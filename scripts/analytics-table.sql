-- ============================================
-- ANALYTICS TABLES
-- Run this in Supabase SQL Editor
-- ============================================

-- Page views
CREATE TABLE IF NOT EXISTS page_views (
  id SERIAL PRIMARY KEY,
  page TEXT NOT NULL,
  referrer TEXT DEFAULT '',
  user_agent TEXT DEFAULT '',
  screen_width INTEGER DEFAULT 0,
  user_id TEXT DEFAULT '',
  session_id TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "page_views_insert" ON page_views
  FOR INSERT WITH CHECK (true);

CREATE POLICY "page_views_select" ON page_views
  FOR SELECT USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_page_views_page ON page_views(page);
CREATE INDEX IF NOT EXISTS idx_page_views_created ON page_views(created_at DESC);

-- Item impressions (when a product card is viewed/clicked)
CREATE TABLE IF NOT EXISTS item_events (
  id SERIAL PRIMARY KEY,
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'add_to_cart', 'order')),
  item_id TEXT NOT NULL,
  item_name TEXT NOT NULL DEFAULT '',
  user_id TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE item_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "item_events_insert" ON item_events
  FOR INSERT WITH CHECK (true);

CREATE POLICY "item_events_select" ON item_events
  FOR SELECT USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_item_events_item ON item_events(item_id);
CREATE INDEX IF NOT EXISTS idx_item_events_type ON item_events(event_type);
CREATE INDEX IF NOT EXISTS idx_item_events_created ON item_events(created_at DESC);
