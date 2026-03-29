// ============================================
// CART SERVICE
// State management with localStorage + events
// ============================================

const CART_KEY = 'ssr_cart';

function getCartData() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  window.dispatchEvent(new CustomEvent('cart-updated', { detail: { cart, count: getCartCount(), total: getCartTotal() } }));
}

export function getCart() {
  return getCartData();
}

export function addToCart(product, qty = 1) {
  if (qty < 1 || qty > 10) qty = 1;
  const cart = getCartData();
  const existing = cart.find(item => item.id === product.id);
  
  if (existing) {
    existing.quantity = Math.min(existing.quantity + qty, 10);
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      unit: product.unit,
      image: product.image,
      category: product.category,
      quantity: Math.min(qty, 10),
    });
  }
  
  saveCart(cart);
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
    item.quantity = Math.min(Math.max(qty, 1), 10);
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
  localStorage.removeItem(CART_KEY);
  window.dispatchEvent(new CustomEvent('cart-updated', { detail: { cart: [], count: 0, total: 0 } }));
}

export function isInCart(productId) {
  return getCartData().some(item => item.id === productId);
}
