-- ============================================
-- PROFILES TABLE V2 (Firebase Phone Auth + Supabase data)
-- Run this in Supabase SQL Editor
-- ============================================

-- Drop old profiles table if it exists (from v1)
DROP TABLE IF EXISTS profiles CASCADE;

-- Create new profiles table (not linked to auth.users since we use Firebase)
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  email TEXT DEFAULT '',
  firebase_uid TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Phone must be unique
ALTER TABLE profiles ADD CONSTRAINT profiles_phone_unique UNIQUE (phone);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Everyone can read (needed for phone lookup during login)
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);

-- Anyone can insert (registration)
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (true);

-- Anyone can update (profile edits — app handles authorization)
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone);
CREATE INDEX IF NOT EXISTS idx_profiles_firebase_uid ON profiles(firebase_uid);
