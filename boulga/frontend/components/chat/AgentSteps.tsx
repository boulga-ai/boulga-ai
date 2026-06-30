"use client";

import { useState } from "react";
import type { AgentStep } from "@/types";
import CodeBlock from "./CodeBlock";

// ── Label : description du LLM en priorité, fallback générique ───────────────

function getLabel(step: AgentStep): string {
  const llmDescription = step.args?.description as string | undefined;
  if (llmDescription?.trim()) return llmDescription.trim();

  const { tool, status } = step;
  if (tool === "read_skill") {
    return status === "running" ? "Je prépare votre fichier…" : "Préparation terminée";
  }
  if (tool === "generate_file") {
    return status === "running" ? "Création en cours…" : status === "done" ? "Votre fichier est prêt" : "Je corrige et réessaie…";
  }
  return status === "running" ? "En cours…" : "Terminé";
}

// ── Icône discrète ────────────────────────────────────────────────────────────

function StepDot({ status }: { status: AgentStep["status"] }) {
  if (status === "running") {
    return (
      <span
        className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 mt-[5px] animate-pulse"
        style={{ background: "#94A3B8" }}
      />
    );
  }
  if (status === "done") {
    return (
      <span
        className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 mt-[5px]"
        style={{ background: "#94A3B8", opacity: 0.5 }}
      />
    );
  }
  return (
    <span
      className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 mt-[5px]"
      style={{ background: "#C62828", opacity: 0.6 }}
    />
  );
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

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => hasDetail && setExpanded((e) => !e)}
        className={`flex items-start gap-2 text-left w-full ${hasDetail ? "cursor-pointer" : "cursor-default"}`}
      >
        <StepDot status={step.status} />
        <span
          className="text-[12px] font-body leading-snug"
          style={{ color: "#94A3B8" }}
        >
          {label}
          {hasDetail && (
            <span className="ml-1 text-[11px]" style={{ color: "#CBD5E1" }}>
              {expanded ? "▲" : "▶"}
            </span>
          )}
        </span>
      </button>

      {expanded && hasDetail && (
        <div className="ml-3.5 mt-1 space-y-2">
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
  if (steps.length === 0) return null;

  return (
    <div className="mt-2 space-y-1">
      {steps.map((step, i) => (
        <AgentStepRow key={`${step.tool}-${i}`} step={step} />
      ))}
    </div>
  );
}
