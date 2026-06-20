import { API_URL } from "@/lib/constants";
import { getStoredToken } from "@/store/authStore";
import type {
  LLM,
  Conversation,
  ConversationDetail,
  FileInfo,
  File as UserFile,
  Agent,
  UserAgent,
  ReferralStats,
  ReferralHistoryItem,
} from "@/types";

export type { ReferralStats, ReferralHistoryItem };

// ── Helpers ──────────────────────────────────────────────────────────────────

function authHeader(): Record<string, string> {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function jsonHeaders(): HeadersInit {
  return { "Content-Type": "application/json", ...authHeader() };
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `Erreur ${res.status}`;
    try {
      const body = await res.json();
      message = body?.detail ?? body?.message ?? message;
    } catch {
      // réponse non-JSON
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

// ── Endpoints ─────────────────────────────────────────────────────────────────

export async function getLLMs(): Promise<LLM[]> {
  const res = await fetch(`${API_URL}/api/llms`);
  return handleResponse<LLM[]>(res);
}

export async function getConversations(): Promise<Conversation[]> {
  const res = await fetch(`${API_URL}/api/conversations`, {
    headers: authHeader(),
  });
  return handleResponse<Conversation[]>(res);
}

export async function getConversation(id: string): Promise<ConversationDetail> {
  const res = await fetch(`${API_URL}/api/conversations/${id}`, {
    headers: authHeader(),
  });
  return handleResponse<ConversationDetail>(res);
}

export async function deleteConversation(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/conversations/${id}`, {
    method: "DELETE",
    headers: authHeader(),
  });
  if (!res.ok) {
    let message = `Erreur ${res.status}`;
    try {
      const body = await res.json();
      message = body?.detail ?? body?.message ?? message;
    } catch { /* non-JSON */ }
    throw new Error(message);
  }
}

export async function getUserFiles(): Promise<UserFile[]> {
  const res = await fetch(`${API_URL}/api/files`, {
    headers: authHeader(),
  });
  return handleResponse<UserFile[]>(res);
}

export async function uploadFile(file: globalThis.File): Promise<FileInfo> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_URL}/api/files/upload`, {
    method: "POST",
    headers: authHeader(),
    body: form,
  });
  return handleResponse<FileInfo>(res);
}

export async function downloadFile(id: string): Promise<Blob> {
  const res = await fetch(`${API_URL}/api/files/${id}/download`, {
    headers: authHeader(),
  });
  if (!res.ok) throw new Error(`Erreur ${res.status} lors du téléchargement`);
  return res.blob();
}

// ── Abonnements & Quotas ──────────────────────────────────────────────────────

export interface SubscriptionInfo {
  tier: string;
  billing_cycle: string | null;
  status: string;
  expires_at: string | null;
  messages_remaining: number;
  messages_limit: number;
  files_remaining: number;
  tokens_remaining: number;
  period_end: string;
}

export async function getSubscription(): Promise<SubscriptionInfo> {
  const res = await fetch(`${API_URL}/api/subscriptions/me`, {
    headers: authHeader(),
  });
  return handleResponse<SubscriptionInfo>(res);
}

// ── Paiements ─────────────────────────────────────────────────────────────────

export async function initiatePayment(
  tier: string,
  billing_cycle: string,
): Promise<{ payment_url: string }> {
  const res = await fetch(`${API_URL}/api/payments/initiate`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ tier, billing_cycle }),
  });
  return handleResponse<{ payment_url: string }>(res);
}

export async function checkPaymentStatus(
  txn: string,
): Promise<{ status: string; tier?: string; billing_cycle?: string }> {
  const res = await fetch(`${API_URL}/api/payments/status?txn=${encodeURIComponent(txn)}`, {
    headers: authHeader(),
  });
  return handleResponse(res);
}

// ── Agents ────────────────────────────────────────────────────────────────────

export async function getAgents(): Promise<Agent[]> {
  const res = await fetch(`${API_URL}/api/agents`, {
    headers: authHeader(),
  });
  return handleResponse<Agent[]>(res);
}

export async function getMyAgents(): Promise<UserAgent[]> {
  const res = await fetch(`${API_URL}/api/agents/me`, {
    headers: authHeader(),
  });
  return handleResponse<UserAgent[]>(res);
}

export async function assignAgent(agentId: string): Promise<UserAgent> {
  const res = await fetch(`${API_URL}/api/agents/${agentId}/assign`, {
    method: "POST",
    headers: authHeader(),
  });
  return handleResponse<UserAgent>(res);
}

export async function unassignAgent(agentId: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/agents/${agentId}/unassign`, {
    method: "DELETE",
    headers: authHeader(),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.detail ?? `Erreur ${res.status}`);
  }
}

// ── Feedback ──────────────────────────────────────────────────────────────────

export interface FeedbackPayload {
  message_id: string;
  rating: "up" | "down";
  comment?: string;
}

export async function postFeedback(payload: FeedbackPayload): Promise<{ id: string }> {
  const res = await fetch(`${API_URL}/api/feedback`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse<{ id: string }>(res);
}

// ── Recherche ─────────────────────────────────────────────────────────────────

export interface SearchResult {
  conversation_id: string;
  conversation_title: string | null;
  updated_at: string;
  excerpt: string;
}

export async function searchConversations(q: string): Promise<SearchResult[]> {
  const res = await fetch(
    `${API_URL}/api/search?q=${encodeURIComponent(q)}`,
    { headers: authHeader() },
  );
  return handleResponse<SearchResult[]>(res);
}

// ── Parrainage ────────────────────────────────────────────────────────────────

export async function getReferralStats(): Promise<ReferralStats> {
  const res = await fetch(`${API_URL}/api/referrals/stats`, {
    headers: authHeader(),
  });
  return handleResponse<ReferralStats>(res);
}

export async function sendReferralInvite(email: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/referrals/invite`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ email }),
  });
  await handleResponse<{ sent: boolean }>(res);
}
