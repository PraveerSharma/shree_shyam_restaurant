// ============================================
// MAIN APP ENTRY POINT
// SPA Router + App Shell
// ============================================

import './styles/index.css';
import './styles/components.css';
import './styles/pages.css';
import './services/error-monitor.js'; // Global error capture
import './styles/responsive.css';

import { renderHeader, initHeader, updateActiveLink, updateCartBadge } from './components/header.js';
import { renderFooter } from './components/footer.js';
import { trackPageView } from './services/analytics.js';
import { showAuthModal } from './components/auth-modal.js';
import { initScrollReveal } from './utils/animations.js';

// Page imports
import { renderHomePage } from './pages/home.js';
import { renderSweetsPage, initSweetsPage, cleanupSweetsPage } from './pages/sweets.js';
import { renderRestaurantPage, initRestaurantPage, cleanupRestaurantPage } from './pages/restaurant.js';
import { renderCartPage, initCartPage } from './pages/cart.js';
import { renderAdminPage, initAdminPage } from './pages/admin.js';
import { renderOrdersPage, initOrdersPage } from './pages/orders.js';
import { renderPrivacyPage } from './pages/privacy.js';
import { renderTermsPage } from './pages/terms.js';

// ── App Shell ──
const app = document.getElementById('app');

// Current page cleanup function
let currentCleanup = null;

function getRoute() {
  const hash = window.location.hash || '#/';
  return hash.replace('#/', '') || 'home';
}

function renderPage(route) {
  // Run cleanup for previous page
  if (currentCleanup) {
    currentCleanup();
    currentCleanup = null;
  }

  let pageContent = '';
  let pageTitle = 'Shree Shyam Restaurant';
  let initFn = null;

  switch (route) {
    case 'home':
    case '':
      pageContent = renderHomePage();
      pageTitle = 'Shree Shyam Restaurant - Best Vegetarian Food in Golaghat';
      break;
    case 'sweets':
      pageContent = renderSweetsPage();
      pageTitle = 'Sweets & Snacks - Shree Shyam Restaurant';
      initFn = initSweetsPage;
      currentCleanup = cleanupSweetsPage;
      break;
    case 'restaurant':
      pageContent = renderRestaurantPage();
      pageTitle = 'Restaurant Menu - Shree Shyam Restaurant';
      initFn = initRestaurantPage;
      currentCleanup = cleanupRestaurantPage;
      break;
    case 'cart':
      pageContent = renderCartPage();
      pageTitle = 'Cart & Checkout - Shree Shyam Restaurant';
      initFn = initCartPage;
      break;
    case 'admin':
      pageContent = renderAdminPage();
      pageTitle = 'Admin Panel - Shree Shyam Restaurant';
      initFn = initAdminPage;
      break;
    case 'orders':
      pageContent = renderOrdersPage();
      pageTitle = 'My Orders - Shree Shyam Restaurant';
      initFn = initOrdersPage;
      break;
    case 'privacy':
      pageContent = renderPrivacyPage();
      pageTitle = 'Privacy Policy - Shree Shyam Restaurant';
      break;
    case 'terms':
      pageContent = renderTermsPage();
      pageTitle = 'Terms & Conditions - Shree Shyam Restaurant';
      break;
    case 'auth-callback':
      // Google OAuth redirects here — handle in background, show loading
      pageContent = `
        <main class="page-content page-enter">
          <section class="section" style="text-align:center;padding:6rem 1rem;">
            <div class="spinner" style="margin:0 auto 1rem;" aria-hidden="true"></div>
            <p style="color:var(--clr-gray-500);">Signing you in...</p>
          </section>
        </main>
      `;
      pageTitle = 'Signing In...';
      initFn = async () => {
        const { handleAuthCallback } = await import(/* @vite-ignore */ './services/auth.js');
        const { showPhoneModal } = await import(/* @vite-ignore */ './components/auth-modal.js');
        const result = await handleAuthCallback();
        if (result.success) {
          if (result.needsPhone) {
            window.location.hash = '#/';
            setTimeout(() => showPhoneModal(result.user), 300);
          } else {
            showToast(`Welcome back, ${result.user.name}!`, 'success');
            window.location.hash = '#/';
          }
        } else {
          showToast(result.error || 'Sign in failed', 'error');
          window.location.hash = '#/';
        }
      };
      break;
    default:
      pageContent = `
        <main class="page-content page-enter">
          <section class="section" style="text-align:center;padding:6rem 1rem;">
            <h1 style="font-size:4rem;margin-bottom:1rem;">404</h1>
            <h2>Page Not Found</h2>
            <p style="color:var(--clr-gray-500);margin-bottom:2rem;">The page you're looking for doesn't exist.</p>
            <a href="#/" class="btn btn-primary">Go to Home</a>
          </section>
        </main>
      `;
      pageTitle = '404 - Shree Shyam Restaurant';
  }

  document.title = pageTitle;

  // Re-render entire app shell
  app.innerHTML = `
    ${renderHeader()}
    ${pageContent}
    ${renderFooter()}
  `;

  // Add main-content id for skip link
  const mainEl = app.querySelector('main');
  if (mainEl) mainEl.id = 'main-content';

  // Initialize header
  initHeader();
  
  // Update active link
  updateActiveLink();

  // Update cart badge
  updateCartBadge();

  // Initialize page-specific JS
  if (initFn) initFn();

  // Scroll to top
  window.scrollTo(0, 0);

  // Analytics: track page view
  trackPageView(route);

  // Init scroll reveals
  setTimeout(() => initScrollReveal(), 100);
}

