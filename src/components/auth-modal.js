// ============================================
// AUTH MODAL — Google SSO + WhatsApp OTP
// ============================================

import { signInWithGoogle, savePhone, sendWhatsAppOTP, verifyWhatsAppOTP } from '../services/auth.js';
import { showToast } from '../utils/dom.js';

let successCallback = null;
let waStep = 'phone'; // 'phone' | 'otp' | 'name'
let waPhone = '';
let waOTPCode = '';
let waLink = '';

// ── Main auth modal ──

export function showAuthModal(tab = 'login', onSuccess = null) {
  successCallback = onSuccess;
  waStep = 'phone';
  waPhone = '';

  const existing = document.getElementById('auth-modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'auth-modal-overlay';

  overlay.innerHTML = `
    <div class="modal" id="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-heading" style="max-width: 420px; padding: 2rem;">
      <button class="modal-close" id="auth-modal-close" aria-label="Close dialog">&times;</button>
      <div id="auth-content">
        ${renderMainScreen()}
      </div>
    </div>
  `;

  const triggerElement = document.activeElement;
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  const appRoot = document.getElementById('app');
  if (appRoot) appRoot.setAttribute('aria-hidden', 'true');

  setTimeout(() => document.getElementById('google-sign-in-btn')?.focus(), 50);

  // Close
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeAuthModal(triggerElement);
  });
  document.getElementById('auth-modal-close').addEventListener('click', () => closeAuthModal(triggerElement));

  // Escape + focus trap
  const keyHandler = (e) => {
    if (e.key === 'Escape') { closeAuthModal(triggerElement); document.removeEventListener('keydown', keyHandler); return; }
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

  bindMainHandlers(triggerElement);
}

// ── Screens ──

function renderMainScreen() {
  return `
    <div style="text-align: center; margin-bottom: 1.5rem;">
      <img src="/images/logo.png" alt="" style="width: 52px; height: 52px; margin-bottom: 0.5rem;" aria-hidden="true">
      <h2 id="auth-heading" style="margin: 0 0 0.25rem 0; font-size: 1.2rem; color: var(--clr-charcoal);">Welcome to Shree Shyam</h2>
      <p style="color: var(--clr-gray-500); font-size: 0.82rem; margin: 0;">Sign in to place orders and track them</p>
    </div>

    <!-- Google SSO -->
    <button id="google-sign-in-btn" style="
      width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.75rem;
      padding: 0.7rem 1rem; border: 1.5px solid var(--clr-gray-200); border-radius: var(--radius-md);
      background: white; font-size: 0.9rem; font-weight: 600; color: var(--clr-charcoal);
      cursor: pointer; transition: all 0.2s ease; height: 46px;
    ">
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
      Continue with Google
    </button>

    <!-- Divider -->
    <div style="display: flex; align-items: center; gap: 1rem; margin: 1.25rem 0;">
      <div style="flex: 1; height: 1px; background: var(--clr-gray-200);"></div>
      <span style="font-size: 0.75rem; color: var(--clr-gray-400); font-weight: 500;">or</span>
      <div style="flex: 1; height: 1px; background: var(--clr-gray-200);"></div>
    </div>

    <!-- WhatsApp OTP -->
    <button id="wa-otp-btn" style="
      width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.6rem;
      padding: 0.7rem 1rem; border: 1.5px solid #C2E7CB; border-radius: var(--radius-md);
      background: #F0FDF4; font-size: 0.9rem; font-weight: 600; color: #15803D;
      cursor: pointer; transition: all 0.2s ease; height: 46px;
    ">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="#25D366" aria-hidden="true"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.246 2.248 3.484 5.232 3.484 8.412-.003 6.557-5.338 11.892-11.893 11.892-1.997-.001-3.951-.5-5.688-1.448l-6.309 1.656zm6.29-4.143c1.552.921 3.13 1.411 4.793 1.412 5.204 0 9.444-4.24 9.446-9.443.002-2.521-.979-4.89-2.762-6.67s-4.149-2.765-6.67-2.765c-5.204 0-9.441 4.239-9.443 9.441-.001 1.742.483 3.339 1.398 4.71l-1.01 3.693 3.791-.994zm11.367-7.4c-.31-.154-1.829-.902-2.107-1.003-.278-.101-.48-.153-.68.154-.201.307-.779 1.003-.955 1.205-.175.202-.351.226-.66.073-.31-.153-1.309-.482-2.493-1.54-.92-.821-1.54-1.835-1.72-2.144-.18-.309-.019-.476.136-.629.139-.138.309-.36.464-.54.154-.18.206-.309.309-.515.103-.206.052-.386-.025-.54-.077-.154-.68-1.644-.932-2.253-.245-.592-.495-.511-.68-.521-.176-.009-.379-.011-.581-.011-.202 0-.531.076-.809.381-.278.305-1.062 1.039-1.062 2.535s1.087 2.941 1.239 3.146c.152.206 2.14 3.268 5.184 4.582 2.534 1.095 3.048.877 3.603.824.555-.053 1.829-.747 2.087-1.468.258-.721.258-1.339.181-1.468-.076-.128-.278-.206-.587-.36z"/></svg>
      Continue with WhatsApp
    </button>

    <div id="auth-error" style="color: var(--clr-error); font-size: 0.82rem; text-align: center; margin-top: 0.75rem; min-height: 1em;" aria-live="polite"></div>

    <p style="text-align: center; font-size: 0.7rem; color: var(--clr-gray-400); margin-top: 1.25rem; line-height: 1.5;">
      By continuing, you agree to our <a href="#/terms" style="color: var(--clr-saffron);">Terms</a> & <a href="#/privacy" style="color: var(--clr-saffron);">Privacy Policy</a>
    </p>
  `;
}

