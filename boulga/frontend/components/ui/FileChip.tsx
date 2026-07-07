import { IconDownload } from "@tabler/icons-react";
import { getFileMeta, formatBytes } from "./FileIcon";

interface FileChipProps {
  name: string;
  size: number;
  mimeType: string;
  variant?: "chip" | "badge";
  onOpen?: () => void;
  onDownload?: () => void;
  className?: string;
}

/** Chip fichier compact (bulle de chat) ou badge de label (en-tête DocumentPanel). */
export default function FileChip({
  name, size, mimeType, variant = "chip", onOpen, onDownload, className = "",
}: FileChipProps) {
  const meta = getFileMeta(mimeType);

  if (variant === "badge") {
    return (
      <span className={`text-[11px] font-body font-medium px-1.5 py-0.5 rounded ${meta.bg} ${meta.color} ${className}`}>
        {meta.label}
      </span>
    );
  }

  return (
    <div className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl border border-neutral-border bg-neutral-white shadow-xs hover:bg-neutral-bg transition-colors ${className}`}>
      <button
        type="button"
        onClick={onOpen}
        className="flex items-center gap-3 flex-1 min-w-0 text-left"
      >
        <div className={`w-9 h-9 rounded-lg ${meta.bg} flex items-center justify-center flex-shrink-0`}>
          <meta.Icon size={18} className={meta.color} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-marine truncate">{name}</p>
          <p className="text-[11px] text-neutral-text-tertiary">
            {meta.label} · {formatBytes(size)}
          </p>
        </div>
      </button>
      {onDownload && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDownload(); }}
          className="flex-shrink-0 p-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
          title="Télécharger"
        >
          <IconDownload size={16} className="text-neutral-text-tertiary" />
        </button>
      )}
    </div>
  );
}
