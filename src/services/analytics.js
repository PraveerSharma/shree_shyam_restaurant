// ============================================
// LIGHTWEIGHT ANALYTICS
// Page views + item events → Supabase
// ============================================

import { supabase } from '../config/supabase.js';

// Generate a session ID (persists for the browser tab lifetime)
const SESSION_ID = 'sess_' + Math.random().toString(36).substring(2, 10);

function getUserId() {
  try { return JSON.parse(localStorage.getItem('ssr_session') || '{}').id || ''; } catch { return ''; }
}

// ── Page View Tracking ──

export function trackPageView(page) {
  supabase.from('page_views').insert({
    page,
    referrer: document.referrer.slice(0, 500),
    user_agent: navigator.userAgent.slice(0, 300),
    screen_width: window.innerWidth,
    user_id: getUserId(),
    session_id: SESSION_ID,
  }).then(() => {}).catch(() => {}); // Silent fire-and-forget
}

// ── Item Event Tracking ──

export function trackItemEvent(eventType, itemId, itemName = '') {
  supabase.from('item_events').insert({
    event_type: eventType,
    item_id: itemId,
    item_name: itemName,
    user_id: getUserId(),
  }).then(() => {}).catch(() => {});
}

// Convenience methods
export const trackAddToCart = (id, name) => trackItemEvent('add_to_cart', id, name);
export const trackOrder = (id, name) => trackItemEvent('order', id, name);
