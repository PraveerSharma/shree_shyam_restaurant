// ============================================
// TERMS & CONDITIONS PAGE
// ============================================

import { SITE_CONFIG } from '../config/site.js';

export function renderTermsPage() {
  return `
    <main class="page-content page-enter">
      <section class="section">
        <div class="container legal-page">
          <h1>Terms & Conditions</h1>
          <p><em>Last updated: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</em></p>

          <h2>1. Acceptance of Terms</h2>
          <p>By accessing and using the ${SITE_CONFIG.name} website, you agree to be bound by these Terms and Conditions. If you do not agree, please do not use our services.</p>

          <h2>2. Orders & Payments</h2>
          <ul>
            <li>All orders are subject to availability and confirmation</li>
            <li>Prices displayed are in Indian Rupees (₹) and inclusive of applicable taxes</li>
            <li>Payment is accepted as Cash on Delivery (pay at pickup) only</li>
            <li>We reserve the right to modify prices without prior notice</li>
            <li>Orders once confirmed via WhatsApp cannot be cancelled within 2 hours of the pickup time</li>
          </ul>

          <h2>3. Pickup Policy</h2>
          <ul>
            <li>Orders must be picked up on the selected pickup date</li>
            <li>Please arrive during business hours (${SITE_CONFIG.hours.open} - ${SITE_CONFIG.hours.close})</li>
            <li>Orders not picked up within 24 hours of the scheduled date may be cancelled</li>
            <li>Please carry your order ID or show the WhatsApp confirmation for pickup</li>
          </ul>

          <h2>4. Product Quality</h2>
          <ul>
            <li>All our products are 100% vegetarian and prepared with pure ingredients</li>
            <li>We maintain strict hygiene standards in our kitchen</li>
            <li>In case of any quality issue, please contact us within 2 hours of pickup</li>
            <li>Refunds or replacements will be provided at our discretion</li>
          </ul>

          <h2>5. User Accounts</h2>
          <ul>
            <li>You are responsible for maintaining the confidentiality of your account</li>
            <li>You agree to provide accurate and current information during registration</li>
            <li>We reserve the right to suspend accounts that violate these terms</li>
          </ul>

          <h2>6. Intellectual Property</h2>
          <p>All content on this website, including text, images, logos, and design, is the property of ${SITE_CONFIG.name} and is protected by applicable intellectual property laws.</p>

          <h2>7. Limitation of Liability</h2>
          <p>We shall not be liable for any indirect, incidental, or consequential damages arising from the use of our website or services, beyond the amount paid for the specific order in question.</p>

          <h2>8. Governing Law</h2>
          <p>These terms are governed by the laws of India. Any disputes shall be subject to the jurisdiction of courts in Golaghat, Assam.</p>

          <h2>9. Contact</h2>
          <p>For any queries regarding these terms, please contact us:</p>
          <p>📞 ${SITE_CONFIG.contact.phone}<br>📍 ${SITE_CONFIG.address.full}</p>
        </div>
      </section>
    </main>
  `;
}
