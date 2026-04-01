// ============================================
// AUTH MODAL — Google SSO + Phone Collection
// ============================================

import { signInWithGoogle, savePhone } from '../services/auth.js';
import { showToast } from '../utils/dom.js';

let successCallback = null;

// ── Main auth modal (Google Sign In) ──

export function showAuthModal(tab = 'login', onSuccess = null) {
  successCallback = onSuccess;

  const existing = document.getElementById('auth-modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'auth-modal-overlay';

  overlay.innerHTML = `
    <div class="modal" id="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-heading" style="max-width: 400px; padding: 2rem;">
      <button class="modal-close" id="auth-modal-close" aria-label="Close dialog">&times;</button>

      <div style="text-align: center; margin-bottom: 1.5rem;">
        <img src="/images/logo.png" alt="" style="width: 56px; height: 56px; margin-bottom: 0.75rem;" aria-hidden="true">
        <h2 id="auth-heading" style="margin: 0 0 0.25rem 0; font-size: 1.25rem; color: var(--clr-charcoal);">Welcome to Shree Shyam</h2>
        <p style="color: var(--clr-gray-500); font-size: 0.85rem; margin: 0;">Sign in to place orders and track them</p>
      </div>

      <button id="google-sign-in-btn" style="
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
        padding: 0.75rem 1rem;
        border: 1.5px solid var(--clr-gray-200);
        border-radius: var(--radius-md);
        background: white;
        font-size: 0.95rem;
        font-weight: 600;
        color: var(--clr-charcoal);
        cursor: pointer;
        transition: all 0.2s ease;
        height: 48px;
      " onmouseover="this.style.borderColor='var(--clr-gray-300)';this.style.boxShadow='0 2px 8px rgba(0,0,0,0.06)'" onmouseout="this.style.borderColor='var(--clr-gray-200)';this.style.boxShadow='none'">
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Continue with Google
      </button>

      <div id="auth-error" style="color: var(--clr-error); font-size: 0.85rem; text-align: center; margin-top: 1rem; min-height: 1.2em;" aria-live="polite"></div>

      <p style="text-align: center; font-size: 0.72rem; color: var(--clr-gray-400); margin-top: 1.25rem; line-height: 1.5;">
        By continuing, you agree to our <a href="#/terms" style="color: var(--clr-saffron);">Terms</a> & <a href="#/privacy" style="color: var(--clr-saffron);">Privacy Policy</a>
      </p>
    </div>
  `;

  const triggerElement = document.activeElement;
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  const appRoot = document.getElementById('app');
  if (appRoot) appRoot.setAttribute('aria-hidden', 'true');

  setTimeout(() => document.getElementById('google-sign-in-btn')?.focus(), 50);

  // Close handlers
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeAuthModal(triggerElement);
  });
  document.getElementById('auth-modal-close').addEventListener('click', () => closeAuthModal(triggerElement));

  // Escape + focus trap
  const keyHandler = (e) => {
    if (e.key === 'Escape') {
      closeAuthModal(triggerElement);
      document.removeEventListener('keydown', keyHandler);
      return;
    }
    if (e.key === 'Tab') {
      const modal = document.getElementById('auth-modal');
      if (!modal) return;
      const focusable = modal.querySelectorAll('button, input, a, [tabindex]:not([tabindex="-1"])');
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };
  document.addEventListener('keydown', keyHandler);

  // Google sign in
  document.getElementById('google-sign-in-btn').addEventListener('click', async () => {
    const btn = document.getElementById('google-sign-in-btn');
    const errorEl = document.getElementById('auth-error');
    errorEl.textContent = '';
    btn.disabled = true;
    btn.innerHTML = `
      <div class="spinner" style="width: 20px; height: 20px; border-width: 2px;" aria-hidden="true"></div>
      Signing in...
    `;

    const result = await signInWithGoogle();

    if (!result.success && !result.redirecting) {
      errorEl.textContent = result.error;
      btn.disabled = false;
      btn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Continue with Google
      `;
    }
    // If redirecting, the page will navigate to Google OAuth
  });
}

// ── Phone collection modal (shown after Google sign-in for new/incomplete users) ──

export function showPhoneModal(user, onComplete = null) {
  const existing = document.getElementById('phone-modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'phone-modal-overlay';

  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="phone-heading" style="max-width: 400px; padding: 2rem;">
      <div style="text-align: center; margin-bottom: 1.5rem;">
        <div style="width: 52px; height: 52px; border-radius: 50%; background: var(--grad-saffron); color: white; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; margin: 0 auto 0.75rem; font-weight: 700;">
          ${(user?.name || 'U').charAt(0).toUpperCase()}
        </div>
        <h2 id="phone-heading" style="margin: 0 0 0.25rem 0; font-size: 1.15rem; color: var(--clr-charcoal);">Hi${user?.name ? ', ' + user.name.split(' ')[0] : ''}!</h2>
        <p style="color: var(--clr-gray-500); font-size: 0.85rem; margin: 0;">Add your mobile number to complete setup</p>
      </div>

      <form id="phone-save-form" novalidate>
        <div class="form-group">
          <label class="form-label" for="phone-save-input">Mobile Number</label>
          <div style="display: flex; align-items: center; gap: 0; border: 1.5px solid var(--clr-gray-200); border-radius: var(--radius-md); overflow: hidden; transition: border-color 0.2s;" id="phone-save-wrapper">
            <span style="padding: 0 0.75rem; font-weight: 600; color: var(--clr-gray-600); background: var(--clr-gray-100); height: 46px; display: flex; align-items: center; font-size: 0.95rem; border-right: 1px solid var(--clr-gray-200);">+91</span>
            <input type="tel" id="phone-save-input" placeholder="Enter 10-digit number" maxlength="10" required autocomplete="tel" inputmode="numeric"
                   style="border: none; padding: 0 0.75rem; height: 46px; flex: 1; font-size: 1rem; outline: none; width: 100%;"
                   aria-describedby="phone-save-error">
          </div>
          <div class="form-error" id="phone-save-error" aria-live="polite"></div>
        </div>

        <button type="submit" class="btn btn-primary" style="width: 100%; height: 46px; font-size: 1rem; margin-top: 0.5rem;" id="save-phone-btn">
          Save & Continue
        </button>
      </form>

      <p style="text-align: center; font-size: 0.75rem; color: var(--clr-gray-400); margin-top: 1rem;">
        Your number is used for order updates and delivery coordination.
      </p>
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  const input = document.getElementById('phone-save-input');
  const wrapper = document.getElementById('phone-save-wrapper');
  setTimeout(() => input?.focus(), 50);

  // Focus styling
  if (input && wrapper) {
    input.addEventListener('focus', () => wrapper.style.borderColor = 'var(--clr-saffron)');
    input.addEventListener('blur', () => wrapper.style.borderColor = 'var(--clr-gray-200)');
    input.addEventListener('input', () => { input.value = input.value.replace(/\D/g, ''); });
  }

  // Submit
  document.getElementById('phone-save-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const phone = input.value.trim();
    const errorEl = document.getElementById('phone-save-error');
    const btn = document.getElementById('save-phone-btn');

    errorEl.textContent = '';

    if (phone.length !== 10 || !/^[6-9]\d{9}$/.test(phone)) {
      errorEl.textContent = 'Please enter a valid 10-digit mobile number';
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Saving...';

    const result = await savePhone(phone);

    if (result.success) {
      overlay.remove();
      document.body.style.overflow = '';
      showToast(`Welcome, ${result.user.name || 'there'}!`, 'success');
      if (typeof onComplete === 'function') onComplete(result.user);
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } else {
      errorEl.textContent = result.error;
      btn.disabled = false;
      btn.textContent = 'Save & Continue';
    }
  });

  // Don't allow closing without phone — this is a required step
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      showToast('Please add your phone number to continue', 'info');
    }
  });
}

export function closeAuthModal(triggerElement = null) {
  const overlay = document.getElementById('auth-modal-overlay');
  if (overlay) {
    overlay.style.opacity = '0';
    setTimeout(() => {
      overlay.remove();
      document.body.style.overflow = '';
      const appRoot = document.getElementById('app');
      if (appRoot) appRoot.removeAttribute('aria-hidden');
      if (triggerElement && typeof triggerElement.focus === 'function') triggerElement.focus();
    }, 200);
  }
  successCallback = null;
}