function renderWAPhoneScreen() {
  return `
    <div style="text-align: center; margin-bottom: 1.25rem;">
      <div style="font-size: 2rem; margin-bottom: 0.5rem;">📱</div>
      <h2 id="auth-heading" style="margin: 0 0 0.25rem 0; font-size: 1.15rem; color: var(--clr-charcoal);">Verify via WhatsApp</h2>
      <p style="color: var(--clr-gray-500); font-size: 0.82rem; margin: 0;">We'll send a code to verify your number</p>
    </div>

    <form id="wa-phone-form" novalidate>
      <div class="form-group" style="margin-bottom: 0.75rem;">
        <label class="form-label" for="wa-phone-input">Mobile Number</label>
        <div style="display: flex; border: 1.5px solid var(--clr-gray-200); border-radius: var(--radius-md); overflow: hidden;" id="wa-phone-wrapper">
          <span style="padding: 0 0.75rem; font-weight: 600; color: var(--clr-gray-600); background: var(--clr-gray-100); height: 44px; display: flex; align-items: center; font-size: 0.9rem; border-right: 1px solid var(--clr-gray-200);">+91</span>
          <input type="tel" id="wa-phone-input" placeholder="10-digit number" maxlength="10" required inputmode="numeric"
                 style="border: none; padding: 0 0.75rem; height: 44px; flex: 1; font-size: 0.95rem; outline: none; width: 100%;"
                 aria-describedby="wa-phone-error">
        </div>
        <div class="form-error" id="wa-phone-error" aria-live="polite"></div>
      </div>

      <div class="form-group" style="margin-bottom: 0.75rem;">
        <label class="form-label" for="wa-name-input">Your Name</label>
        <input type="text" id="wa-name-input" class="form-input" placeholder="E.g. Rajesh Kumar" required
               style="height: 44px; font-size: 0.95rem;" aria-describedby="wa-name-error">
        <div class="form-error" id="wa-name-error" aria-live="polite"></div>
      </div>

      <button type="submit" class="btn btn-primary" style="width: 100%; height: 44px; font-size: 0.9rem;" id="wa-send-btn">
        Send Code via WhatsApp
      </button>
    </form>

    <button id="wa-back-btn" style="display: block; margin: 1rem auto 0; background: none; border: none; color: var(--clr-gray-500); font-size: 0.82rem; cursor: pointer;">
      ← Back to sign in options
    </button>
  `;
}

