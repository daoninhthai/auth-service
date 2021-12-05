-- Migration: Create oauth_providers table
-- Author: daoninhthai
-- Date: 2021-12-05

CREATE TABLE IF NOT EXISTS oauth_providers (
    id            SERIAL PRIMARY KEY,
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider      VARCHAR(50) NOT NULL,
    provider_id   VARCHAR(255) NOT NULL,
    access_token  TEXT,
    profile_data  JSONB,
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider, provider_id)
);

-- Index for provider lookups
CREATE INDEX IF NOT EXISTS idx_oauth_providers_provider ON oauth_providers (provider, provider_id);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_oauth_providers_user_id ON oauth_providers (user_id);
