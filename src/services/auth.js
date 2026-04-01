// ============================================
// AUTHENTICATION SERVICE
// Google SSO via Supabase Auth + Phone collection
// ============================================

import { supabase } from '../config/supabase.js';
import { refreshCartUI } from './cart.js';

const SESSION_KEY = 'ssr_session';

// ── Format Supabase user → app user ──

function formatUser(supaUser, profile = null) {
  if (!supaUser) return null;
  return {
    id: supaUser.id,
    name: profile?.name || supaUser.user_metadata?.full_name || supaUser.user_metadata?.name || '',
    phone: profile?.phone || supaUser.user_metadata?.phone || '',
    email: supaUser.email || '',
    avatar: supaUser.user_metadata?.avatar_url || '',
  };
}

// ── Session cache ──

function cacheSession(user) {
  if (user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
}

// ── Google Sign In ──

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + '/#/auth-callback',
      queryParams: {
        access_type: 'offline',
        prompt: 'select_account',
      },
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  // OAuth redirects the user — no immediate return
  return { success: true, redirecting: true };
}

// ── Handle OAuth callback (called after Google redirects back) ──

export async function handleAuthCallback() {
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error || !session?.user) {
    return { success: false, error: 'Authentication failed. Please try again.' };
  }

  const user = session.user;

  // Check if profile exists
  const { data: existing } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .limit(1);

  if (existing && existing.length > 0) {
    const profile = existing[0];
    if (profile.phone) {
      // Returning user with phone — fully set up
      const appUser = formatUser(user, profile);
      cacheSession(appUser);
      refreshCartUI();
      window.dispatchEvent(new CustomEvent('auth-changed', { detail: appUser }));
      return { success: true, user: appUser, needsPhone: false };
    } else {
      // User exists but no phone — needs phone
      const appUser = formatUser(user, profile);
      cacheSession(appUser);
      return { success: true, user: appUser, needsPhone: true };
    }
  }

  // New user — create profile, needs phone
  const newProfile = {
    id: user.id,
    name: user.user_metadata?.full_name || user.user_metadata?.name || '',
    phone: '',
    email: user.email || '',
  };

  await supabase.from('profiles').upsert(newProfile, { onConflict: 'id' }).catch(() => {});

  const appUser = formatUser(user, newProfile);
  cacheSession(appUser);
  return { success: true, user: appUser, needsPhone: true };
}

// ── Save phone number after Google sign-in ──

export async function savePhone(phone) {
  const clean = phone.replace(/[\s\-+]/g, '');
  if (!/^(91)?[6-9]\d{9}$/.test(clean)) {
    return { success: false, error: 'Please enter a valid 10-digit Indian mobile number' };
  }

  const formatted = clean.length === 10 ? '+91' + clean : '+' + clean;
  const user = getCurrentUser();
  if (!user) return { success: false, error: 'Not logged in' };

  // Check phone uniqueness
  const { data: existingPhone } = await supabase
    .from('profiles')
    .select('id')
    .eq('phone', formatted)
    .neq('id', user.id)
    .limit(1);

  if (existingPhone && existingPhone.length > 0) {
    return { success: false, error: 'This phone number is already linked to another account' };
  }

  // Update profile
  const { error } = await supabase
    .from('profiles')
    .update({ phone: formatted })
    .eq('id', user.id);

  if (error) {
    return { success: false, error: 'Failed to save phone number. Please try again.' };
  }

  // Update cached session
  const updated = { ...user, phone: formatted };
  cacheSession(updated);
  refreshCartUI();
  window.dispatchEvent(new CustomEvent('auth-changed', { detail: updated }));

  return { success: true, user: updated };
}

// ── Logout ──

export async function logout() {
  await supabase.auth.signOut().catch(() => {});
  localStorage.removeItem(SESSION_KEY);
  refreshCartUI();
  window.dispatchEvent(new CustomEvent('auth-changed', { detail: null }));
}

// ── Get Current User (synchronous) ──

export function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY)) || null;
  } catch {
    return null;
  }
}

export function isLoggedIn() {
  return getCurrentUser() !== null;
}

// ── Restore session on app init ──

export async function restoreSession() {
  refreshUserCount().catch(() => {});

  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    // Fetch profile from Supabase
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .limit(1);

    const profile = profiles?.[0] || null;
    const user = formatUser(session.user, profile);
    cacheSession(user);
    return user;
  }

  localStorage.removeItem(SESSION_KEY);
  return null;
}

// ── Admin Metrics ──

let cachedUserCount = 0;

export function getAllUsersCount() {
  return cachedUserCount;
}

export async function refreshUserCount() {
  const { count } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });
  cachedUserCount = count || 0;
  return cachedUserCount;
}

// ── Listen for auth state changes ──

supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN' && session?.user) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .limit(1);

    const profile = profiles?.[0] || null;
    const user = formatUser(session.user, profile);
    cacheSession(user);
    refreshCartUI();
    window.dispatchEvent(new CustomEvent('auth-changed', { detail: user }));
  } else if (event === 'SIGNED_OUT') {
    localStorage.removeItem(SESSION_KEY);
    refreshCartUI();
    window.dispatchEvent(new CustomEvent('auth-changed', { detail: null }));
  }
});
