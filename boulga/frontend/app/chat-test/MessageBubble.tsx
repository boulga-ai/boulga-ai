"use client";

import type { ChatMessage, FileReady } from "./types";

function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
    return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}

function FileCard({ file }: { file: FileReady }) {
    const icon = file.format === "pdf" ? "📕" : "📘";
    return (
        <a
            href={file.url}
            download={file.filename}
            style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginTop: 8,
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid #E5E7EB",
                background: "#FAFAFA",
                textDecoration: "none",
                color: "inherit",
                maxWidth: 360,
            }}
        >
            <span style={{ fontSize: 26 }}>{icon}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontWeight: 600, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {file.filename}
                </span>
                <span style={{ display: "block", color: "#9CA3AF", fontSize: 12 }}>
                    {file.format?.toUpperCase()} · {formatSize(file.sizeBytes)}
                </span>
                {file.summary && (
                    <span style={{ display: "block", color: "#6B7280", fontSize: 12, marginTop: 2 }}>
                        {file.summary}
                    </span>
                )}
            </span>
            <span
                style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#4F46E5",
                    border: "1px solid #C7D2FE",
                    borderRadius: 8,
                    padding: "4px 10px",
                    whiteSpace: "nowrap",
                }}
            >
                ⬇ Télécharger
            </span>
        </a>
    );
}

export function MessageBubble({ message }: { message: ChatMessage }) {
    const isUser = message.role === "user";
    return (
        <div
            style={{
                alignSelf: isUser ? "flex-end" : "flex-start",
                maxWidth: "85%",
            }}
        >
            <div
                style={{
                    padding: "10px 14px",
                    borderRadius: 14,
                    background: isUser ? "#0B1F3A" : "#F3F4F6",
                    color: isUser ? "white" : "#1A1A1A",
                    fontSize: 14,
                    lineHeight: 1.5,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                }}
            >
                {message.content || (isUser ? "" : "…")}
            </div>
            {message.file && <FileCard file={message.file} />}
        </div>
    );
}