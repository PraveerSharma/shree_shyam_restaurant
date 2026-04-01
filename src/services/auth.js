// ============================================
// AUTHENTICATION SERVICE
// Google SSO (Firebase) + Email Magic Link (Supabase Auth)
// Phone number collected after auth (no OTP)
// ============================================

import { supabase } from '../config/supabase.js';
import { firebaseAuth, GoogleAuthProvider, signInWithPopup, signOut } from '../config/firebase.js';
import { refreshCartUI } from './cart.js';

// ── Auth State ──
let currentAppUser = null;
let authInitialized = false;
let authInitResolve = null;
const authInitPromise = new Promise(resolve => { authInitResolve = resolve; });
let profileLoadedResolve = null;

// Track which listeners have fired on init
let firebaseReady = false;
let supabaseReady = false;

function markReady(source) {
  if (source === 'firebase') firebaseReady = true;
  if (source === 'supabase') supabaseReady = true;
  if (firebaseReady && supabaseReady && !authInitialized) {
    authInitialized = true;
    authInitResolve();
  }
}

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

// ── Profile Lookup / Creation (Google SSO via Firebase) ──

async function loadOrCreateProfile(fbUser) {
  const uid = fbUser.uid;

  if (fbUser.email) {
    const { data } = await supabase.from('profiles').select('*').eq('email', fbUser.email).limit(1);
    if (data?.[0]) {
      const updates = {};
      if (!data[0].name && fbUser.displayName) updates.name = fbUser.displayName;
      if (!data[0].phone && fbUser.phoneNumber) updates.phone = fbUser.phoneNumber;
      if (Object.keys(updates).length) {
        await supabase.from('profiles').update(updates).eq('id', data[0].id).catch(() => {});
        Object.assign(data[0], updates);
      }
      return formatUser(data[0], fbUser.photoURL);
    }
  }

  if (fbUser.phoneNumber) {
    const { data } = await supabase.from('profiles').select('*').eq('phone', fbUser.phoneNumber).limit(1);
    if (data?.[0]) return formatUser(data[0], fbUser.photoURL);
  }

  const { data: byId } = await supabase.from('profiles').select('*').eq('id', uid).limit(1);
  if (byId?.[0]) return formatUser(byId[0], fbUser.photoURL);

  const { data: byLegacy } = await supabase.from('profiles').select('*').eq('id', 'fb_' + uid).limit(1);
  if (byLegacy?.[0]) return formatUser(byLegacy[0], fbUser.photoURL);

  const newProfile = { id: uid, name: fbUser.displayName || '', phone: fbUser.phoneNumber || '', email: fbUser.email || '' };
  await supabase.from('profiles').upsert(newProfile, { onConflict: 'id' }).catch(() => {});
  return formatUser(newProfile, fbUser.photoURL);
}

// ── Profile Lookup / Creation (Email Magic Link via Supabase Auth) ──

async function loadOrCreateSupabaseProfile(sbUser) {
  const email = sbUser.email;

  // Check existing profile by email
  const { data } = await supabase.from('profiles').select('*').eq('email', email).limit(1);
  if (data?.[0]) return formatUser(data[0]);

  // Check by Supabase auth ID
  const { data: byId } = await supabase.from('profiles').select('*').eq('id', sbUser.id).limit(1);
  if (byId?.[0]) return formatUser(byId[0]);

  // Create new profile
  const newProfile = { id: sbUser.id, name: '', phone: '', email };
  await supabase.from('profiles').upsert(newProfile, { onConflict: 'id' }).catch(() => {});
  return formatUser(newProfile);
}

// ── Firebase Auth Listener (Google SSO) ──

firebaseAuth.onAuthStateChanged(async (fbUser) => {
  if (fbUser) {
    currentAppUser = await loadOrCreateProfile(fbUser);
  }
  // Don't set null here — Supabase email session might exist

  markReady('firebase');

  if (profileLoadedResolve) {
    profileLoadedResolve();
    profileLoadedResolve = null;
  }

  refreshUserCount().catch(() => {});
  refreshCartUI();
  window.dispatchEvent(new CustomEvent('auth-changed', { detail: currentAppUser }));
});

// ── Supabase Auth Listener (Email Magic Link) ──

supabase.auth.onAuthStateChange(async (event, session) => {
  if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
    const sbUser = session.user;
    // Only handle Supabase email auth users (not Google SSO via Firebase)
    if (!currentAppUser || currentAppUser.email === sbUser.email) {
      const profile = await loadOrCreateSupabaseProfile(sbUser);
      if (profile) {
        currentAppUser = profile;
        refreshUserCount().catch(() => {});
        refreshCartUI();
        window.dispatchEvent(new CustomEvent('auth-changed', { detail: currentAppUser }));
      }
    }
  }

  if (event === 'SIGNED_OUT' && !firebaseAuth.currentUser) {
    currentAppUser = null;
    refreshCartUI();
    window.dispatchEvent(new CustomEvent('auth-changed', { detail: null }));
  }

  markReady('supabase');
});

// ── Public API ──

export function getCurrentUser() { return currentAppUser; }
export function isLoggedIn() { return currentAppUser !== null; }
export async function waitForAuth() { return authInitPromise; }

// ============================================
// GOOGLE SSO (Firebase Popup)
// ============================================

export async function signInWithGoogle() {
  try {
    const profileLoaded = new Promise(r => { profileLoadedResolve = r; });
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    await signInWithPopup(firebaseAuth, provider);
    await profileLoaded;

    const user = getCurrentUser();
    if (!user) return { success: false, error: 'Authentication failed.' };
    return { success: true, user, needsPhone: !user.phone };
  } catch (err) {
    if (err.code === 'auth/popup-closed-by-user') return { success: false, error: 'Sign-in was cancelled.' };
    if (err.code === 'auth/popup-blocked') return { success: false, error: 'Pop-up blocked. Please allow pop-ups for this site.' };
    if (err.code === 'auth/cancelled-popup-request') return { success: false, error: '' };
    return { success: false, error: 'Sign-in failed. Please try again.' };
  }
}

// ============================================
// EMAIL MAGIC LINK (Supabase Auth)
// ============================================

export async function signInWithEmail(email) {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: 'Please enter a valid email address.' };
  }

  try {
    const redirectTo = window.location.origin + '/#/';
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });
    if (error) {
      if (error.message?.includes('rate limit')) return { success: false, error: 'Too many attempts. Please wait a minute.' };
      return { success: false, error: error.message || 'Failed to send link. Try again.' };
    }
    return { success: true };
  } catch {
    return { success: false, error: 'Something went wrong. Please try again.' };
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

  const { data: dup } = await supabase.from('profiles').select('id').eq('phone', formatted).neq('id', currentAppUser.id).limit(1);
  if (dup?.length > 0) return { success: false, error: 'This number is already linked to another account' };

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

  try { await signOut(firebaseAuth); } catch {}
  try { await supabase.auth.signOut(); } catch {}

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
