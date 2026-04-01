// ============================================
// AUTH MODAL — Google SSO + Phone OTP + WhatsApp OTP
// ============================================

import {
  signInWithGoogle, savePhone,
  setupRecaptcha, sendFirebaseOTP, verifyFirebaseOTP,
  sendWhatsAppOTP, verifyWhatsAppOTP,
} from '../services/auth.js';
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

  // Close
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeAuthModal(trigger); });
  document.getElementById('auth-modal-close').addEventListener('click', () => closeAuthModal(trigger));

  // Escape + focus trap
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

function phoneInputSetup(inputId, wrapperId) {
  const input = document.getElementById(inputId);
  const wrap = document.getElementById(wrapperId);
  if (input && wrap) {
    input.addEventListener('focus', () => wrap.style.borderColor = 'var(--clr-saffron)');
    input.addEventListener('blur', () => wrap.style.borderColor = 'var(--clr-gray-200)');
    input.addEventListener('input', () => { input.value = input.value.replace(/\D/g, ''); });
  }
}

function phoneInputHTML(id, wrapperId, errorId) {
  return `
    <div style="display: flex; border: 1.5px solid var(--clr-gray-200); border-radius: var(--radius-md); overflow: hidden;" id="${wrapperId}">
      <span style="padding: 0 0.7rem; font-weight: 600; color: var(--clr-gray-600); background: var(--clr-gray-100); height: 44px; display: flex; align-items: center; font-size: 0.9rem; border-right: 1px solid var(--clr-gray-200);">+91</span>
      <input type="tel" id="${id}" placeholder="10-digit number" maxlength="10" required inputmode="numeric"
             style="border:none; padding:0 0.7rem; height:44px; flex:1; font-size:0.95rem; outline:none; width:100%;"
             aria-describedby="${errorId}">
    </div>
    <div class="form-error" id="${errorId}" aria-live="polite"></div>
  `;
}

function otpInputHTML(id, errorId) {
  return `
    <input type="text" id="${id}" class="form-input" placeholder="------" maxlength="6" required inputmode="numeric" pattern="[0-9]*"
           style="text-align:center; font-size:1.4rem; letter-spacing:0.4rem; font-weight:700; height:48px;"
           aria-describedby="${errorId}">
    <div class="form-error" id="${errorId}" aria-live="polite"></div>
  `;
}

function authComplete(result, trigger) {
  const greeting = result.isNew ? `Welcome, ${result.user.name}!` : `Welcome back, ${result.user.name}!`;
  showToast(greeting, 'success');
  closeAuthModal(trigger);
  if (typeof successCallback === 'function') { successCallback(result.user); successCallback = null; }
  else window.dispatchEvent(new HashChangeEvent('hashchange'));
}

function startTimer(btnId, spanId, seconds = 30) {
  let s = seconds;
  const btn = document.getElementById(btnId);
  const span = document.getElementById(spanId);
  if (!btn || !span) return;
  btn.disabled = true;
  span.textContent = `(${s}s)`;
  const iv = setInterval(() => {
    s--;
    if (s <= 0) { clearInterval(iv); span.textContent = ''; btn.disabled = false; btn.style.color = 'var(--clr-saffron)'; }
    else span.textContent = `(${s}s)`;
  }, 1000);
}

