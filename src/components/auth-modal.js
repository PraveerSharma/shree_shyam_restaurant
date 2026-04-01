// ============================================
// AUTH MODAL — Phone OTP Login/Register
// ============================================

import { sendOTP, verifyOTP, setupRecaptcha } from '../services/auth.js';
import { showToast } from '../utils/dom.js';

let successCallback = null;
let currentStep = 'phone'; // 'phone' | 'otp' | 'name'
let phoneNumber = '';
let isNewUser = false;

export function showAuthModal(tab = 'login', onSuccess = null) {
  successCallback = onSuccess;
  currentStep = 'phone';
  phoneNumber = '';
  isNewUser = false;

  // Remove existing
  const existing = document.getElementById('auth-modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'auth-modal-overlay';

  overlay.innerHTML = `
    <div class="modal" id="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-heading">
      <button class="modal-close" id="auth-modal-close" aria-label="Close dialog">&times;</button>
      <div id="auth-form-container">
        ${renderPhoneStep()}
      </div>
    </div>
  `;

  const triggerElement = document.activeElement;
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  const appRoot = document.getElementById('app');
  if (appRoot) appRoot.setAttribute('aria-hidden', 'true');

  setTimeout(() => document.getElementById('phone-input')?.focus(), 50);

  // Close handlers
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeAuthModal(triggerElement);
  });
  document.getElementById('auth-modal-close').addEventListener('click', () => closeAuthModal(triggerElement));

  // Focus trap + Escape
  const keyHandler = (e) => {
    if (e.key === 'Escape') {
      closeAuthModal(triggerElement);
      document.removeEventListener('keydown', keyHandler);
      return;
    }
    if (e.key === 'Tab') {
      const modal = document.getElementById('auth-modal');
      if (!modal) return;
      const focusable = modal.querySelectorAll('button, input, [tabindex]:not([tabindex="-1"])');
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };
  document.addEventListener('keydown', keyHandler);

  initFormHandlers(triggerElement);
}

function renderPhoneStep() {
  return `
    <div style="text-align: center; margin-bottom: 1.5rem;">
      <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📱</div>
      <h2 id="auth-heading" style="margin: 0 0 0.25rem 0; font-size: 1.3rem; color: var(--clr-charcoal);">Login or Register</h2>
      <p style="color: var(--clr-gray-500); font-size: 0.85rem; margin: 0;">Enter your mobile number to continue</p>
    </div>

    <form id="phone-form" novalidate>
      <div class="form-group">
        <label class="form-label" for="phone-input">Mobile Number</label>
        <div style="display: flex; align-items: center; gap: 0; border: 1.5px solid var(--clr-gray-200); border-radius: var(--radius-md); overflow: hidden; transition: border-color 0.2s;" id="phone-input-wrapper">
          <span style="padding: 0 0.75rem; font-weight: 600; color: var(--clr-gray-600); background: var(--clr-gray-100); height: 46px; display: flex; align-items: center; font-size: 0.95rem; border-right: 1px solid var(--clr-gray-200);">+91</span>
          <input type="tel" id="phone-input" placeholder="Enter 10-digit number" maxlength="10" required autocomplete="tel"
                 style="border: none; padding: 0 0.75rem; height: 46px; flex: 1; font-size: 1rem; outline: none; width: 100%;"
                 aria-describedby="phone-error">
        </div>
        <div class="form-error" id="phone-error" aria-live="polite"></div>
      </div>

      <button type="submit" class="btn btn-primary" style="width: 100%; height: 46px; font-size: 1rem; margin-top: 0.5rem;" id="send-otp-btn">
        Send OTP
      </button>
      <div id="recaptcha-container"></div>
    </form>

    <p style="text-align: center; font-size: 0.75rem; color: var(--clr-gray-400); margin-top: 1.25rem; line-height: 1.5;">
      By continuing, you agree to our <a href="#/terms" style="color: var(--clr-saffron);">Terms</a> & <a href="#/privacy" style="color: var(--clr-saffron);">Privacy Policy</a>
    </p>
  `;
}

