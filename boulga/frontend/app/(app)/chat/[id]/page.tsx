"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useChatStore } from "@/store/chatStore";
import LLMSelector from "@/components/chat/LLMSelector";
import ChatWindow from "@/components/chat/ChatWindow";
import ChatInput from "@/components/chat/ChatInput";

export default function ConversationPage() {
  // usePathname évite useParams qui appelle use() en interne (bug Next.js 14.2.35)
  const pathname = usePathname();
  const id = pathname.split("/").pop() ?? "";

  const loadConversation = useChatStore((s) => s.loadConversation);
  const currentConversationId = useChatStore((s) => s.currentConversationId);

  useEffect(() => {
    if (id && currentConversationId !== id) {
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
