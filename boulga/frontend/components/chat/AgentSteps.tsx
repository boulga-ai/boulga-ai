"use client";

import { useState } from "react";
import {
  IconCheck,
  IconX,
  IconChevronDown,
  IconLoader2,
} from "@tabler/icons-react";
import type { AgentStep } from "@/types";
import CodeBlock from "./CodeBlock";

// ── Labels : description du LLM en priorité, fallback générique ──────────────

function getLabel(step: AgentStep): string {
  const llmDescription = step.args?.description as string | undefined;
  if (llmDescription?.trim()) return llmDescription.trim();

  // Fallback si le modèle n'a pas fourni de description
  const { tool, status } = step;
  if (tool === "read_skill") {
    return status === "running" ? "Je prépare votre fichier…" : status === "done" ? "Préparation terminée" : "Erreur";
  }
  if (tool === "generate_file") {
    return status === "running" ? "Création en cours…" : status === "done" ? "Votre fichier est prêt" : "Je corrige et réessaie…";
  }
  return status === "running" ? "En cours…" : status === "done" ? "Terminé" : "Erreur";
}

// ── Icône de statut ───────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: AgentStep["status"] }) {
  if (status === "running") {
    return (
      <IconLoader2
        size={14}
        className="animate-spin flex-shrink-0"
        style={{ color: "#1565C0" }}
      />
    );
  }
  if (status === "done") {
    return (
      <IconCheck size={14} className="flex-shrink-0" style={{ color: "#2E7D32" }} />
    );
  }
  return (
    <IconX size={14} className="flex-shrink-0" style={{ color: "#C62828" }} />
  );
}

// ── Ligne d'une étape ─────────────────────────────────────────────────────────

function AgentStepRow({ step }: { step: AgentStep }) {
  const [expanded, setExpanded] = useState(false);

  const code = step.args?.code as string | undefined;
  const output = step.detail?.output;
  const error = step.detail?.error;
  const filename = step.detail?.filename;

  const hasDetail = !!(code || output || error || filename);
  const label = getLabel(step);

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ border: "0.5px solid #E0E4EC", background: "#F8F9FB" }}
    >
      <button
        type="button"
        onClick={() => hasDetail && setExpanded((e) => !e)}
        className={`flex items-center gap-2 w-full px-3 py-2 text-left transition-colors ${
          hasDetail ? "hover:bg-neutral-100 cursor-pointer" : "cursor-default"
        }`}
      >
        <StatusIcon status={step.status} />
        <span className="text-[13px] font-body text-marine flex-1 leading-tight">
          {label}
        </span>
        {hasDetail && (
          <IconChevronDown
            size={13}
            className={`flex-shrink-0 text-neutral-400 transition-transform duration-200 ${
              expanded ? "rotate-180" : ""
            }`}
          />
        )}
      </button>

      {expanded && hasDetail && (
        <div
          className="border-t px-3 py-3 space-y-2"
          style={{ borderColor: "#E0E4EC" }}
        >
          {code && (
            <div>
              <p className="text-[11px] font-body text-neutral-400 mb-1">Code exécuté</p>
              <CodeBlock language="python" code={code} />
            </div>
          )}
          {filename && (
            <p className="text-[12px] font-body text-neutral-500">
              Fichier : <span className="font-medium text-marine">{filename}</span>
            </p>
          )}
          {output && output.trim() && (
            <div>
              <p className="text-[11px] font-body text-neutral-400 mb-1">Sortie</p>
              <pre className="text-[11px] font-mono text-neutral-600 whitespace-pre-wrap break-words leading-relaxed bg-white rounded p-2" style={{ border: "0.5px solid #E0E4EC" }}>
                {output.trim()}
              </pre>
            </div>
          )}
          {error && (
            <div>
              <p className="text-[11px] font-body mb-1" style={{ color: "#C62828" }}>Erreur</p>
              <pre className="text-[11px] font-mono whitespace-pre-wrap break-words leading-relaxed bg-white rounded p-2" style={{ color: "#C62828", border: "0.5px solid #FFCDD2" }}>
                {error}
              </pre>
            </div>
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
    <div className="mt-3 space-y-1.5">
      {steps.map((step, i) => (
        <AgentStepRow key={`${step.tool}-${i}`} step={step} />
      ))}
    </div>
  );
}