// ── Router ──
function handleRoute() {
  const route = getRoute();
  renderPage(route);
}

window.addEventListener('hashchange', handleRoute);

// ── Global Events ──
window.addEventListener('auth-changed', () => {
  handleRoute(); // Re-render to update header
});

window.addEventListener('cart-updated', () => {
  updateCartBadge();
});

window.addEventListener('show-auth-modal', (e) => {
  const detail = e.detail;
  if (typeof detail === 'string') {
    showAuthModal(detail);
  } else if (detail && typeof detail === 'object') {
    showAuthModal(detail.tab || 'login', detail.onSuccess);
  }
});

// ── Security: CSP violation logging ──
document.addEventListener('securitypolicyviolation', (e) => {
  console.warn('CSP Violation:', e.violatedDirective, e.blockedURI);
});

// ── Initial render ──
handleRoute();

// ── Supabase Sync (background — doesn't block initial render) ──
import { syncAll, processRetryQueue, subscribeToOrders } from './services/db.js';
import { showToast } from './utils/dom.js';
import { restoreSession } from './services/auth.js';

// Show sync indicator
const syncBar = document.createElement('div');
syncBar.id = 'sync-bar';
syncBar.style.cssText = 'position:fixed;top:0;left:0;height:3px;background:var(--clr-saffron);z-index:9999;transition:width 0.3s ease;width:30%;';
document.body.appendChild(syncBar);

// Process retry queue first (for any previously failed writes)
processRetryQueue().catch(() => {});

// Restore auth session from Supabase JWT
restoreSession().then(() => handleRoute()).catch(() => {});

syncAll().then(ok => {
  syncBar.style.width = '100%';
  setTimeout(() => syncBar.remove(), 400);
  if (ok) {
    console.log('[DB] Synced with Supabase');
    handleRoute(); // Re-render with server data
  } else {
    showToast('Using offline data. Some features may be limited.', 'info');
  }
}).catch(err => {
  syncBar.remove();
  console.warn('[DB] Sync failed, using local data:', err);
});

// ── Realtime: only connect when admin page is active ──
if (window.location.hash.includes('admin')) {
  subscribeToOrders(() => { handleRoute(); });
}

// ── Service Worker Registration (PWA) ──
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // SW registration failed — not critical
    });
  });
}
