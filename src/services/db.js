// ============================================
// DATABASE SYNC LAYER
// Supabase as primary, localStorage as cache
// ============================================

import { supabase } from '../config/supabase.js';

// ── Retry Queue: persists failed writes for later retry ──

const RETRY_KEY = 'ssr_db_retry_queue';

function getRetryQueue() {
  try { return JSON.parse(localStorage.getItem(RETRY_KEY) || '[]'); } catch { return []; }
}

function addToRetryQueue(operation) {
  const queue = getRetryQueue();
  queue.push({ ...operation, timestamp: Date.now() });
  // Keep max 50 items, drop oldest
  if (queue.length > 50) queue.splice(0, queue.length - 50);
  localStorage.setItem(RETRY_KEY, JSON.stringify(queue));
}

export async function processRetryQueue() {
  const queue = getRetryQueue();
  if (!queue.length) return;

  const remaining = [];
  for (const op of queue) {
    try {
      let result;
      if (op.type === 'insert') {
        result = await supabase.from(op.table).insert(op.data).select();
      } else if (op.type === 'upsert') {
        result = await supabase.from(op.table).upsert(op.data, { onConflict: op.onConflict || 'id' }).select();
      } else if (op.type === 'update') {
        let q = supabase.from(op.table).update(op.updates);
        for (const [k, v] of Object.entries(op.match)) q = q.eq(k, v);
        result = await q.select();
      } else if (op.type === 'delete') {
        let q = supabase.from(op.table).delete();
        for (const [k, v] of Object.entries(op.match)) q = q.eq(k, v);
        result = await q;
      }
      if (result?.error) remaining.push(op); // Still failing, keep in queue
    } catch {
      remaining.push(op); // Network error, keep for next retry
    }
  }

  localStorage.setItem(RETRY_KEY, JSON.stringify(remaining));
  if (queue.length - remaining.length > 0) {
    console.log(`[DB] Retry: ${queue.length - remaining.length} succeeded, ${remaining.length} remaining`);
  }
}

// ── Generic Helpers (with retry queue on failure) ──

export async function fetchFromSupabase(table, query = {}) {
  let q = supabase.from(table).select(query.select || '*');
  if (query.eq) q = q.eq(query.eq[0], query.eq[1]);
  if (query.order) q = q.order(query.order[0], { ascending: query.order[1] ?? true });
  if (query.limit) q = q.limit(query.limit);
  const { data, error } = await q;
  if (error) { console.error(`[DB] fetch ${table}:`, error.message); return null; }
  return data;
}

export async function insertRow(table, row) {
  const { data, error } = await supabase.from(table).insert(row).select();
  if (error) {
    console.error(`[DB] insert ${table}:`, error.message);
    addToRetryQueue({ type: 'insert', table, data: row });
    return null;
  }
  return data;
}

export async function upsertRow(table, row, onConflict = 'id') {
  const { data, error } = await supabase.from(table).upsert(row, { onConflict }).select();
  if (error) {
    console.error(`[DB] upsert ${table}:`, error.message);
    addToRetryQueue({ type: 'upsert', table, data: row, onConflict });
    return null;
  }
  return data;
}

export async function updateRow(table, match, updates) {
  let q = supabase.from(table).update(updates);
  for (const [key, val] of Object.entries(match)) { q = q.eq(key, val); }
  const { data, error } = await q.select();
  if (error) {
    console.error(`[DB] update ${table}:`, error.message);
    addToRetryQueue({ type: 'update', table, match, updates });
    return null;
  }
  return data;
}

export async function deleteRow(table, match) {
  let q = supabase.from(table).delete();
  for (const [key, val] of Object.entries(match)) { q = q.eq(key, val); }
  const { error } = await q;
  if (error) {
    console.error(`[DB] delete ${table}:`, error.message);
    addToRetryQueue({ type: 'delete', table, match });
    return false;
  }
  return true;
}

// ── Sync: Pull from Supabase → localStorage ──

export async function syncAll() {
  const results = await Promise.allSettled([
    syncOrders(),
    syncSubscribers(),
    syncMenuItems(),
  ]);
  const failed = results.filter(r => r.status === 'rejected');
  if (failed.length) console.warn('[DB] Some syncs failed:', failed);
  return failed.length === 0;
}

