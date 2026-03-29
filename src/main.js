// ============================================
// MAIN APP ENTRY POINT
// SPA Router + App Shell
// ============================================

import './styles/index.css';
import './styles/components.css';
import './styles/pages.css';
import './styles/responsive.css';

import { renderHeader, initHeader, updateActiveLink, updateCartBadge } from './components/header.js';
import { renderFooter } from './components/footer.js';
import { showAuthModal } from './components/auth-modal.js';
import { initScrollReveal } from './utils/animations.js';

// Page imports
import { renderHomePage } from './pages/home.js';
import { renderSweetsPage, initSweetsPage, cleanupSweetsPage } from './pages/sweets.js';
import { renderRestaurantPage, initRestaurantPage, cleanupRestaurantPage } from './pages/restaurant.js';
import { renderCartPage, initCartPage, resetCartPageState } from './pages/cart.js';
import { renderAdminPage, initAdminPage } from './pages/admin.js';
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
      pageTitle = 'Shree Shyam Restaurant - Best Vegetarian Food in Sikar';
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
    case 'privacy':
      pageContent = renderPrivacyPage();
      pageTitle = 'Privacy Policy - Shree Shyam Restaurant';
      break;
    case 'terms':
      pageContent = renderTermsPage();
      pageTitle = 'Terms & Conditions - Shree Shyam Restaurant';
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
  showAuthModal(e.detail);
});

// ── Security: CSP violation logging ──
document.addEventListener('securitypolicyviolation', (e) => {
  console.warn('CSP Violation:', e.violatedDirective, e.blockedURI);
});

// ── Initial render ──
handleRoute();

// ── Service Worker Registration (for PWA-ready) ──
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    // Service worker can be registered for offline support in production
    console.log('Production mode: Service Worker ready for registration');
  });
}
