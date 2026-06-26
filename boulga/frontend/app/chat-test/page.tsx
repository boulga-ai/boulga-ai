"use client";

/**
 * chat-test/page.tsx — Page de test du chat + génération de documents.
 *
 * Comportement façon Claude :
 *  - le texte streame token par token
 *  - si le LLM décide de produire un document, une carte fichier apparaît
 *    avec un bouton de téléchargement
 *
 * Composants : ModelSelector, MessageBubble, FileCard (dans le même dossier).
 */

import { useRef, useState } from "react";
import { ModelSelector } from "./ModelSelector";
import { MessageBubble } from "./MessageBubble";
import type { ChatMessage, FileReady } from "./types";

// APRÈS — passe par le proxy /backend de ta config Next.js
const API_BASE = "/backend";

export default function ChatTestPage() {
    const [model, setModel] = useState("claude-sonnet-4-6");
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [streaming, setStreaming] = useState(false);
    const [building, setBuilding] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        requestAnimationFrame(() => {
            scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
        });
    };

    async function send() {
        const text = input.trim();
        if (!text || streaming) return;

        const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: text };
        const assistantMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: "",
        };

        const history = [...messages, userMsg];
        setMessages([...history, assistantMsg]);
        setInput("");
        setStreaming(true);
        scrollToBottom();

        try {
            const res = await fetch(`${API_BASE}/api/chat-test`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model_id: model,
                    messages: history.map((m) => ({ role: m.role, content: m.content })),
                }),
            });

            if (!res.ok || !res.body) {
                throw new Error(`Erreur serveur (${res.status})`);
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });

                const lines = buffer.split("\n\n");
                buffer = lines.pop() || "";

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed.startsWith("data:")) continue;
                    const payload = trimmed.slice(5).trim();
                    if (!payload) continue;

                    let event: any;
                    try {
                        event = JSON.parse(payload);
                    } catch {
                        continue;
                    }

                    if (event.type === "chunk") {
                        assistantMsg.content += event.text;
                        setMessages((prev) =>
                            prev.map((m) =>
                                m.id === assistantMsg.id ? { ...m, content: assistantMsg.content } : m
                            )
                        );
                        scrollToBottom();
                    } else if (event.type === "building") {
                        setBuilding(true);
                        scrollToBottom();
                    } else if (event.type === "file_ready") {
                        const file: FileReady = {
                            fileId: event.file_id,
                            filename: event.filename,
                            mimeType: event.mime_type,
                            sizeBytes: event.size_bytes,
                            summary: event.summary,
                            format: event.format,
                            url: `${API_BASE}/api/chat-test/file/${event.file_id}/${encodeURIComponent(
                                event.filename
                            )}`,
                        };
                        setBuilding(false);
                        setMessages((prev) =>
                            prev.map((m) => (m.id === assistantMsg.id ? { ...m, file } : m))
                        );
                        scrollToBottom();
                    } else if (event.type === "error") {
                        assistantMsg.content +=
                            (assistantMsg.content ? "\n\n" : "") + `⚠ ${event.message}`;
                        setBuilding(false);
                        setMessages((prev) =>
                            prev.map((m) =>
                                m.id === assistantMsg.id ? { ...m, content: assistantMsg.content } : m
                            )
                        );
                    }
                }
            }
        } catch (err: any) {
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === assistantMsg.id
                        ? { ...m, content: (m.content || "") + `\n\n⚠ ${err.message}` }
                        : m
                )
            );
        } finally {
            setStreaming(false);
            setBuilding(false);
        }
    }

    function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
        }
    }

    return (
        <div style={styles.page}>
            <header style={styles.header}>
                <div style={styles.title}>Boulga — Chat Test</div>
                <ModelSelector value={model} onChange={setModel} apiBase={API_BASE} />
            </header>

            <div ref={scrollRef} style={styles.messages}>
                {messages.length === 0 && (
                    <div style={styles.empty}>
                        Pose une question, ou demande un document Word / PDF.
                    </div>
                )}
                {messages.map((m) => (
                    <MessageBubble key={m.id} message={m} />
                ))}
                {building && (
                    <div style={styles.building}>
                        <span style={styles.spinner} /> Construction du document…
                    </div>
                )}
            </div>

            <div style={styles.composer}>
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder="Écris ton message…  (Entrée pour envoyer, Maj+Entrée pour un saut de ligne)"
                    rows={2}
                    style={styles.textarea}
                    disabled={streaming}
                />
                <button onClick={send} disabled={streaming || !input.trim()} style={styles.send}>
                    {streaming ? "…" : "Envoyer"}
                </button>
            </div>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    page: {
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        maxWidth: 820,
        margin: "0 auto",
        fontFamily: "system-ui, -apple-system, sans-serif",
        color: "#1A1A1A",
    },
    header: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 16px",
        borderBottom: "1px solid #E5E7EB",
    },
    title: { fontWeight: 600, fontSize: 15 },
    messages: { flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 12 },
    empty: { color: "#9CA3AF", textAlign: "center", marginTop: 40, fontSize: 14 },
    building: {
        alignSelf: "flex-start",
        display: "flex",
        alignItems: "center",
        gap: 8,
        color: "#6B7280",
        fontSize: 13,
        padding: "8px 12px",
    },
    spinner: {
        width: 12,
        height: 12,
        border: "2px solid #C7D2FE",
        borderTopColor: "#4F46E5",
        borderRadius: "50%",
        display: "inline-block",
        animation: "spin 0.8s linear infinite",
    },
    composer: { display: "flex", gap: 8, padding: 12, borderTop: "1px solid #E5E7EB" },
    textarea: {
        flex: 1,
        resize: "none",
        padding: "10px 12px",
        borderRadius: 10,
        border: "1px solid #D1D5DB",
        fontSize: 14,
        fontFamily: "inherit",
        outline: "none",
    },
    send: {
        padding: "0 18px",
        borderRadius: 10,
        border: "none",
        background: "#4F46E5",
        color: "white",
        fontWeight: 600,
        cursor: "pointer",
        fontSize: 14,
    },
};