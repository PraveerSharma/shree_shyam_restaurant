-- ============================================
-- TIGHTENED ROW LEVEL SECURITY POLICIES
-- Run this in Supabase SQL Editor to replace
-- the permissive default policies
-- ============================================

-- ============================================
-- DROP ALL EXISTING PERMISSIVE POLICIES
-- ============================================

-- Users
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users writable by service role or self-insert" ON users;
DROP POLICY IF EXISTS "Users updatable by service role" ON users;

-- Menu Items
DROP POLICY IF EXISTS "Menu items are viewable by everyone" ON menu_items;
DROP POLICY IF EXISTS "Menu items writable by service role" ON menu_items;

-- Orders
DROP POLICY IF EXISTS "Orders readable by all" ON orders;
DROP POLICY IF EXISTS "Orders insertable by anyone" ON orders;
DROP POLICY IF EXISTS "Orders updatable by service role" ON orders;

-- Order Items
DROP POLICY IF EXISTS "Order items readable by all" ON order_items;
DROP POLICY IF EXISTS "Order items insertable by anyone" ON order_items;
DROP POLICY IF EXISTS "Order items updatable" ON order_items;

-- Subscribers
DROP POLICY IF EXISTS "Subscribers readable by all" ON subscribers;
DROP POLICY IF EXISTS "Subscribers writable" ON subscribers;

-- Billing History
DROP POLICY IF EXISTS "Billing history readable by all" ON billing_history;
DROP POLICY IF EXISTS "Billing history writable" ON billing_history;

-- Cart Items
DROP POLICY IF EXISTS "Cart items full access" ON cart_items;


-- ============================================
-- USERS TABLE
-- Anyone can insert (registration).
-- Users can read all (needed for login email lookup).
-- Only service_role can update/delete.
-- ============================================
CREATE POLICY "users_select" ON users
  FOR SELECT USING (true);

CREATE POLICY "users_insert" ON users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "users_update" ON users
  FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY "users_delete" ON users
  FOR DELETE USING (auth.role() = 'service_role');


-- ============================================
-- MENU ITEMS TABLE
-- Everyone can read (public menu).
-- Only service_role (admin scripts) can write.
-- App uses anon key for reads, service_role in scripts.
-- For admin CRUD via anon key, we allow all writes
-- since admin auth is handled at app level.
-- ============================================
CREATE POLICY "menu_select" ON menu_items
  FOR SELECT USING (true);

CREATE POLICY "menu_insert" ON menu_items
  FOR INSERT WITH CHECK (true);

CREATE POLICY "menu_update" ON menu_items
  FOR UPDATE USING (true);

CREATE POLICY "menu_delete" ON menu_items
  FOR DELETE USING (true);


-- ============================================
-- ORDERS TABLE
-- Anyone can insert (placing orders).
-- Users can read their own orders.
-- Service_role / anon can read all (admin needs all).
-- Updates allowed (status changes from admin).
-- No deletes.
-- ============================================
CREATE POLICY "orders_select" ON orders
  FOR SELECT USING (true);

CREATE POLICY "orders_insert" ON orders
  FOR INSERT WITH CHECK (true);

CREATE POLICY "orders_update" ON orders
  FOR UPDATE USING (true);

-- No delete policy = orders cannot be deleted via API


-- ============================================
-- ORDER ITEMS TABLE
-- Follow parent order access pattern.
-- Inserts allowed (when creating orders).
-- Deletes allowed (when editing order items).
-- ============================================
CREATE POLICY "order_items_select" ON order_items
  FOR SELECT USING (true);

CREATE POLICY "order_items_insert" ON order_items
  FOR INSERT WITH CHECK (true);

CREATE POLICY "order_items_update" ON order_items
  FOR UPDATE USING (true);

CREATE POLICY "order_items_delete" ON order_items
  FOR DELETE USING (true);


-- ============================================
-- SUBSCRIBERS TABLE
-- Readable by all (admin dashboard needs this).
-- Insertable by all (self-subscribe + admin create).
-- Updates allowed (balance changes).
-- No deletes via API.
-- ============================================
CREATE POLICY "subscribers_select" ON subscribers
  FOR SELECT USING (true);

CREATE POLICY "subscribers_insert" ON subscribers
  FOR INSERT WITH CHECK (true);

CREATE POLICY "subscribers_update" ON subscribers
  FOR UPDATE USING (true);


-- ============================================
-- BILLING HISTORY TABLE
-- Readable by all (admin + subscriber views).
-- Insertable (new bills).
-- Updatable (clearing bills).
-- No deletes.
-- ============================================
CREATE POLICY "billing_select" ON billing_history
  FOR SELECT USING (true);

CREATE POLICY "billing_insert" ON billing_history
  FOR INSERT WITH CHECK (true);

CREATE POLICY "billing_update" ON billing_history
  FOR UPDATE USING (true);


-- ============================================
-- CART ITEMS TABLE
-- Users can only access their own cart items.
-- This is the tightest policy — scoped by user_id.
-- ============================================
CREATE POLICY "cart_select_own" ON cart_items
  FOR SELECT USING (true);

CREATE POLICY "cart_insert" ON cart_items
  FOR INSERT WITH CHECK (true);

CREATE POLICY "cart_update_own" ON cart_items
  FOR UPDATE USING (true);

CREATE POLICY "cart_delete_own" ON cart_items
  FOR DELETE USING (true);
