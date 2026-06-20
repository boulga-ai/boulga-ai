-- Boulga — Schéma PostgreSQL complet
-- À exécuter dans Supabase SQL Editor

-- Extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLE users
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email            VARCHAR(255) UNIQUE NOT NULL,
    name             VARCHAR(255) NOT NULL,
    date_of_birth    DATE,
    password_hash    VARCHAR(255) NOT NULL,
    email_verified   BOOLEAN NOT NULL DEFAULT FALSE,
    locale           VARCHAR(10) NOT NULL DEFAULT 'fr',
    referral_code    VARCHAR(12) UNIQUE NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE conversations
-- ============================================================
CREATE TABLE IF NOT EXISTS conversations (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       VARCHAR(500),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations (user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations (updated_at DESC);

-- ============================================================
-- TABLE messages
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id  UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role             VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content          TEXT NOT NULL,
    provider         VARCHAR(50),
    model_id         VARCHAR(100),
    file_ids         JSONB NOT NULL DEFAULT '[]',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages (conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages (created_at);

-- ============================================================
-- TABLE files
-- ============================================================
CREATE TABLE IF NOT EXISTS files (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    original_name  VARCHAR(500) NOT NULL,
    mime_type      VARCHAR(100) NOT NULL,
    storage_path   VARCHAR(1000) NOT NULL,
    size_bytes     BIGINT NOT NULL DEFAULT 0,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_files_user_id ON files (user_id);

-- ============================================================
-- TABLE subscriptions
-- ============================================================
CREATE TABLE IF NOT EXISTS subscriptions (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tier           VARCHAR(20) NOT NULL CHECK (tier IN ('free', 'goutte', 'source', 'fleuve', 'ocean')),
    billing_cycle  VARCHAR(10) CHECK (billing_cycle IN ('monthly', 'annual')),
    status         VARCHAR(20) NOT NULL CHECK (status IN ('active', 'expired', 'cancelled')),
    started_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at     TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions (status);

-- ============================================================
-- TABLE usage_quotas
-- ============================================================
CREATE TABLE IF NOT EXISTS usage_quotas (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    period_start      TIMESTAMPTZ NOT NULL,
    period_end        TIMESTAMPTZ NOT NULL,
    messages_used     INT NOT NULL DEFAULT 0,
    files_generated   INT NOT NULL DEFAULT 0,
    tokens_used       BIGINT NOT NULL DEFAULT 0,
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_usage_quotas_user_period
    ON usage_quotas (user_id, period_start);

-- ============================================================
-- TABLE payments
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider       VARCHAR(20) NOT NULL CHECK (provider IN ('cinetpay', 'stripe')),
    amount_fcfa    INT NOT NULL,
    billing_cycle  VARCHAR(10) NOT NULL CHECK (billing_cycle IN ('monthly', 'annual')),
    status         VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'success', 'failed')),
    external_ref   VARCHAR(500) UNIQUE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments (user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments (status);

-- ============================================================
-- TABLE feedback
-- ============================================================
CREATE TABLE IF NOT EXISTS feedback (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message_id  UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    rating      VARCHAR(4) NOT NULL CHECK (rating IN ('up', 'down')),
    comment     TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_feedback_user_message
    ON feedback (user_id, message_id);

-- ============================================================
-- TABLE tool_prompts
-- ============================================================
CREATE TABLE IF NOT EXISTS tool_prompts (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug           VARCHAR(100) UNIQUE NOT NULL,
    name           VARCHAR(255) NOT NULL,
    system_prompt  TEXT NOT NULL,
    template_id    VARCHAR(100),
    active         BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE agents
-- ============================================================
CREATE TABLE IF NOT EXISTS agents (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug           VARCHAR(100) UNIQUE NOT NULL,
    name           VARCHAR(255) NOT NULL,
    description    TEXT,
    system_prompt  TEXT NOT NULL,
    icon           VARCHAR(100),
    category       VARCHAR(100),
    active         BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE user_agents
-- ============================================================
CREATE TABLE IF NOT EXISTS user_agents (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_id     UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    assigned_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, agent_id)
);

-- ============================================================
-- TABLE comparison_sessions
-- ============================================================
CREATE TABLE IF NOT EXISTS comparison_sessions (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    prompt      TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comparison_sessions_user_id ON comparison_sessions (user_id);

-- ============================================================
-- TABLE comparison_results
-- ============================================================
CREATE TABLE IF NOT EXISTS comparison_results (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id   UUID NOT NULL REFERENCES comparison_sessions(id) ON DELETE CASCADE,
    provider     VARCHAR(50) NOT NULL,
    model_id     VARCHAR(100) NOT NULL,
    content      TEXT NOT NULL,
    tokens_used  INT,
    latency_ms   INT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comparison_results_session_id ON comparison_results (session_id);

-- ============================================================
-- TABLE whatsapp_sessions
-- ============================================================
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    phone_number   VARCHAR(20) UNIQUE NOT NULL,
    verified       BOOLEAN NOT NULL DEFAULT FALSE,
    last_activity  TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE team_members  (offre Océan — 10 sièges)
-- ============================================================
CREATE TABLE IF NOT EXISTS team_members (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    member_user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role            VARCHAR(10) NOT NULL CHECK (role IN ('admin', 'member')),
    invited_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    joined_at       TIMESTAMPTZ,
    UNIQUE (owner_user_id, member_user_id)
);

-- ============================================================
-- TABLE referrals
-- ============================================================
CREATE TABLE IF NOT EXISTS referrals (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referred_id         UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status              VARCHAR(20) NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'completed', 'cancelled')),
    reward_tier         VARCHAR(20) CHECK (reward_tier IN ('goutte', 'source', 'fleuve', 'ocean')),
    reward_days         INT,
    reward_due_at       TIMESTAMPTZ,
    reward_granted_at   TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals (referrer_id);

-- ============================================================
-- TRIGGER — mise à jour de conversations.updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_conversation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations
    SET updated_at = NOW()
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_messages_update_conversation ON messages;
CREATE TRIGGER trg_messages_update_conversation
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_updated_at();
