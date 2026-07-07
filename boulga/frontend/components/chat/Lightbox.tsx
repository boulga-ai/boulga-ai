"use client";

import { useEffect, useState, useCallback } from "react";
import { IconX, IconDownload, IconZoomIn, IconZoomOut, IconMaximize, IconLink } from "@tabler/icons-react";
import { useToast } from "@/components/ui/Toast";

interface LightboxProps {
  src: string;
  alt?: string;
  onClose: () => void;
}

export default function Lightbox({ src, alt, onClose }: LightboxProps) {
  const [zoom, setZoom] = useState(1);
  const { addToast } = useToast();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "+" || e.key === "=") setZoom((z) => Math.min(4, z + 0.25));
      if (e.key === "-") setZoom((z) => Math.max(0.25, z - 0.25));
      if (e.key === "0") setZoom(1);
    };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.stopPropagation();
    setZoom((z) => Math.min(4, Math.max(0.25, z + (e.deltaY < 0 ? 0.15 : -0.15))));
  }, []);

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
        className="flex items-center justify-between px-4 py-2 flex-shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1">
          <button onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}
            className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors" title="Zoom arrière (−)">
            <IconZoomOut size={18} />
          </button>
          <span className="text-white/60 text-[12px] font-body w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((z) => Math.min(4, z + 0.25))}
            className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors" title="Zoom avant (+)">
            <IconZoomIn size={18} />
          </button>
          <button onClick={() => setZoom(1)}
            className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors" title="Réinitialiser (0)">
            <IconMaximize size={18} />
          </button>
        </div>
        <div className="flex items-center gap-1">
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
      </div>

      {/* Image zoomable */}
      <div
        className="flex-1 overflow-auto flex items-start justify-center p-4"
        onClick={(e) => e.stopPropagation()}
        onWheel={handleWheel}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt ?? "Image"}
          style={{ transform: `scale(${zoom})`, transformOrigin: "top center", transition: "transform 0.12s ease" }}
          className="max-w-full rounded-lg shadow-2xl select-none cursor-zoom-in"
          draggable={false}
          onClick={(e) => { e.stopPropagation(); setZoom((z) => (z === 1 ? 2 : 1)); }}
        />
      </div>

      <p className="text-center text-white/30 text-[11px] pb-2 flex-shrink-0 font-body">
        Molette · +/− · Clic pour agrandir · Échap pour fermer
      </p>
    </div>
  );
}
