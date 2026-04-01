// ============================================
// PHONE VERIFICATION MODAL
// Firebase SMS OTP → saves verified phone to Supabase profile
// Reusable: call showPhoneVerify(user) from anywhere
// ============================================

import { setupRecaptcha, sendFirebaseOTP, verifyFirebaseOTP, savePhone, getCurrentUser } from '../services/auth.js';
import { showToast } from '../utils/dom.js';

let verifyCallback = null;

/**
 * Show phone verification modal.
 * @param {Function} onVerified - called with updated user after successful verification
 * @returns {void}
 */
export function showPhoneVerify(onVerified = null) {
  verifyCallback = onVerified;

  const existing = document.getElementById('phone-verify-overlay');
  if (existing) existing.remove();

  const user = getCurrentUser();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'phone-verify-overlay';
  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="pv-heading" style="max-width: 400px; padding: 2rem;">
      <div id="pv-content">${renderPhoneStep(user)}</div>
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  // Can't dismiss without verifying
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) showToast('Please verify your phone number to continue', 'info');
  });

  // Escape: warn but allow
  const kh = (e) => {
    if (e.key === 'Escape') {
      closeVerify();
      document.removeEventListener('keydown', kh);
    }
  };
  document.addEventListener('keydown', kh);

  setTimeout(() => document.getElementById('pv-phone')?.focus(), 50);
  bindPhoneStep();
}

function renderPhoneStep(user) {
  return `
    <div style="text-align: center; margin-bottom: 1.25rem;">
      <div style="width: 48px; height: 48px; border-radius: 50%; background: var(--grad-saffron); color: white; display: flex; align-items: center; justify-content: center; font-size: 1.3rem; margin: 0 auto 0.5rem; font-weight: 700;">
        ${(user?.name || 'U')[0].toUpperCase()}
      </div>
      <h2 id="pv-heading" style="margin: 0 0 0.2rem; font-size: 1.1rem; color: var(--clr-charcoal);">Verify Your Phone</h2>
      <p style="color: var(--clr-gray-500); font-size: 0.82rem; margin: 0;">We'll send an OTP via SMS to verify your number</p>
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
      <button type="submit" class="btn btn-primary" style="width: 100%; height: 44px; font-size: 0.9rem;" id="pv-send-btn">
        Send OTP
      </button>
      <div id="pv-recaptcha"></div>
    </form>

    <button id="pv-cancel" style="display: block; margin: 0.75rem auto 0; background: none; border: none; color: var(--clr-gray-500); font-size: 0.82rem; cursor: pointer;">
      Cancel
    </button>
  `;
}

let pvPhone = '';

function renderOTPStep() {
  const masked = pvPhone.slice(0, 3) + '••••' + pvPhone.slice(-3);
  return `
    <div style="text-align: center; margin-bottom: 1.25rem;">
      <div style="font-size: 2rem; margin-bottom: 0.4rem;">🔐</div>
      <h2 id="pv-heading" style="margin: 0 0 0.2rem; font-size: 1.1rem; color: var(--clr-charcoal);">Enter OTP</h2>
      <p style="color: var(--clr-gray-500); font-size: 0.82rem; margin: 0;">Sent to <strong>+91 ${masked}</strong></p>
    </div>

    <form id="pv-otp-form" novalidate>
      <div class="form-group" style="margin-bottom: 0.75rem;">
        <label class="form-label" for="pv-otp">6-digit verification code</label>
        <input type="text" id="pv-otp" class="form-input" placeholder="• • • • • •" maxlength="6" required inputmode="numeric"
               style="text-align: center; font-size: 1.4rem; letter-spacing: 0.5rem; font-weight: 700; height: 50px;"
               aria-describedby="pv-otp-err">
        <div class="form-error" id="pv-otp-err" aria-live="polite"></div>
      </div>
      <button type="submit" class="btn btn-primary" style="width: 100%; height: 44px; font-size: 0.9rem;" id="pv-verify-btn">
        Verify
      </button>
    </form>

    <div style="display: flex; justify-content: center; gap: 1rem; margin-top: 0.75rem;">
      <button id="pv-change" style="background: none; border: none; color: var(--clr-saffron); font-size: 0.82rem; cursor: pointer; font-weight: 500;">Change number</button>
      <button id="pv-resend" style="background: none; border: none; color: var(--clr-gray-500); font-size: 0.82rem; cursor: pointer;" disabled>
        Resend <span id="pv-timer"></span>
      </button>
    </div>
    <div id="pv-recaptcha"></div>
  `;
}

