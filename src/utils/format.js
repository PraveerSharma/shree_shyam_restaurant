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
