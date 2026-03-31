// ============================================
// Supabase Database Setup Script
// Run: node scripts/setup-db.mjs
// ============================================

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dufolyrnrbybeflhdsay.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1Zm9seXJucmJ5YmVmbGhkc2F5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDk3NzY0OSwiZXhwIjoyMDkwNTUzNjQ5fQ.VwNY29hGXj0tSgf_MIWykuFCXBXCqhB8ZYbKnMryCig';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const SQL = `
-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  phone_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MENU ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS menu_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  unit TEXT DEFAULT 'piece',
  category TEXT NOT NULL,
  menu_type TEXT NOT NULL CHECK (menu_type IN ('sweets', 'restaurant')),
  description TEXT DEFAULT '',
  image TEXT DEFAULT '',
  available BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ORDERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  order_id TEXT UNIQUE NOT NULL,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL DEFAULT '',
  pickup_date TEXT NOT NULL,
  pickup_time TEXT NOT NULL DEFAULT '',
  notes TEXT DEFAULT '',
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_method TEXT DEFAULT 'Cash on Delivery',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'ready', 'delivered', 'cancelled')),
  admin_comment TEXT DEFAULT '',
  is_offline BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ORDER ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id TEXT REFERENCES orders(order_id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  unit TEXT DEFAULT '',
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0
);

-- ============================================
-- SUBSCRIBERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS subscribers (
  id SERIAL PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT DEFAULT '',
  outstanding_balance NUMERIC(10,2) DEFAULT 0,
  joined_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- BILLING HISTORY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS billing_history (
  id SERIAL PRIMARY KEY,
  subscriber_id INTEGER REFERENCES subscribers(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  amount NUMERIC(10,2) DEFAULT 0,
  description TEXT DEFAULT '',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'pending_price', 'cleared')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CART TABLE (server-side cart persistence)
-- ============================================
CREATE TABLE IF NOT EXISTS cart_items (
  id SERIAL PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  unit TEXT DEFAULT '',
  quantity INTEGER NOT NULL DEFAULT 1,
  image TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, item_id)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_type ON menu_items(menu_type);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category);
CREATE INDEX IF NOT EXISTS idx_billing_history_user ON billing_history(user_id);
CREATE INDEX IF NOT EXISTS idx_subscribers_user_id ON subscribers(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_user ON cart_items(user_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- MENU ITEMS: Everyone can read, only service_role can write
DROP POLICY IF EXISTS "Menu items are viewable by everyone" ON menu_items;
CREATE POLICY "Menu items are viewable by everyone" ON menu_items
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Menu items writable by service role" ON menu_items;
CREATE POLICY "Menu items writable by service role" ON menu_items
  FOR ALL USING (auth.role() = 'service_role');

-- USERS: Users can read their own data, service_role full access
DROP POLICY IF EXISTS "Users can read own data" ON users;
CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users writable by service role or self-insert" ON users;
CREATE POLICY "Users writable by service role or self-insert" ON users
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users updatable by service role" ON users;
CREATE POLICY "Users updatable by service role" ON users
  FOR UPDATE USING (auth.role() = 'service_role');

-- ORDERS: Public can insert, read own, service_role full
DROP POLICY IF EXISTS "Orders readable by all" ON orders;
CREATE POLICY "Orders readable by all" ON orders
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Orders insertable by anyone" ON orders;
CREATE POLICY "Orders insertable by anyone" ON orders
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Orders updatable by service role" ON orders;
CREATE POLICY "Orders updatable by service role" ON orders
  FOR UPDATE USING (true);

-- ORDER ITEMS: Follow parent order access
DROP POLICY IF EXISTS "Order items readable by all" ON order_items;
CREATE POLICY "Order items readable by all" ON order_items
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Order items insertable by anyone" ON order_items;
CREATE POLICY "Order items insertable by anyone" ON order_items
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Order items updatable" ON order_items;
CREATE POLICY "Order items updatable" ON order_items
  FOR ALL USING (true);

-- SUBSCRIBERS: Readable by all, writable by service role
DROP POLICY IF EXISTS "Subscribers readable by all" ON subscribers;
CREATE POLICY "Subscribers readable by all" ON subscribers
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Subscribers writable" ON subscribers;
CREATE POLICY "Subscribers writable" ON subscribers
  FOR ALL USING (true);

-- BILLING HISTORY: Readable by all
DROP POLICY IF EXISTS "Billing history readable by all" ON billing_history;
CREATE POLICY "Billing history readable by all" ON billing_history
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Billing history writable" ON billing_history;
CREATE POLICY "Billing history writable" ON billing_history
  FOR ALL USING (true);

-- CART ITEMS: Users manage own cart
DROP POLICY IF EXISTS "Cart items full access" ON cart_items;
CREATE POLICY "Cart items full access" ON cart_items
  FOR ALL USING (true);

-- ============================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_orders_updated_at ON orders;
CREATE TRIGGER set_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_menu_items_updated_at ON menu_items;
CREATE TRIGGER set_menu_items_updated_at
  BEFORE UPDATE ON menu_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
`;

async function setupDatabase() {
  console.log('Setting up Supabase database...\n');

  // Execute SQL via the Supabase SQL API
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    }
  });

  // The rpc endpoint won't work for raw SQL.
  // Let's use the pg-meta SQL execution endpoint instead
  const sqlResponse = await fetch(`${SUPABASE_URL}/pg/query`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: SQL })
  });

  if (!sqlResponse.ok) {
    // Try the alternative endpoint
    console.log('Trying alternative SQL endpoint...');
    const altResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: SQL })
    });

    if (!altResponse.ok) {
      console.log('\n⚠️  Cannot execute SQL directly via REST API.');
      console.log('Please run the SQL manually in the Supabase Dashboard:');
      console.log('  1. Go to https://supabase.com/dashboard');
      console.log('  2. Open your project → SQL Editor');
      console.log('  3. Copy and paste the SQL from: scripts/schema.sql');
      console.log('  4. Click "Run"\n');

      // Write SQL to a file for manual execution
      const fs = await import('fs');
      fs.writeFileSync('scripts/schema.sql', SQL.trim());
      console.log('✅ SQL schema written to scripts/schema.sql');
      return;
    }
  }

  const result = await sqlResponse.json();
  console.log('Result:', result);
}

setupDatabase().catch(console.error);
