// ============================================
// AUTHENTICATION SERVICE (Firebase Auth Only)
// Google SSO (popup) + Phone OTP via Firebase
// Supabase for profile data storage only
// ============================================

import { supabase } from '../config/supabase.js';
import {
  firebaseAuth, GoogleAuthProvider, signInWithPopup,
  RecaptchaVerifier, signInWithPhoneNumber, signOut,
} from '../config/firebase.js';
import { refreshCartUI } from './cart.js';

// ── Auth State ──
let currentAppUser = null;
let authInitialized = false;
let authInitResolve = null;
const authInitPromise = new Promise(resolve => { authInitResolve = resolve; });
let profileLoadedResolve = null;

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

// ── Profile Lookup / Creation ──

async function loadOrCreateProfile(fbUser) {
  const uid = fbUser.uid;

  // 1. Try by email (Google SSO — existing users may have Supabase UUID as ID)
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

  // 2. Try by phone (Phone OTP users)
  if (fbUser.phoneNumber) {
    const { data } = await supabase.from('profiles').select('*').eq('phone', fbUser.phoneNumber).limit(1);
    if (data?.[0]) {
      const updates = {};
      if (!data[0].name && fbUser.displayName) updates.name = fbUser.displayName;
      if (!data[0].email && fbUser.email) updates.email = fbUser.email;
      if (Object.keys(updates).length) {
        await supabase.from('profiles').update(updates).eq('id', data[0].id).catch(() => {});
        Object.assign(data[0], updates);
      }
      return formatUser(data[0], fbUser.photoURL);
    }
  }

  // 3. Try by Firebase UID or legacy fb_ prefix
  const { data: byId } = await supabase.from('profiles').select('*').eq('id', uid).limit(1);
  if (byId?.[0]) return formatUser(byId[0], fbUser.photoURL);

  const { data: byLegacy } = await supabase.from('profiles').select('*').eq('id', 'fb_' + uid).limit(1);
  if (byLegacy?.[0]) return formatUser(byLegacy[0], fbUser.photoURL);

  // 4. New user — create profile
  const newProfile = {
    id: uid,
    name: fbUser.displayName || '',
    phone: fbUser.phoneNumber || '',
    email: fbUser.email || '',
  };
  await supabase.from('profiles').upsert(newProfile, { onConflict: 'id' }).catch(() => {});
  return formatUser(newProfile, fbUser.photoURL);
}

// ── Firebase Auth State Listener (single source of truth) ──
// This fires on: sign-in, sign-out, page load (session restore), token refresh

firebaseAuth.onAuthStateChanged(async (fbUser) => {
  if (fbUser) {
    currentAppUser = await loadOrCreateProfile(fbUser);
  } else {
    currentAppUser = null;
  }

  if (!authInitialized) {
    authInitialized = true;
    authInitResolve();
  }

  if (profileLoadedResolve) {
    profileLoadedResolve();
    profileLoadedResolve = null;
  }

  refreshUserCount().catch(() => {});
  refreshCartUI();
  window.dispatchEvent(new CustomEvent('auth-changed', { detail: currentAppUser }));
});

// ── Public API ──

export function getCurrentUser() {
  return currentAppUser;
}

export function isLoggedIn() { return getCurrentUser() !== null; }

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
// PHONE OTP (Firebase)
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

export async function verifyFirebaseOTP(otp) {
  if (!confirmationResult) return { success: false, error: 'No OTP sent. Request a new one.' };
  if (!otp || otp.length !== 6) return { success: false, error: 'Enter the 6-digit OTP' };

  try {
    const profileLoaded = new Promise(r => { profileLoadedResolve = r; });
    await confirmationResult.confirm(otp);
    confirmationResult = null;
    await profileLoaded; // Wait for onAuthStateChanged to load/create profile

    const user = getCurrentUser();
    if (!user) return { success: false, error: 'Verification failed.' };

    const needsName = !user.name || user.name.trim().length < 2;
    return { success: true, user, isNew: needsName, needsName };
  } catch (err) {
    if (err.code === 'auth/invalid-verification-code') return { success: false, error: 'Incorrect OTP.' };
    if (err.code === 'auth/code-expired') return { success: false, error: 'OTP expired. Request a new one.' };
    return { success: false, error: 'Verification failed. Try again.' };
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

  // Check for duplicate phone
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
  // Clear user-specific carts before sign-out
  Object.keys(localStorage).forEach(k => {
    if (k.startsWith('ssr_cart_')) localStorage.removeItem(k);
  });

  try { await signOut(firebaseAuth); } catch {}
  // onAuthStateChanged handles clearing state and dispatching events
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