function renderOTPStep() {
  const masked = phoneNumber.slice(0, 3) + '****' + phoneNumber.slice(-3);
  return `
    <div style="text-align: center; margin-bottom: 1.5rem;">
      <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🔐</div>
      <h2 id="auth-heading" style="margin: 0 0 0.25rem 0; font-size: 1.3rem; color: var(--clr-charcoal);">Verify OTP</h2>
      <p style="color: var(--clr-gray-500); font-size: 0.85rem; margin: 0;">Sent to <strong>+91 ${masked}</strong></p>
    </div>

    <form id="otp-form" novalidate>
      <div class="form-group">
        <label class="form-label" for="otp-input">Enter 6-digit OTP</label>
        <input type="text" id="otp-input" class="form-input" placeholder="------" maxlength="6" required autocomplete="one-time-code" inputmode="numeric" pattern="[0-9]*"
               style="text-align: center; font-size: 1.5rem; letter-spacing: 0.5rem; font-weight: 700; height: 52px;"
               aria-describedby="otp-error">
        <div class="form-error" id="otp-error" aria-live="polite"></div>
      </div>

      <button type="submit" class="btn btn-primary" style="width: 100%; height: 46px; font-size: 1rem; margin-top: 0.5rem;" id="verify-otp-btn">
        Verify & Continue
      </button>
    </form>

    <div style="text-align: center; margin-top: 1rem;">
      <button id="change-phone-btn" style="background: none; border: none; color: var(--clr-saffron); font-size: 0.85rem; cursor: pointer; font-weight: 600;">
        Change number
      </button>
      <span style="color: var(--clr-gray-300); margin: 0 0.5rem;">|</span>
      <button id="resend-otp-btn" style="background: none; border: none; color: var(--clr-gray-500); font-size: 0.85rem; cursor: pointer;" disabled>
        Resend OTP <span id="resend-timer"></span>
      </button>
    </div>
    <div id="recaptcha-container"></div>
  `;
}

function renderNameStep() {
  return `
    <div style="text-align: center; margin-bottom: 1.5rem;">
      <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">👋</div>
      <h2 id="auth-heading" style="margin: 0 0 0.25rem 0; font-size: 1.3rem; color: var(--clr-charcoal);">Welcome!</h2>
      <p style="color: var(--clr-gray-500); font-size: 0.85rem; margin: 0;">Tell us your name to complete registration</p>
    </div>

    <form id="name-form" novalidate>
      <div class="form-group">
        <label class="form-label" for="name-input">Your Name</label>
        <input type="text" id="name-input" class="form-input" placeholder="E.g. Rajesh Kumar" required autocomplete="name"
               style="height: 46px; font-size: 1rem;"
               aria-describedby="name-error">
        <div class="form-error" id="name-error" aria-live="polite"></div>
      </div>

      <button type="submit" class="btn btn-primary" style="width: 100%; height: 46px; font-size: 1rem; margin-top: 0.5rem;" id="save-name-btn">
        Get Started
      </button>
    </form>
  `;
}

