import { API_URL } from "@/lib/constants";
import { getStoredToken } from "@/store/authStore";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ChatPayload {
  message: string;
  provider: string;
  model_id: string;
  conversation_id?: string | null;
  file_ids?: string[];
  tool_slug?: string | null;
  auto_route?: boolean;
}

export interface RoutingInfo {
  provider: string;
  model: string;
  reason: string;
}

export interface StreamHandlers {
  onConversation: (id: string, isNew: boolean) => void;
  onRouting?: (info: RoutingInfo) => void;
  onChunk: (text: string) => void;
  onTitle: (title: string) => void;
  onFileReady: (url: string, name: string, format: string, size: number, isImage: boolean) => void;
  onDone: (messageId: string) => void;
  onError: (message: string) => void;
}

// ── streamChat ────────────────────────────────────────────────────────────────

/**
 * Ouvre un flux SSE vers POST /api/chat.
 * Retourne un AbortController pour permettre l'interruption via abort().
 */
export function streamChat(
  payload: ChatPayload,
  handlers: StreamHandlers,
): AbortController {
  const controller = new AbortController();

  (async () => {
    let res: Response;
    try {
      res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(getStoredToken() ? { Authorization: `Bearer ${getStoredToken()}` } : {}),
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (err: unknown) {
      if ((err as { name?: string }).name === "AbortError") return;
      handlers.onError("Impossible de joindre le serveur.");
      return;
    }

    if (!res.ok) {
      let message = `Erreur ${res.status}`;
      try {
        const body = await res.json();
        message = body?.detail ?? body?.message ?? message;
      } catch {
        // réponse non-JSON
      }
      handlers.onError(message);
      return;
    }

    const reader = res.body?.getReader();
    if (!reader) {
      handlers.onError("Flux de réponse indisponible.");
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Découper par lignes complètes
        const lines = buffer.split("\n");
        // La dernière ligne peut être incomplète → la conserver dans le buffer
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;

          const jsonStr = trimmed.slice("data:".length).trim();
          if (!jsonStr) continue;

          let event: Record<string, unknown>;
          try {
            event = JSON.parse(jsonStr);
          } catch {
            continue; // ligne malformée, on ignore
          }

          const type = event.type as string;

          switch (type) {
            case "conversation":
              handlers.onConversation(
                event.id as string,
                event.is_new as boolean,
              );
              break;
            case "routing":
              handlers.onRouting?.({
                provider: event.provider as string,
                model:    event.model as string,
                reason:   event.reason as string,
              });
              break;
            case "chunk":
              handlers.onChunk(event.text as string);
              break;
            case "title":
              handlers.onTitle(event.title as string);
              break;
            case "file_ready":
              handlers.onFileReady(
                event.url as string,
                event.filename as string,
                event.mime_type as string,
                event.size_bytes as number,
                Boolean(event.is_image),
              );
              break;
            case "done":
              handlers.onDone(event.message_id as string);
              break;
            case "error":
              handlers.onError(event.message as string);
              break;
          }
        }
      }
    } catch (err: unknown) {
      if ((err as { name?: string }).name !== "AbortError") {
        handlers.onError("Connexion interrompue.");
      }
    } finally {
      reader.releaseLock();
    }
  })();

  return controller;
}

// ── streamCompare ─────────────────────────────────────────────────────────────

export interface ComparePayload {
  prompt: string;
  providers: Array<{ provider: string; model_id: string }>;
  file_ids?: string[];
}

export interface CompareHandlers {
  onChunk: (provider: string, model: string, text: string) => void;
  onDone: (provider: string, model: string, latencyMs: number, tokens: number) => void;
  onError: (provider: string, model: string, message: string) => void;
  onAllDone: (sessionId: string) => void;
  onFatalError: (message: string) => void;
}

export function streamCompare(
  payload: ComparePayload,
  handlers: CompareHandlers,
): AbortController {
  const controller = new AbortController();

  (async () => {
    let res: Response;
    try {
      res = await fetch(`${API_URL}/api/compare`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(getStoredToken() ? { Authorization: `Bearer ${getStoredToken()}` } : {}),
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (err: unknown) {
      if ((err as { name?: string }).name === "AbortError") return;
      handlers.onFatalError("Impossible de joindre le serveur.");
      return;
    }

    if (!res.ok) {
      let message = `Erreur ${res.status}`;
      try {
        const body = await res.json();
        message = body?.message ?? body?.detail ?? message;
      } catch {
        // non-JSON
      }
      handlers.onFatalError(message);
      return;
    }

    const reader = res.body?.getReader();
    if (!reader) {
      handlers.onFatalError("Flux de réponse indisponible.");
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const jsonStr = trimmed.slice("data:".length).trim();
          if (!jsonStr) continue;

          let event: Record<string, unknown>;
          try {
            event = JSON.parse(jsonStr);
          } catch {
            continue;
          }

          switch (event.type) {
            case "compare_chunk":
              handlers.onChunk(
                event.provider as string,
                event.model as string,
                event.text as string,
              );
              break;
            case "compare_done":
              handlers.onDone(
                event.provider as string,
                event.model as string,
                event.latency_ms as number,
                event.tokens as number,
              );
              break;
            case "compare_error":
              handlers.onError(
                event.provider as string,
                event.model as string,
                event.message as string,
              );
              break;
            case "all_done":
              handlers.onAllDone(event.session_id as string);
              break;
          }
        }
      }
    } catch (err: unknown) {
      if ((err as { name?: string }).name !== "AbortError") {
        handlers.onFatalError("Connexion interrompue.");
      }
    } finally {
      reader.releaseLock();
    }
  })();

  return controller;
}
