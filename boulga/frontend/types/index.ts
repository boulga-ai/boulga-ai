// ============================================================
// Enums / Union types
// ============================================================

export type Tier = "free" | "goutte" | "source" | "fleuve" | "ocean";

export type BillingCycle = "monthly" | "annual";

export type MessageRole = "user" | "assistant" | "system";

export type Provider = "gemini" | "claude" | "chatgpt" | "deepseek";

// ============================================================
// LLM & Models
// ============================================================

export interface Model {
  id: string;
  label: string;
  tier: "low" | "high";
  active: boolean;
}

export interface LLM {
  provider: Provider;
  label: string;
  description: string;
  models: Model[];
  active: boolean;
}

// ============================================================
// User
// ============================================================

export interface User {
  id: string;
  email: string;
  name: string;
  date_of_birth?: string;
  email_verified: boolean;
  locale: string;
  referral_code: string;
  created_at: string;
  is_admin?: boolean;
}

// ============================================================
// Subscription
// ============================================================

export interface Subscription {
  id: string;
  user_id: string;
  tier: Tier;
  billing_cycle: BillingCycle | null;
  status: "active" | "expired" | "cancelled";
  started_at: string;
  expires_at: string | null;
  created_at: string;
}

// ============================================================
// Quota
// ============================================================

export interface QuotaInfo {
  messages_remaining: number;
  files_remaining: number;
  tokens_remaining: number;
  period_end: string;
}

// ============================================================
// Conversation & Message
// ============================================================

export interface Conversation {
  id: string;
  user_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  provider?: Provider;
  model_id?: string;
  file_ids: string[];
  created_at: string;
  fileReady?: {
    url: string;
    name: string;
    size: number;
    mimeType?: string;
  };
}

// ============================================================
// File
// ============================================================

export interface File {
  id: string;
  user_id: string;
  original_name: string;
  mime_type: string;
  storage_path: string;
  size_bytes: number;
  created_at: string;
}

// ============================================================
// Comparison
// ============================================================

export interface ComparisonResult {
  id: string;
  session_id: string;
  provider: Provider;
  model_id: string;
  content: string;
  tokens_used: number | null;
  latency_ms: number | null;
  created_at: string;
}

export interface ComparisonSession {
  id: string;
  user_id: string;
  prompt: string;
  created_at: string;
  results?: ComparisonResult[];
}

// ============================================================
// Agents
// ============================================================

export interface Agent {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  category: string | null;
  active: boolean;
  created_at: string;
}

export interface UserAgent {
  id: string;
  user_id: string;
  agent_id: string;
  assigned_at: string;
  agents?: Agent;
}

// ============================================================
// Team (offre Océan)
// ============================================================

export interface TeamMember {
  id: string;
  owner_user_id: string;
  member_user_id: string;
  role: "admin" | "member";
  invited_at: string;
  joined_at: string | null;
  users?: Pick<User, "id" | "name" | "email">;
}

// ============================================================
// Referral
// ============================================================

export interface ReferralHistoryItem {
  id: string;
  referred_name: string;
  status: "pending" | "completed" | "cancelled";
  reward_due_at: string | null;
  reward_granted_at: string | null;
  created_at: string;
}

export interface ReferralStats {
  referral_link: string;
  total_referrals: number;
  completed_count: number;
  pending_count: number;
  history: ReferralHistoryItem[];
}

// ============================================================
// File upload (retour de l'API)
// ============================================================

export interface FileInfo {
  id: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
}

// ============================================================
// Conversation avec messages (GET /api/conversations/{id})
// ============================================================

export interface ConversationDetail extends Conversation {
  messages: Message[];
}

// ============================================================
// WhatsApp
// ============================================================

export interface WhatsAppSession {
  id: string;
  user_id: string;
  phone_number: string;
  verified: boolean;
  last_activity: string | null;
  created_at: string;
}