function renderWAOTPScreen() {
  const masked = waPhone.slice(0, 4) + '****' + waPhone.slice(-2);
  return `
    <div style="text-align: center; margin-bottom: 1.25rem;">
      <div style="font-size: 2rem; margin-bottom: 0.5rem;">✅</div>
      <h2 id="auth-heading" style="margin: 0 0 0.25rem 0; font-size: 1.15rem; color: var(--clr-charcoal);">Enter Verification Code</h2>
      <p style="color: var(--clr-gray-500); font-size: 0.82rem; margin: 0;">
        Send the code via WhatsApp, then enter it below
      </p>
    </div>

    <!-- Step 1: Open WhatsApp -->
    <a href="${waLink}" target="_blank" rel="noopener" id="wa-open-link" style="
      display: flex; align-items: center; justify-content: center; gap: 0.5rem;
      width: 100%; padding: 0.6rem; background: #25D366; color: white; border-radius: var(--radius-md);
      text-decoration: none; font-weight: 600; font-size: 0.9rem; margin-bottom: 1rem;
    ">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="white" aria-hidden="true"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.246 2.248 3.484 5.232 3.484 8.412-.003 6.557-5.338 11.892-11.893 11.892-1.997-.001-3.951-.5-5.688-1.448l-6.309 1.656zm6.29-4.143c1.552.921 3.13 1.411 4.793 1.412 5.204 0 9.444-4.24 9.446-9.443.002-2.521-.979-4.89-2.762-6.67s-4.149-2.765-6.67-2.765c-5.204 0-9.441 4.239-9.443 9.441-.001 1.742.483 3.339 1.398 4.71l-1.01 3.693 3.791-.994z"/></svg>
      Open WhatsApp & Send Code
    </a>

    <div style="background: var(--clr-gray-50); border-radius: var(--radius-sm); padding: 0.6rem; margin-bottom: 1rem; text-align: center;">
      <span style="font-size: 0.75rem; color: var(--clr-gray-500);">Your code:</span>
      <span style="font-family: var(--ff-accent); font-size: 1.3rem; font-weight: 800; color: var(--clr-saffron); letter-spacing: 0.3rem; margin-left: 0.5rem;">${waOTPCode}</span>
    </div>

    <!-- Step 2: Enter code -->
    <form id="wa-verify-form" novalidate>
      <div class="form-group" style="margin-bottom: 0.75rem;">
        <label class="form-label" for="wa-otp-input">Enter the 6-digit code</label>
        <input type="text" id="wa-otp-input" class="form-input" placeholder="------" maxlength="6" required inputmode="numeric" pattern="[0-9]*"
               style="text-align: center; font-size: 1.4rem; letter-spacing: 0.4rem; font-weight: 700; height: 48px;"
               aria-describedby="wa-otp-error">
        <div class="form-error" id="wa-otp-error" aria-live="polite"></div>
      </div>

      <button type="submit" class="btn btn-primary" style="width: 100%; height: 44px; font-size: 0.9rem;" id="wa-verify-btn">
        Verify & Sign In
      </button>
    </form>

    <div style="display: flex; justify-content: center; gap: 1rem; margin-top: 0.75rem;">
      <button id="wa-change-btn" style="background: none; border: none; color: var(--clr-saffron); font-size: 0.82rem; cursor: pointer; font-weight: 500;">Change number</button>
      <button id="wa-resend-btn" style="background: none; border: none; color: var(--clr-gray-500); font-size: 0.82rem; cursor: pointer;" disabled>
        Resend <span id="wa-timer"></span>
      </button>
    </div>
  `;
}

// ── Bind handlers ──

