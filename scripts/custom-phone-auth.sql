-- ============================================
-- CUSTOM PHONE OTP AUTH SYSTEM
-- Replaces Firebase Phone Auth with Supabase RPC
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Allow profiles to exist without auth.users entry
-- (Needed for custom phone OTP users who don't go through Supabase Auth)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_pkey CASCADE;
ALTER TABLE profiles ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE profiles ADD PRIMARY KEY (id);

-- Step 2: Create phone_otps table (if not exists)
CREATE TABLE IF NOT EXISTS phone_otps (
  id SERIAL PRIMARY KEY,
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT DEFAULT '',
  verified BOOLEAN DEFAULT FALSE,
  attempts INT DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add attempts column if table already existed without it
ALTER TABLE phone_otps ADD COLUMN IF NOT EXISTS attempts INT DEFAULT 0;

ALTER TABLE phone_otps ENABLE ROW LEVEL SECURITY;

-- Drop old permissive policies
DROP POLICY IF EXISTS "otp_insert" ON phone_otps;
DROP POLICY IF EXISTS "otp_select" ON phone_otps;
DROP POLICY IF EXISTS "otp_update" ON phone_otps;
DROP POLICY IF EXISTS "otp_delete" ON phone_otps;
DROP POLICY IF EXISTS "no_direct_access" ON phone_otps;

-- No direct client access — only through SECURITY DEFINER functions
CREATE POLICY "no_direct_access" ON phone_otps FOR ALL USING (false);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_phone_otps_phone ON phone_otps(phone);
CREATE INDEX IF NOT EXISTS idx_phone_otps_expires ON phone_otps(expires_at);

-- ============================================
-- RPC: Generate and store OTP
-- Called from client: supabase.rpc('send_phone_otp', { p_phone: '8824266577' })
-- ============================================
CREATE OR REPLACE FUNCTION send_phone_otp(p_phone TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
  v_count INT;
  v_phone TEXT;
BEGIN
  -- Normalize phone number
  v_phone := regexp_replace(p_phone, '[\s\-\(\)]', '', 'g');
  IF v_phone ~ '^\d{10}$' THEN
    v_phone := '+91' || v_phone;
  ELSIF v_phone ~ '^91\d{10}$' THEN
    v_phone := '+' || v_phone;
  ELSIF NOT v_phone ~ '^\+' THEN
    v_phone := '+' || v_phone;
  END IF;

  -- Validate Indian mobile number
  IF NOT v_phone ~ '^\+91[6-9]\d{9}$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Enter a valid 10-digit mobile number.');
  END IF;

  -- Rate limit: max 5 OTPs per phone per hour
  SELECT COUNT(*) INTO v_count
  FROM phone_otps
  WHERE phone = v_phone AND created_at > NOW() - INTERVAL '1 hour';

  IF v_count >= 5 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Too many attempts. Please try again later.');
  END IF;

  -- Generate 6-digit code (100000-999999)
  v_code := LPAD(FLOOR(RANDOM() * 900000 + 100000)::TEXT, 6, '0');

  -- Delete old OTPs for this phone
  DELETE FROM phone_otps WHERE phone = v_phone;

  -- Insert new OTP with 5-minute expiry
  INSERT INTO phone_otps (phone, code, expires_at)
  VALUES (v_phone, v_code, NOW() + INTERVAL '5 minutes');

  RETURN jsonb_build_object('success', true, 'phone', v_phone);
END;
$$;

-- ============================================
-- RPC: Verify OTP and return/create profile
-- Called from client: supabase.rpc('verify_phone_otp', { p_phone: '...', p_code: '123456' })
-- ============================================
CREATE OR REPLACE FUNCTION verify_phone_otp(p_phone TEXT, p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_otp RECORD;
  v_profile RECORD;
  v_phone TEXT;
  v_new_id TEXT;
BEGIN
  -- Normalize phone
  v_phone := regexp_replace(p_phone, '[\s\-\(\)]', '', 'g');
  IF v_phone ~ '^\d{10}$' THEN
    v_phone := '+91' || v_phone;
  ELSIF v_phone ~ '^91\d{10}$' THEN
    v_phone := '+' || v_phone;
  ELSIF NOT v_phone ~ '^\+' THEN
    v_phone := '+' || v_phone;
  END IF;

  -- Find valid OTP (not expired, not verified, max 5 attempts)
  SELECT * INTO v_otp
  FROM phone_otps
  WHERE phone = v_phone
    AND expires_at > NOW()
    AND verified = false
    AND attempts < 5
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No OTP found. Please request a new one.');
  END IF;

  -- Increment attempts
  UPDATE phone_otps SET attempts = attempts + 1 WHERE id = v_otp.id;

  -- Check code
  IF v_otp.code != p_code THEN
    IF v_otp.attempts + 1 >= 5 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Too many wrong attempts. Request a new OTP.');
    END IF;
    RETURN jsonb_build_object('success', false, 'error', 'Incorrect OTP. Please try again.');
  END IF;

  -- Mark as verified and clean up
  UPDATE phone_otps SET verified = true WHERE id = v_otp.id;
  DELETE FROM phone_otps WHERE phone = v_phone AND id != v_otp.id;

  -- Find existing profile by phone
  SELECT * INTO v_profile FROM profiles WHERE phone = v_phone LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'isNew', false,
      'profile', jsonb_build_object(
        'id', v_profile.id,
        'phone', v_profile.phone,
        'name', COALESCE(v_profile.name, ''),
        'email', COALESCE(v_profile.email, '')
      )
    );
  END IF;

  -- Create new profile
  v_new_id := gen_random_uuid()::text;
  INSERT INTO profiles (id, phone, name, email)
  VALUES (v_new_id, v_phone, '', '');

  RETURN jsonb_build_object(
    'success', true,
    'isNew', true,
    'profile', jsonb_build_object(
      'id', v_new_id,
      'phone', v_phone,
      'name', '',
      'email', ''
    )
  );
END;
$$;

-- ============================================
-- DEV HELPER: Get OTP for testing (DELETE IN PRODUCTION!)
-- Called from client: supabase.rpc('get_dev_otp', { p_phone: '...' })
-- ============================================
CREATE OR REPLACE FUNCTION get_dev_otp(p_phone TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
  v_phone TEXT;
BEGIN
  v_phone := regexp_replace(p_phone, '[\s\-\(\)]', '', 'g');
  IF v_phone ~ '^\d{10}$' THEN
    v_phone := '+91' || v_phone;
  ELSIF v_phone ~ '^91\d{10}$' THEN
    v_phone := '+' || v_phone;
  ELSIF NOT v_phone ~ '^\+' THEN
    v_phone := '+' || v_phone;
  END IF;

  SELECT code INTO v_code
  FROM phone_otps
  WHERE phone = v_phone AND verified = false AND expires_at > NOW()
  ORDER BY created_at DESC
  LIMIT 1;

  RETURN v_code;
END;
$$;

-- ============================================
-- CLEANUP: Auto-delete expired OTPs
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM phone_otps WHERE expires_at < NOW() - INTERVAL '1 hour';
END;
$$;
