// ============================================
// AUTHENTICATION SERVICE
// Google SSO (Supabase) only
// Phone number collected during checkout/subscription (no verification)
// ============================================

import { supabase } from '../config/supabase.js';
import { refreshCartUI } from './cart.js';

// ── Auth State ──
let currentAppUser = null;
let authInitialized = false;
let authInitResolve = null;
const authInitPromise = new Promise(resolve => { authInitResolve = resolve; });

// ── Helpers ──

function formatUser(profile, avatar = '') {
  if (!profile) return null;
  return {
    id: profile.id || '',
    name: profile.name || '',
    phone: profile.phone || '',
    email: profile.email || '',
    avatar: avatar || profile.avatar || '',
  };
}

function normalizePhone(phone) {
  let clean = phone.replace(/[\s\-+]/g, '');
  if (clean.length === 10 && /^[6-9]/.test(clean)) clean = '+91' + clean;
  else if (clean.startsWith('91') && clean.length === 12) clean = '+' + clean;
  else if (!clean.startsWith('+')) clean = '+' + clean;
  return clean;
}

function validatePhone(phone) {
  const clean = phone.replace(/[\s\-+]/g, '');
  return /^(91)?[6-9]\d{9}$/.test(clean);
}

// ── Profile Lookup / Creation (Supabase Auth) ──

async function loadOrCreateSupabaseProfile(sbUser) {
  const email = sbUser.email;
  const metadata = sbUser.user_metadata || {};

  // 1. Check existing profile by auth ID (most reliable — RLS allows own row)
  const { data: byId } = await supabase.from('profiles').select('*').eq('id', sbUser.id).limit(1);
  if (byId?.[0]) {
    // Update name/avatar from Google if missing locally
    const updates = {};
    if (!byId[0].name && metadata.full_name) updates.name = metadata.full_name;
    if (!byId[0].avatar && metadata.avatar_url) updates.avatar = metadata.avatar_url;
    if (!byId[0].email && email) updates.email = email;

    if (Object.keys(updates).length) {
      await supabase.from('profiles').update(updates).eq('id', sbUser.id).catch(() => {});
      Object.assign(byId[0], updates);
    }
    return formatUser(byId[0]);
  }

  // 2. No profile exists — create one
  const newProfile = {
    id: sbUser.id,
    name: metadata.full_name || '',
    phone: '',
    email: email || '',
    avatar: metadata.avatar_url || ''
  };

  const { error } = await supabase.from('profiles').upsert(newProfile, { onConflict: 'id' });
  if (error) {
    console.warn('[Auth] Profile creation failed:', error.message);
    // Still return the user data even if DB save fails — app can work with in-memory data
  }
  return formatUser(newProfile);
}

// ── Supabase Auth Listener ──

supabase.auth.onAuthStateChange(async (event, session) => {
  if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') && session?.user) {
    // Only load profile if we don't already have one for this user
    if (!currentAppUser || currentAppUser.id !== session.user.id) {
      const sbUser = session.user;
      try {
        const profile = await loadOrCreateSupabaseProfile(sbUser);
        if (profile) {
          currentAppUser = profile;
          refreshUserCount().catch(() => {});
          refreshCartUI();
          window.dispatchEvent(new CustomEvent('auth-changed', { detail: currentAppUser }));
        }
      } catch (err) {
        console.warn('[Auth] Profile load failed:', err);
        // Create a minimal user from auth data so the app doesn't break
        currentAppUser = formatUser({
          id: sbUser.id,
          name: sbUser.user_metadata?.full_name || '',
          email: sbUser.email || '',
          phone: '',
          avatar: sbUser.user_metadata?.avatar_url || '',
        });
        refreshCartUI();
        window.dispatchEvent(new CustomEvent('auth-changed', { detail: currentAppUser }));
      }
    }
  }

  if (event === 'SIGNED_OUT') {
    currentAppUser = null;
    refreshCartUI();
    window.dispatchEvent(new CustomEvent('auth-changed', { detail: null }));
  }

  if (!authInitialized) {
    authInitialized = true;
    authInitResolve();
  }
});

// ── Public API ──

export function getCurrentUser() { return currentAppUser; }
export function isLoggedIn() { return currentAppUser !== null; }
export async function waitForAuth() { return authInitPromise; }

// ============================================
// GOOGLE SSO (Supabase)
// ============================================

export async function signInWithGoogle() {
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: 'Sign-in failed. Please try again.' };
  }
}

// ============================================
// PROFILE UPDATES
// ============================================

export async function updateUserName(name) {
  if (!currentAppUser) return { success: false, error: 'Not signed in' };
  if (!name || name.trim().length < 2) return { success: false, error: 'Name must be at least 2 characters' };

  const { error } = await supabase.from('profiles').update({ name: name.trim() }).eq('id', currentAppUser.id);
  if (error) return { success: false, error: 'Failed to save name.' };

  currentAppUser = { ...currentAppUser, name: name.trim() };
  window.dispatchEvent(new CustomEvent('auth-changed', { detail: currentAppUser }));
  return { success: true, user: currentAppUser };
}

export async function savePhone(phone) {
  if (!validatePhone(phone)) return { success: false, error: 'Enter a valid 10-digit mobile number' };
  if (!currentAppUser) return { success: false, error: 'Not signed in' };

  const formatted = normalizePhone(phone);

  const { error } = await supabase.from('profiles').update({ phone: formatted }).eq('id', currentAppUser.id);
  if (error) return { success: false, error: 'Failed to save. Try again.' };

  currentAppUser = { ...currentAppUser, phone: formatted };
  refreshCartUI();
  window.dispatchEvent(new CustomEvent('auth-changed', { detail: currentAppUser }));
  return { success: true, user: currentAppUser };
}

// ============================================
// LOGOUT
// ============================================

export async function logout() {
  Object.keys(localStorage).forEach(k => {
    if (k.startsWith('ssr_cart_')) localStorage.removeItem(k);
  });

  try { await supabase.auth.signOut({ scope: 'local' }); } catch {}

  if (currentAppUser) {
    currentAppUser = null;
    refreshCartUI();
    window.dispatchEvent(new CustomEvent('auth-changed', { detail: null }));
  }
}

// ============================================
// USER COUNT
// ============================================

let cachedUserCount = 0;
export function getAllUsersCount() { return cachedUserCount; }
export async function refreshUserCount() {
  const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
  cachedUserCount = count || 0;
}
