// boulga/frontend/lib/errorCodes.ts
// Miroir frontend de boulga/backend/app/core/stream_errors.py — garder synchronisé.
// Codes d'erreur typés émis dans le flux SSE de chat. Le store branche sur `code`
// (avec repli sur `message` pour la rétrocompat avec un ancien backend).

export const StreamErrorCode = {
  QuotaExceeded: "quota_exceeded",
  ModelAccessDenied: "model_access_denied",
  FileQuotaExceeded: "file_quota_exceeded",
  ConversationNotFound: "conversation_not_found",
  LlmError: "llm_error",
} as const;

export type StreamErrorCode =
  (typeof StreamErrorCode)[keyof typeof StreamErrorCode];
