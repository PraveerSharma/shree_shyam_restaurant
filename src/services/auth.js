// ============================================
// AUTHENTICATION SERVICE
// Firebase Phone OTP + Supabase Profiles
// ============================================

import { firebaseAuth, RecaptchaVerifier, signInWithPhoneNumber, signOut } from '../config/firebase.js';
import { supabase } from '../config/supabase.js';
import { sanitizeInput } from '../utils/dom.js';
import { formatPhoneNumber } from '../utils/format.js';
import { refreshCartUI } from './cart.js';

const SESSION_KEY = 'ssr_session';

// ── Validation ──

function validatePhone(phone) {
  const clean = phone.replace(/[\s\-+]/g, '');
  // 10 digits or 12 digits starting with 91
  return /^(91)?[6-9]\d{9}$/.test(clean);
}

function normalizePhone(phone) {
  let clean = phone.replace(/[\s\-+]/g, '');
  if (clean.length === 10 && /^[6-9]/.test(clean)) clean = '91' + clean;
  if (!clean.startsWith('+')) clean = '+' + clean;
  return clean; // returns "+91XXXXXXXXXX"
}

// ── Format user for app ──

function formatUser(profile) {
  if (!profile) return null;
  return {
    id: profile.id,
    name: profile.name || '',
    phone: profile.phone || '',
    email: profile.email || '',
  };
}

// ── Session cache (synchronous reads for UI) ──

function cacheSession(user) {
  if (user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
}

// ── reCAPTCHA setup (required by Firebase Phone Auth) ──

let recaptchaVerifier = null;
let confirmationResult = null;

export function setupRecaptcha(buttonId) {
  if (recaptchaVerifier) {
    recaptchaVerifier.clear();
    recaptchaVerifier = null;
  }
  recaptchaVerifier = new RecaptchaVerifier(firebaseAuth, buttonId, {
    size: 'invisible',
    callback: () => {
      // reCAPTCHA solved
    },
  });
  return recaptchaVerifier;
}

// ── Send OTP ──

export async function sendOTP(phone) {
  const clean = phone.replace(/[\s\-+]/g, '');
  if (!validatePhone(clean)) {
    return { success: false, error: 'Please enter a valid 10-digit Indian mobile number' };
  }

  const formatted = normalizePhone(clean);

  try {
    if (!recaptchaVerifier) {
      return { success: false, error: 'reCAPTCHA not initialized. Please try again.' };
    }

    confirmationResult = await signInWithPhoneNumber(firebaseAuth, formatted, recaptchaVerifier);
    return { success: true };
  } catch (error) {
    console.error('[Auth] OTP send failed:', error);
    // Reset recaptcha on failure
    recaptchaVerifier = null;

    if (error.code === 'auth/too-many-requests') {
      return { success: false, error: 'Too many attempts. Please try again later.' };
    }
    if (error.code === 'auth/invalid-phone-number') {
      return { success: false, error: 'Invalid phone number format.' };
    }
    return { success: false, error: 'Failed to send OTP. Please try again.' };
  }
}

// ── Verify OTP ──

export async function verifyOTP(otp, name = '') {
  if (!confirmationResult) {
    return { success: false, error: 'No OTP was sent. Please request a new one.' };
  }

  if (!otp || otp.length !== 6) {
    return { success: false, error: 'Please enter the 6-digit OTP' };
  }

  try {
    const result = await confirmationResult.confirm(otp);
    const fbUser = result.user;
    const phone = fbUser.phoneNumber || '';

    // Check if profile exists in Supabase
    const { data: existing } = await supabase
      .from('profiles')
      .select('*')
      .eq('phone', phone)
      .limit(1);

    let profile;

    if (existing && existing.length > 0) {
      // Existing user — login
      profile = existing[0];
      // Update Firebase UID if changed
      if (profile.firebase_uid !== fbUser.uid) {
        await supabase.from('profiles').update({ firebase_uid: fbUser.uid }).eq('id', profile.id);
      }
    } else {
      // New user — register
      const sanitizedName = sanitizeInput(name).trim();
      if (!sanitizedName || sanitizedName.length < 2) {
        return { success: false, error: 'Please enter your name (at least 2 characters)', needsName: true };
      }

      const newProfile = {
        id: fbUser.uid,
        name: sanitizedName,
        phone: phone,
        email: '',
        firebase_uid: fbUser.uid,
      };

      const { error: insertError } = await supabase.from('profiles').insert(newProfile);

      if (insertError) {
        if (insertError.message.includes('profiles_phone_unique')) {
          return { success: false, error: 'This phone number is already registered with another account.' };
        }
        console.error('[Auth] Profile insert failed:', insertError);
        return { success: false, error: 'Registration failed. Please try again.' };
      }

      profile = newProfile;
    }

    const user = formatUser(profile);
    cacheSession(user);
    refreshCartUI();
    window.dispatchEvent(new CustomEvent('auth-changed', { detail: user }));
    confirmationResult = null;

    return { success: true, user, isNew: !existing || existing.length === 0 };
  } catch (error) {
    console.error('[Auth] OTP verify failed:', error);
    if (error.code === 'auth/invalid-verification-code') {
      return { success: false, error: 'Incorrect OTP. Please check and try again.' };
    }
    if (error.code === 'auth/code-expired') {
      return { success: false, error: 'OTP has expired. Please request a new one.' };
    }
    return { success: false, error: 'Verification failed. Please try again.' };
  }
}

// ── Logout ──

export async function logout() {
  try { await signOut(firebaseAuth); } catch {}
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
  // Refresh user count for admin
  refreshUserCount().catch(() => {});

  // Check Firebase auth state
  return new Promise((resolve) => {
    const unsubscribe = firebaseAuth.onAuthStateChanged(async (fbUser) => {
      unsubscribe();
      if (fbUser && fbUser.phoneNumber) {
        // Verify profile exists
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('phone', fbUser.phoneNumber)
          .limit(1);

        if (data && data.length > 0) {
          const user = formatUser(data[0]);
          cacheSession(user);
          resolve(user);
          return;
        }
      }
      // No valid session
      localStorage.removeItem(SESSION_KEY);
      resolve(null);
    });
  });
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
