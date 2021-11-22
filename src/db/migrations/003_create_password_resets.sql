-- Migration: Create password_resets table
-- Author: daoninhthai
-- Date: 2021-11-22

CREATE TABLE IF NOT EXISTS password_resets (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token       VARCHAR(255) UNIQUE NOT NULL,
    expires_at  TIMESTAMP WITH TIME ZONE NOT NULL,
    used        BOOLEAN DEFAULT false,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for token lookups
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets (token);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_password_resets_user_id ON password_resets (user_id);
