import { getCurrentUser } from './auth.js';
import { dbSyncCart } from './db.js';
import { trackAddToCart } from './analytics.js';

function getCartKey() {
  const user = getCurrentUser();
  if (!user) return null;
  return `ssr_cart_${user.id}`;
}

function getCartData() {
  const key = getCartKey();
  if (!key) return [];
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
}

function saveCart(cart) {
  const key = getCartKey();
  if (!key) return;
  localStorage.setItem(key, JSON.stringify(cart));
  window.dispatchEvent(new CustomEvent('cart-updated', { detail: { cart, count: getCartCount(), total: getCartTotal() } }));

  // Sync to Supabase (background)
  const user = getCurrentUser();
  if (user) dbSyncCart(user.id, cart).catch(err => console.warn('[DB] cart sync failed:', err));
}

export function getCart() {
  return getCartData();
}

export function addToCart(product, qty = 1) {
  if (!getCurrentUser()) return [];
  if (qty < 1 || qty > 999) qty = 1;
  const cart = getCartData();
  const existing = cart.find(item => item.id === product.id);
  
  if (existing) {
    existing.quantity = Math.min(existing.quantity + qty, 999);
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      unit: product.unit,
      image: product.image,
      category: product.category,
      quantity: Math.min(qty, 999),
    });
  }

  saveCart(cart);
  trackAddToCart(product.id, product.name);
  return cart;
}

export function removeFromCart(productId) {
  let cart = getCartData();
  cart = cart.filter(item => item.id !== productId);
  saveCart(cart);
  return cart;
}

export function updateQuantity(productId, qty) {
  const cart = getCartData();
  const item = cart.find(i => i.id === productId);
  
  if (item) {
    if (qty <= 0) {
      return removeFromCart(productId);
    }
    item.quantity = Math.min(Math.max(qty, 1), 999);
    saveCart(cart);
  }
  return cart;
}

export function getCartCount() {
  return getCartData().reduce((sum, item) => sum + item.quantity, 0);
}

export function getCartTotal() {
  return getCartData().reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

export function clearCart() {
  const key = getCartKey();
  if (key) localStorage.removeItem(key);
  window.dispatchEvent(new CustomEvent('cart-updated', { detail: { cart: [], count: 0, total: 0 } }));
}

export function refreshCartUI() {
  const cart = getCartData();
  window.dispatchEvent(new CustomEvent('cart-updated', { detail: { cart, count: getCartCount(), total: getCartTotal() } }));
}

export function isInCart(productId) {
  return getCartData().some(item => item.id === productId);
}
