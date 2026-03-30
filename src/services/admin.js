// ============================================
// ADMIN SERVICE
// Item/price management with localStorage
// ============================================

import { DEFAULT_SWEETS } from '../config/sweets-data.js';
import { DEFAULT_RESTAURANT_ITEMS } from '../config/restaurant-data.js';
import { SITE_CONFIG } from '../config/site.js';
import { sanitizeInput } from '../utils/dom.js';

const SWEETS_OVERRIDE_KEY = 'ssr_sweets_custom';
const RESTAURANT_OVERRIDE_KEY = 'ssr_restaurant_custom';
const ADMIN_SESSION_KEY = 'ssr_admin_session';

// Admin Auth
export function adminLogin(password) {
  if (password === SITE_CONFIG.admin.password) {
    const session = {
      loggedIn: true,
      loginTime: Date.now(),
      expires: Date.now() + (2 * 60 * 60 * 1000), // 2 hours
    };
    sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
    return true;
  }
  return false;
}

export function isAdminLoggedIn() {
  try {
    const session = JSON.parse(sessionStorage.getItem(ADMIN_SESSION_KEY));
    if (session && session.loggedIn && Date.now() < session.expires) {
      return true;
    }
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    return false;
  } catch {
    return false;
  }
}

export function adminLogout() {
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
}

// Get items (with overrides)
export function getSweetsItems() {
  try {
    const custom = JSON.parse(localStorage.getItem(SWEETS_OVERRIDE_KEY));
    if (custom && Array.isArray(custom)) return custom;
  } catch { /* use defaults */ }
  return [...DEFAULT_SWEETS];
}

export function getRestaurantItems() {
  try {
    const custom = JSON.parse(localStorage.getItem(RESTAURANT_OVERRIDE_KEY));
    if (custom && Array.isArray(custom)) return custom;
  } catch { /* use defaults */ }
  return [...DEFAULT_RESTAURANT_ITEMS];
}

// Update item
export function updateItem(type, itemId, updates) {
  const key = type === 'sweets' ? SWEETS_OVERRIDE_KEY : RESTAURANT_OVERRIDE_KEY;
  const items = type === 'sweets' ? getSweetsItems() : getRestaurantItems();
  
  const index = items.findIndex(i => i.id === itemId);
  if (index === -1) return false;

  // Sanitize updatable fields
  if (updates.name) updates.name = sanitizeInput(updates.name).slice(0, 100);
  if (updates.category) updates.category = sanitizeInput(updates.category).slice(0, 50);
  if (updates.description) updates.description = sanitizeInput(updates.description).slice(0, 500);
  if (updates.price) updates.price = Math.max(0, Math.min(Number(updates.price) || 0, 99999));
  if (updates.unit) updates.unit = sanitizeInput(updates.unit).slice(0, 50);
  if (updates.image !== undefined) updates.image = sanitizeInput(updates.image);
  
  items[index] = { ...items[index], ...updates };
  localStorage.setItem(key, JSON.stringify(items));
  return true;
}

// Add new item
export function addItem(type, item) {
  const key = type === 'sweets' ? SWEETS_OVERRIDE_KEY : RESTAURANT_OVERRIDE_KEY;
  const items = type === 'sweets' ? getSweetsItems() : getRestaurantItems();
  
  const newItem = {
    id: sanitizeInput(item.name || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now().toString(36),
    name: sanitizeInput(item.name || '').slice(0, 100),
    category: sanitizeInput(item.category || 'snacks'),
    description: sanitizeInput(item.description || '').slice(0, 500),
    price: Math.max(0, Math.min(Number(item.price) || 0, 99999)),
    unit: sanitizeInput(item.unit || 'per piece').slice(0, 50),
    image: item.image || '/images/sweets/samosa.png', // fallback
    isVeg: true,
    isAvailable: true,
  };
  
  items.push(newItem);
  localStorage.setItem(key, JSON.stringify(items));
  return newItem;
}

// Delete item
export function deleteItem(type, itemId) {
  const key = type === 'sweets' ? SWEETS_OVERRIDE_KEY : RESTAURANT_OVERRIDE_KEY;
  const items = type === 'sweets' ? getSweetsItems() : getRestaurantItems();
  
  const filtered = items.filter(i => i.id !== itemId);
  localStorage.setItem(key, JSON.stringify(filtered));
  return true;
}

// Reset to defaults
export function resetToDefaults(type) {
  const key = type === 'sweets' ? SWEETS_OVERRIDE_KEY : RESTAURANT_OVERRIDE_KEY;
  localStorage.removeItem(key);
}
