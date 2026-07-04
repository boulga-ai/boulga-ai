"use client";

import { useState } from "react";
import {
  IconFileSearch,
  IconTerminal2,
  IconFileTypeDoc,
  IconFileTypePdf,
  IconFileSpreadsheet,
  IconPresentation,
  IconFile,
} from "@tabler/icons-react";
import type { AgentStep } from "@/types";
import CodeBlock from "./CodeBlock";

// ── Icône par type d'outil ─────────────────────────────────────────────────────

function StepIcon({ step }: { step: AgentStep }) {
  const cls = "flex-shrink-0 mt-[1px]";
  const color = step.status === "error" ? "#C62828" : "#B0BAC9";
  const size = 13;

  if (step.tool === "read_skill") {
    return <IconFileSearch size={size} className={cls} style={{ color }} />;
  }

  if (step.tool === "generate_file") {
    const filename = (step.detail?.filename as string | undefined) ?? "";
    const desc = (step.args?.description as string | undefined) ?? "";
    const hint = (filename + desc).toLowerCase();
    if (hint.includes(".pdf")) return <IconFileTypePdf size={size} className={cls} style={{ color }} />;
    if (hint.includes(".doc") || hint.includes("word")) return <IconFileTypeDoc size={size} className={cls} style={{ color }} />;
    if (hint.includes(".xls") || hint.includes("excel")) return <IconFileSpreadsheet size={size} className={cls} style={{ color }} />;
    if (hint.includes(".ppt") || hint.includes("présentation") || hint.includes("presentation")) return <IconPresentation size={size} className={cls} style={{ color }} />;
    return <IconTerminal2 size={size} className={cls} style={{ color }} />;
  }

  return <IconFile size={size} className={cls} style={{ color }} />;
}

// ── Label contextuel ───────────────────────────────────────────────────────────

function getLabel(step: AgentStep): string {
  const desc = step.args?.description as string | undefined;
  if (desc?.trim()) return desc.trim();

  if (step.tool === "read_skill") {
    return step.status === "running" ? "Lecture du skill…" : "Skill chargé";
  }
  if (step.tool === "generate_file") {
    if (step.status === "running") return "Génération en cours…";
    if (step.status === "done") return "Fichier prêt";
    return "Nouvelle tentative…";
  }
  return step.status === "running" ? "En cours…" : "Terminé";
}

// ── Ligne d'étape ─────────────────────────────────────────────────────────────

function AgentStepRow({ step }: { step: AgentStep }) {
  const [expanded, setExpanded] = useState(false);

  const code = step.args?.code as string | undefined;
  const output = step.detail?.output;
  const error = step.detail?.error;
  const filename = step.detail?.filename;
  const hasDetail = !!(code || output || error || filename);
  const label = getLabel(step);

  const isRead = step.tool === "read_skill";

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => hasDetail && setExpanded((e) => !e)}
        className={`flex items-start gap-1.5 text-left w-full ${hasDetail && !isRead ? "cursor-pointer" : "cursor-default"}`}
      >
        <StepIcon step={step} />
        <span
          className="text-[12px] font-body leading-snug"
          style={{ color: isRead ? "#C0C9D5" : "#94A3B8" }}
        >
          {label}
          {hasDetail && !isRead && (
            <span className="ml-1 text-[11px]" style={{ color: "#CBD5E1" }}>
              {expanded ? "▲" : "▶"}
            </span>
          )}
        </span>
        {step.status === "running" && (
          <span
            className="inline-block w-1 h-1 rounded-full flex-shrink-0 mt-[5px] ml-0.5 animate-pulse"
            style={{ background: "#94A3B8" }}
          />
        )}
      </button>

      {expanded && hasDetail && !isRead && (
        <div className="ml-4 mt-1 space-y-2">
          {code && <CodeBlock language="python" code={code} />}
          {filename && (
            <p className="text-[11px] font-body" style={{ color: "#94A3B8" }}>
              {filename}
            </p>
          )}
          {output?.trim() && (
            <pre
              className="text-[11px] font-mono whitespace-pre-wrap break-words leading-relaxed p-2 rounded"
              style={{ color: "#94A3B8", background: "#F5F7FA" }}
            >
              {output.trim()}
            </pre>
          )}
          {error && (
            <pre
              className="text-[11px] font-mono whitespace-pre-wrap break-words leading-relaxed p-2 rounded"
              style={{ color: "#C62828", background: "#FFF5F5" }}
            >
              {error}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function AgentSteps({ steps }: { steps: AgentStep[] }) {
  // Les étapes generate_image ne s'affichent pas ici (remplacées par le skeleton dans MessageBubble)
  const visibleSteps = steps.filter((s) => s.tool !== "generate_image");
  if (visibleSteps.length === 0) return null;

  return (
    <div className="mt-2 space-y-1.5">
      {visibleSteps.map((step, i) => (
        <AgentStepRow key={`${step.tool}-${i}`} step={step} />
      ))}
    </div>
  );
}
