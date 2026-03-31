// ============================================
// ORDERS SERVICE
// Order creation & WhatsApp integration
// ============================================

import { SITE_CONFIG } from '../config/site.js';
import { formatPrice } from '../utils/format.js';
import { sanitizeInput } from '../utils/dom.js';
import { clearCart } from './cart.js';
import { getCurrentUser } from './auth.js';

const ORDERS_KEY = 'ssr_orders';

function getOrders() {
  try {
    return JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
  } catch {
    return [];
  }
}

function generateOrderId() {
  const date = new Date();
  const dateStr = date.getFullYear().toString() +
    (date.getMonth() + 1).toString().padStart(2, '0') +
    date.getDate().toString().padStart(2, '0');
  const orders = getOrders();
  const todayOrders = orders.filter(o => o.orderId.includes(dateStr));
  const seq = (todayOrders.length + 1).toString().padStart(3, '0');
  return `${SITE_CONFIG.orderPrefix}-${dateStr}-${seq}`;
}

export function createOrder(cart, customerInfo) {
  const user = getCurrentUser();
  if (!user) return { success: false, error: 'Please login to place an order' };

  // Sanitize inputs
  const phone = sanitizeInput(customerInfo.phone || '').trim();
  const pickupDate = sanitizeInput(customerInfo.pickupDate || '').trim();
  const pickupTime = sanitizeInput(customerInfo.pickupTime || '').trim();
  const notes = sanitizeInput(customerInfo.notes || '').trim();

  // Validate
  if (!phone) return { success: false, error: 'Phone/WhatsApp number is required' };
  if (!pickupDate) return { success: false, error: 'Pickup date is required' };
  if (!pickupTime) return { success: false, error: 'Pickup time slot is required' };
  if (!cart || cart.length === 0) return { success: false, error: 'Cart is empty' };

  const order = {
    orderId: generateOrderId(),
    userId: user.id,
    customerName: user.name,
    customerPhone: phone,
    pickupDate,
    pickupTime,
    notes: notes.slice(0, 500), // Limit notes length
    items: cart.map(item => ({
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      subtotal: item.price * item.quantity,
    })),
    total: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
    paymentMethod: 'Cash on Delivery',
    status: 'pending',
    createdAt: new Date().toISOString(),
    timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
  };

  // Save order
  const orders = getOrders();
  orders.push(order);
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));

  return { success: true, order };
}

export function generateWhatsAppMessage(order) {
  const lines = [
    `🛒 *NEW ORDER - ${SITE_CONFIG.name}*`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `📋 *Order ID:* ${order.orderId}`,
    `📅 *Pickup Date:* ${order.pickupDate}`,
    `⏰ *Pickup Time:* ${order.pickupTime}`,
    `📱 *Phone:* ${order.customerPhone}`,
    `⏰ *Placed:* ${order.timestamp}`,
    ``,
    `📦 *ORDER ITEMS:*`,
    `──────────────────`,
  ];

  order.items.forEach((item, i) => {
    lines.push(
      `${i + 1}. ${item.name}`,
      `   Qty: ${item.quantity} × ${formatPrice(item.price)} = ${formatPrice(item.subtotal)}`
    );
  });

  lines.push(
    ``,
    `──────────────────`,
    `💰 *TOTAL: ${formatPrice(order.total)}*`,
    `💳 *Payment: ${order.paymentMethod}*`,
  );

  if (order.notes) {
    lines.push(``, `📝 *Notes:* ${order.notes}`);
  }

  lines.push(
    ``,
    `━━━━━━━━━━━━━━━━━━━━`,
    `_Sent from ${SITE_CONFIG.name} Website_`
  );

  return lines.join('\n');
}

export function sendToWhatsApp(order) {
  const message = generateWhatsAppMessage(order);
  const encoded = encodeURIComponent(message);
  const url = `https://wa.me/${SITE_CONFIG.contact.whatsapp}?text=${encoded}`;
  
  // Clear cart after successful order
  clearCart();
  
  // Open WhatsApp
  window.open(url, '_blank');
  
  return url;
}

export function getOrderHistory() {
  const user = getCurrentUser();
  if (!user) return [];
  
  return getOrders()
    .filter(o => o.userId === user.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// ── Admin Order Management ──
export function getAllOrders() {
  return getOrders().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function updateOrderStatus(orderId, status) {
  const orders = getOrders();
  const orderIndex = orders.findIndex(o => o.orderId === orderId);
  if (orderIndex === -1) return false;
  
  orders[orderIndex].status = status;
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  
  // Optional real-time event dispatch
  window.dispatchEvent(new CustomEvent('orders-updated', { detail: { orderId, status } }));
  return true;
}

export function updateOrderPickupTime(orderId, pickupTime) {
  const orders = getOrders();
  const orderIndex = orders.findIndex(o => o.orderId === orderId);
  if (orderIndex === -1) return false;
  
  orders[orderIndex].pickupTime = pickupTime;
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  
  window.dispatchEvent(new CustomEvent('orders-updated', { detail: { orderId, pickupTime } }));
  return true;
}
