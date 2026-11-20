-- Table for password-reset OTPs sent by email.
-- Idempotent: safe to run multiple times.

CREATE TABLE IF NOT EXISTS password_resets (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    otp_hash VARCHAR(255) NOT NULL,
    attempts INT NOT NULL DEFAULT 0,
    expires_at TIMESTAMPTZ NOT NULL,
    verified_at TIMESTAMPTZ,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_resets_user_created
ON password_resets(user_id, created_at DESC);

-- Clean up a column from an earlier (SMS-capable) draft of this table.
ALTER TABLE password_resets DROP COLUMN IF EXISTS channel;
