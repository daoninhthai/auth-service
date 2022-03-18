-- Migration: Add two-factor authentication columns to users table
-- Author: daoninhthai
-- Date: 2022-03-18

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS two_factor_secret VARCHAR(255),
  ADD COLUMN IF NOT EXISTS two_factor_backup_codes TEXT[];

-- Index for 2FA enabled users
CREATE INDEX IF NOT EXISTS idx_users_two_factor ON users (two_factor_enabled) WHERE two_factor_enabled = true;