function bindMainHandlers(triggerElement) {
  const content = document.getElementById('auth-content');

  // Google
  document.getElementById('google-sign-in-btn')?.addEventListener('click', async () => {
    const btn = document.getElementById('google-sign-in-btn');
    const errorEl = document.getElementById('auth-error');
    errorEl.textContent = '';
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner" style="width:18px;height:18px;border-width:2px;" aria-hidden="true"></div> Signing in...';

    const result = await signInWithGoogle();
    if (!result.success && !result.redirecting) {
      errorEl.textContent = result.error;
      btn.disabled = false;
      btn.textContent = 'Continue with Google';
    }
  });

  // WhatsApp OTP
  document.getElementById('wa-otp-btn')?.addEventListener('click', () => {
    waStep = 'phone';
    content.innerHTML = renderWAPhoneScreen();
    bindWAPhoneHandlers(triggerElement);
    setTimeout(() => document.getElementById('wa-phone-input')?.focus(), 50);
  });
}

function bindWAPhoneHandlers(triggerElement) {
  const content = document.getElementById('auth-content');
  const input = document.getElementById('wa-phone-input');
  const wrapper = document.getElementById('wa-phone-wrapper');

  if (input && wrapper) {
    input.addEventListener('focus', () => wrapper.style.borderColor = 'var(--clr-saffron)');
    input.addEventListener('blur', () => wrapper.style.borderColor = 'var(--clr-gray-200)');
    input.addEventListener('input', () => { input.value = input.value.replace(/\D/g, ''); });
  }

  document.getElementById('wa-back-btn')?.addEventListener('click', () => {
    content.innerHTML = renderMainScreen();
    bindMainHandlers(triggerElement);
  });

  document.getElementById('wa-phone-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const phone = document.getElementById('wa-phone-input').value.trim();
    const name = document.getElementById('wa-name-input').value.trim();
    const phoneErr = document.getElementById('wa-phone-error');
    const nameErr = document.getElementById('wa-name-error');
    const btn = document.getElementById('wa-send-btn');

    phoneErr.textContent = '';
    nameErr.textContent = '';

    if (phone.length !== 10 || !/^[6-9]\d{9}$/.test(phone)) {
      phoneErr.textContent = 'Enter a valid 10-digit mobile number';
      return;
    }
    if (!name || name.length < 2) {
      nameErr.textContent = 'Enter your name (at least 2 characters)';
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Sending...';

    const result = await sendWhatsAppOTP(phone, name);

    if (result.success) {
      waPhone = phone;
      waOTPCode = result.code;
      waLink = result.waLink;
      waStep = 'otp';
      content.innerHTML = renderWAOTPScreen();
      bindWAOTPHandlers(triggerElement, name);
      startResendTimer();
      setTimeout(() => document.getElementById('wa-otp-input')?.focus(), 50);
    } else {
      phoneErr.textContent = result.error;
      btn.disabled = false;
      btn.textContent = 'Send Code via WhatsApp';
    }
  });
}

function bindWAOTPHandlers(triggerElement, name) {
  const content = document.getElementById('auth-content');
  const otpInput = document.getElementById('wa-otp-input');

  if (otpInput) {
    otpInput.addEventListener('input', () => { otpInput.value = otpInput.value.replace(/\D/g, ''); });
  }

  document.getElementById('wa-verify-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = otpInput.value.trim();
    const errorEl = document.getElementById('wa-otp-error');
    const btn = document.getElementById('wa-verify-btn');

    errorEl.textContent = '';

    if (code.length !== 6) {
      errorEl.textContent = 'Enter the 6-digit code';
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Verifying...';

    const result = await verifyWhatsAppOTP(waPhone, code, name);

    if (result.success) {
      const greeting = result.isNew ? `Welcome, ${result.user.name}!` : `Welcome back, ${result.user.name}!`;
      showToast(greeting, 'success');
      closeAuthModal(triggerElement);
      if (typeof successCallback === 'function') {
        successCallback(result.user);
        successCallback = null;
      } else {
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      }
    } else {
      errorEl.textContent = result.error;
      btn.disabled = false;
      btn.textContent = 'Verify & Sign In';
    }
  });

  document.getElementById('wa-change-btn')?.addEventListener('click', () => {
    waStep = 'phone';
    content.innerHTML = renderWAPhoneScreen();
    bindWAPhoneHandlers(triggerElement);
  });

  document.getElementById('wa-resend-btn')?.addEventListener('click', async () => {
    const btn = document.getElementById('wa-resend-btn');
    btn.disabled = true;
    btn.textContent = 'Sending...';

    const result = await sendWhatsAppOTP(waPhone, name);
    if (result.success) {
      waOTPCode = result.code;
      waLink = result.waLink;
      // Update the displayed code and WhatsApp link
      content.innerHTML = renderWAOTPScreen();
      bindWAOTPHandlers(triggerElement, name);
      startResendTimer();
      showToast('New code generated!', 'success');
    } else {
      showToast(result.error, 'error');
      btn.disabled = false;
      btn.textContent = 'Resend';
    }
  });
}

