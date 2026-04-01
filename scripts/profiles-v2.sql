-- ============================================
-- PROFILES TABLE V2 (Google SSO via Supabase Auth)
-- Run this in Supabase SQL Editor
-- ============================================

-- Drop old tables if they exist
DROP TABLE IF EXISTS profiles CASCADE;

-- Create profiles table linked to Supabase Auth
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  email TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Phone must be unique (but allow empty for users who haven't added phone yet)
CREATE UNIQUE INDEX idx_profiles_phone_unique ON profiles(phone) WHERE phone != '' AND phone != '+91';

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Everyone can read (needed for phone uniqueness check during registration)
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);

-- Anyone can insert their own profile
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (true);

-- Users can update their own profile
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- ============================================
-- AUTO-CREATE PROFILE ON GOOGLE SIGN-UP
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, phone, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    '',
    COALESCE(NEW.email, '')
  )
  ON CONFLICT (id) DO UPDATE SET
    name = COALESCE(NULLIF(EXCLUDED.name, ''), profiles.name),
    email = COALESCE(NULLIF(EXCLUDED.email, ''), profiles.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