function initFormHandlers(triggerElement) {
  const container = document.getElementById('auth-form-container');
  if (!container) return;

  // Phone step
  if (currentStep === 'phone') {
    // Focus styles for the custom phone wrapper
    const input = document.getElementById('phone-input');
    const wrapper = document.getElementById('phone-input-wrapper');
    if (input && wrapper) {
      input.addEventListener('focus', () => wrapper.style.borderColor = 'var(--clr-saffron)');
      input.addEventListener('blur', () => wrapper.style.borderColor = 'var(--clr-gray-200)');
      // Only allow digits
      input.addEventListener('input', () => { input.value = input.value.replace(/\D/g, ''); });
    }

    document.getElementById('phone-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const phoneInput = document.getElementById('phone-input');
      const errorEl = document.getElementById('phone-error');
      const btn = document.getElementById('send-otp-btn');
      const rawPhone = phoneInput.value.trim();

      errorEl.textContent = '';

      if (rawPhone.length !== 10 || !/^[6-9]\d{9}$/.test(rawPhone)) {
        errorEl.textContent = 'Please enter a valid 10-digit mobile number';
        return;
      }

      phoneNumber = rawPhone;
      btn.disabled = true;
      btn.textContent = 'Sending OTP...';

      try {
        setupRecaptcha('recaptcha-container');
        const result = await sendOTP(rawPhone);

        if (result.success) {
          currentStep = 'otp';
          container.innerHTML = renderOTPStep();
          initFormHandlers(triggerElement);
          setTimeout(() => document.getElementById('otp-input')?.focus(), 50);
          startResendTimer();
        } else {
          errorEl.textContent = result.error;
          btn.disabled = false;
          btn.textContent = 'Send OTP';
        }
      } catch (err) {
        errorEl.textContent = 'Something went wrong. Please try again.';
        btn.disabled = false;
        btn.textContent = 'Send OTP';
      }
    });
  }

  // OTP step
  if (currentStep === 'otp') {
    const otpInput = document.getElementById('otp-input');
    if (otpInput) {
      otpInput.addEventListener('input', () => { otpInput.value = otpInput.value.replace(/\D/g, ''); });
    }

    document.getElementById('otp-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const otp = document.getElementById('otp-input').value.trim();
      const errorEl = document.getElementById('otp-error');
      const btn = document.getElementById('verify-otp-btn');

      errorEl.textContent = '';

      if (otp.length !== 6) {
        errorEl.textContent = 'Please enter the 6-digit OTP';
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Verifying...';

      const result = await verifyOTP(otp);

      if (result.success) {
        if (result.isNew) {
          // New user — needs name
          currentStep = 'name';
          isNewUser = true;
          container.innerHTML = renderNameStep();
          initFormHandlers(triggerElement);
          setTimeout(() => document.getElementById('name-input')?.focus(), 50);
        } else {
          // Existing user — done
          showToast(`Welcome back, ${result.user.name}!`, 'success');
          closeAuthModal(triggerElement);
          if (typeof successCallback === 'function') {
            successCallback(result.user);
            successCallback = null;
          } else {
            window.dispatchEvent(new HashChangeEvent('hashchange'));
          }
        }
      } else if (result.needsName) {
        // OTP verified but profile needs name
        currentStep = 'name';
        isNewUser = true;
        container.innerHTML = renderNameStep();
        initFormHandlers(triggerElement);
        setTimeout(() => document.getElementById('name-input')?.focus(), 50);
      } else {
        errorEl.textContent = result.error;
        btn.disabled = false;
        btn.textContent = 'Verify & Continue';
      }
    });

    document.getElementById('change-phone-btn')?.addEventListener('click', () => {
      currentStep = 'phone';
      container.innerHTML = renderPhoneStep();
      initFormHandlers(triggerElement);
      setTimeout(() => document.getElementById('phone-input')?.focus(), 50);
    });

    document.getElementById('resend-otp-btn')?.addEventListener('click', async () => {
      const btn = document.getElementById('resend-otp-btn');
      btn.disabled = true;
      btn.textContent = 'Sending...';

      setupRecaptcha('recaptcha-container');
      const result = await sendOTP(phoneNumber);

      if (result.success) {
        showToast('New OTP sent!', 'success');
        startResendTimer();
      } else {
        showToast(result.error, 'error');
        btn.disabled = false;
        btn.textContent = 'Resend OTP';
      }
    });
  }

  // Name step (new user registration)
  if (currentStep === 'name') {
    document.getElementById('name-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('name-input').value.trim();
      const errorEl = document.getElementById('name-error');
      const btn = document.getElementById('save-name-btn');

      errorEl.textContent = '';

      if (!name || name.length < 2) {
        errorEl.textContent = 'Please enter your name (at least 2 characters)';
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Setting up...';

      // Re-verify with name
      const result = await verifyOTP(null, name);

      if (result.success) {
        showToast(`Welcome, ${result.user.name}!`, 'success');
        closeAuthModal(triggerElement);
        if (typeof successCallback === 'function') {
          successCallback(result.user);
          successCallback = null;
        } else {
          window.dispatchEvent(new HashChangeEvent('hashchange'));
        }
      } else {
        // OTP expired — user already verified via Firebase, save name directly
        const user = getCurrentUserFromFirebase();
        if (user) {
          const { supabase: sb } = await import('../config/supabase.js');
          await sb.from('profiles').upsert({
            id: user.uid,
            name,
            phone: user.phoneNumber,
            email: '',
            firebase_uid: user.uid,
          }, { onConflict: 'id' });

          const profile = { id: user.uid, name, phone: user.phoneNumber, email: '' };
          localStorage.setItem('ssr_session', JSON.stringify(profile));
          window.dispatchEvent(new CustomEvent('auth-changed', { detail: profile }));

          showToast(`Welcome, ${name}!`, 'success');
          closeAuthModal(triggerElement);
          if (typeof successCallback === 'function') {
            successCallback(profile);
            successCallback = null;
          } else {
            window.dispatchEvent(new HashChangeEvent('hashchange'));
          }
        } else {
          errorEl.textContent = 'Session expired. Please start over.';
          btn.disabled = false;
          btn.textContent = 'Get Started';
        }
      }
    });
  }
}

function getCurrentUserFromFirebase() {
  return firebaseAuth?.currentUser || null;
}

import { firebaseAuth as fbAuth } from '../config/firebase.js';
const firebaseAuthRef = fbAuth;

function startResendTimer() {
  let seconds = 30;
  const timerEl = document.getElementById('resend-timer');
  const btn = document.getElementById('resend-otp-btn');
  if (!timerEl || !btn) return;

  btn.disabled = true;
  timerEl.textContent = `(${seconds}s)`;

  const interval = setInterval(() => {
    seconds--;
    if (seconds <= 0) {
      clearInterval(interval);
      timerEl.textContent = '';
      btn.disabled = false;
      btn.style.color = 'var(--clr-saffron)';
    } else {
      timerEl.textContent = `(${seconds}s)`;
    }
  }, 1000);
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
  currentStep = 'phone';
  successCallback = null;
}
