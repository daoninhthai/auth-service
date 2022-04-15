-- Migration: Create audit_logs table
-- Author: daoninhthai
-- Date: 2022-04-15

CREATE TABLE IF NOT EXISTS audit_logs (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action      VARCHAR(100) NOT NULL,
    resource    VARCHAR(100),
    ip_address  VARCHAR(45),
    user_agent  TEXT,
    metadata    JSONB DEFAULT '{}',
    status      VARCHAR(20) DEFAULT 'success',
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs (user_id);

-- Index for action lookups
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs (action);

-- Index for date range queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at);

-- Index for combined queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action ON audit_logs (user_id, action, created_at);
