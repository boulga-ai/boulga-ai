"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useChatStore } from "@/store/chatStore";
import LLMSelector from "@/components/chat/LLMSelector";
import ChatWindow from "@/components/chat/ChatWindow";
import ChatInput from "@/components/chat/ChatInput";
import QuotaBadge from "@/components/chat/QuotaBadge";
import QuotaModal from "@/components/ui/QuotaModal";
import UpgradeModal from "@/components/ui/UpgradeModal";

export default function ChatPage() {
  const router = useRouter();
  const currentConversationId = useChatStore((s) => s.currentConversationId);
  const prevIdRef = useRef<string | null>(currentConversationId);

  // Naviguer vers /chat/[id] uniquement quand une NOUVELLE conversation est créée
  // (transition null → id). Ignorer les cas où loadConversation remet un id existant.
  useEffect(() => {
    const prev = prevIdRef.current;
    prevIdRef.current = currentConversationId;
    if (currentConversationId && prev === null) {
      router.replace(`/chat/${currentConversationId}`);
    }
  }, [currentConversationId, router]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <LLMSelector />
      <QuotaBadge />
      <ChatWindow />
      <ChatInput />
      <QuotaModal />
      <UpgradeModal />
    </div>
  );
}
