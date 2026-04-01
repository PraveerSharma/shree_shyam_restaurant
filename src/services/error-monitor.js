// ============================================
// LIGHTWEIGHT ERROR MONITORING
// Captures uncaught errors → Supabase error_logs table
// ============================================

import { supabase } from '../config/supabase.js';
import { getCurrentUser } from './auth.js';

const MAX_ERRORS_PER_SESSION = 10;
let errorCount = 0;

async function logError(message, stack = '', extra = {}) {
  if (errorCount >= MAX_ERRORS_PER_SESSION) return; // Prevent flood
  errorCount++;

  const user = getCurrentUser() || {};

  try {
    await supabase.from('error_logs').insert({
      message: (message || 'Unknown error').slice(0, 1000),
      stack: (stack || '').slice(0, 5000),
      url: window.location.href,
      user_agent: navigator.userAgent.slice(0, 500),
      user_id: user.id || '',
    });
  } catch {
    // Silently fail — error monitoring should never break the app
  }
}

// Global error handler
window.addEventListener('error', (event) => {
  logError(
    event.message || 'Uncaught error',
    event.error?.stack || `${event.filename}:${event.lineno}:${event.colno}`
  );
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  logError(
    reason?.message || String(reason) || 'Unhandled Promise rejection',
    reason?.stack || ''
  );
});

export { logError };
