// ============================================
// AUTH MODAL COMPONENT
// Login / Register / Forgot Password modal
// ============================================

import { login, register, resetPassword } from '../services/auth.js';
import { showToast } from '../utils/dom.js';

let currentTab = 'login';

export function showAuthModal(tab = 'login') {
  currentTab = tab;
  
  // Remove existing modal
  const existing = document.getElementById('auth-modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'auth-modal-overlay';
  
  overlay.innerHTML = `
    <div class="modal" id="auth-modal">
      <button class="modal-close" id="auth-modal-close" aria-label="Close">&times;</button>
      
      <div class="auth-tabs" id="auth-tabs-bar">
        <button class="auth-tab ${tab === 'login' ? 'active' : ''}" data-tab="login">Login</button>
        <button class="auth-tab ${tab === 'register' ? 'active' : ''}" data-tab="register">Register</button>
      </div>

      <div id="auth-form-container">
        ${tab === 'login' ? renderLoginForm() : renderRegisterForm()}
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  // Events
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeAuthModal();
  });

  document.getElementById('auth-modal-close').addEventListener('click', closeAuthModal);

  // Tab switching
  overlay.querySelectorAll('.auth-tab').forEach(tabBtn => {
    tabBtn.addEventListener('click', () => {
      currentTab = tabBtn.dataset.tab;
      overlay.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
      tabBtn.classList.add('active');
      document.getElementById('auth-tabs-bar').style.display = '';
      document.getElementById('auth-form-container').innerHTML = 
        currentTab === 'login' ? renderLoginForm() : renderRegisterForm();
      initFormHandlers();
    });
  });

  initFormHandlers();

  // Escape key
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      closeAuthModal();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
}

function renderLoginForm() {
  return `
    <form id="login-form" novalidate>
      <h2 class="modal-title">Welcome Back</h2>
      <p class="modal-subtitle">Login to your account to continue</p>
      
      <div class="form-group">
        <label class="form-label" for="login-email">Email Address</label>
        <input class="form-input" type="email" id="login-email" placeholder="your@gmail.com" required autocomplete="email">
        <div class="form-hint">Only Gmail addresses accepted</div>
        <div class="form-error" id="login-email-error"></div>
      </div>
      
      <div class="form-group">
        <label class="form-label" for="login-password">Password</label>
        <input class="form-input" type="password" id="login-password" placeholder="Enter your password" required autocomplete="current-password">
        <div class="form-error" id="login-password-error"></div>
      </div>
      
      <div class="form-error" id="login-general-error" style="margin-bottom:1rem;"></div>
      
      <button type="submit" class="btn btn-primary" style="width:100%;" id="login-submit">Login</button>
      
      <div class="forgot-password-link">
        <a href="#" id="show-forgot-password">Forgot Password?</a>
      </div>
    </form>
  `;
}

function renderRegisterForm() {
  return `
    <form id="register-form" novalidate>
      <h2 class="modal-title">Create Account</h2>
      <p class="modal-subtitle">Join us for a delightful experience</p>
      
      <div class="form-group">
        <label class="form-label" for="reg-name">Full Name</label>
        <input class="form-input" type="text" id="reg-name" placeholder="Your name" required autocomplete="name" maxlength="100">
        <div class="form-error" id="reg-name-error"></div>
      </div>
      
      <div class="form-group">
        <label class="form-label" for="reg-phone">Phone Number</label>
        <input class="form-input" type="tel" id="reg-phone" placeholder="+91 98XXX XXXXX" required autocomplete="tel" maxlength="15">
        <div class="form-error" id="reg-phone-error"></div>
      </div>
      
      <div class="form-group">
        <label class="form-label" for="reg-email">Email Address</label>
        <input class="form-input" type="email" id="reg-email" placeholder="your@gmail.com" required autocomplete="email">
        <div class="form-hint">Only Gmail addresses accepted</div>
        <div class="form-error" id="reg-email-error"></div>
      </div>
      
      <div class="form-group">
        <label class="form-label" for="reg-password">Password</label>
        <input class="form-input" type="password" id="reg-password" placeholder="Min 6 characters" required autocomplete="new-password" minlength="6" maxlength="128">
        <div class="form-error" id="reg-password-error"></div>
      </div>
      
      <div class="form-error" id="reg-general-error" style="margin-bottom:1rem;"></div>
      
      <button type="submit" class="btn btn-primary" style="width:100%;" id="register-submit">Create Account</button>
    </form>
  `;
}

function renderForgotPasswordForm() {
  return `
    <form id="forgot-form" novalidate>
      <h2 class="modal-title">🔐 Reset Password</h2>
      <p class="modal-subtitle">Enter your registered email and phone number to verify your identity</p>
      
      <div class="form-group">
        <label class="form-label" for="forgot-email">Registered Email</label>
        <input class="form-input" type="email" id="forgot-email" placeholder="your@gmail.com" required autocomplete="email">
        <div class="form-hint">Enter the Gmail address you registered with</div>
        <div class="form-error" id="forgot-email-error"></div>
      </div>
      
      <div class="form-group">
        <label class="form-label" for="forgot-phone">Registered Phone Number</label>
        <input class="form-input" type="tel" id="forgot-phone" placeholder="+91 98XXX XXXXX" required autocomplete="tel" maxlength="15">
        <div class="form-hint">Must match the phone number on your account</div>
        <div class="form-error" id="forgot-phone-error"></div>
      </div>
      
      <div class="form-group">
        <label class="form-label" for="forgot-new-password">New Password</label>
        <input class="form-input" type="password" id="forgot-new-password" placeholder="Min 6 characters" required autocomplete="new-password" minlength="6" maxlength="128">
        <div class="form-error" id="forgot-new-password-error"></div>
      </div>
      
      <div class="form-group">
        <label class="form-label" for="forgot-confirm-password">Confirm New Password</label>
        <input class="form-input" type="password" id="forgot-confirm-password" placeholder="Re-enter new password" required autocomplete="new-password" minlength="6" maxlength="128">
        <div class="form-error" id="forgot-confirm-password-error"></div>
      </div>
      
      <div class="form-error" id="forgot-general-error" style="margin-bottom:1rem;"></div>
      
      <button type="submit" class="btn btn-primary" style="width:100%;" id="forgot-submit">Reset Password</button>
      
      <div class="forgot-password-link">
        <a href="#" id="back-to-login">← Back to Login</a>
      </div>
    </form>
  `;
}

function showForgotPasswordView() {
  // Hide tabs
  const tabsBar = document.getElementById('auth-tabs-bar');
  if (tabsBar) tabsBar.style.display = 'none';

  document.getElementById('auth-form-container').innerHTML = renderForgotPasswordForm();
  initFormHandlers();
}

function initFormHandlers() {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const forgotForm = document.getElementById('forgot-form');

  // LOGIN
  loginForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    document.querySelectorAll('#login-form .form-error').forEach(el => el.textContent = '');
    document.querySelectorAll('#login-form .form-input').forEach(el => el.classList.remove('error'));

    const result = login(email, password);
    if (result.success) {
      showToast(`Welcome back, ${result.user.name}!`, 'success');
      closeAuthModal();
    } else {
      document.getElementById('login-general-error').textContent = result.error;
    }
  });

  // "Forgot Password?" link
  document.getElementById('show-forgot-password')?.addEventListener('click', (e) => {
    e.preventDefault();
    showForgotPasswordView();
  });

  // REGISTER
  registerForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value;
    const phone = document.getElementById('reg-phone').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;

    document.querySelectorAll('#register-form .form-error').forEach(el => el.textContent = '');
    document.querySelectorAll('#register-form .form-input').forEach(el => el.classList.remove('error'));

    const result = register({ name, phone, email, password });
    if (result.success) {
      showToast(`Welcome, ${result.user.name}! Account created.`, 'success');
      closeAuthModal();
    } else {
      document.getElementById('reg-general-error').textContent = result.error;
    }
  });

  // FORGOT PASSWORD
  forgotForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('forgot-email').value;
    const phone = document.getElementById('forgot-phone').value;
    const newPassword = document.getElementById('forgot-new-password').value;
    const confirmPassword = document.getElementById('forgot-confirm-password').value;

    document.querySelectorAll('#forgot-form .form-error').forEach(el => el.textContent = '');
    document.querySelectorAll('#forgot-form .form-input').forEach(el => el.classList.remove('error'));

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      document.getElementById('forgot-confirm-password-error').textContent = 'Passwords do not match';
      document.getElementById('forgot-confirm-password').classList.add('error');
      return;
    }

    const result = resetPassword(email, phone, newPassword);
    if (result.success) {
      showToast('Password reset successfully! You can now login.', 'success');
      // Go back to login view
      const tabsBar = document.getElementById('auth-tabs-bar');
      if (tabsBar) tabsBar.style.display = '';
      currentTab = 'login';
      const tabs = document.querySelectorAll('.auth-tab');
      tabs.forEach(t => t.classList.remove('active'));
      tabs[0]?.classList.add('active');
      document.getElementById('auth-form-container').innerHTML = renderLoginForm();
      initFormHandlers();
    } else {
      document.getElementById('forgot-general-error').textContent = result.error;
    }
  });

  // "Back to Login" link
  document.getElementById('back-to-login')?.addEventListener('click', (e) => {
    e.preventDefault();
    const tabsBar = document.getElementById('auth-tabs-bar');
    if (tabsBar) tabsBar.style.display = '';
    currentTab = 'login';
    const tabs = document.querySelectorAll('.auth-tab');
    tabs.forEach(t => t.classList.remove('active'));
    tabs[0]?.classList.add('active');
    document.getElementById('auth-form-container').innerHTML = renderLoginForm();
    initFormHandlers();
  });
}

export function closeAuthModal() {
  const overlay = document.getElementById('auth-modal-overlay');
  if (overlay) {
    overlay.style.opacity = '0';
    setTimeout(() => {
      overlay.remove();
      document.body.style.overflow = '';
    }, 200);
  }
}
