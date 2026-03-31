// ============================================
// ORDERS SERVICE
// Order creation & WhatsApp integration
// ============================================

import { SITE_CONFIG } from '../config/site.js';
import { formatPrice } from '../utils/format.js';
import { sanitizeInput } from '../utils/dom.js';
import { clearCart } from './cart.js';
import { getCurrentUser } from './auth.js';
import { addOrderToBill, isSubscriber } from './subscription.js';

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
    paymentMethod: customerInfo.paymentMethod || 'Cash on Delivery',
    status: 'pending',
    createdAt: new Date().toISOString(),
    timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
  };

  // If monthly bill selected, add to their balance
  if (order.paymentMethod === 'Monthly Billing' && isSubscriber(user.id)) {
    addOrderToBill(user.id, order.orderId, order.total);
    order.status = 'accepted'; // Auto-accept credit orders from subscribers
  }

  // Save order
  const orders = getOrders();
  orders.push(order);
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));

  // Clear cart after successful order creation
  clearCart();

  return { success: true, order };
}

export function createOfflineOrder(items, customerInfo) {
  // Sanitize
  const customerName = sanitizeInput(customerInfo.name || 'Walk-in Customer').trim();
  const customerPhone = sanitizeInput(customerInfo.phone || '').trim();
  const notes = sanitizeInput(customerInfo.notes || '').trim();

  const order = {
    orderId: generateOrderId(),
    userId: 'offline',
    isOffline: true,
    customerName,
    customerPhone: customerPhone || 'N/A',
    pickupDate: sanitizeInput(customerInfo.pickupDate || new Date().toLocaleDateString('en-GB')),
    pickupTime: sanitizeInput(customerInfo.pickupTime || 'Immediate'),
    notes: notes.slice(0, 500),
    items: items.map(item => ({
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      subtotal: item.price * item.quantity,
    })),
    total: items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
    paymentMethod: 'Cash (Offline)',
    status: 'accepted', // Initial status for offline orders
    createdAt: new Date().toISOString(),
    timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
  };

  // Save order
  const orders = getOrders();
  orders.push(order);
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));

  return { success: true, order };
}

export function createQuickOrder(userId, description) {
  const ordersHistory = getOrders();
  const order = {
    orderId: generateOrderId(),
    userId,
    customerName: 'Subscriber Quick Order',
    customerPhone: 'N/A',
    pickupDate: new Date().toLocaleDateString('en-GB'),
    pickupTime: 'Quick Order',
    notes: `Quick Order: ${description}`,
    items: [{
      name: `Quick Order Description: ${description}`,
      quantity: 1,
      price: 0,
      subtotal: 0
    }],
    total: 0,
    paymentMethod: 'Monthly Billing',
    status: 'accepted',
    createdAt: new Date().toISOString(),
    timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
  };

  // Add to bill history with the description (status: pending_price, amount: 0)
  // Admin will fill the price later.
  addOrderToBill(userId, order.orderId, 0, `Quick Order Request: ${description}`, 'pending_price');

  ordersHistory.push(order);
  localStorage.setItem(ORDERS_KEY, JSON.stringify(ordersHistory));

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
    .map(o => ({ ...o, pickupTime: o.pickupTime || '10:00 AM - 02:00 PM' }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// ── Admin Order Management ──
export function getAllOrders() {
  return getOrders()
    .map(o => ({ ...o, pickupTime: o.pickupTime || '10:00 AM - 02:00 PM' }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
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
export function updateOrderItems(orderId, newItems) {
  const orders = getOrders();
  const orderIndex = orders.findIndex(o => o.orderId === orderId);
  if (orderIndex === -1) return { success: false, error: 'Order not found' };

  const oldTotal = orders[orderIndex].total;
  const newTotal = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  // Calculate difference if it's a monthly billing order
  if (orders[orderIndex].paymentMethod === 'Monthly Billing') {
    const { getSubscribers, saveSubscribers } = import.meta.glob('./subscription.js', { eager: true })['./subscription.js'];
    const subs = getSubscribers();
    const sub = subs.find(s => s.userId === orders[orderIndex].userId);
    if (sub) {
      sub.outstandingBalance = (sub.outstandingBalance - oldTotal) + newTotal;
      const historyItem = sub.billingHistory.find(h => h.orderId === orderId);
      if (historyItem) {
        historyItem.amount = newTotal;
      }
      saveSubscribers(subs);
    }
  }

  orders[orderIndex].items = newItems.map(item => ({
    name: item.name,
    quantity: item.quantity,
    price: item.price,
    subtotal: item.price * item.quantity,
  }));
  orders[orderIndex].total = newTotal;
  
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  window.dispatchEvent(new CustomEvent('orders-updated', { detail: { orderId } }));
  
  return { success: true, order: orders[orderIndex] };
}
