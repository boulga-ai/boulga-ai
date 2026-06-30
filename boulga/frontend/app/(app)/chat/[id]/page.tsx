"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useChatStore } from "@/store/chatStore";
import LLMSelector from "@/components/chat/LLMSelector";
import ChatWindow from "@/components/chat/ChatWindow";
import ChatInput from "@/components/chat/ChatInput";

export default function ConversationPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";

  const loadConversation = useChatStore((s) => s.loadConversation);

  // Ne pas inclure currentConversationId dans les deps :
  // l'effet doit se déclencher uniquement quand l'URL change (id change),
  // pas quand l'utilisateur clique "Nouvelle conversation" (qui met currentConversationId=null)
  // ce qui déclenchait un rechargement parasite et re-remplissait le store avec l'ancien chat.
  //
  // Lire currentConversationId via getState() (pas useChatStore(s => ...)) pour ne pas
  // re-déclencher l'effet à chaque changement de store. Si le store a déjà cet id comme
  // conversation active (ex: on vient de l'y amener depuis /chat après le 1er message en
  // cours de streaming), on NE recharge PAS : loadConversation() abort le stream en cours
  // (même AbortController) et écrase messages avec l'état DB encore incomplet.
  useEffect(() => {
    if (id && useChatStore.getState().currentConversationId !== id) {
      loadConversation(id);
    }
  }, [id, loadConversation]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <LLMSelector />
      <ChatWindow />
      <ChatInput />
    </div>
  );
}
