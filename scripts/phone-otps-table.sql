-- ============================================
-- PHONE OTP TABLE (WhatsApp OTP verification)
-- Run this in Supabase SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS phone_otps (
  id SERIAL PRIMARY KEY,
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT DEFAULT '',
  verified BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE phone_otps ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (requesting OTP)
CREATE POLICY "otp_insert" ON phone_otps FOR INSERT WITH CHECK (true);

-- Anyone can read (verifying OTP)
CREATE POLICY "otp_select" ON phone_otps FOR SELECT USING (true);

-- Anyone can update (marking as verified)
CREATE POLICY "otp_update" ON phone_otps FOR UPDATE USING (true);

-- Anyone can delete (cleanup)
CREATE POLICY "otp_delete" ON phone_otps FOR DELETE USING (true);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_phone_otps_phone ON phone_otps(phone);
CREATE INDEX IF NOT EXISTS idx_phone_otps_expires ON phone_otps(expires_at);

-- Auto-cleanup: delete expired OTPs older than 1 hour
-- (Run this periodically or it'll be handled by the app)
