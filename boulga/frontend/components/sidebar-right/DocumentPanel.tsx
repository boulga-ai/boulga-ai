"use client";

import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import {
  IconX,
  IconCopy,
  IconCheck,
  IconDownload,
  IconChevronDown,
  IconHistory,
  IconFile,
  IconArrowLeft,
} from "@tabler/icons-react";
import { useDocStore } from "@/store/docStore";
import { getStoredToken } from "@/store/authStore";
import CodeBlock from "@/components/chat/CodeBlock";

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
  a.click();
  URL.revokeObjectURL(url);
}

// ── DocumentBody ──────────────────────────────────────────────────────────────

function DocumentBody({ content, format }: { content: string; format: string }) {
  if (format === "file") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
        <div className="w-16 h-16 rounded-xl bg-blue-50 flex items-center justify-center">
          <IconFile size={32} className="text-blue-700" />
        </div>
        <div className="prose-chat max-w-xs">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
      </div>
    );
  }

  if (format === "code") {
    const langMatch = content.match(/^```(\w+)/);
    const lang = langMatch ? langMatch[1] : "plaintext";
    const code = content.replace(/^```\w*\n?/, "").replace(/```$/, "").trim();
    return (
      <div className="p-4">
        <CodeBlock language={lang} code={code} />
      </div>
    );
  }

  // Markdown par défaut
  return (
    <div className="p-6 prose-chat text-[14px]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          code({ className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || "");
            if (!match) {
              return (
                <code className="bg-[#F1F5F9] text-blue-700 font-mono text-[13px] px-[5px] py-[1px] rounded-sm" {...props}>
                  {children}
                </code>
              );
            }
            return <CodeBlock language={match[1]} code={String(children).replace(/\n$/, "")} />;
          },
          table({ children }) {
            return (
              <div className="overflow-x-auto my-3 rounded-md border border-[#E0E4EC]">
                <table className="w-full border-collapse text-[13px]">{children}</table>
              </div>
            );
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
  const currentDocument = useDocStore((s) => s.currentDocument);
  const fileReady = useDocStore((s) => s.fileReady);
  const viewingVersionIndex = useDocStore((s) => s.viewingVersionIndex);
  const closeDocument = useDocStore((s) => s.closeDocument);
  const goToVersion = useDocStore((s) => s.goToVersion);

  const [copied, setCopied] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const versionsRef = useRef<HTMLDivElement>(null) as React.RefObject<HTMLDivElement>;

  if (!currentDocument) return null;

  // Contenu affiché (version historique ou version courante)
  const displayedContent =
    viewingVersionIndex !== null
      ? (currentDocument.versions[viewingVersionIndex] ?? currentDocument.content)
      : currentDocument.content;

  const hasVersions = currentDocument.versions.length > 0;
  const isViewingHistory = viewingVersionIndex !== null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(displayedContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard non disponible
    }
  };

  const handleDownload = async () => {
    if (fileReady) {
      // Fichier généré par le backend : télécharger via l'URL (déjà préfixée /backend)
      try {
        const token = getStoredToken();
        const res = await fetch(fileReady.url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error(`Erreur ${res.status}`);
        const blob = await res.blob();
        downloadBlob(blob, fileReady.name);
      } catch {
        // Fallback : ouvrir l'URL directement
        window.open(fileReady.url, "_blank");
      }
      return;
    }
    // Pas de fichier backend : télécharger le contenu en .md
    const blob = new Blob([displayedContent], { type: "text/markdown;charset=utf-8" });
    downloadBlob(blob, "document.md");
  };

  // ── Rendu ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Desktop : panneau latéral fixe 400px */}
      <aside className="hidden md:flex flex-col w-[400px] flex-shrink-0 border-l border-neutral-border bg-neutral-white overflow-hidden">
        <PanelContent
          currentDocument={currentDocument}
          displayedContent={displayedContent}
          fileReady={fileReady}
          hasVersions={hasVersions}
          isViewingHistory={isViewingHistory}
          viewingVersionIndex={viewingVersionIndex}
          versionsOpen={versionsOpen}
          versionsRef={versionsRef}
          copied={copied}
          onClose={closeDocument}
          onCopy={handleCopy}
          onDownload={handleDownload}
          onToggleVersions={() => setVersionsOpen((o) => !o)}
          onGoToVersion={(i) => { goToVersion(i); setVersionsOpen(false); }}
          isMobile={false}
        />
      </aside>

      {/* Mobile : plein écran fixed */}
      <div className="md:hidden fixed inset-0 z-40 bg-neutral-white flex flex-col">
        <PanelContent
          currentDocument={currentDocument}
          displayedContent={displayedContent}
          fileReady={fileReady}
          hasVersions={hasVersions}
          isViewingHistory={isViewingHistory}
          viewingVersionIndex={viewingVersionIndex}
          versionsOpen={versionsOpen}
          versionsRef={versionsRef}
          copied={copied}
          onClose={closeDocument}
          onCopy={handleCopy}
          onDownload={handleDownload}
          onToggleVersions={() => setVersionsOpen((o) => !o)}
          onGoToVersion={(i) => { goToVersion(i); setVersionsOpen(false); }}
          isMobile={true}
        />
      </div>
    </>
  );
}

// ── PanelContent (partagé desktop/mobile) ─────────────────────────────────────

interface PanelContentProps {
  currentDocument: ReturnType<typeof useDocStore.getState>["currentDocument"] & object;
  displayedContent: string;
  fileReady: ReturnType<typeof useDocStore.getState>["fileReady"];
  hasVersions: boolean;
  isViewingHistory: boolean;
  viewingVersionIndex: number | null;
  versionsOpen: boolean;
  versionsRef: React.RefObject<HTMLDivElement>;
  copied: boolean;
  onClose: () => void;
  onCopy: () => void;
  onDownload: () => void;
  onToggleVersions: () => void;
  onGoToVersion: (i: number) => void;
  isMobile: boolean;
}

function PanelContent({
  currentDocument,
  displayedContent,
  fileReady,
  hasVersions,
  isViewingHistory,
  viewingVersionIndex,
  versionsOpen,
  versionsRef,
  copied,
  onClose,
  onCopy,
  onDownload,
  onToggleVersions,
  onGoToVersion,
  isMobile,
}: PanelContentProps) {
  return (
    <>
      {/* En-tête */}
      <div className="flex items-center justify-between px-4 h-12 border-b border-neutral-border flex-shrink-0">
        {isMobile ? (
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-uism font-body text-neutral-text-secondary hover:text-marine transition-colors duration-100"
          >
            <IconArrowLeft size={16} />
            Retour au chat
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-uism font-body font-medium text-marine">Document</span>
            {isViewingHistory && (
              <span className="text-[10px] font-body px-1.5 py-0.5 rounded-sm bg-warning/10 text-warning">
                Version {(viewingVersionIndex ?? 0) + 1}
              </span>
            )}
          </div>
        )}
        {!isMobile && (
          <button
            onClick={onClose}
            className="text-neutral-text-tertiary hover:text-marine transition-colors duration-100"
            aria-label="Fermer le panneau"
          >
            <IconX size={18} />
          </button>
        )}
      </div>

      {/* Corps — scrollable */}
      <div className="flex-1 overflow-y-auto">
        {/* Bannière fichier prêt */}
        {fileReady && currentDocument.format !== "file" && (
          <div className="mx-4 mt-4 px-3 py-2 rounded-md bg-blue-50 border border-blue-100 flex items-center gap-3">
            <IconFile size={16} className="text-blue-700 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-body font-medium text-marine truncate">{fileReady.name}</p>
              <p className="text-[11px] font-body text-neutral-text-tertiary">{formatBytes(fileReady.size)}</p>
            </div>
          </div>
        )}

        <DocumentBody content={displayedContent} format={currentDocument.format} />
      </div>

      {/* Barre d'actions */}
      <div className="flex-shrink-0 border-t border-neutral-border px-3 py-2 flex items-center gap-2">
        {/* Copier */}
        <button
          onClick={onCopy}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-uism font-body border transition-colors duration-100 ${
            copied
              ? "border-success/30 bg-success/5 text-success"
              : "border-neutral-border text-neutral-text-secondary hover:bg-neutral-bg hover:text-marine"
          }`}
        >
          {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
          {copied ? "Copié" : "Copier"}
        </button>

        {/* Télécharger */}
        <button
          onClick={onDownload}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-uism font-body border border-neutral-border text-neutral-text-secondary hover:bg-neutral-bg hover:text-marine transition-colors duration-100"
        >
          <IconDownload size={14} />
          Télécharger
        </button>

        {/* Versions */}
        {hasVersions && (
          <div ref={versionsRef} className="relative ml-auto">
            <button
              onClick={onToggleVersions}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-uism font-body border border-neutral-border text-neutral-text-secondary hover:bg-neutral-bg hover:text-marine transition-colors duration-100"
            >
              <IconHistory size={14} />
              Versions
              <IconChevronDown
                size={12}
                className={`transition-transform duration-200 ${versionsOpen ? "rotate-180" : ""}`}
              />
            </button>

            {versionsOpen && (
              <div className="absolute bottom-full right-0 mb-1 w-52 bg-neutral-white border border-neutral-border rounded-md shadow-lg overflow-hidden z-10">
                {/* Versions précédentes */}
                {currentDocument.versions.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => onGoToVersion(i)}
                    className={`w-full text-left px-3 py-2 text-uism font-body transition-colors duration-100 ${
                      viewingVersionIndex === i
                        ? "bg-blue-50 text-blue-700"
                        : "text-marine hover:bg-neutral-bg"
                    }`}
                  >
                    Version {i + 1}
                  </button>
                ))}
                {/* Version courante */}
                <button
                  onClick={() => onGoToVersion(currentDocument.versions.length)}
                  className={`w-full text-left px-3 py-2 text-uism font-body transition-colors duration-100 border-t border-neutral-border ${
                    viewingVersionIndex === null
                      ? "bg-blue-50 text-blue-700"
                      : "text-marine hover:bg-neutral-bg"
                  }`}
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
}