function bindPhoneStep() {
  const input = document.getElementById('pv-phone');
  const wrap = document.getElementById('pv-phone-wrap');
  if (input && wrap) {
    input.addEventListener('focus', () => wrap.style.borderColor = 'var(--clr-saffron)');
    input.addEventListener('blur', () => wrap.style.borderColor = 'var(--clr-gray-200)');
    input.addEventListener('input', () => { input.value = input.value.replace(/\D/g, ''); });
  }

  document.getElementById('pv-cancel')?.addEventListener('click', closeVerify);

  document.getElementById('pv-phone-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const ph = document.getElementById('pv-phone').value.trim();
    const err = document.getElementById('pv-phone-err');
    const btn = document.getElementById('pv-send-btn');
    err.textContent = '';

    if (ph.length !== 10 || !/^[6-9]\d{9}$/.test(ph)) {
      err.textContent = 'Enter a valid 10-digit mobile number';
      return;
    }

    pvPhone = ph;
    btn.disabled = true;
    btn.textContent = 'Sending OTP...';

    try {
      setupRecaptcha('pv-recaptcha');
      const r = await sendFirebaseOTP(ph);
      if (r.success) {
        const content = document.getElementById('pv-content');
        content.innerHTML = renderOTPStep();
        bindOTPStep();
        startTimer();
        setTimeout(() => document.getElementById('pv-otp')?.focus(), 50);
      } else {
        err.textContent = r.error;
        btn.disabled = false;
        btn.textContent = 'Send OTP';
      }
    } catch {
      err.textContent = 'Failed to send OTP. Try again.';
      btn.disabled = false;
      btn.textContent = 'Send OTP';
    }
  });
}

function bindOTPStep() {
  const otpIn = document.getElementById('pv-otp');
  if (otpIn) otpIn.addEventListener('input', () => { otpIn.value = otpIn.value.replace(/\D/g, ''); });

  document.getElementById('pv-otp-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const otp = otpIn.value.trim();
    const err = document.getElementById('pv-otp-err');
    const btn = document.getElementById('pv-verify-btn');
    err.textContent = '';

    if (otp.length !== 6) { err.textContent = 'Enter the 6-digit OTP'; return; }

    btn.disabled = true;
    btn.textContent = 'Verifying...';

    // Verify OTP via Firebase
    const r = await verifyFirebaseOTP(otp, getCurrentUser()?.name || 'User');

    if (r.success) {
      // Phone verified via Firebase — now save to Supabase profile
      const formatted = '+91' + pvPhone;
      const user = getCurrentUser();

      if (user?.id) {
        // Save phone to Supabase profile (for Google SSO users)
        await savePhone(pvPhone).catch(() => {});
      }

      // Update localStorage session with verified phone
      const updated = { ...getCurrentUser(), phone: formatted };
      localStorage.setItem('ssr_session', JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('auth-changed', { detail: updated }));

      closeVerify();
      showToast('Phone number verified!', 'success');

      if (typeof verifyCallback === 'function') {
        verifyCallback(updated);
        verifyCallback = null;
      }
    } else if (r.needsName) {
      // Already handled — verifyFirebaseOTP creates profile with name
      err.textContent = 'Please try again.';
      btn.disabled = false;
      btn.textContent = 'Verify';
    } else {
      err.textContent = r.error;
      btn.disabled = false;
      btn.textContent = 'Verify';
    }
  });

  document.getElementById('pv-change')?.addEventListener('click', () => {
    const content = document.getElementById('pv-content');
    content.innerHTML = renderPhoneStep(getCurrentUser());
    bindPhoneStep();
    setTimeout(() => document.getElementById('pv-phone')?.focus(), 50);
  });

  document.getElementById('pv-resend')?.addEventListener('click', async () => {
    const btn = document.getElementById('pv-resend');
    btn.disabled = true;
    btn.textContent = 'Sending...';
    setupRecaptcha('pv-recaptcha');
    const r = await sendFirebaseOTP(pvPhone);
    if (r.success) { showToast('New OTP sent!', 'success'); startTimer(); }
    else { showToast(r.error, 'error'); btn.disabled = false; btn.textContent = 'Resend'; }
  });
}

function startTimer() {
  let s = 30;
  const btn = document.getElementById('pv-resend');
  const span = document.getElementById('pv-timer');
  if (!btn || !span) return;
  btn.disabled = true;
  span.textContent = `(${s}s)`;
  const iv = setInterval(() => {
    s--;
    if (s <= 0) { clearInterval(iv); span.textContent = ''; btn.disabled = false; btn.style.color = 'var(--clr-saffron)'; }
    else span.textContent = `(${s}s)`;
  }, 1000);
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
 * Check if user has a verified phone. If not, show verification modal.
 * @param {Function} onVerified - called when phone is verified
 * @returns {boolean} true if phone already verified, false if modal shown
 */
export function requireVerifiedPhone(onVerified) {
  const user = getCurrentUser();
  if (!user) return false;

  // Phone exists and starts with +91 (verified)
  if (user.phone && user.phone.startsWith('+91') && user.phone.length >= 13) {
    return true; // Already verified
  }

  // Show verification modal
  showPhoneVerify(onVerified);
  return false;
}
