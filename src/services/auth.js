// ============================================
// AUTHENTICATION SERVICE
// Supabase Auth (email/password, server-side hashing)
// ============================================

import { supabase } from '../config/supabase.js';
import { sanitizeInput } from '../utils/dom.js';
import { formatPhoneNumber } from '../utils/format.js';
import { refreshCartUI } from './cart.js';

const SESSION_KEY = 'ssr_session';

// ── Validation ──

function validateEmail(email) {
  return /^[a-zA-Z0-9]([a-zA-Z0-9._%+-]*[a-zA-Z0-9])?@gmail\.com$/.test(email);
}

function validatePhone(phone) {
  return /^(\+91[\-\s]?)?[6-9]\d{9}$/.test(phone.replace(/\s/g, ''));
}

function validatePassword(password) {
  if (password.length < 6) return 'Password must be at least 6 characters';
  if (password.length > 128) return 'Password is too long';
  return null;
}

// ── Helper: format Supabase user → app user shape ──

function formatUser(supaUser) {
  if (!supaUser) return null;
  return {
    id: supaUser.id,
    name: supaUser.user_metadata?.name || '',
    phone: supaUser.user_metadata?.phone || '',
    email: supaUser.email || '',
  };
}

// ── Cache session in localStorage for synchronous getCurrentUser() reads ──

function cacheSession(user) {
  if (user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
}

// ── Register ──

export async function register({ name, phone, email, password }) {
  name = sanitizeInput(name).trim();
  phone = formatPhoneNumber(sanitizeInput(phone).trim()).replace(/\s/g, '');
  email = sanitizeInput(email).trim().toLowerCase();

  if (!name || name.length < 2) return { success: false, error: 'Name must be at least 2 characters' };
  if (name.length > 100) return { success: false, error: 'Name is too long' };
  if (!validateEmail(email)) return { success: false, error: 'Only Gmail addresses are accepted (example@gmail.com)' };
  if (!validatePhone(phone)) return { success: false, error: 'Please enter a valid Indian phone number' };

  const pwError = validatePassword(password);
  if (pwError) return { success: false, error: pwError };

  // Check phone uniqueness — query existing users with same phone
  const { data: existingPhone } = await supabase
    .from('profiles')
    .select('id')
    .eq('phone', phone)
    .limit(1);

  if (existingPhone && existingPhone.length > 0) {
    return { success: false, error: 'An account with this phone number already exists' };
  }

  // Register via Supabase Auth
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, phone }, // stored in user_metadata
    },
  });

  if (error) {
    if (error.message.includes('already registered')) {
      return { success: false, error: 'An account with this email already exists' };
    }
    return { success: false, error: error.message };
  }

  // Save profile to public profiles table (for phone uniqueness and admin queries)
  const user = formatUser(data.user);
  if (user) {
    await supabase.from('profiles').upsert({
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
    }, { onConflict: 'id' }).catch(() => {});

    cacheSession(user);
    refreshCartUI();
    window.dispatchEvent(new CustomEvent('auth-changed', { detail: user }));
  }

  return { success: true, user };
}

// ── Login ──

export async function login(email, password) {
  email = sanitizeInput(email).trim().toLowerCase();

  if (!validateEmail(email)) return { success: false, error: 'Please enter a valid Gmail address (example@gmail.com)' };

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { success: false, error: 'Invalid email or password' };
  }

  const user = formatUser(data.user);
  if (user) {
    cacheSession(user);
    refreshCartUI();
    window.dispatchEvent(new CustomEvent('auth-changed', { detail: user }));
  }

  return { success: true, user };
}

// ── Logout ──

export async function logout() {
  await supabase.auth.signOut().catch(() => {});
  localStorage.removeItem(SESSION_KEY);
  refreshCartUI();
  window.dispatchEvent(new CustomEvent('auth-changed', { detail: null }));
}

// ── Get Current User (synchronous — reads from localStorage cache) ──

export function getCurrentUser() {
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY));
    return session || null;
  } catch {
    return null;
  }
}

export function isLoggedIn() {
  return getCurrentUser() !== null;
}

// ── Restore session on app init (checks Supabase for valid JWT) ──

export async function restoreSession() {
  const { data: { session } } = await supabase.auth.getSession();
  // Refresh user count for admin metrics (background)
  refreshUserCount().catch(() => {});
  if (session?.user) {
    const user = formatUser(session.user);
    cacheSession(user);
    return user;
  }
  // No valid session — clear stale cache
  localStorage.removeItem(SESSION_KEY);
  return null;
}

// ── Reset Password (via email + phone verification) ──

export async function resetPassword(email, phone, newPassword) {
  email = sanitizeInput(email).trim().toLowerCase();
  phone = sanitizeInput(phone).trim();

  if (!validateEmail(email)) {
    return { success: false, error: 'Please enter a valid Gmail address' };
  }

  const pwError = validatePassword(newPassword);
  if (pwError) return { success: false, error: pwError };

  // Verify phone matches the stored profile
  const { data: profiles } = await supabase
    .from('profiles')
    .select('phone')
    .eq('email', email)
    .limit(1);

  if (!profiles || profiles.length === 0) {
    return { success: false, error: 'No account found with this email' };
  }

  const cleanInput = phone.replace(/[\s\-+]/g, '').replace(/^91/, '');
  const cleanStored = profiles[0].phone.replace(/[\s\-+]/g, '').replace(/^91/, '');

  if (cleanInput !== cleanStored) {
    return { success: false, error: 'Phone number does not match our records' };
  }

  // Update password via Supabase Auth (requires user to be signed in,
  // so we sign them in first with a workaround — admin API or magic link)
  // For now, we use the admin-level update via service role is not available client-side.
  // The pragmatic approach: sign the user in won't work without the old password.
  // So we'll use Supabase's password reset email flow as a fallback.
  return { success: false, error: 'Please use "Forgot Password" link — a reset email will be sent to your Gmail' };
}

// ── Admin Metrics ──

let cachedUserCount = 0;

export function getAllUsersCount() {
  // Return cached count synchronously — updated on restoreSession
  return cachedUserCount;
}

export async function refreshUserCount() {
  const { count } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });
  cachedUserCount = count || 0;
  return cachedUserCount;
}

// ── Listen for auth state changes (auto-sync session) ──

supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' && session?.user) {
    cacheSession(formatUser(session.user));
  } else if (event === 'SIGNED_OUT') {
    localStorage.removeItem(SESSION_KEY);
  }
});
