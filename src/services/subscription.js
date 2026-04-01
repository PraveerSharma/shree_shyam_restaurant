// ============================================
// SUBSCRIPTION SERVICE
// Manages regular customers and billing history
// ============================================

import { dbSaveSubscriber, dbUpdateSubscriberBalance, dbAddBillingHistory, dbClearSubscriberBills } from './db.js';

const SUBS_KEY = 'ssr_subscribers';

export function getSubscribers() {
  try {
    return JSON.parse(localStorage.getItem(SUBS_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveSubscribers(subs) {
  localStorage.setItem(SUBS_KEY, JSON.stringify(subs));
}

export function isSubscriber(userId) {
  if (!userId) return false;
  return getSubscribers().some(s => s.userId === userId);
}

export function getSubscription(userId) {
  return getSubscribers().find(s => s.userId === userId);
}

export function subscribeUser(userId, data) {
  const subs = getSubscribers();
  if (subs.some(s => s.userId === userId)) return { success: false, error: 'User is already a subscriber' };
  
  const newSub = {
    userId,
    name: data.name,
    phone: data.phone,
    outstandingBalance: 0,
    joinedAt: new Date().toISOString(),
    billingHistory: []
  };
  
  subs.push(newSub);
  saveSubscribers(subs);
  dbSaveSubscriber(newSub).catch(err => console.warn('[DB] subscriber save failed:', err));
  return { success: true, subscriber: newSub };
}

export function addOrderToBill(userId, orderId, amount, description = '', status = 'pending') {
  const subs = getSubscribers();
  const sub = subs.find(s => s.userId === userId);
  if (!sub) return { success: false, error: 'Subscriber not found' };
  
  sub.outstandingBalance += amount;
  const entry = {
    orderId,
    amount,
    description: description || `Online Order #${orderId.split('-').pop()}`,
    date: new Date().toISOString(),
    status: status
  };
  sub.billingHistory.unshift(entry);

  saveSubscribers(subs);
  dbUpdateSubscriberBalance(userId, sub.outstandingBalance).catch(err => console.warn('[DB]', err));
  dbAddBillingHistory(userId, entry).catch(err => console.warn('[DB]', err));
  return { success: true };
}

export function approveQuickOrder(userId, orderId, amount) {
  const subs = getSubscribers();
  const sub = subs.find(s => s.userId === userId);
  if (!sub) return { success: false, error: 'Subscriber not found' };
  
  const historyItem = sub.billingHistory.find(h => h.orderId === orderId);
  if (!historyItem) return { success: false, error: 'Order not found in history' };
  
  if (historyItem.status !== 'pending_price') return { success: false, error: 'Order is already priced or cleared' };
  
  historyItem.amount = amount;
  historyItem.status = 'pending';
  sub.outstandingBalance += amount;

  saveSubscribers(subs);
  dbUpdateSubscriberBalance(userId, sub.outstandingBalance).catch(err => console.warn('[DB]', err));
  return { success: true };
}

export function addManualBill(userId, amount, description) {
  const subs = getSubscribers();
  const sub = subs.find(s => s.userId === userId);
  if (!sub) return { success: false, error: 'Subscriber not found' };
  
  sub.outstandingBalance += amount;
  const billEntry = {
    orderId: 'BILL-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
    amount,
    description: description || 'Manual Charge',
    date: new Date().toISOString(),
    status: 'pending'
  };
  sub.billingHistory.unshift(billEntry);

  saveSubscribers(subs);
  dbUpdateSubscriberBalance(userId, sub.outstandingBalance).catch(err => console.warn('[DB]', err));
  dbAddBillingHistory(userId, billEntry).catch(err => console.warn('[DB]', err));
  return { success: true };
}

export function clearOutstandingBill(userId) {
  const subs = getSubscribers();
  const sub = subs.find(s => s.userId === userId);
  if (!sub) return { success: false, error: 'Subscriber not found' };
  
  sub.outstandingBalance = 0;
  sub.billingHistory.forEach(h => {
    if (h.status === 'pending') h.status = 'cleared';
  });

  saveSubscribers(subs);
  dbClearSubscriberBills(userId).catch(err => console.warn('[DB]', err));
  return { success: true };
}

export function clearPartialAmount(userId, amount) {
  const subs = getSubscribers();
  const sub = subs.find(s => s.userId === userId);
  if (!sub) return { success: false, error: 'Subscriber not found' };
  
  const clearAmount = parseFloat(amount);
  if (isNaN(clearAmount) || clearAmount <= 0) return { success: false, error: 'Invalid amount' };
  
  sub.outstandingBalance = Math.max(0, sub.outstandingBalance - clearAmount);
  
  // Clear items using FIFO
  let remainingPayment = clearAmount;
  // Use reverse copy of history to find oldest pending items
  const history = [...sub.billingHistory].reverse();
  
  for (const item of history) {
    if (item.status === 'pending' && item.amount > 0) {
      if (remainingPayment >= item.amount) {
        remainingPayment -= item.amount;
        // Find original reference and clear it
        const original = sub.billingHistory.find(h => h.orderId === item.orderId);
        if (original) original.status = 'cleared';
      } else {
        // Partial payment doesn't clear the individual item in this simple model,
        // but the overall balance is already reduced.
        break;
      }
    }
  }
  
  saveSubscribers(subs);
  dbUpdateSubscriberBalance(userId, sub.outstandingBalance).catch(err => console.warn('[DB]', err));
  return { success: true };
}

export function updateSubscriberOrderTotal(userId, orderId, oldTotal, newTotal) {
  const subs = getSubscribers();
  const sub = subs.find(s => s.userId === userId);
  if (!sub) return { success: false };

  sub.outstandingBalance = (sub.outstandingBalance - oldTotal) + newTotal;
  const historyItem = sub.billingHistory.find(h => h.orderId === orderId);
  if (historyItem) {
    historyItem.amount = newTotal;
  }
  saveSubscribers(subs);
  dbUpdateSubscriberBalance(userId, sub.outstandingBalance).catch(err => console.warn('[DB]', err));
  return { success: true };
}

export function createAdminSubscriber(data) {
  const userId = `sub_${Date.now()}`;
  return subscribeUser(userId, data);
}

export function generateBillSummary(sub) {
  const lines = [
    `📊 *BILL SUMMARY - Shree Shyam Restaurant*`,
    `----------------------------------`,
    `👤 *Customer:* ${sub.name}`,
    `📱 *Phone:* ${sub.phone}`,
    `💰 *Outstanding Balance:* ₹${sub.outstandingBalance}`,
    `📅 *As of:* ${new Date().toLocaleDateString('en-IN')}`,
    `----------------------------------`,
    `Please clear the outstanding amount at your earliest convenience. Thank you for being a regular guest! 🙏`
  ];
  return lines.join('\n');
}

export function getTotalClearedRevenue() {
  const subs = getSubscribers();
  return subs.reduce((total, sub) => {
    // Total Billed = All items, excluding ones with no price set yet
    const billed = sub.billingHistory
      .filter(h => h.status !== 'pending_price')
      .reduce((sum, h) => sum + (h.amount || 0), 0);
    
    // Revenue = Billed amount that is NO LONGER outstanding
    const paid = billed - (sub.outstandingBalance || 0);
    return total + Math.max(0, paid);
  }, 0);
}
