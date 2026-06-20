"use client";

import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import type { Components } from "react-markdown";
import { IconPaperclip } from "@tabler/icons-react";
import type { Message } from "@/types";
import { getStoredToken } from "@/store/authStore";
import CodeBlock from "./CodeBlock";
import Lightbox from "./Lightbox";
import BubbleActions from "./BubbleActions";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / 1048576).toFixed(1)} Mo`;
}

function providerLabel(provider?: string, modelId?: string): string {
  const providerNames: Record<string, string> = {
    gemini: "Gemini",
    claude: "Claude",
    chatgpt: "ChatGPT",
    deepseek: "DeepSeek",
  };
  const modelLabels: Record<string, string> = {
    "gemini-2.5-flash": "2.5 Flash",
    "gemini-2.5-pro": "2.5 Pro",
    "claude-haiku-4-5": "Haiku 4.5",
    "claude-sonnet-4-6": "Sonnet 4.6",
    "gpt-5.5-instant": "5.5 Instant",
    "gpt-5.5-pro": "5.5 Pro",
    "deepseek-v4-flash": "V4 Flash",
    "deepseek-v4-pro": "V4 Pro",
  };
  const pName = provider ? (providerNames[provider] ?? provider) : "Assistant";
  const mLabel = modelId ? (modelLabels[modelId] ?? modelId) : "";
  return mLabel ? `${pName} · ${mLabel}` : pName;
}

// ── Indicateur "thinking" (avant le premier chunk) ────────────────────────────

function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-1.5 py-1">
      <span className="thinking-dot" />
      <span className="thinking-dot" />
      <span className="thinking-dot" />
    </div>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
  streamingText?: string;
  attachments?: Array<{ id: string; name: string; size: number; mime_type: string }>;
}

// ── Composant ─────────────────────────────────────────────────────────────────

export default function MessageBubble({
  message,
  isStreaming = false,
  streamingText = "",
  attachments = [],
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const content = isStreaming ? streamingText : message.content;

  // Lightbox state
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  // Composants Markdown définis à l'intérieur pour accéder à setLightboxSrc
  const markdownComponents = useMemo<Components>(
    () => ({
      // ── Code inline et blocs ──────────────────────────────────────────
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      code({ className, children, ...props }: any) {
        const match = /language-(\w+)/.exec(className || "");
        const isBlock = match || String(children).includes("\n");

        if (!isBlock) {
          return (
            <code
              className="bg-[#F1F5F9] text-blue-700 font-mono text-[13px] px-[5px] py-[1px] rounded-sm"
              {...props}
            >
              {children}
            </code>
          );
        }

        const language = match ? match[1] : "";
        const code = String(children).replace(/\n$/, "");
        return <CodeBlock language={language} code={code} />;
      },

      // ── Tableaux : scroll horizontal + alternance ─────────────────────
      table({ children }) {
        return (
          <div className="overflow-x-auto my-3 rounded-md border border-[#E0E4EC]">
            <table className="w-full border-collapse text-[13px]">
              {children}
            </table>
          </div>
        );
      },
      thead({ children }) {
        return (
          <thead style={{ background: "rgba(11,31,58,0.06)" }}>{children}</thead>
        );
      },
      th({ children }) {
        return (
          <th className="font-semibold text-left px-3 py-2 border-b border-[#E0E4EC] text-marine">
            {children}
          </th>
        );
      },
      td({ children }) {
        return (
          <td className="px-3 py-2 text-neutral-text-secondary">{children}</td>
        );
      },
      tr({ children }) {
        return <tr className="even:bg-[#F5F5F5] odd:bg-white">{children}</tr>;
      },

      // ── Citations ─────────────────────────────────────────────────────
      blockquote({ children }) {
        return (
          <blockquote
            style={{
              borderLeft: "3px solid #1565C0",
              background: "#F5F7FA",
              paddingLeft: "16px",
              paddingTop: "8px",
              paddingBottom: "8px",
              margin: "8px 0",
              fontStyle: "italic",
              color: "#4A5568",
              borderRadius: "0 4px 4px 0",
            }}
          >
            {children}
          </blockquote>
        );
      },

      // ── Images : inline + lightbox ────────────────────────────────────
      // eslint-disable-next-line @next/next/no-img-element
      img({ src, alt }) {
        if (!src) return null;
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={alt ?? ""}
            className="max-w-full rounded-md my-2 cursor-zoom-in hover:opacity-90 transition-opacity duration-100"
            style={{ maxHeight: "480px", objectFit: "contain" }}
            onClick={() => setLightboxSrc(src)}
          />
        );
      },

      // ── Liens ─────────────────────────────────────────────────────────
      a({ href, children, ...props }) {
        return (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-700 underline hover:text-blue-900"
            {...props}
          >
            {children}
          </a>
        );
      },
    }),
    [setLightboxSrc],
  );

  // ── Bulle UTILISATEUR ──────────────────────────────────────────────────────
  if (isUser) {
    const imageAttachments = attachments.filter((a) =>
      a.mime_type.startsWith("image/"),
    );
    const fileAttachments = attachments.filter(
      (a) => !a.mime_type.startsWith("image/"),
    );

    return (
      <div className="flex justify-end mb-4">
        {/* max-w-[90%] mobile, max-w-[70%] desktop */}
        <div className="w-full max-w-[90%] md:max-w-[70%] flex flex-col items-end gap-2">
          {/* Miniatures images */}
          {imageAttachments.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-end">
              {imageAttachments.map((f) => (
                <div
                  key={f.id}
                  className="w-16 h-16 rounded-md overflow-hidden border border-neutral-border bg-neutral-bg flex items-center justify-center"
                  title={f.name}
                >
                  {/* Placeholder visuel — thumbnail réel à brancher prompt 12 */}
                  <span className="text-[10px] text-neutral-text-tertiary text-center px-1 break-all">
                    {f.name.split(".").pop()?.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Chips fichiers non-images */}
          {fileAttachments.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-end">
              {fileAttachments.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center gap-1 px-2 py-1 rounded-sm text-[11px]"
                  style={{
                    background: "rgba(11,31,58,0.10)",
                    color: "#0B1F3A",
                    border: "0.5px solid #E0E4EC",
                  }}
                >
                  <span className="font-medium truncate max-w-[120px]">{f.name}</span>
                  <span className="text-neutral-text-tertiary">
                    · {formatBytes(f.size)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Texte */}
          <div
            className="px-4 py-3 text-white text-[15px] leading-relaxed whitespace-pre-wrap"
            style={{ background: "#0B1F3A", borderRadius: "12px" }}
          >
            {message.content}
          </div>
        </div>
      </div>
    );
  }

  // ── Bulle ASSISTANT ────────────────────────────────────────────────────────
  const isThinking = isStreaming && !streamingText;

  return (
    <>
      {/* Lightbox */}
      {lightboxSrc && (
        <Lightbox
          src={lightboxSrc}
          alt="Image dans la réponse"
          onClose={() => setLightboxSrc(null)}
        />
      )}

      <div className="flex justify-start mb-4 group">
        <div className="w-full max-w-[90%] md:max-w-[70%]">
          {/* Label provider · modèle */}
          <div className="text-[11px] text-neutral-text-tertiary mb-1 pl-1 font-body">
            {providerLabel(message.provider, message.model_id)}
          </div>

          {/* Bulle */}
          <div
            className="bg-neutral-white px-4 py-3 text-[15px] text-marine"
            style={{ borderRadius: "12px", border: "0.5px solid #E0E4EC" }}
          >
            {isThinking ? (
              <ThinkingIndicator />
            ) : content ? (
              <div className={`prose-chat${isStreaming ? " streaming-cursor" : ""}`}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                  components={markdownComponents}
                >
                  {content}
                </ReactMarkdown>
              </div>
            ) : (
              /* Bulle finalisée mais vide (ne devrait pas arriver) */
              <span className="text-neutral-text-tertiary text-[13px]">—</span>
            )}

            {/* Indicateur fichier généré */}
            {!isStreaming && message.fileReady && (
              <div className="mt-3 pt-3 border-t border-neutral-border/50">
                <a
                  href="#"
                  onClick={async (e) => {
                    e.preventDefault();
                    if (!message.fileReady) return;
                    try {
                      const token = getStoredToken();
                      const res = await fetch(message.fileReady.url, {
                        headers: token ? { Authorization: `Bearer ${token}` } : {},
                      });
                      if (!res.ok) throw new Error(`Erreur ${res.status}`);
                      const blob = await res.blob();
                      const objectUrl = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = objectUrl;
                      a.download = message.fileReady.name;
                      a.click();
                      URL.revokeObjectURL(objectUrl);
                    } catch {
                      window.open(message.fileReady.url, "_blank");
                    }
                  }}
                  className="flex items-center gap-2 text-[13px] font-body text-blue-700 hover:underline"
                >
                  <IconPaperclip size={14} />
                  {message.fileReady.name} ({formatBytes(message.fileReady.size)}) — Télécharger
                </a>
              </div>
            )}
          </div>

          {/* Actions (hover desktop / visible si réponse complète) */}
          {!isStreaming && message.content && (
            <BubbleActions message={message} />
          )}
        </div>
      </div>
    </>
  );
}
