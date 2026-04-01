// ============================================
// AUTHENTICATION SERVICE
// Google SSO + Firebase Phone OTP + WhatsApp OTP
// Supabase Profiles for user data
// ============================================

import { supabase } from '../config/supabase.js';
import { firebaseAuth, RecaptchaVerifier, signInWithPhoneNumber, signOut as fbSignOut } from '../config/firebase.js';
import { refreshCartUI } from './cart.js';

const SESSION_KEY = 'ssr_session';

// ── Helpers ──

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

function formatUser(profile) {
  if (!profile) return null;
  return {
    id: profile.id || '',
    name: profile.name || '',
    phone: profile.phone || '',
    email: profile.email || '',
    avatar: profile.avatar || '',
  };
}

function cacheSession(user) {
  if (user) localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  else localStorage.removeItem(SESSION_KEY);
}

// ============================================
// 1. GOOGLE SSO (via Supabase Auth)
// ============================================

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
      queryParams: { access_type: 'offline', prompt: 'select_account' },
    },
  });
  if (error) return { success: false, error: error.message };
  return { success: true, redirecting: true };
}

export async function handleAuthCallback() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session?.user) return { success: false, error: 'Authentication failed.' };

  const user = session.user;
  const { data: existing } = await supabase.from('profiles').select('*').eq('id', user.id).limit(1);

  if (existing?.length > 0 && existing[0].phone) {
    const appUser = formatUser({ ...existing[0], avatar: user.user_metadata?.avatar_url });
    cacheSession(appUser);
    refreshCartUI();
    window.dispatchEvent(new CustomEvent('auth-changed', { detail: appUser }));
    return { success: true, user: appUser, needsPhone: false };
  }

  // New or incomplete — upsert profile, needs phone
  await supabase.from('profiles').upsert({
    id: user.id,
    name: user.user_metadata?.full_name || user.user_metadata?.name || '',
    phone: existing?.[0]?.phone || '',
    email: user.email || '',
  }, { onConflict: 'id' }).catch(() => {});

  const appUser = formatUser({
    id: user.id,
    name: user.user_metadata?.full_name || '',
    phone: '', email: user.email || '',
    avatar: user.user_metadata?.avatar_url || '',
  });
  cacheSession(appUser);
  return { success: true, user: appUser, needsPhone: true };
}

export async function savePhone(phone) {
  if (!validatePhone(phone)) return { success: false, error: 'Enter a valid 10-digit mobile number' };
  const formatted = normalizePhone(phone);
  const user = getCurrentUser();
  if (!user) return { success: false, error: 'Not signed in' };

  const { data: dup } = await supabase.from('profiles').select('id').eq('phone', formatted).neq('id', user.id).limit(1);
  if (dup?.length > 0) return { success: false, error: 'This number is already linked to another account' };

  const { error } = await supabase.from('profiles').update({ phone: formatted }).eq('id', user.id);
  if (error) return { success: false, error: 'Failed to save. Try again.' };

  const updated = { ...user, phone: formatted };
  cacheSession(updated);
  refreshCartUI();
  window.dispatchEvent(new CustomEvent('auth-changed', { detail: updated }));
  return { success: true, user: updated };
}

// ============================================
// 2. FIREBASE PHONE OTP
// ============================================

let recaptchaVerifier = null;
let confirmationResult = null;

export function setupRecaptcha(containerId) {
  if (recaptchaVerifier) { recaptchaVerifier.clear(); recaptchaVerifier = null; }
  recaptchaVerifier = new RecaptchaVerifier(firebaseAuth, containerId, { size: 'invisible' });
  return recaptchaVerifier;
}

export async function sendFirebaseOTP(phone) {
  if (!validatePhone(phone)) return { success: false, error: 'Enter a valid 10-digit mobile number' };
  const formatted = normalizePhone(phone);

  try {
    if (!recaptchaVerifier) return { success: false, error: 'reCAPTCHA not ready. Try again.' };
    confirmationResult = await signInWithPhoneNumber(firebaseAuth, formatted, recaptchaVerifier);
    return { success: true, phone: formatted };
  } catch (err) {
    recaptchaVerifier = null;
    if (err.code === 'auth/too-many-requests') return { success: false, error: 'Too many attempts. Try later.' };
    if (err.code === 'auth/invalid-phone-number') return { success: false, error: 'Invalid phone number.' };
    return { success: false, error: 'Failed to send OTP. Try again.' };
  }
}

