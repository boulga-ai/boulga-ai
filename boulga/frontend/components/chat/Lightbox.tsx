"use client";

import { useEffect } from "react";
import { IconX, IconDownload, IconLink } from "@tabler/icons-react";
import { useToast } from "@/components/ui/Toast";

interface LightboxProps {
  src: string;
  alt?: string;
  onClose: () => void;
}

export default function Lightbox({ src, alt, onClose }: LightboxProps) {
  const { addToast } = useToast();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(src);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ext = src.split(".").pop()?.split("?")[0] ?? "png";
      a.download = alt ? `${alt}.${ext}` : `image.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(src, "_blank");
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(src);
      addToast({ type: "success", title: "Lien copié" });
    } catch {
      addToast({ type: "error", title: "Impossible de copier le lien" });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "rgba(0,0,0,0.92)" }}
      onClick={onClose}
    >
      {/* Toolbar */}
      <div
        className="flex items-center justify-end gap-1 px-4 py-2 flex-shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={handleShare}
          className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors" title="Copier le lien">
          <IconLink size={18} />
        </button>
        <button onClick={handleDownload}
          className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors" title="Télécharger">
          <IconDownload size={18} />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors" title="Fermer (Échap)">
          <IconX size={18} />
        </button>
      </div>

      {/* Image */}
      <div
        className="flex-1 flex items-center justify-center p-4 min-h-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt ?? "Image"}
          className="max-w-full max-h-full rounded-lg shadow-2xl select-none"
          draggable={false}
        />
      </div>
    </div>
  );
}
