// ============================================
// PRIVACY POLICY PAGE
// ============================================

import { SITE_CONFIG } from '../config/site.js';

export function renderPrivacyPage() {
  return `
    <main class="page-content page-enter">
      <section class="section">
        <div class="container legal-page">
          <h1>Privacy Policy</h1>
          <p><em>Last updated: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</em></p>

          <h2>1. Information We Collect</h2>
          <p>When you use our website, we may collect the following information:</p>
          <ul>
            <li>Name, email address, and phone number (during registration)</li>
            <li>Order details including items, quantities, and preferences</li>
            <li>Pickup dates and delivery preferences</li>
            <li>Device information and browsing patterns (via cookies)</li>
          </ul>

          <h2>2. How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul>
            <li>Process and fulfill your food orders</li>
            <li>Communicate with you about your orders via WhatsApp/phone</li>
            <li>Improve our website and services</li>
            <li>Send promotional offers (with your consent)</li>
          </ul>

          <h2>3. Data Storage</h2>
          <p>Your account data is stored locally in your browser's localStorage. We do not currently store personal data on external servers. Order details sent via WhatsApp are subject to WhatsApp's privacy policy.</p>

          <h2>4. Data Sharing</h2>
          <p>We do not sell, trade, or share your personal information with third parties, except as required to process your orders or as mandated by law.</p>

          <h2>5. Cookies</h2>
          <p>We use essential cookies and localStorage to remember your cart, preferences, and login session. No third-party tracking cookies are used.</p>

          <h2>6. Your Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li>Access your personal data</li>
            <li>Request correction or deletion of your data</li>
            <li>Withdraw consent for marketing communications</li>
            <li>Clear your browser data at any time to remove all stored information</li>
          </ul>

          <h2>7. Contact Us</h2>
          <p>For privacy-related queries, contact us at:</p>
          <p>📞 ${SITE_CONFIG.contact.phone}<br>📍 ${SITE_CONFIG.address.full}</p>
        </div>
      </section>
    </main>
  `;
}
