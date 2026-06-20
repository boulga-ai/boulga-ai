"use client";

import { use, useEffect } from "react";
import { useChatStore } from "@/store/chatStore";
import LLMSelector from "@/components/chat/LLMSelector";
import ChatWindow from "@/components/chat/ChatWindow";
import ChatInput from "@/components/chat/ChatInput";

interface Props {
  params: Promise<{ id: string }>;
}

export default function ConversationPage({ params }: Props) {
  const { id } = use(params);
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
