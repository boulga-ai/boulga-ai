"use client";

import { useEffect, useState } from "react";
import { IconFileText, IconDownload, IconFile, IconAlertCircle } from "@tabler/icons-react";
import { getUserFiles, downloadFile } from "@/lib/api";
import type { File as UserFile } from "@/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / 1048576).toFixed(1)} Mo`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function mimeToLabel(mime: string): string {
  const map: Record<string, string> = {
    "application/pdf": "PDF",
    "text/csv": "CSV",
    "text/plain": "TXT",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
    "image/png": "PNG",
    "image/jpeg": "JPG",
    "image/gif": "GIF",
    "image/webp": "WEBP",
  };
  return map[mime] ?? mime.split("/").pop()?.toUpperCase() ?? "—";
}

const TYPE_COLORS: Record<string, string> = {
  PDF: "bg-red-50 text-red-700",
  CSV: "bg-green-50 text-green-700",
  TXT: "bg-neutral-bg text-neutral-text-secondary",
  DOCX: "bg-blue-50 text-blue-700",
  XLSX: "bg-emerald-50 text-emerald-700",
  PNG: "bg-purple-50 text-purple-700",
  JPG: "bg-purple-50 text-purple-700",
};

// ── Composant ─────────────────────────────────────────────────────────────────

export default function DocumentsPage() {
  const [files, setFiles] = useState<UserFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getUserFiles()
      .then(setFiles)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleDownload = async (file: UserFile) => {
    try {
      const blob = await downloadFile(file.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.original_name;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silencieux — le navigateur affichera une erreur réseau si nécessaire
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-neutral-bg">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* En-tête */}
        <div className="mb-6">
          <h1 className="text-h1 font-display text-marine mb-1">Documents</h1>
          <p className="text-body text-neutral-text-secondary">
            Vos fichiers générés et uploadés
          </p>
        </div>

        {/* États */}
        {loading ? (
          <div className="bg-neutral-white border border-neutral-border rounded-lg p-8">
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 rounded-md bg-neutral-bg animate-pulse" />
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="bg-neutral-white border border-neutral-border rounded-lg py-12 flex flex-col items-center gap-3 text-center px-6">
            <IconAlertCircle size={32} className="text-error" />
            <p className="text-body text-neutral-text-secondary">{error}</p>
          </div>
        ) : files.length === 0 ? (
          <div className="bg-neutral-white border border-neutral-border rounded-lg py-20 flex flex-col items-center justify-center text-center px-6">
            <div className="w-16 h-16 rounded-full bg-neutral-bg flex items-center justify-center mb-4">
              <IconFileText size={32} className="text-neutral-text-tertiary" />
            </div>
            <p className="text-h2 font-body font-medium text-marine mb-2">
              Aucun document pour l'instant
            </p>
            <p className="text-body text-neutral-text-secondary max-w-sm">
              Vos fichiers générés et uploadés apparaîtront ici.
            </p>
          </div>
        ) : (
          <div className="bg-neutral-white border border-neutral-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-border bg-neutral-bg">
                  <th className="text-left px-4 py-3 text-ui font-body font-medium text-neutral-text-secondary">
                    Nom
                  </th>
                  <th className="text-left px-4 py-3 text-ui font-body font-medium text-neutral-text-secondary hidden sm:table-cell">
                    Type
                  </th>
                  <th className="text-left px-4 py-3 text-ui font-body font-medium text-neutral-text-secondary hidden md:table-cell">
                    Date
                  </th>
                  <th className="text-left px-4 py-3 text-ui font-body font-medium text-neutral-text-secondary hidden md:table-cell">
                    Taille
                  </th>
                  <th className="px-4 py-3 w-12" />
                </tr>
              </thead>
              <tbody>
                {files.map((file) => {
                  const typeLabel = mimeToLabel(file.mime_type);
                  const colorClass = TYPE_COLORS[typeLabel] ?? "bg-neutral-bg text-neutral-text-secondary";
                  return (
                    <tr
                      key={file.id}
                      className="border-b border-neutral-border last:border-0 hover:bg-neutral-bg transition-colors duration-100"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <IconFile size={20} className="text-blue-700 flex-shrink-0" />
                          <span className="text-ui font-body text-marine truncate max-w-[180px] sm:max-w-xs">
                            {file.original_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className={`text-[10px] font-body font-medium px-1.5 py-0.5 rounded-sm ${colorClass}`}>
                          {typeLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-ui font-body text-neutral-text-secondary">
                          {formatDate(file.created_at)}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-ui font-body text-neutral-text-secondary">
                          {formatBytes(file.size_bytes)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDownload(file)}
                          className="text-neutral-text-tertiary hover:text-blue-700 transition-colors duration-100"
                          title="Télécharger"
                          aria-label={`Télécharger ${file.original_name}`}
                        >
                          <IconDownload size={20} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