// ============================================
// MAIN SCREEN
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
      <!-- Google -->
      <button id="google-btn" style="width:100%; display:flex; align-items:center; justify-content:center; gap:0.6rem; padding:0.65rem; border:1.5px solid var(--clr-gray-200); border-radius:var(--radius-md); background:white; font-size:0.9rem; font-weight:600; color:var(--clr-charcoal); cursor:pointer; height:46px;">
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
        Continue with Google
      </button>

      <div style="display:flex; align-items:center; gap:0.75rem; margin:0.25rem 0;">
        <div style="flex:1; height:1px; background:var(--clr-gray-200);"></div>
        <span style="font-size:0.72rem; color:var(--clr-gray-400);">or verify with phone</span>
        <div style="flex:1; height:1px; background:var(--clr-gray-200);"></div>
      </div>

      <!-- Phone OTP (SMS) -->
      <button id="sms-otp-btn" style="width:100%; display:flex; align-items:center; justify-content:center; gap:0.6rem; padding:0.65rem; border:1.5px solid var(--clr-gray-200); border-radius:var(--radius-md); background:white; font-size:0.9rem; font-weight:600; color:var(--clr-charcoal); cursor:pointer; height:46px;">
        <span style="font-size:1.1rem;">📱</span>
        Login with SMS OTP
      </button>

      <!-- WhatsApp OTP -->
      <button id="wa-otp-btn" style="width:100%; display:flex; align-items:center; justify-content:center; gap:0.5rem; padding:0.65rem; border:1.5px solid #C2E7CB; border-radius:var(--radius-md); background:#F0FDF4; font-size:0.9rem; font-weight:600; color:#15803D; cursor:pointer; height:46px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#25D366" aria-hidden="true"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.246 2.248 3.484 5.232 3.484 8.412-.003 6.557-5.338 11.892-11.893 11.892-1.997-.001-3.951-.5-5.688-1.448l-6.309 1.656zm6.29-4.143c1.552.921 3.13 1.411 4.793 1.412 5.204 0 9.444-4.24 9.446-9.443.002-2.521-.979-4.89-2.762-6.67s-4.149-2.765-6.67-2.765c-5.204 0-9.441 4.239-9.443 9.441-.001 1.742.483 3.339 1.398 4.71l-1.01 3.693 3.791-.994z"/></svg>
        Login with WhatsApp
      </button>
    </div>

    <div id="auth-error" style="color:var(--clr-error); font-size:0.82rem; text-align:center; margin-top:0.5rem; min-height:1em;" aria-live="polite"></div>
    <p style="text-align:center; font-size:0.68rem; color:var(--clr-gray-400); margin-top:1rem; line-height:1.5;">
      By continuing, you agree to our <a href="#/terms" style="color:var(--clr-saffron);">Terms</a> & <a href="#/privacy" style="color:var(--clr-saffron);">Privacy Policy</a>
    </p>
  `;
}

function bindMain(trigger) {
  document.getElementById('google-btn')?.addEventListener('click', async () => {
    const btn = document.getElementById('google-btn');
    btn.disabled = true; btn.innerHTML = '<div class="spinner" style="width:18px;height:18px;border-width:2px;" aria-hidden="true"></div> Signing in...';
    const r = await signInWithGoogle();
    if (!r.success && !r.redirecting) { document.getElementById('auth-error').textContent = r.error; btn.disabled = false; btn.textContent = 'Continue with Google'; }
  });
  document.getElementById('sms-otp-btn')?.addEventListener('click', () => { setContent(renderSMSPhone()); bindSMSPhone(trigger); setTimeout(() => document.getElementById('sms-phone')?.focus(), 50); });
  document.getElementById('wa-otp-btn')?.addEventListener('click', () => { setContent(renderWAPhone()); bindWAPhone(trigger); setTimeout(() => document.getElementById('wa-phone')?.focus(), 50); });
}

// ============================================
// SMS OTP FLOW (Firebase)
// ============================================

let smsPhoneNum = '';

function renderSMSPhone() {
  return `
    <div style="text-align:center; margin-bottom:1.25rem;">
      <div style="font-size:2rem; margin-bottom:0.4rem;">📱</div>
      <h2 id="auth-heading" style="margin:0 0 0.2rem; font-size:1.15rem;">Login with SMS OTP</h2>
      <p style="color:var(--clr-gray-500); font-size:0.82rem; margin:0;">We'll send a code to your phone via SMS</p>
    </div>
    <form id="sms-phone-form" novalidate>
      <div class="form-group" style="margin-bottom:0.75rem;">
        <label class="form-label" for="sms-phone">Mobile Number</label>
        ${phoneInputHTML('sms-phone', 'sms-phone-wrap', 'sms-phone-err')}
      </div>
      <button type="submit" class="btn btn-primary" style="width:100%; height:44px; font-size:0.9rem;" id="sms-send-btn">Send SMS OTP</button>
      <div id="sms-recaptcha"></div>
    </form>
    <button id="sms-back" style="display:block; margin:0.75rem auto 0; background:none; border:none; color:var(--clr-gray-500); font-size:0.82rem; cursor:pointer;">← Back</button>
  `;
}

function renderSMSOTP() {
  const masked = smsPhoneNum.replace(/^\+91/, '').slice(0, 3) + '****' + smsPhoneNum.slice(-2);
  return `
    <div style="text-align:center; margin-bottom:1.25rem;">
      <div style="font-size:2rem; margin-bottom:0.4rem;">🔐</div>
      <h2 id="auth-heading" style="margin:0 0 0.2rem; font-size:1.15rem;">Verify OTP</h2>
      <p style="color:var(--clr-gray-500); font-size:0.82rem; margin:0;">Sent via SMS to +91 ${masked}</p>
    </div>
    <form id="sms-otp-form" novalidate>
      <div class="form-group" style="margin-bottom:0.75rem;">
        <label class="form-label" for="sms-otp">Enter 6-digit OTP</label>
        ${otpInputHTML('sms-otp', 'sms-otp-err')}
      </div>
      <button type="submit" class="btn btn-primary" style="width:100%; height:44px; font-size:0.9rem;" id="sms-verify-btn">Verify & Continue</button>
    </form>
    <div style="display:flex; justify-content:center; gap:1rem; margin-top:0.75rem;">
      <button id="sms-change" style="background:none; border:none; color:var(--clr-saffron); font-size:0.82rem; cursor:pointer;">Change number</button>
      <button id="sms-resend" style="background:none; border:none; color:var(--clr-gray-500); font-size:0.82rem; cursor:pointer;" disabled>Resend <span id="sms-timer"></span></button>
    </div>
    <div id="sms-recaptcha"></div>
  `;
}

function renderSMSName() {
  return `
    <div style="text-align:center; margin-bottom:1.25rem;">
      <div style="font-size:2rem; margin-bottom:0.4rem;">👋</div>
      <h2 id="auth-heading" style="margin:0 0 0.2rem; font-size:1.15rem;">What's your name?</h2>
      <p style="color:var(--clr-gray-500); font-size:0.82rem; margin:0;">Complete your registration</p>
    </div>
    <form id="sms-name-form" novalidate>
      <div class="form-group" style="margin-bottom:0.75rem;">
        <label class="form-label" for="sms-name">Your Name</label>
        <input type="text" id="sms-name" class="form-input" placeholder="E.g. Rajesh Kumar" required style="height:44px; font-size:0.95rem;" aria-describedby="sms-name-err">
        <div class="form-error" id="sms-name-err" aria-live="polite"></div>
      </div>
      <button type="submit" class="btn btn-primary" style="width:100%; height:44px; font-size:0.9rem;" id="sms-name-btn">Get Started</button>
    </form>
  `;
}

function bindSMSPhone(trigger) {
  phoneInputSetup('sms-phone', 'sms-phone-wrap');
  document.getElementById('sms-back')?.addEventListener('click', () => { setContent(renderMain()); bindMain(trigger); });

  document.getElementById('sms-phone-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const ph = document.getElementById('sms-phone').value.trim();
    const err = document.getElementById('sms-phone-err');
    const btn = document.getElementById('sms-send-btn');
    err.textContent = '';
    if (ph.length !== 10 || !/^[6-9]\d{9}$/.test(ph)) { err.textContent = 'Enter a valid 10-digit number'; return; }
    smsPhoneNum = '+91' + ph;
    btn.disabled = true; btn.textContent = 'Sending...';
    try {
      setupRecaptcha('sms-recaptcha');
      const r = await sendFirebaseOTP(ph);
      if (r.success) { setContent(renderSMSOTP()); bindSMSOTP(trigger); startTimer('sms-resend', 'sms-timer'); setTimeout(() => document.getElementById('sms-otp')?.focus(), 50); }
      else { err.textContent = r.error; btn.disabled = false; btn.textContent = 'Send SMS OTP'; }
    } catch { err.textContent = 'Something went wrong.'; btn.disabled = false; btn.textContent = 'Send SMS OTP'; }
  });
}

function bindSMSOTP(trigger) {
  const otpIn = document.getElementById('sms-otp');
  otpIn?.addEventListener('input', () => { otpIn.value = otpIn.value.replace(/\D/g, ''); });

  document.getElementById('sms-otp-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const otp = otpIn.value.trim();
    const err = document.getElementById('sms-otp-err');
    const btn = document.getElementById('sms-verify-btn');
    err.textContent = '';
    if (otp.length !== 6) { err.textContent = 'Enter the 6-digit OTP'; return; }
    btn.disabled = true; btn.textContent = 'Verifying...';

    const r = await verifyFirebaseOTP(otp);
    if (r.success) { authComplete(r, trigger); }
    else if (r.needsName) { setContent(renderSMSName()); bindSMSName(trigger); setTimeout(() => document.getElementById('sms-name')?.focus(), 50); }
    else { err.textContent = r.error; btn.disabled = false; btn.textContent = 'Verify & Continue'; }
  });

  document.getElementById('sms-change')?.addEventListener('click', () => { setContent(renderSMSPhone()); bindSMSPhone(trigger); });
  document.getElementById('sms-resend')?.addEventListener('click', async () => {
    const btn = document.getElementById('sms-resend'); btn.disabled = true; btn.textContent = 'Sending...';
    setupRecaptcha('sms-recaptcha');
    const r = await sendFirebaseOTP(smsPhoneNum.replace('+91', ''));
    if (r.success) { showToast('New OTP sent!', 'success'); startTimer('sms-resend', 'sms-timer'); }
    else { showToast(r.error, 'error'); btn.disabled = false; btn.textContent = 'Resend'; }
  });
}

function bindSMSName(trigger) {
  document.getElementById('sms-name-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('sms-name').value.trim();
    const err = document.getElementById('sms-name-err');
    const btn = document.getElementById('sms-name-btn');
    err.textContent = '';
    if (!name || name.length < 2) { err.textContent = 'Enter your name (at least 2 characters)'; return; }
    btn.disabled = true; btn.textContent = 'Setting up...';
    const r = await verifyFirebaseOTP(null, name);
    if (r.success) authComplete(r, trigger);
    else { err.textContent = r.error || 'Failed. Please start over.'; btn.disabled = false; btn.textContent = 'Get Started'; }
  });
}

// ============================================
// WHATSAPP OTP FLOW
// ============================================

let waPhone = '', waCode = '', waLink = '';

function renderWAPhone() {
  return `
    <div style="text-align:center; margin-bottom:1.25rem;">
      <div style="font-size:2rem; margin-bottom:0.4rem;">💬</div>
      <h2 id="auth-heading" style="margin:0 0 0.2rem; font-size:1.15rem;">Login with WhatsApp</h2>
      <p style="color:var(--clr-gray-500); font-size:0.82rem; margin:0;">Verify your number via WhatsApp</p>
    </div>
    <form id="wa-phone-form" novalidate>
      <div class="form-group" style="margin-bottom:0.75rem;">
        <label class="form-label" for="wa-phone">Mobile Number</label>
        ${phoneInputHTML('wa-phone', 'wa-phone-wrap', 'wa-phone-err')}
      </div>
      <div class="form-group" style="margin-bottom:0.75rem;">
        <label class="form-label" for="wa-name">Your Name</label>
        <input type="text" id="wa-name" class="form-input" placeholder="E.g. Rajesh Kumar" required style="height:44px; font-size:0.95rem;">
      </div>
      <button type="submit" class="btn btn-primary" style="width:100%; height:44px; font-size:0.9rem; background:#25D366; border-color:#25D366;" id="wa-send-btn">Send Code via WhatsApp</button>
    </form>
    <button id="wa-back" style="display:block; margin:0.75rem auto 0; background:none; border:none; color:var(--clr-gray-500); font-size:0.82rem; cursor:pointer;">← Back</button>
  `;
}

function renderWAOTP() {
  return `
    <div style="text-align:center; margin-bottom:1.25rem;">
      <div style="font-size:2rem; margin-bottom:0.4rem;">✅</div>
      <h2 id="auth-heading" style="margin:0 0 0.2rem; font-size:1.15rem;">Verify Code</h2>
      <p style="color:var(--clr-gray-500); font-size:0.82rem; margin:0;">Send the code via WhatsApp, then enter it below</p>
    </div>
    <a href="${waLink}" target="_blank" rel="noopener" style="display:flex; align-items:center; justify-content:center; gap:0.5rem; width:100%; padding:0.6rem; background:#25D366; color:white; border-radius:var(--radius-md); text-decoration:none; font-weight:600; font-size:0.9rem; margin-bottom:0.75rem;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="white" aria-hidden="true"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.246 2.248 3.484 5.232 3.484 8.412-.003 6.557-5.338 11.892-11.893 11.892-1.997-.001-3.951-.5-5.688-1.448l-6.309 1.656z"/></svg>
      Open WhatsApp & Send Code
    </a>
    <div style="background:var(--clr-gray-50); border-radius:var(--radius-sm); padding:0.5rem; margin-bottom:0.75rem; text-align:center;">
      <span style="font-size:0.72rem; color:var(--clr-gray-500);">Your code:</span>
      <span style="font-family:var(--ff-accent); font-size:1.2rem; font-weight:800; color:var(--clr-saffron); letter-spacing:0.3rem; margin-left:0.4rem;">${waCode}</span>
    </div>
    <form id="wa-otp-form" novalidate>
      <div class="form-group" style="margin-bottom:0.75rem;">
        <label class="form-label" for="wa-otp">Enter 6-digit code</label>
        ${otpInputHTML('wa-otp', 'wa-otp-err')}
      </div>
      <button type="submit" class="btn btn-primary" style="width:100%; height:44px; font-size:0.9rem;" id="wa-verify-btn">Verify & Sign In</button>
    </form>
    <div style="display:flex; justify-content:center; gap:1rem; margin-top:0.75rem;">
      <button id="wa-change" style="background:none; border:none; color:var(--clr-saffron); font-size:0.82rem; cursor:pointer;">Change number</button>
      <button id="wa-resend" style="background:none; border:none; color:var(--clr-gray-500); font-size:0.82rem; cursor:pointer;" disabled>Resend <span id="wa-timer"></span></button>
    </div>
  `;
}

function bindWAPhone(trigger) {
  phoneInputSetup('wa-phone', 'wa-phone-wrap');
  document.getElementById('wa-back')?.addEventListener('click', () => { setContent(renderMain()); bindMain(trigger); });

  document.getElementById('wa-phone-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const ph = document.getElementById('wa-phone').value.trim();
    const name = document.getElementById('wa-name').value.trim();
    const err = document.getElementById('wa-phone-err');
    const btn = document.getElementById('wa-send-btn');
    err.textContent = '';
    if (ph.length !== 10 || !/^[6-9]\d{9}$/.test(ph)) { err.textContent = 'Enter a valid 10-digit number'; return; }
    if (!name || name.length < 2) { err.textContent = 'Enter your name'; return; }
    btn.disabled = true; btn.textContent = 'Sending...';
    const r = await sendWhatsAppOTP(ph, name);
    if (r.success) { waPhone = ph; waCode = r.code; waLink = r.waLink; setContent(renderWAOTP()); bindWAOTP(trigger, name); startTimer('wa-resend', 'wa-timer'); setTimeout(() => document.getElementById('wa-otp')?.focus(), 50); }
    else { err.textContent = r.error; btn.disabled = false; btn.textContent = 'Send Code via WhatsApp'; }
  });
}

function bindWAOTP(trigger, name) {
  const otpIn = document.getElementById('wa-otp');
  otpIn?.addEventListener('input', () => { otpIn.value = otpIn.value.replace(/\D/g, ''); });

  document.getElementById('wa-otp-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = otpIn.value.trim();
    const err = document.getElementById('wa-otp-err');
    const btn = document.getElementById('wa-verify-btn');
    err.textContent = '';
    if (code.length !== 6) { err.textContent = 'Enter the 6-digit code'; return; }
    btn.disabled = true; btn.textContent = 'Verifying...';
    const r = await verifyWhatsAppOTP(waPhone, code, name);
    if (r.success) authComplete(r, trigger);
    else { err.textContent = r.error; btn.disabled = false; btn.textContent = 'Verify & Sign In'; }
  });

  document.getElementById('wa-change')?.addEventListener('click', () => { setContent(renderWAPhone()); bindWAPhone(trigger); });
  document.getElementById('wa-resend')?.addEventListener('click', async () => {
    const btn = document.getElementById('wa-resend'); btn.disabled = true; btn.textContent = 'Sending...';
    const r = await sendWhatsAppOTP(waPhone, name);
    if (r.success) { waCode = r.code; waLink = r.waLink; setContent(renderWAOTP()); bindWAOTP(trigger, name); startTimer('wa-resend', 'wa-timer'); showToast('New code sent!', 'success'); }
    else { showToast(r.error, 'error'); btn.disabled = false; btn.textContent = 'Resend'; }
  });
}

// ============================================
// PHONE COLLECTION (after Google SSO)
// ============================================

export function showPhoneModal(user, onComplete = null) {
  const existing = document.getElementById('phone-modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'phone-modal-overlay';
  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" style="max-width:400px; padding:2rem;">
      <div style="text-align:center; margin-bottom:1.25rem;">
        <div style="width:44px; height:44px; border-radius:50%; background:var(--grad-saffron); color:white; display:flex; align-items:center; justify-content:center; font-size:1.2rem; margin:0 auto 0.5rem; font-weight:700;">${(user?.name || 'U')[0].toUpperCase()}</div>
        <h2 style="margin:0 0 0.2rem; font-size:1.1rem;">Almost there${user?.name ? ', ' + user.name.split(' ')[0] : ''}!</h2>
        <p style="color:var(--clr-gray-500); font-size:0.82rem; margin:0;">Add your number for order updates</p>
      </div>
      <form id="phone-save-form" novalidate>
        <div class="form-group" style="margin-bottom:0.75rem;">
          ${phoneInputHTML('phone-save', 'phone-save-wrap', 'phone-save-err')}
        </div>
        <button type="submit" class="btn btn-primary" style="width:100%; height:44px; font-size:0.9rem;" id="phone-save-btn">Save & Continue</button>
      </form>
    </div>
  `;
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';
  setTimeout(() => { document.getElementById('phone-save')?.focus(); phoneInputSetup('phone-save', 'phone-save-wrap'); }, 50);

  document.getElementById('phone-save-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const ph = document.getElementById('phone-save').value.trim();
    const err = document.getElementById('phone-save-err');
    const btn = document.getElementById('phone-save-btn');
    err.textContent = '';
    if (ph.length !== 10 || !/^[6-9]\d{9}$/.test(ph)) { err.textContent = 'Enter a valid 10-digit number'; return; }
    btn.disabled = true; btn.textContent = 'Saving...';
    const r = await savePhone(ph);
    if (r.success) { overlay.remove(); document.body.style.overflow = ''; showToast(`Welcome, ${r.user.name || 'there'}!`, 'success'); if (onComplete) onComplete(r.user); window.dispatchEvent(new HashChangeEvent('hashchange')); }
    else { err.textContent = r.error; btn.disabled = false; btn.textContent = 'Save & Continue'; }
  });

  overlay.addEventListener('click', (e) => { if (e.target === overlay) showToast('Please add your phone number', 'info'); });
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
