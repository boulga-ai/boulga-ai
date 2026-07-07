"use client";

import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import {
  IconFileText, IconFileTypePdf, IconFileSpreadsheet, IconDownload,
} from "@tabler/icons-react";
import type { Message, AgentStep } from "@/types";
import { useDocStore } from "@/store/docStore";
import CodeBlock from "./CodeBlock";
import Lightbox from "./Lightbox";
import BubbleActions from "./BubbleActions";
import AgentSteps from "./AgentSteps";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / 1048576).toFixed(1)} Mo`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

async function downloadFile(url: string, filename: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error();
    const blob = await res.blob();
    downloadBlob(blob, filename);
  } catch {
    window.open(url, "_blank");
  }
}

function providerLabel(provider?: string, modelId?: string): string {
  const providerNames: Record<string, string> = {
    gemini: "Gemini",
    claude: "Claude",
    openai: "ChatGPT",
    deepseek: "DeepSeek",
  };
  const modelLabels: Record<string, string> = {
    "gemini-2.5-flash": "2.5 Flash",
    "gemini-2.5-pro": "2.5 Pro",
    "claude-haiku-4-5": "Haiku 4.5",
    "claude-sonnet-4-6": "Sonnet 4.6",
    "claude-opus-4-6": "Opus 4.6",
    "gpt-5.5-instant": "5.5 Instant",
    "gpt-5.5-pro": "5.5 Pro",
    "deepseek-v4-flash": "V4 Flash",
    "deepseek-v4-pro": "V4 Pro",
  };
  const pName = provider ? (providerNames[provider] ?? provider) : "Assistant";
  const mLabel = modelId ? (modelLabels[modelId] ?? modelId) : "";
  return mLabel ? `${pName} · ${mLabel}` : pName;
}

// ── FileCard ─────────────────────────────────────────────────────────────────

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function FileCard({ messageId }: { messageId: string }) {
  const artifacts = useDocStore((s) => s.artifacts);
  const goToArtifact = useDocStore((s) => s.goToArtifact);
  const openPanel = useDocStore((s) => s.openPanel);

  const files = artifacts.filter((a) => a.messageId === messageId);
  if (files.length === 0) return null;

  return (
    <div className="mt-3 space-y-2">
      {files.map((file) => {
        const isPdf  = file.mimeType === "application/pdf";
        const isXlsx = file.mimeType === XLSX_MIME;

        const Icon      = isPdf ? IconFileTypePdf : isXlsx ? IconFileSpreadsheet : IconFileText;
        const iconColor = isPdf ? "text-red-600"  : isXlsx ? "text-green-600"  : "text-blue-600";
        const iconBg    = isPdf ? "bg-red-50"     : isXlsx ? "bg-green-50"     : "bg-blue-50";
        const label     = isPdf ? "PDF"           : isXlsx ? "Excel"           : "Word";

        const handleOpen = () => {
          const idx = artifacts.findIndex((a) => a.id === file.id);
          if (idx >= 0) goToArtifact(idx);
          openPanel();
        };

        const handleDownload = (e: React.MouseEvent) => {
          e.stopPropagation();
          downloadFile(file.url, file.name);
        };

        return (
          <div
            key={file.id}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl border bg-white hover:bg-neutral-50 transition-colors"
            style={{ borderColor: "#E0E4EC" }}
          >
            <button
              type="button"
              onClick={handleOpen}
              className="flex items-center gap-3 flex-1 min-w-0 text-left"
            >
              <div className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}>
                <Icon size={18} className={iconColor} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-marine truncate">{file.name}</p>
                <p className="text-[11px] text-neutral-text-tertiary">
                  {label} · {formatBytes(file.size)}
                </p>
              </div>
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="flex-shrink-0 p-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
              title="Télécharger"
            >
              <IconDownload size={16} className="text-neutral-text-tertiary" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
  streamingText?: string;
  attachments?: Array<{ id: string; name: string; size: number; mime_type: string }>;
  agentSteps?: AgentStep[];
}

// ── Composant ─────────────────────────────────────────────────────────────────

export default function MessageBubble({
  message,
  isStreaming = false,
  streamingText = "",
  attachments = [],
  agentSteps = [],
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const content = isStreaming ? streamingText : message.content;

  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const markdownComponents = useMemo<Components>(
    () => ({
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

      // eslint-disable-next-line @next/next/no-img-element
      img({ src, alt }) {
        if (!src) return null;
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={alt ?? ""}
            className="max-w-full rounded-md my-2 cursor-pointer hover:opacity-90 transition-opacity duration-100"
            style={{ maxHeight: "480px", objectFit: "contain" }}
            onClick={() => setLightboxSrc(src)}
          />
        );
      },

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
        <div className="w-full max-w-[90%] md:max-w-[70%] flex flex-col items-end gap-2">
          {imageAttachments.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-end">
              {imageAttachments.map((f) => (
                <div
                  key={f.id}
                  className="w-16 h-16 rounded-md overflow-hidden border border-neutral-border bg-neutral-bg flex items-center justify-center"
                  title={f.name}
                >
                  <span className="text-[10px] text-neutral-text-tertiary text-center px-1 break-all">
                    {f.name.split(".").pop()?.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          )}

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
  const hasSteps = agentSteps.length > 0;
  const isWaiting = isStreaming && !content && !hasSteps;

  return (
    <>
      {lightboxSrc && (
        <Lightbox
          src={lightboxSrc}
          alt="Image dans la réponse"
          onClose={() => setLightboxSrc(null)}
        />
      )}

      <div className="flex justify-start mb-4 group">
        <div className="w-full max-w-[90%] md:max-w-[70%]">
          <div className="text-[11px] text-neutral-text-tertiary mb-1 pl-1 font-body">
            {providerLabel(message.provider, message.model_id)}
          </div>

          <div className="text-[15px] text-marine">
            {isWaiting ? (
              <span className="flex gap-1 py-1">
                <span className="thinking-dot" />
                <span className="thinking-dot" />
                <span className="thinking-dot" />
              </span>
            ) : content ? (
              <div className="prose-chat">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={markdownComponents}
                >
                  {content}
                </ReactMarkdown>
              </div>
            ) : !hasSteps ? null : null}

            {hasSteps && <AgentSteps steps={agentSteps} />}

            {/* Skeleton pendant la génération d'image */}
            {isStreaming && agentSteps.some((s) => s.tool === "generate_image" && s.status === "running") && (
              <div
                className="image-gen-skeleton mt-3 w-64 h-64 rounded-xl overflow-hidden border flex items-end justify-center pb-3"
                style={{ borderColor: "#E0E4EC" }}
              >
                <span className="text-[11px] text-neutral-text-tertiary">Génération en cours…</span>
              </div>
            )}

            {/* Images générées — affichées inline comme ChatGPT */}
            {message.inlineImages && message.inlineImages.length > 0 && (
              <div className="mt-3 space-y-3">
                {message.inlineImages.map((img) => (
                  <div key={img.id} className="relative inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.url}
                      alt={img.name}
                      className="max-w-full block rounded-xl cursor-pointer hover:opacity-95 transition-opacity duration-100"
                      style={{ maxHeight: "480px", objectFit: "contain" }}
                      onClick={() => setLightboxSrc(img.url)}
                    />
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); downloadFile(img.url, img.name); }}
                      className="absolute bottom-3 right-3 p-2 rounded-full text-white transition-colors"
                      style={{ background: "rgba(0,0,0,0.5)" }}
                      title="Télécharger"
                    >
                      <IconDownload size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {!isStreaming && <FileCard messageId={message.id} />}
          </div>

          {!isStreaming && message.content && (
            <div className="pl-1">
              <BubbleActions message={message} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