function startResendTimer() {
  let seconds = 30;
  const timerEl = document.getElementById('wa-timer');
  const btn = document.getElementById('wa-resend-btn');
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
      btn.style.fontWeight = '600';
    } else {
      timerEl.textContent = `(${seconds}s)`;
    }
  }, 1000);
}

// ── Phone collection modal (after Google SSO) ──

export function showPhoneModal(user, onComplete = null) {
  const existing = document.getElementById('phone-modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'phone-modal-overlay';

  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="phone-heading" style="max-width: 400px; padding: 2rem;">
      <div style="text-align: center; margin-bottom: 1.25rem;">
        <div style="width: 48px; height: 48px; border-radius: 50%; background: var(--grad-saffron); color: white; display: flex; align-items: center; justify-content: center; font-size: 1.3rem; margin: 0 auto 0.5rem; font-weight: 700;">
          ${(user?.name || 'U').charAt(0).toUpperCase()}
        </div>
        <h2 id="phone-heading" style="margin: 0 0 0.25rem 0; font-size: 1.1rem; color: var(--clr-charcoal);">Almost there${user?.name ? ', ' + user.name.split(' ')[0] : ''}!</h2>
        <p style="color: var(--clr-gray-500); font-size: 0.82rem; margin: 0;">Add your number for order updates</p>
      </div>

      <form id="phone-save-form" novalidate>
        <div class="form-group" style="margin-bottom: 0.75rem;">
          <div style="display: flex; border: 1.5px solid var(--clr-gray-200); border-radius: var(--radius-md); overflow: hidden;" id="phone-save-wrapper">
            <span style="padding: 0 0.75rem; font-weight: 600; color: var(--clr-gray-600); background: var(--clr-gray-100); height: 44px; display: flex; align-items: center; font-size: 0.9rem; border-right: 1px solid var(--clr-gray-200);">+91</span>
            <input type="tel" id="phone-save-input" placeholder="10-digit number" maxlength="10" required inputmode="numeric"
                   style="border: none; padding: 0 0.75rem; height: 44px; flex: 1; font-size: 0.95rem; outline: none; width: 100%;"
                   aria-describedby="phone-save-error">
          </div>
          <div class="form-error" id="phone-save-error" aria-live="polite"></div>
        </div>
        <button type="submit" class="btn btn-primary" style="width: 100%; height: 44px; font-size: 0.9rem;" id="save-phone-btn">
          Save & Continue
        </button>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  const input = document.getElementById('phone-save-input');
  const wrapper = document.getElementById('phone-save-wrapper');
  setTimeout(() => input?.focus(), 50);

  if (input && wrapper) {
    input.addEventListener('focus', () => wrapper.style.borderColor = 'var(--clr-saffron)');
    input.addEventListener('blur', () => wrapper.style.borderColor = 'var(--clr-gray-200)');
    input.addEventListener('input', () => { input.value = input.value.replace(/\D/g, ''); });
  }

  document.getElementById('phone-save-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const phone = input.value.trim();
    const errorEl = document.getElementById('phone-save-error');
    const btn = document.getElementById('save-phone-btn');

    errorEl.textContent = '';
    if (phone.length !== 10 || !/^[6-9]\d{9}$/.test(phone)) {
      errorEl.textContent = 'Enter a valid 10-digit mobile number';
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

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) showToast('Please add your phone number to continue', 'info');
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
