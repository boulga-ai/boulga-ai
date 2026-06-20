import LLMSelector from "@/components/chat/LLMSelector";
import ChatWindow from "@/components/chat/ChatWindow";
import ChatInput from "@/components/chat/ChatInput";
import QuotaBadge from "@/components/chat/QuotaBadge";
import QuotaModal from "@/components/ui/QuotaModal";
import UpgradeModal from "@/components/ui/UpgradeModal";

export default function ChatPage() {
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
