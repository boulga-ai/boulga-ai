"use client";

import { useEffect } from "react";
import {
  IconSparkles,
  IconBrandGoogleFilled,
  IconBrandOpenai,
  IconRobot,
} from "@tabler/icons-react";
import { useChatStore } from "@/store/chatStore";

// Icône par provider
function ProviderIcon({ provider }: { provider: string }) {
  const cls = "flex-shrink-0";
  switch (provider) {
    case "gemini":
      return <IconBrandGoogleFilled size={14} className={`${cls} text-blue-500`} />;
    case "openai":
      return <IconBrandOpenai size={14} className={`${cls} text-success`} />;
    case "deepseek":
    case "claude":
    default:
      return <IconRobot size={14} className={`${cls} text-neutral-text-tertiary`} />;
  }
}

// Label lisible du modèle
function modelLabel(provider: string, model: string): string {
  const labels: Record<string, string> = {
    "gemini-2.5-flash":  "Gemini 2.5 Flash",
    "gemini-2.5-pro":    "Gemini 2.5 Pro",
    "claude-haiku-4-5":  "Claude Haiku 4.5",
    "claude-sonnet-4-6": "Claude Sonnet 4.6",
    "gpt-5.5-instant":   "GPT-5.5 Instant",
    "gpt-5.5-pro":       "GPT-5.5 Pro",
    "deepseek-v4-flash": "DeepSeek V4 Flash",
    "deepseek-v4-pro":   "DeepSeek V4 Pro",
  };
  return labels[model] ?? `${provider} / ${model}`;
}

export default function RoutingIndicator() {
  const routingInfo   = useChatStore((s) => s.routingInfo);
  const isStreaming   = useChatStore((s) => s.isStreaming);
  const clearRouting  = useChatStore((s) => s.clearRoutingInfo);

  // Disparaît automatiquement 3 s après la fin du streaming
  useEffect(() => {
    if (!routingInfo || isStreaming) return;
    const timer = setTimeout(clearRouting, 3000);
    return () => clearTimeout(timer);
  }, [routingInfo, isStreaming, clearRouting]);

  if (!routingInfo) return null;

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 mb-2 mx-auto max-w-fit
                 rounded-full border border-neutral-border bg-neutral-white
                 text-caption font-body text-neutral-text-secondary
                 shadow-sm animate-fade-in cursor-pointer select-none"
      onClick={clearRouting}
      title="Cliquer pour fermer"
    >
      <IconSparkles size={13} className="text-blue-700 flex-shrink-0" />
      <span>Boulga a choisi</span>
      <ProviderIcon provider={routingInfo.provider} />
      <span className="font-medium text-marine">
        {modelLabel(routingInfo.provider, routingInfo.model)}
      </span>
      {routingInfo.reason && (
        <>
          <span className="text-neutral-text-tertiary">—</span>
          <span className="text-neutral-text-tertiary">{routingInfo.reason}</span>
        </>
      )}
    </div>
  );
}
