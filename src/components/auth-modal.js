// ============================================
// AUTH MODAL — Google SSO Only
// ============================================

import { signInWithGoogle, updateUserName } from '../services/auth.js';
import { showToast } from '../utils/dom.js';

let successCallback = null;

// ── Shared helpers ──

function createOverlay(html) {
  const existing = document.getElementById('auth-modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'auth-modal-overlay';
  overlay.innerHTML = `
    <div class="modal" id="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-heading" style="max-width: 420px; padding: 2rem;">
      <button class="modal-close" id="auth-modal-close" aria-label="Close dialog">&times;</button>
      <div id="auth-content">${html}</div>
    </div>
  `;

  const trigger = document.activeElement;
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';
  document.getElementById('app')?.setAttribute('aria-hidden', 'true');

  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeAuthModal(trigger); });
  document.getElementById('auth-modal-close').addEventListener('click', () => closeAuthModal(trigger));

  const kh = (e) => {
    if (e.key === 'Escape') { closeAuthModal(trigger); document.removeEventListener('keydown', kh); return; }
    if (e.key === 'Tab') {
      const modal = document.getElementById('auth-modal');
      if (!modal) return;
      const f = modal.querySelectorAll('button, input, a, [tabindex]:not([tabindex="-1"])');
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  };
  document.addEventListener('keydown', kh);
  return trigger;
}

function setContent(html) {
  const c = document.getElementById('auth-content');
  if (c) c.innerHTML = html;
}

function authComplete(result, trigger) {
  const name = result.user?.name;
  const greeting = result.isNew ? `Welcome, ${name || 'there'}!` : `Welcome back, ${name || 'there'}!`;
  showToast(greeting, 'success');
  closeAuthModal(trigger);
  if (typeof successCallback === 'function') { successCallback(result.user); successCallback = null; }
  else window.dispatchEvent(new HashChangeEvent('hashchange'));
}

// ============================================
// MAIN SCREEN — Google SSO Only
// ============================================

export function showAuthModal(tab = 'login', onSuccess = null) {
  successCallback = onSuccess;
  const trigger = createOverlay(renderMain());
  bindMain(trigger);
  setTimeout(() => document.getElementById('google-btn')?.focus(), 50);
}

function renderMain() {
  return `
    <div style="text-align:center; margin-bottom:1.5rem;">
      <img src="/images/logo.png" alt="" style="width:48px; height:48px; margin-bottom:0.5rem;" aria-hidden="true">
      <h2 id="auth-heading" style="margin:0 0 0.2rem; font-size:1.2rem; color:var(--clr-charcoal);">Welcome to Shree Shyam</h2>
      <p style="color:var(--clr-gray-500); font-size:0.82rem; margin:0;">Sign in to place orders and track them</p>
    </div>

    <div style="display:flex; flex-direction:column; gap:0.65rem;">
      <!-- Google SSO -->
      <button id="google-btn" style="width:100%; display:flex; align-items:center; justify-content:center; gap:0.6rem; padding:0.65rem; border:2px solid var(--clr-saffron); border-radius:var(--radius-md); background:white; font-size:0.95rem; font-weight:600; color:var(--clr-charcoal); cursor:pointer; height:48px;">
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
        Continue with Google
      </button>
    </div>

    <div id="auth-error" style="color:var(--clr-error); font-size:0.82rem; text-align:center; margin-top:0.5rem; min-height:1em;" aria-live="polite"></div>
    <p style="text-align:center; font-size:0.68rem; color:var(--clr-gray-400); margin-top:1.25rem; line-height:1.5;">
      By continuing, you agree to our <a href="#/terms" style="color:var(--clr-saffron);">Terms</a> & <a href="#/privacy" style="color:var(--clr-saffron);">Privacy Policy</a>
    </p>
  `;
}

const GOOGLE_BTN_HTML = `<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg> Continue with Google`;

function bindMain(trigger) {
  document.getElementById('google-btn')?.addEventListener('click', async () => {
    const btn = document.getElementById('google-btn');
    const errEl = document.getElementById('auth-error');
    errEl.textContent = '';
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner" style="width:18px;height:18px;border-width:2px;" aria-hidden="true"></div> Redirecting...';
    const r = await signInWithGoogle();
    if (!r.success && r.error) {
      errEl.textContent = r.error;
      btn.disabled = false;
      btn.innerHTML = GOOGLE_BTN_HTML;
    }
  });
}

// ============================================
// NAME INPUT (Post-auth setup)
// ============================================

function renderNameInput() {
  return `
    <div style="text-align:center; margin-bottom:1.25rem;">
      <div style="font-size:2rem; margin-bottom:0.4rem;">👋</div>
      <h2 id="auth-heading" style="margin:0 0 0.2rem; font-size:1.15rem;">Welcome! What's your name?</h2>
      <p style="color:var(--clr-gray-500); font-size:0.82rem; margin:0;">This helps us personalize your experience</p>
    </div>
    <form id="name-form" novalidate>
      <div class="form-group" style="margin-bottom:0.75rem;">
        <label class="form-label" for="name-input">Your Name</label>
        <input type="text" id="name-input" class="form-input" placeholder="E.g. Rajesh Kumar" required
               style="height:46px; font-size:0.95rem;" aria-describedby="name-err">
        <div class="form-error" id="name-err" aria-live="polite"></div>
      </div>
      <button type="submit" class="btn btn-primary" style="width:100%; height:46px; font-size:0.95rem;" id="name-btn">
        Get Started
      </button>
    </form>
  `;
}

function bindNameInput(trigger) {
  document.getElementById('name-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('name-input').value.trim();
    const err = document.getElementById('name-err');
    const btn = document.getElementById('name-btn');
    err.textContent = '';

    if (!name || name.length < 2) { err.textContent = 'Please enter your name (at least 2 characters)'; return; }

    btn.disabled = true;
    btn.textContent = 'Setting up...';

    const r = await updateUserName(name);
    if (r.success) authComplete({ ...r, isNew: true }, trigger);
    else { err.textContent = r.error || 'Something went wrong.'; btn.disabled = false; btn.textContent = 'Get Started'; }
  });
}

// ============================================
// POST-AUTH SETUP (Name collection only)
// ============================================

export function showPostAuthSetup(user) {
  const needsName = !user.name || user.name.trim().length < 2;
  if (needsName) {
    const trigger = createOverlay(renderNameInput());
    bindNameInput(trigger);
    setTimeout(() => document.getElementById('name-input')?.focus(), 50);
  }
}

// ============================================
// CLOSE
// ============================================

export function closeAuthModal(triggerElement = null) {
  const overlay = document.getElementById('auth-modal-overlay');
  if (overlay) {
    overlay.style.opacity = '0';
    setTimeout(() => {
      overlay.remove();
      document.body.style.overflow = '';
      document.getElementById('app')?.removeAttribute('aria-hidden');
      if (triggerElement?.focus) triggerElement.focus();
    }, 200);
  }
  successCallback = null;
}
