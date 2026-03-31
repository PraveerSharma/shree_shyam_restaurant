-- ============================================
-- ERROR LOGS TABLE
-- Run this in Supabase SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS error_logs (
  id SERIAL PRIMARY KEY,
  message TEXT NOT NULL,
  stack TEXT DEFAULT '',
  url TEXT DEFAULT '',
  user_agent TEXT DEFAULT '',
  user_id TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- Anyone can insert errors, only service_role can read
CREATE POLICY "error_logs_insert" ON error_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "error_logs_select" ON error_logs
  FOR SELECT USING (auth.role() = 'service_role');

-- Auto-cleanup: keep last 500 entries (run periodically or via cron)
-- CREATE INDEX IF NOT EXISTS idx_error_logs_created ON error_logs(created_at DESC);
