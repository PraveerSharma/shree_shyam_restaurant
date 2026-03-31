// ============================================
// HEADER COMPONENT
// Sticky navigation with mobile menu
// ============================================

import { SITE_CONFIG } from '../config/site.js';
import { getCartCount } from '../services/cart.js';
import { getCurrentUser, logout } from '../services/auth.js';
import { isAdminLoggedIn } from '../services/admin.js';

export function renderHeader() {
  const user = getCurrentUser();
  const adminActive = isAdminLoggedIn();
  const cartCount = getCartCount();

  return `
    <header class="site-header" id="site-header">
      <div class="header-inner">
        <a href="#/" class="header-logo" id="header-logo">
          <img src="/images/logo.png" alt="${SITE_CONFIG.name} Logo" width="48" height="48" loading="eager">
          <div class="header-logo-text">
            Shree Shyam<br>Restaurant
            <small>Est. Golaghat, Assam</small>
          </div>
        </a>

        <nav class="header-nav">
          <div class="nav-links" id="nav-links">
            <a href="#/" class="nav-link" data-page="home">Home</a>
            <a href="#/sweets" class="nav-link" data-page="sweets">Sweets & Snacks</a>
            <a href="#/restaurant" class="nav-link" data-page="restaurant">Restaurant</a>
            ${user ? `<a href="#/orders" class="nav-link" data-page="orders">My Orders</a>` : ''}
          </div>
        </nav>

        <div class="header-actions">
          <a href="#/cart" class="cart-btn" id="cart-btn" aria-label="View Cart">
            <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
            Cart
            <span class="cart-badge" id="cart-badge">${cartCount || 0}</span>
          </a>

          ${user ? `
            <button class="btn btn-ghost btn-sm" id="user-menu-btn" title="${user.name}">
              <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              ${user.name.split(' ')[0]}
            </button>
            <button class="btn btn-ghost btn-sm" id="logout-btn" title="Logout">
              <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </button>
          ` : adminActive ? `
            <span style="font-size: 0.85rem; font-weight: 600; color: var(--clr-saffron);">👨‍💼 Admin Active</span>
          ` : `
            <button class="btn btn-ghost btn-sm" id="login-btn">Login</button>
            <button class="btn btn-primary btn-sm" id="register-btn">Register</button>
          `}

          <div class="hamburger" id="hamburger" aria-label="Menu">
            <span></span><span></span><span></span>
          </div>
        </div>
      </div>
    </header>

    <div class="mobile-nav" id="mobile-nav">
      <a href="#/" class="nav-link" data-page="home">🏠 Home</a>
      <a href="#/sweets" class="nav-link" data-page="sweets">🍬 Sweets & Snacks</a>
      <a href="#/restaurant" class="nav-link" data-page="restaurant">🍛 Restaurant Menu</a>
      ${user ? `<a href="#/orders" class="nav-link" data-page="orders">📦 My Orders</a>` : ''}
      <a href="#/cart" class="nav-link" data-page="cart">🛒 Cart (${cartCount})</a>
      <div class="mobile-nav-auth">
        ${user ? `
          <span class="mobile-nav-user">Hello, ${user.name}</span>
          <button class="btn btn-secondary btn-sm" id="mobile-logout-btn">Logout</button>
        ` : adminActive ? `
          <span style="font-size: 0.9rem; font-weight: 600; color: var(--clr-saffron);">👨‍💼 Admin Mode Active</span>
        ` : `
          <button class="btn btn-ghost btn-sm" id="mobile-login-btn">Login</button>
          <button class="btn btn-primary btn-sm" id="mobile-register-btn">Register</button>
        `}
      </div>
    </div>
  `;
}

export function initHeader() {
  const header = document.getElementById('site-header');
  const hamburger = document.getElementById('hamburger');
  const mobileNav = document.getElementById('mobile-nav');

  // Scroll effect
  let lastScroll = 0;
  window.addEventListener('scroll', () => {
    const currentScroll = window.scrollY;
    if (currentScroll > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
    lastScroll = currentScroll;
  }, { passive: true });

  // Hamburger toggle
  hamburger?.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    mobileNav.classList.toggle('open');
    document.body.style.overflow = mobileNav.classList.contains('open') ? 'hidden' : '';
  });

  // Close mobile nav on link click
  mobileNav?.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('active');
      mobileNav.classList.remove('open');
      document.body.style.overflow = '';
    });
  });

  // Auth buttons — bind BOTH desktop and mobile buttons independently
  const desktopLoginBtn = document.getElementById('login-btn');
  const desktopRegisterBtn = document.getElementById('register-btn');
  const desktopLogoutBtn = document.getElementById('logout-btn');
  const mobileLoginBtn = document.getElementById('mobile-login-btn');
  const mobileRegisterBtn = document.getElementById('mobile-register-btn');
  const mobileLogoutBtn = document.getElementById('mobile-logout-btn');

  const closeMobileMenu = () => {
    hamburger?.classList.remove('active');
    mobileNav?.classList.remove('open');
    document.body.style.overflow = '';
  };

  [desktopLoginBtn, mobileLoginBtn].forEach(btn => {
    btn?.addEventListener('click', () => {
      closeMobileMenu();
      window.dispatchEvent(new CustomEvent('show-auth-modal', { detail: 'login' }));
    });
  });

  [desktopRegisterBtn, mobileRegisterBtn].forEach(btn => {
    btn?.addEventListener('click', () => {
      closeMobileMenu();
      window.dispatchEvent(new CustomEvent('show-auth-modal', { detail: 'register' }));
    });
  });

  [desktopLogoutBtn, mobileLogoutBtn].forEach(btn => {
    btn?.addEventListener('click', () => {
      closeMobileMenu();
      logout();
    });
  });

  // Active nav link
  updateActiveLink();
}

export function updateActiveLink() {
  const hash = window.location.hash || '#/';
  const page = hash.replace('#/', '') || 'home';
  document.querySelectorAll('.nav-link').forEach(link => {
    const linkPage = link.dataset.page;
    if (linkPage === page || (page === '' && linkPage === 'home')) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

export function updateCartBadge() {
  const badge = document.getElementById('cart-badge');
  if (badge) {
    const count = getCartCount();
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  }
}
