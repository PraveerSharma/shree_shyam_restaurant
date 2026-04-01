-- ============================================
-- SHREE SHYAM RESTAURANT — Complete Supabase Schema
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- This creates all tables from scratch.
-- ============================================

-- 1. PROFILES
-- Stores user info. Linked to Supabase Auth (auth.users.id).
-- Phone is NOT unique — no verification, multiple users can share a number.
create table if not exists profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text not null default '',
  phone      text not null default '',
  email      text not null default '',
  avatar     text not null default '',
  created_at timestamptz not null default now()
);

-- Index for email lookups (used in loadOrCreateSupabaseProfile)
create unique index if not exists profiles_email_idx on profiles(email);


-- 2. MENU ITEMS
-- Central catalog for sweets and restaurant items.
create table if not exists menu_items (
  id          text primary key,
  name        text not null,
  price       numeric(10,2) not null default 0,
  unit        text not null default 'piece',
  category    text not null default '',
  menu_type   text not null check (menu_type in ('sweets', 'restaurant')),
  description text not null default '',
  image       text not null default '',
  available   boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists menu_items_type_idx on menu_items(menu_type);


-- 3. ORDERS
-- All orders: online, offline, quick orders.
create table if not exists orders (
  order_id       text primary key,
  user_id        text not null,
  customer_name  text not null default '',
  customer_phone text not null default '',
  pickup_date    text not null default '',
  pickup_time    text not null default '',
  notes          text not null default '',
  total          numeric(10,2) not null default 0,
  payment_method text not null default 'Cash on Delivery',
  status         text not null default 'pending' check (status in ('pending', 'accepted', 'delivered', 'cancelled')),
  admin_comment  text not null default '',
  is_offline     boolean not null default false,
  created_at     timestamptz not null default now()
);

create index if not exists orders_user_idx on orders(user_id);
create index if not exists orders_status_idx on orders(status);
create index if not exists orders_created_idx on orders(created_at desc);


-- 4. ORDER ITEMS
-- Line items for each order.
create table if not exists order_items (
  id         bigint generated always as identity primary key,
  order_id   text not null references orders(order_id) on delete cascade,
  item_name  text not null,
  quantity   int not null default 1,
  price      numeric(10,2) not null default 0,
  unit       text not null default '',
  subtotal   numeric(10,2) not null default 0
);

create index if not exists order_items_order_idx on order_items(order_id);


-- 5. SUBSCRIBERS
-- Regular customers enrolled in monthly billing.
create table if not exists subscribers (
  id                  bigint generated always as identity primary key,
  user_id             text not null unique,
  name                text not null default '',
  phone               text not null default '',
  outstanding_balance numeric(10,2) not null default 0,
  joined_at           timestamptz not null default now()
);

create index if not exists subscribers_user_idx on subscribers(user_id);


-- 6. BILLING HISTORY
-- Tracks each charge/bill for subscribers.
create table if not exists billing_history (
  id            bigint generated always as identity primary key,
  subscriber_id bigint not null references subscribers(id) on delete cascade,
  user_id       text not null,
  order_id      text not null default '',
  amount        numeric(10,2) not null default 0,
  description   text not null default '',
  status        text not null default 'pending' check (status in ('pending', 'cleared', 'pending_price')),
  created_at    timestamptz not null default now()
);

create index if not exists billing_history_sub_idx on billing_history(subscriber_id);
create index if not exists billing_history_user_idx on billing_history(user_id);


-- 7. CART ITEMS
-- Persistent shopping cart for logged-in users.
create table if not exists cart_items (
  id        bigint generated always as identity primary key,
  user_id   uuid not null references auth.users(id) on delete cascade,
  item_id   text not null,
  item_name text not null default '',
  price     numeric(10,2) not null default 0,
  unit      text not null default '',
  quantity  int not null default 1,
  image     text not null default '',

  unique (user_id, item_id)
);

create index if not exists cart_items_user_idx on cart_items(user_id);


-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
alter table profiles        enable row level security;
alter table menu_items      enable row level security;
alter table orders          enable row level security;
alter table order_items     enable row level security;
alter table subscribers     enable row level security;
alter table billing_history enable row level security;
alter table cart_items      enable row level security;

-- PROFILES: users can read/update their own profile; insert on signup
create policy "Users can view own profile"   on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);

-- MENU ITEMS: everyone can read (public menu)
create policy "Anyone can view menu" on menu_items for select using (true);
-- Admin writes are done via service_role key or you can add an admin check:
create policy "Authenticated users can manage menu" on menu_items for all using (auth.role() = 'authenticated');

-- ORDERS: users see their own orders; authenticated users can insert
create policy "Users can view own orders"  on orders for select using (auth.uid()::text = user_id or user_id = 'offline');
create policy "Users can insert orders"    on orders for insert with check (auth.role() = 'authenticated');
create policy "Users can update own orders" on orders for update using (auth.uid()::text = user_id or user_id = 'offline');

-- ORDER ITEMS: accessible if the parent order is accessible
create policy "Users can view own order items" on order_items for select using (
  exists (select 1 from orders where orders.order_id = order_items.order_id and (orders.user_id = auth.uid()::text or orders.user_id = 'offline'))
);
create policy "Users can insert order items" on order_items for insert with check (auth.role() = 'authenticated');
create policy "Users can update order items" on order_items for update using (auth.role() = 'authenticated');
create policy "Users can delete order items" on order_items for delete using (auth.role() = 'authenticated');

-- SUBSCRIBERS: authenticated users can read/write
create policy "Authenticated can manage subscribers" on subscribers for all using (auth.role() = 'authenticated');

-- BILLING HISTORY: authenticated users can read/write
create policy "Authenticated can manage billing" on billing_history for all using (auth.role() = 'authenticated');

-- CART ITEMS: users can manage their own cart
create policy "Users can manage own cart" on cart_items for all using (auth.uid() = user_id);


-- ============================================
-- REALTIME (for admin order dashboard)
-- ============================================
-- Enable realtime on key tables so admin and client stay in sync.
-- Go to Supabase Dashboard > Database > Replication and enable these tables, OR run:
alter publication supabase_realtime add table orders;
alter publication supabase_realtime add table order_items;
alter publication supabase_realtime add table menu_items;
alter publication supabase_realtime add table subscribers;
alter publication supabase_realtime add table billing_history;


-- ============================================
-- DONE
-- ============================================
-- After running this script:
-- 1. Go to Authentication > Providers > enable Google
-- 2. Disable Email provider (we only use Google SSO)
-- 3. Set your Google OAuth client ID and secret
-- 4. Set Site URL and Redirect URLs in Auth > URL Configuration
