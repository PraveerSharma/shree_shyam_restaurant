// ============================================
// PHONE COLLECTION MODAL
// Simple phone input for users who need to add their number
// Used before checkout and subscription (no OTP — user already authenticated)
// ============================================

import { getCurrentUser, savePhone } from '../services/auth.js';
import { showToast } from '../utils/dom.js';

let verifyCallback = null;

/**
 * Show phone collection modal.
 * @param {Function} onCollected - called with updated user after phone is saved
 */
export function showPhoneVerify(onCollected = null) {
  verifyCallback = onCollected;

  const existing = document.getElementById('phone-verify-overlay');
  if (existing) existing.remove();

  const user = getCurrentUser();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'phone-verify-overlay';
  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="pv-heading" style="max-width: 400px; padding: 2rem;">
      <div style="text-align: center; margin-bottom: 1.25rem;">
        <div style="width: 48px; height: 48px; border-radius: 50%; background: var(--grad-saffron); color: white; display: flex; align-items: center; justify-content: center; font-size: 1.3rem; margin: 0 auto 0.5rem; font-weight: 700;">
          ${(user?.name || 'U')[0].toUpperCase()}
        </div>
        <h2 id="pv-heading" style="margin: 0 0 0.2rem; font-size: 1.1rem; color: var(--clr-charcoal);">Add Your Phone Number</h2>
        <p style="color: var(--clr-gray-500); font-size: 0.82rem; margin: 0;">Required for order updates and pickup coordination</p>
      </div>

      <form id="pv-phone-form" novalidate>
        <div class="form-group" style="margin-bottom: 0.75rem;">
          <label class="form-label" for="pv-phone">Mobile Number</label>
          <div style="display: flex; border: 1.5px solid var(--clr-gray-200); border-radius: var(--radius-md); overflow: hidden;" id="pv-phone-wrap">
            <span style="padding: 0 0.7rem; font-weight: 600; color: var(--clr-gray-600); background: var(--clr-gray-100); height: 44px; display: flex; align-items: center; font-size: 0.9rem; border-right: 1px solid var(--clr-gray-200);">+91</span>
            <input type="tel" id="pv-phone" placeholder="10-digit number" maxlength="10" required inputmode="numeric"
                   style="border: none; padding: 0 0.7rem; height: 44px; flex: 1; font-size: 0.95rem; outline: none; width: 100%;"
                   value="${user?.phone ? user.phone.replace('+91', '').replace(/\s/g, '') : ''}"
                   aria-describedby="pv-phone-err">
          </div>
          <div class="form-error" id="pv-phone-err" aria-live="polite"></div>
        </div>
        <button type="submit" class="btn btn-primary" style="width: 100%; height: 44px; font-size: 0.9rem;" id="pv-save-btn">
          Save & Continue
        </button>
      </form>

      <button id="pv-cancel" style="display: block; margin: 0.75rem auto 0; background: none; border: none; color: var(--clr-gray-500); font-size: 0.82rem; cursor: pointer;">
        Cancel
      </button>
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  // Dismiss behavior
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) showToast('Please add your phone number to continue', 'info');
  });
  const kh = (e) => {
    if (e.key === 'Escape') { closeVerify(); document.removeEventListener('keydown', kh); }
  };
  document.addEventListener('keydown', kh);

  setTimeout(() => document.getElementById('pv-phone')?.focus(), 50);

  // Input styling & formatting
  const input = document.getElementById('pv-phone');
  const wrap = document.getElementById('pv-phone-wrap');
  if (input && wrap) {
    input.addEventListener('focus', () => wrap.style.borderColor = 'var(--clr-saffron)');
    input.addEventListener('blur', () => wrap.style.borderColor = 'var(--clr-gray-200)');
    input.addEventListener('input', () => { input.value = input.value.replace(/\D/g, ''); });
  }

  document.getElementById('pv-cancel')?.addEventListener('click', closeVerify);

  // Submit — save phone to Supabase profile
  document.getElementById('pv-phone-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const ph = document.getElementById('pv-phone').value.trim();
    const err = document.getElementById('pv-phone-err');
    const btn = document.getElementById('pv-save-btn');
    err.textContent = '';

    if (ph.length !== 10 || !/^[6-9]\d{9}$/.test(ph)) {
      err.textContent = 'Enter a valid 10-digit mobile number';
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Saving...';

    const r = await savePhone(ph);
    if (r.success) {
      closeVerify();
      showToast('Phone number saved!', 'success');
      if (typeof verifyCallback === 'function') {
        verifyCallback(r.user);
        verifyCallback = null;
      }
    } else {
      err.textContent = r.error;
      btn.disabled = false;
      btn.textContent = 'Save & Continue';
    }
  });
}

function closeVerify() {
  const overlay = document.getElementById('phone-verify-overlay');
  if (overlay) {
    overlay.remove();
    document.body.style.overflow = '';
  }
  verifyCallback = null;
}

/**
 * Check if user has a phone number. If not, show collection modal.
 * @param {Function} onVerified - called when phone is added
 * @returns {boolean} true if phone already exists, false if modal shown
 */
export function requireVerifiedPhone(onVerified) {
  const user = getCurrentUser();
  if (!user) return false;

  if (user.phone && user.phone.startsWith('+91') && user.phone.length >= 13) {
    return true; // Already has phone
  }

  showPhoneVerify(onVerified);
  return false;
}
