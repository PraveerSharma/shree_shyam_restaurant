// ============================================
// AUTHENTICATION SERVICE
// Secure client-side auth with localStorage
// ============================================

import { sanitizeInput } from '../utils/dom.js';

const USERS_KEY = 'ssr_users';
const SESSION_KEY = 'ssr_session';
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
const ATTEMPTS_KEY = 'ssr_login_attempts';

// Cryptographic hash using SHA-256 (Web Crypto API)
async function hashPassword(password, salt = 'ssr_default_salt') {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getLoginAttempts() {
  try {
    return JSON.parse(localStorage.getItem(ATTEMPTS_KEY) || '{}');
  } catch {
    return {};
  }
}

function isLockedOut(email) {
  const attempts = getLoginAttempts();
  const record = attempts[email];
  if (!record) return false;
  if (record.count >= MAX_LOGIN_ATTEMPTS) {
    const elapsed = Date.now() - record.lastAttempt;
    if (elapsed < LOCKOUT_DURATION) {
      return true;
    }
    // Reset after lockout
    delete attempts[email];
    localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(attempts));
  }
  return false;
}

function recordLoginAttempt(email, success) {
  const attempts = getLoginAttempts();
  if (success) {
    delete attempts[email];
  } else {
    if (!attempts[email]) {
      attempts[email] = { count: 0, lastAttempt: 0 };
    }
    attempts[email].count++;
    attempts[email].lastAttempt = Date.now();
  }
  localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(attempts));
}

// Validation — only @gmail.com emails allowed
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

export async function register({ name, phone, email, password }) {
  // Sanitize inputs
  name = sanitizeInput(name).trim();
  phone = sanitizeInput(phone).trim();
  email = sanitizeInput(email).trim().toLowerCase();

  // Validate
  if (!name || name.length < 2) return { success: false, error: 'Name must be at least 2 characters' };
  if (name.length > 100) return { success: false, error: 'Name is too long' };
  if (!validateEmail(email)) return { success: false, error: 'Only Gmail addresses are accepted (example@gmail.com)' };
  if (!validatePhone(phone)) return { success: false, error: 'Please enter a valid Indian phone number' };
  
  const pwError = validatePassword(password);
  if (pwError) return { success: false, error: pwError };

  const users = getUsers();
  
  // Check duplicate email
  if (users.find(u => u.email === email)) {
    return { success: false, error: 'An account with this email already exists' };
  }

  // Generate a unique salt for this user
  const salt = Math.random().toString(36).slice(2, 10);
  const passwordHash = await hashPassword(password, salt);

  const user = {
    id: 'user_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name,
    phone,
    email,
    salt,
    passwordHash,
    createdAt: new Date().toISOString(),
  };

  users.push(user);
  saveUsers(users);

  // Auto-login
  const session = { ...user };
  delete session.passwordHash;
  delete session.salt;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));

  window.dispatchEvent(new CustomEvent('auth-changed', { detail: session }));
  return { success: true, user: session };
}

export async function login(email, password) {
  email = sanitizeInput(email).trim().toLowerCase();

  if (!validateEmail(email)) return { success: false, error: 'Please enter a valid Gmail address (example@gmail.com)' };
  
  // Rate limiting
  if (isLockedOut(email)) {
    return { success: false, error: 'Too many failed attempts. Please try again in 15 minutes.' };
  }

  const users = getUsers();
  const user = users.find(u => u.email === email);
  
  if (!user) {
    recordLoginAttempt(email, false);
    return { success: false, error: 'Invalid email or password' };
  }

  // Check password with user's salt
  const enteredHash = await hashPassword(password, user.salt || 'ssr_default_salt');
  
  if (user.passwordHash !== enteredHash) {
    recordLoginAttempt(email, false);
    return { success: false, error: 'Invalid email or password' };
  }

  recordLoginAttempt(email, true);

  const session = { ...user };
  delete session.passwordHash;
  delete session.salt;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));

  window.dispatchEvent(new CustomEvent('auth-changed', { detail: session }));
  return { success: true, user: session };
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new CustomEvent('auth-changed', { detail: null }));
}

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

// Forgot / Reset Password
export async function resetPassword(email, phone, newPassword) {
  email = sanitizeInput(email).trim().toLowerCase();
  phone = sanitizeInput(phone).trim();

  if (!validateEmail(email)) {
    return { success: false, error: 'Please enter a valid Gmail address (example@gmail.com)' };
  }

  const pwError = validatePassword(newPassword);
  if (pwError) return { success: false, error: pwError };

  const users = getUsers();
  const user = users.find(u => u.email === email);

  if (!user) {
    return { success: false, error: 'No account found with this email address' };
  }

  // Verify identity via registered phone number
  const cleanInputPhone = phone.replace(/[\s\-+]/g, '').replace(/^91/, '');
  const cleanStoredPhone = user.phone.replace(/[\s\-+]/g, '').replace(/^91/, '');

  if (cleanInputPhone !== cleanStoredPhone) {
    return { success: false, error: 'Phone number does not match our records for this email' };
  }

  // Update password with new salt
  const salt = Math.random().toString(36).slice(2, 10);
  user.salt = salt;
  user.passwordHash = await hashPassword(newPassword, salt);
  saveUsers(users);

  return { success: true };
}

// Admin Metrics
export function getAllUsersCount() {
  const users = getUsers();
  return users.length;
}
