"use client";

import { useRef, useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import {
  IconX, IconCopy, IconCheck, IconDownload, IconChevronDown,
  IconHistory, IconArrowLeft, IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react";
import { useDocStore, type Artifact } from "@/store/docStore";
import CodeBlock from "@/components/chat/CodeBlock";
import { FileChip, getFileMeta, formatBytes } from "@/components/ui";

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── ArtifactViewer ────────────────────────────────────────────────────────────

function ArtifactViewer({ artifact }: { artifact: Artifact }) {
  const [txtContent, setTxtContent] = useState<string | null>(null);
  const isPdf = artifact.mimeType === "application/pdf";
  const isTxt = artifact.mimeType === "text/plain" || artifact.mimeType === "text/csv";

  useEffect(() => {
    if (!isTxt) return;
    fetch(artifact.url, { credentials: "include" })
      .then((r) => r.text())
      .then(setTxtContent)
      .catch(() => setTxtContent("Impossible de charger le contenu."));
  }, [artifact.url, isTxt]);

  // PDF dans un iframe
  if (isPdf) {
    return (
      <iframe
        src={artifact.url}
        className="flex-1 w-full border-0"
        title={artifact.name}
      />
    );
  }

  // TXT / CSV — texte brut
  if (isTxt) {
    return (
      <div className="flex-1 overflow-auto p-4">
        {txtContent === null ? (
          <p className="text-neutral-400 text-[13px]">Chargement…</p>
        ) : (
          <pre className="text-[12px] font-mono text-marine whitespace-pre-wrap break-words leading-relaxed">
            {txtContent}
          </pre>
        )}
      </div>
    );
  }

  // DOCX / XLSX / PPTX — pas de preview
  const meta = getFileMeta(artifact.mimeType);
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-5 p-8 text-center">
      <div className={`w-20 h-20 rounded-2xl ${meta.bg} flex items-center justify-center`}>
        <meta.Icon size={40} className={meta.color} />
      </div>
      <div>
        <p className="text-[15px] font-medium text-marine">{artifact.name}</p>
        <p className="text-[13px] text-neutral-400 mt-1">{meta.label} · {formatBytes(artifact.size)}</p>
      </div>
      <p className="text-[13px] text-neutral-400 max-w-[260px]">
        La prévisualisation n&apos;est pas disponible pour ce format.<br />
        Téléchargez le fichier pour l&apos;ouvrir.
      </p>
    </div>
  );
}

// ── DocumentBody (texte markdown) ─────────────────────────────────────────────

function DocumentBody({ content, format }: { content: string; format: string }) {
  if (format === "code") {
    const langMatch = content.match(/^```(\w+)/);
    const lang = langMatch ? langMatch[1] : "plaintext";
    const code = content.replace(/^```\w*\n?/, "").replace(/```$/, "").trim();
    return <div className="p-4"><CodeBlock language={lang} code={code} /></div>;
  }
  return (
    <div className="p-6 prose-chat text-[14px]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          code({ className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || "");
            if (!match) return <code className="bg-tint-code-inline text-blue-700 font-mono text-[13px] px-[5px] py-[1px] rounded-sm" {...props}>{children}</code>;
            return <CodeBlock language={match[1]} code={String(children).replace(/\n$/, "")} />;
          },
          table({ children }) {
            return <div className="overflow-x-auto my-3 rounded-md border border-neutral-border"><table className="w-full border-collapse text-[13px]">{children}</table></div>;
          },
          a({ href, children, ...props }) {
            return <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline" {...props}>{children}</a>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

// ── DocumentPanel ─────────────────────────────────────────────────────────────

export default function DocumentPanel() {
  const currentDocument      = useDocStore((s) => s.currentDocument);
  const artifacts            = useDocStore((s) => s.artifacts);
  const currentArtifactIndex = useDocStore((s) => s.currentArtifactIndex);
  const panelOpen            = useDocStore((s) => s.panelOpen);
  const viewingVersionIndex  = useDocStore((s) => s.viewingVersionIndex);
  const closePanel           = useDocStore((s) => s.closePanel);
  const closeDocument        = useDocStore((s) => s.closeDocument);
  const goToVersion          = useDocStore((s) => s.goToVersion);
  const goToArtifact         = useDocStore((s) => s.goToArtifact);

  const [copied, setCopied]         = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const versionsRef = useRef<HTMLDivElement>(null) as React.RefObject<HTMLDivElement>;

  const isArtifactMode = currentArtifactIndex !== null && artifacts.length > 0;
  const currentArtifact = isArtifactMode ? artifacts[currentArtifactIndex] : null;

  if (!panelOpen || (!currentDocument && !currentArtifact)) return null;

  const displayedContent = currentDocument
    ? (viewingVersionIndex !== null
        ? (currentDocument.versions[viewingVersionIndex] ?? currentDocument.content)
        : currentDocument.content)
    : "";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(displayedContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const handleDownload = async () => {
    if (currentArtifact) {
      try {
        const res = await fetch(currentArtifact.url, { credentials: "include" });
        if (!res.ok) throw new Error();
        const blob = await res.blob();
        downloadBlob(blob, currentArtifact.name);
      } catch { window.open(currentArtifact.url, "_blank"); }
      return;
    }
    const blob = new Blob([displayedContent], { type: "text/markdown;charset=utf-8" });
    downloadBlob(blob, "document.md");
  };

  const handleClose = () => {
    closePanel();
    closeDocument();
  };

  const inner = (isMobile: boolean) => (
    <>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 h-12 border-b border-neutral-border flex-shrink-0">
        {isMobile ? (
          <button onClick={handleClose} className="flex items-center gap-1.5 text-uism font-body text-neutral-text-secondary hover:text-marine transition-colors">
            <IconArrowLeft size={16} /> Retour
          </button>
        ) : (
          <>
            {/* Navigation artifacts */}
            {artifacts.length > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => goToArtifact((currentArtifactIndex ?? 0) - 1)}
                  disabled={(currentArtifactIndex ?? 0) === 0}
                  className="p-1 rounded hover:bg-neutral-100 disabled:opacity-30"
                >
                  <IconChevronLeft size={14} />
                </button>
                <span className="text-[11px] text-neutral-400">
                  {(currentArtifactIndex ?? 0) + 1}/{artifacts.length}
                </span>
                <button
                  onClick={() => goToArtifact((currentArtifactIndex ?? 0) + 1)}
                  disabled={(currentArtifactIndex ?? 0) >= artifacts.length - 1}
                  className="p-1 rounded hover:bg-neutral-100 disabled:opacity-30"
                >
                  <IconChevronRight size={14} />
                </button>
              </div>
            )}

            {/* Titre */}
            <div className="flex-1 min-w-0 flex items-center gap-2">
              {currentArtifact ? (
                <>
                  <FileChip variant="badge" name={currentArtifact.name} size={currentArtifact.size} mimeType={currentArtifact.mimeType} />
                  <span className="text-uism font-body font-medium text-marine truncate">{currentArtifact.name}</span>
                </>
              ) : (
                <span className="text-uism font-body font-medium text-marine">Document</span>
              )}
            </div>

            <button onClick={handleClose} className="text-neutral-text-tertiary hover:text-marine transition-colors flex-shrink-0">
              <IconX size={18} />
            </button>
          </>
        )}
      </div>

      {/* Corps */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {isArtifactMode && currentArtifact ? (
          <ArtifactViewer artifact={currentArtifact} />
        ) : (
          <div className="flex-1 overflow-y-auto">
            <DocumentBody content={displayedContent} format={currentDocument?.format ?? "markdown"} />
          </div>
        )}
      </div>

      {/* Barre d'actions */}
      <div className="flex-shrink-0 border-t border-neutral-border px-3 py-2 flex items-center gap-2">
        {!isArtifactMode && (
          <button
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-uism font-body border transition-colors ${
              copied ? "border-success/30 bg-success/5 text-success" : "border-neutral-border text-neutral-text-secondary hover:bg-neutral-bg hover:text-marine"
            }`}
          >
            {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
            {copied ? "Copié" : "Copier"}
          </button>
        )}

        <button
          onClick={handleDownload}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-uism font-body border border-neutral-border text-neutral-text-secondary hover:bg-neutral-bg hover:text-marine transition-colors"
        >
          <IconDownload size={14} />
          Télécharger
        </button>

        {/* Versions (mode document texte) */}
        {!isArtifactMode && currentDocument && currentDocument.versions.length > 0 && (
          <div ref={versionsRef} className="relative ml-auto">
            <button
              onClick={() => setVersionsOpen((o) => !o)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-uism font-body border border-neutral-border text-neutral-text-secondary hover:bg-neutral-bg hover:text-marine transition-colors"
            >
              <IconHistory size={14} />
              Versions
              <IconChevronDown size={12} className={`transition-transform duration-200 ${versionsOpen ? "rotate-180" : ""}`} />
            </button>
            {versionsOpen && (
              <div className="absolute bottom-full right-0 mb-1 w-52 bg-neutral-white border border-neutral-border rounded-md shadow-lg overflow-hidden z-10">
                {currentDocument.versions.map((_, i) => (
                  <button key={i} onClick={() => { goToVersion(i); setVersionsOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-uism font-body transition-colors ${viewingVersionIndex === i ? "bg-blue-50 text-blue-700" : "text-marine hover:bg-neutral-bg"}`}
                  >
                    Version {i + 1}
                  </button>
                ))}
                <button onClick={() => { goToVersion(currentDocument.versions.length); setVersionsOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-uism font-body border-t border-neutral-border transition-colors ${viewingVersionIndex === null ? "bg-blue-50 text-blue-700" : "text-marine hover:bg-neutral-bg"}`}
                >
                  Version actuelle
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      <aside className="hidden md:flex flex-col w-[400px] flex-shrink-0 border-l border-neutral-border bg-neutral-white overflow-hidden">
        {inner(false)}
      </aside>
      <div className="md:hidden fixed inset-0 z-40 bg-neutral-white flex flex-col">
        {inner(true)}
      </div>
    </>
  );
}