export async function verifyFirebaseOTP(otp, name = '') {
  if (!confirmationResult) return { success: false, error: 'No OTP sent. Request a new one.' };
  if (!otp || otp.length !== 6) return { success: false, error: 'Enter the 6-digit OTP' };

  try {
    const result = await confirmationResult.confirm(otp);
    const phone = result.user.phoneNumber || '';

    // Check Supabase profile
    const { data: existing } = await supabase.from('profiles').select('*').eq('phone', phone).limit(1);

    if (existing?.length > 0) {
      const appUser = formatUser(existing[0]);
      cacheSession(appUser);
      refreshCartUI();
      window.dispatchEvent(new CustomEvent('auth-changed', { detail: appUser }));
      confirmationResult = null;
      return { success: true, user: appUser, isNew: false };
    }

    // New user — need name
    if (!name || name.trim().length < 2) {
      return { success: false, needsName: true, error: 'Enter your name' };
    }

    const profile = {
      id: 'fb_' + result.user.uid,
      name: name.trim(),
      phone, email: '',
    };
    const { error: insErr } = await supabase.from('profiles').insert(profile);
    if (insErr?.message?.includes('phone')) return { success: false, error: 'This number is already registered.' };
    if (insErr) return { success: false, error: 'Registration failed. Try again.' };

    const appUser = formatUser(profile);
    cacheSession(appUser);
    refreshCartUI();
    window.dispatchEvent(new CustomEvent('auth-changed', { detail: appUser }));
    confirmationResult = null;
    return { success: true, user: appUser, isNew: true };
  } catch (err) {
    if (err.code === 'auth/invalid-verification-code') return { success: false, error: 'Incorrect OTP.' };
    if (err.code === 'auth/code-expired') return { success: false, error: 'OTP expired. Request a new one.' };
    return { success: false, error: 'Verification failed. Try again.' };
  }
}

// ============================================
// COMMON
// ============================================

export async function logout() {
  try { await supabase.auth.signOut(); } catch {}
  try { await fbSignOut(firebaseAuth); } catch {}
  localStorage.removeItem(SESSION_KEY);
  refreshCartUI();
  window.dispatchEvent(new CustomEvent('auth-changed', { detail: null }));
}

export function getCurrentUser() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)) || null; } catch { return null; }
}

export function isLoggedIn() { return getCurrentUser() !== null; }

export async function restoreSession() {
  refreshUserCount().catch(() => {});

  // Check Supabase session (Google SSO)
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    const { data: profiles } = await supabase.from('profiles').select('*').eq('id', session.user.id).limit(1);
    if (profiles?.[0]) {
      const user = formatUser({ ...profiles[0], avatar: session.user.user_metadata?.avatar_url });
      cacheSession(user);
      return user;
    }
  }

  // Check Firebase session (Phone OTP)
  return new Promise((resolve) => {
    const unsub = firebaseAuth.onAuthStateChanged(async (fbUser) => {
      unsub();
      if (fbUser?.phoneNumber) {
        const { data } = await supabase.from('profiles').select('*').eq('phone', fbUser.phoneNumber).limit(1);
        if (data?.[0]) { cacheSession(formatUser(data[0])); resolve(formatUser(data[0])); return; }
      }
      // Check localStorage cache (WhatsApp OTP sessions)
      const cached = getCurrentUser();
      if (cached?.phone) {
        const { data } = await supabase.from('profiles').select('*').eq('phone', cached.phone).limit(1);
        if (data?.[0]) { cacheSession(formatUser(data[0])); resolve(formatUser(data[0])); return; }
      }
      localStorage.removeItem(SESSION_KEY);
      resolve(null);
    });
  });
}

let cachedUserCount = 0;
export function getAllUsersCount() { return cachedUserCount; }
export async function refreshUserCount() {
  const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
  cachedUserCount = count || 0;
}

// Supabase auth state listener (for Google SSO)
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN' && session?.user) {
    const { data: profiles } = await supabase.from('profiles').select('*').eq('id', session.user.id).limit(1);
    if (profiles?.[0]) {
      cacheSession(formatUser({ ...profiles[0], avatar: session.user.user_metadata?.avatar_url }));
      refreshCartUI();
      window.dispatchEvent(new CustomEvent('auth-changed', { detail: formatUser(profiles[0]) }));
    }
  } else if (event === 'SIGNED_OUT') {
    localStorage.removeItem(SESSION_KEY);
    refreshCartUI();
    window.dispatchEvent(new CustomEvent('auth-changed', { detail: null }));
  }
});