async function syncOrders() {
  const orders = await fetchFromSupabase('orders', { order: ['created_at', false] });
  if (!orders) return;

  // Fetch order items for each order
  const orderIds = orders.map(o => o.order_id);
  const { data: allItems } = await supabase
    .from('order_items')
    .select('*')
    .in('order_id', orderIds.length ? orderIds : ['__none__']);

  const itemsByOrder = {};
  (allItems || []).forEach(item => {
    if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
    itemsByOrder[item.order_id].push({
      name: item.item_name,
      quantity: item.quantity,
      price: Number(item.price),
      unit: item.unit || '',
      subtotal: Number(item.subtotal),
    });
  });

  // Convert to the localStorage format the app expects
  const formatted = orders.map(o => ({
    orderId: o.order_id,
    userId: o.user_id,
    customerName: o.customer_name,
    customerPhone: o.customer_phone,
    pickupDate: o.pickup_date,
    pickupTime: o.pickup_time,
    notes: o.notes || '',
    items: itemsByOrder[o.order_id] || [],
    total: Number(o.total),
    paymentMethod: o.payment_method,
    status: o.status,
    adminComment: o.admin_comment || '',
    isOffline: o.is_offline || false,
    createdAt: o.created_at,
    timestamp: new Date(o.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
  }));

  localStorage.setItem('ssr_orders', JSON.stringify(formatted));
}

async function syncSubscribers() {
  const subs = await fetchFromSupabase('subscribers');
  if (!subs) return;

  // Fetch billing history for all subscribers
  const { data: allHistory } = await supabase
    .from('billing_history')
    .select('*')
    .order('created_at', { ascending: false });

  const historyByUser = {};
  (allHistory || []).forEach(h => {
    if (!historyByUser[h.user_id]) historyByUser[h.user_id] = [];
    historyByUser[h.user_id].push({
      orderId: h.order_id,
      amount: Number(h.amount),
      description: h.description || '',
      date: h.created_at,
      status: h.status,
    });
  });

  const formatted = subs.map(s => ({
    userId: s.user_id,
    name: s.name,
    phone: s.phone,
    address: s.address || '',
    outstandingBalance: Number(s.outstanding_balance),
    joinedAt: s.joined_at,
    billingHistory: historyByUser[s.user_id] || [],
  }));

  localStorage.setItem('ssr_subscribers', JSON.stringify(formatted));
}

export async function fetchMenuFromSupabase() { return syncMenuItems(); }

async function syncMenuItems() {
  const items = await fetchFromSupabase('menu_items', { order: ['sort_order', true] });
  if (!items) return;

  const sweets = items
    .filter(i => i.menu_type === 'sweets')
    .map(toAppMenuItem);
  const restaurant = items
    .filter(i => i.menu_type === 'restaurant')
    .map(toAppMenuItem);

  // Store as custom overrides (the app's admin service reads these)
  localStorage.setItem('ssr_sweets_custom', JSON.stringify(sweets));
  localStorage.setItem('ssr_restaurant_custom', JSON.stringify(restaurant));
}

function toAppMenuItem(dbItem) {
  return {
    id: dbItem.id,
    name: dbItem.name,
    price: Number(dbItem.price),
    unit: dbItem.unit || 'piece',
    category: dbItem.category,
    description: dbItem.description || '',
    image: dbItem.image || '',
    isVeg: true,
    isAvailable: dbItem.available,
  };
}

// ── Write-through helpers (localStorage + Supabase) ──

export async function dbSaveOrder(order) {
  // Insert order
  await insertRow('orders', {
    order_id: order.orderId,
    user_id: order.userId,
    customer_name: order.customerName,
    customer_phone: order.customerPhone,
    pickup_date: order.pickupDate,
    pickup_time: order.pickupTime,
    notes: order.notes || '',
    total: order.total,
    payment_method: order.paymentMethod,
    status: order.status,
    admin_comment: order.adminComment || '',
    is_offline: order.isOffline || false,
  });

  // Insert order items
  if (order.items && order.items.length) {
    await insertRow('order_items', order.items.map(item => ({
      order_id: order.orderId,
      item_name: item.name,
      quantity: item.quantity,
      price: item.price,
      unit: item.unit || '',
      subtotal: item.price * item.quantity,
    })));
  }
}

export async function dbUpdateOrderStatus(orderId, status) {
  return updateRow('orders', { order_id: orderId }, { status });
}

export async function dbUpdateOrderItems(orderId, items, total, adminComment) {
  // Update order total and comment
  await updateRow('orders', { order_id: orderId }, {
    total,
    admin_comment: adminComment || '',
  });

  // Delete old items and insert new
  await deleteRow('order_items', { order_id: orderId });
  if (items.length) {
    await insertRow('order_items', items.map(item => ({
      order_id: orderId,
      item_name: item.name,
      quantity: item.quantity,
      price: item.price,
      unit: item.unit || '',
      subtotal: item.price * item.quantity,
    })));
  }
}

export async function dbUpdateOrderPickupTime(orderId, pickupTime) {
  return updateRow('orders', { order_id: orderId }, { pickup_time: pickupTime });
}

export async function dbSaveSubscriber(sub) {
  return insertRow('subscribers', {
    user_id: sub.userId,
    name: sub.name,
    phone: sub.phone,
    address: sub.address || '',
    outstanding_balance: sub.outstandingBalance || 0,
  });
}

export async function dbUpdateSubscriberBalance(userId, balance) {
  return updateRow('subscribers', { user_id: userId }, { outstanding_balance: balance });
}

export async function dbAddBillingHistory(userId, entry) {
  // Get subscriber id
  const { data: sub } = await supabase
    .from('subscribers')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (sub) {
    return insertRow('billing_history', {
      subscriber_id: sub.id,
      user_id: userId,
      order_id: entry.orderId,
      amount: entry.amount || 0,
      description: entry.description || '',
      status: entry.status || 'pending',
    });
  }
}

export async function dbClearSubscriberBills(userId) {
  await updateRow('subscribers', { user_id: userId }, { outstanding_balance: 0 });
  // Update all pending billing history to cleared
  const { data: sub } = await supabase
    .from('subscribers')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (sub) {
    await supabase
      .from('billing_history')
      .update({ status: 'cleared' })
      .eq('subscriber_id', sub.id)
      .eq('status', 'pending');
  }
}

export async function dbSaveMenuItem(item, menuType) {
  return upsertRow('menu_items', {
    id: item.id,
    name: item.name,
    price: item.price,
    unit: item.unit || 'piece',
    category: item.category,
    menu_type: menuType,
    description: item.description || '',
    image: item.image || '',
    available: item.isAvailable !== false,
  });
}

export async function dbDeleteMenuItem(itemId) {
  return deleteRow('menu_items', { id: itemId });
}

export async function dbSaveAllMenuItems(items, menuType) {
  const rows = items.map((item, i) => ({
    id: item.id,
    name: item.name,
    price: item.price,
    unit: item.unit || 'piece',
    category: item.category,
    menu_type: menuType,
    description: item.description || '',
    image: item.image || '',
    available: item.isAvailable !== false,
    sort_order: i,
  }));

  // Delete all items of this type and re-insert
  await supabase.from('menu_items').delete().eq('menu_type', menuType);
  if (rows.length) await insertRow('menu_items', rows);
}

// ── Cart sync (for logged-in users) ──

export async function dbSyncCart(userId, cart) {
  // Delete existing cart items for user
  await supabase.from('cart_items').delete().eq('user_id', userId);

  if (cart.length) {
    await insertRow('cart_items', cart.map(item => ({
      user_id: userId,
      item_id: item.id,
      item_name: item.name,
      price: item.price,
      unit: item.unit || '',
      quantity: item.quantity,
      image: item.image || '',
    })));
  }
}

export async function dbLoadCart(userId) {
  const items = await fetchFromSupabase('cart_items', { eq: ['user_id', userId] });
  if (!items) return null;
  return items.map(i => ({
    id: i.item_id,
    name: i.item_name,
    price: Number(i.price),
    unit: i.unit || '',
    quantity: i.quantity,
    image: i.image || '',
  }));
}

// ── Realtime: Subscribe to order changes (for admin dashboard) ──

let realtimeChannel = null;

export function subscribeToOrders(callback) {
  if (realtimeChannel) realtimeChannel.unsubscribe();

  realtimeChannel = supabase
    .channel('orders-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
      console.log('[RT] Order change:', payload.eventType);
      // Re-sync orders to localStorage then notify
      syncOrders().then(() => {
        if (typeof callback === 'function') callback(payload);
      });
    })
    .subscribe();

  return realtimeChannel;
}

export function unsubscribeFromOrders() {
  if (realtimeChannel) {
    realtimeChannel.unsubscribe();
    realtimeChannel = null;
  }
}

