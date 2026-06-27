"use client";

import { useEffect, useRef } from "react";
import { useChatStore } from "@/store/chatStore";
import MessageBubble from "./MessageBubble";
import RoutingIndicator from "./RoutingIndicator";
import { IconSparkles } from "@tabler/icons-react";

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 select-none">
      <div
        className="w-12 h-12 rounded-lg flex items-center justify-center"
        style={{ background: "#E3F2FD" }}
      >
        <IconSparkles size={24} className="text-blue-700" />
      </div>
      <div className="text-center">
        <p className="text-[18px] font-body font-medium text-marine">
          Que puis-je faire pour vous ?
        </p>
        <p className="text-[13px] text-neutral-text-tertiary mt-1">
          Posez une question, décrivez une tâche ou partagez un fichier.
        </p>
      </div>
    </div>
  );
}

export default function ChatWindow() {
  const messages = useChatStore((s) => s.messages);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const streamingText = useChatStore((s) => s.streamingText);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [streamingText, messages.length]);

  if (messages.length === 0 && !isStreaming) {
    return (
      <div className="flex-1 h-full">
        <EmptyState />
      </div>
    );
  }

  const streamingMessageIndex = isStreaming
    ? messages.findLastIndex((m) => m.role === "assistant" && m.content === "")
    : -1;

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
      <div className="max-w-3xl mx-auto">
        <RoutingIndicator />
        {messages.map((message, index) => {
          const isThisStreaming = index === streamingMessageIndex;
          return (
            <MessageBubble
              key={message.id}
              message={message}
              isStreaming={isThisStreaming}
              streamingText={isThisStreaming ? streamingText : undefined}
            />
          );
        })}

        <div ref={bottomRef} className="h-1" />
      </div>
    </div>
  );
}
