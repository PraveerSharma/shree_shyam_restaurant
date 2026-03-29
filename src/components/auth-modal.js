// ============================================
// AUTH MODAL COMPONENT
// Login / Register modal forms
// ============================================

import { login, register } from '../services/auth.js';
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
      
      <div class="auth-tabs">
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
        <input class="form-input" type="email" id="login-email" placeholder="your@email.com" required autocomplete="email">
        <div class="form-error" id="login-email-error"></div>
      </div>
      
      <div class="form-group">
        <label class="form-label" for="login-password">Password</label>
        <input class="form-input" type="password" id="login-password" placeholder="Enter your password" required autocomplete="current-password">
        <div class="form-error" id="login-password-error"></div>
      </div>
      
      <div class="form-error" id="login-general-error" style="margin-bottom:1rem;"></div>
      
      <button type="submit" class="btn btn-primary" style="width:100%;" id="login-submit">Login</button>
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
        <input class="form-input" type="email" id="reg-email" placeholder="your@email.com" required autocomplete="email">
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

function initFormHandlers() {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  loginForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    // Clear errors
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

  registerForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value;
    const phone = document.getElementById('reg-phone').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;

    // Clear errors
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
