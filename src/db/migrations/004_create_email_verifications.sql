-- Migration: Create email_verifications table
-- Author: daoninhthai
-- Date: 2022-02-05

CREATE TABLE IF NOT EXISTS email_verifications (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token       VARCHAR(255) UNIQUE NOT NULL,
    expires_at  TIMESTAMP WITH TIME ZONE NOT NULL,
    used        BOOLEAN DEFAULT false,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for token lookups
CREATE INDEX IF NOT EXISTS idx_email_verifications_token ON email_verifications (token);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_email_verifications_user_id ON email_verifications (user_id);
