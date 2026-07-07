import {
  IconFileText, IconFileSpreadsheet, IconPresentationAnalytics,
  IconFileTypePdf, IconFile,
} from "@tabler/icons-react";

export interface FileMeta {
  label: string;
  color: string;
  bg: string;
  Icon: React.ComponentType<{ size?: number | string; className?: string }>;
}

const DEFAULT_META: FileMeta = {
  label: "Fichier",
  color: "text-neutral-600",
  bg: "bg-neutral-50",
  Icon: IconFile,
};

export const MIME_META: Record<string, FileMeta> = {
  "application/pdf": {
    label: "PDF", color: "text-red-700", bg: "bg-red-50", Icon: IconFileTypePdf,
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    label: "Word", color: "text-blue-700", bg: "bg-blue-50", Icon: IconFileText,
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
    label: "Excel", color: "text-green-700", bg: "bg-green-50", Icon: IconFileSpreadsheet,
  },
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": {
    label: "PPT", color: "text-orange-700", bg: "bg-orange-50", Icon: IconPresentationAnalytics,
  },
  "text/csv": {
    label: "CSV", color: "text-green-700", bg: "bg-green-50", Icon: IconFileSpreadsheet,
  },
  "text/plain": {
    label: "TXT", color: "text-neutral-600", bg: "bg-neutral-50", Icon: IconFileText,
  },
};

export function getFileMeta(mimeType: string): FileMeta {
  return MIME_META[mimeType] ?? DEFAULT_META;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / 1048576).toFixed(1)} Mo`;
}
