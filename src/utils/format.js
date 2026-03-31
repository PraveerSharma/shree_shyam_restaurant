// ============================================
// FORMAT UTILITIES
// Price, date, and text formatting
// ============================================

import { SITE_CONFIG } from '../config/site.js';

export function formatPrice(amount) {
  return `${SITE_CONFIG.currency.symbol}${Number(amount).toLocaleString('en-IN')}`;
}

export function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getMinPickupDate() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
}

export function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

export function truncateText(text, maxLength = 100) {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

export function isDueSoon(dateStr) {
  if (!dateStr) return false;
  // Parse date from DD/MM/YYYY or YYYY-MM-DD
  let parts;
  if (dateStr.includes('/')) {
    parts = dateStr.split('/');
    // Check if it's DD/MM/YYYY
    if (parts[0].length <= 2) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const y = parseInt(parts[2], 10);
      const pickupDate = new Date(y, m, d);
      return checkDateDiff(pickupDate);
    }
  }
  
  const pickupDate = new Date(dateStr);
  return checkDateDiff(pickupDate);
}

function checkDateDiff(pickupDate) {
  if (isNaN(pickupDate.getTime())) return false;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  pickupDate.setHours(0, 0, 0, 0);
  
  const diffTime = pickupDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // Tag if today, tomorrow, or day after (diffDays 0, 1, 2)
  return diffDays >= 0 && diffDays <= 2;
}

export function formatPhoneNumber(phone) {
  if (!phone || phone === 'N/A') return 'N/A';
  const clean = phone.toString().replace(/[\s\-+]/g, '');
  if (clean.length === 10) return '+91 ' + clean;
  if (clean.length === 12 && clean.startsWith('91')) {
    return '+91 ' + clean.substring(2);
  }
  return phone.startsWith('+') ? phone : '+91 ' + phone;
}
