"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useChatStore } from "@/store/chatStore";
import LLMSelector from "@/components/chat/LLMSelector";
import ChatWindow from "@/components/chat/ChatWindow";
import ChatInput from "@/components/chat/ChatInput";

export default function ConversationPage() {
  const { id } = useParams<{ id: string }>();
  const loadConversation = useChatStore((s) => s.loadConversation);
  const currentConversationId = useChatStore((s) => s.currentConversationId);

  useEffect(() => {
    if (currentConversationId !== id) {
      loadConversation(id);
    }
  }, [id, currentConversationId, loadConversation]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <LLMSelector />
      <ChatWindow />
      <ChatInput />
    </div>
  );
}
