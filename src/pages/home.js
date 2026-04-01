// ============================================
// HOME PAGE — Elegant & Modern
// ============================================

import { SITE_CONFIG } from '../config/site.js';

export function renderHomePage() {
  return `
    <main class="page-content page-enter">
      <!-- HERO -->
      <section class="hero" id="hero-section">
        <div class="hero-bg">
          <img src="/images/hero-bg.png" alt="" width="1920" height="1080" loading="eager" aria-hidden="true">
        </div>
        <div class="hero-overlay" aria-hidden="true"></div>
        <div class="hero-content">
          <img src="/images/logo.png" alt="" class="hero-logo" aria-hidden="true">
          <div class="hero-badge">Est. 2005 · Golaghat, Assam</div>
          <h1 class="hero-title">
            Shree Shyam
            <span class="accent">Restaurant</span>
          </h1>
          <p class="hero-subtitle">
            Authentic vegetarian sweets, snacks & thalis — made with pure ghee and generations of tradition.
          </p>
          <div class="hero-cta">
            <a href="#/sweets" class="btn btn-primary btn-lg">
              Order Sweets
            </a>
            <a href="#/restaurant" class="btn btn-outline btn-lg" style="border-color:rgba(255,255,255,0.4);color:white;">
              Dine-In Menu
            </a>
          </div>
        </div>
      </section>

      <!-- HIGHLIGHTS STRIP -->
      <section class="home-highlights">
        <div class="container">
          <div class="highlights-row">
            <div class="highlight-item">
              <span class="highlight-icon">🌿</span>
              <span class="highlight-text">100% Pure Veg</span>
            </div>
            <div class="highlight-item">
              <span class="highlight-icon">🧈</span>
              <span class="highlight-text">Made with Desi Ghee</span>
            </div>
            <div class="highlight-item">
              <span class="highlight-icon">🏠</span>
              <span class="highlight-text">Serving Since 2005</span>
            </div>
            <div class="highlight-item">
              <span class="highlight-icon">📦</span>
              <span class="highlight-text">Pickup & Delivery</span>
            </div>
          </div>
        </div>
      </section>

      <!-- WHAT WE OFFER -->
      <section class="home-offerings" id="offerings">
        <div class="container">
          <div class="section-header">
            <span class="section-tag">What We Offer</span>
            <h2>A Taste for Every Occasion</h2>
            <p>From festive sweets to everyday thalis, we've got Golaghat covered.</p>
          </div>

          <div class="offerings-grid">
            <a href="#/sweets" class="offering-card offering-sweets">
              <div class="offering-img">
                <img src="/images/sweets/gulab-jamun.png" alt="Sweets" loading="lazy">
              </div>
              <div class="offering-body">
                <h3>Sweets & Mithai</h3>
                <p>Gulab Jamun, Kaju Barfi, Rasgulla, Peda, Ladoo and more — freshly made every day.</p>
                <span class="offering-link">Browse Sweets →</span>
              </div>
            </a>

            <a href="#/sweets" class="offering-card offering-snacks">
              <div class="offering-img">
                <img src="/images/sweets/samosa.png" alt="Snacks" loading="lazy">
              </div>
              <div class="offering-body">
                <h3>Snacks & Namkeen</h3>
                <p>Samosa, Bhujia, Mathri, Nankhatai, Namak Pare — perfect with chai or as gifts.</p>
                <span class="offering-link">Browse Snacks →</span>
              </div>
            </a>

            <a href="#/restaurant" class="offering-card offering-restaurant">
              <div class="offering-img">
                <img src="/images/restaurant/thali.png" alt="Thali" loading="lazy">
              </div>
              <div class="offering-body">
                <h3>Restaurant & Thalis</h3>
                <p>Full dine-in menu: Paneer Tikka, Dal Makhani, Butter Naan, and complete thali options.</p>
                <span class="offering-link">Explore Menu →</span>
              </div>
            </a>
          </div>
        </div>
      </section>

      <!-- VISIT US -->
      <section class="home-visit" id="visit-section">
        <div class="container">
          <div class="section-header">
            <span class="section-tag">Visit Us</span>
            <h2>We'd Love to See You</h2>
          </div>

          <div class="visit-grid">
            <div class="visit-card">
              <div class="visit-icon">📍</div>
              <h3>Location</h3>
              <p>${SITE_CONFIG.address.full}</p>
              <a href="${SITE_CONFIG.social.googleMapsSearch}" target="_blank" rel="noopener" class="visit-link">
                Get Directions →
              </a>
            </div>

            <div class="visit-card">
              <div class="visit-icon">🕐</div>
              <h3>Hours</h3>
              <p>
                ${SITE_CONFIG.hours.days}<br>
                <strong>${SITE_CONFIG.hours.open} — ${SITE_CONFIG.hours.close}</strong>
              </p>
              <span class="visit-badge-open">Open Now</span>
            </div>

            <div class="visit-card">
              <div class="visit-icon">📞</div>
              <h3>Contact</h3>
              <p>
                <a href="${SITE_CONFIG.contact.phoneLink}" style="color: var(--clr-charcoal); font-weight: 600;">${SITE_CONFIG.contact.phone}</a>
              </p>
              <div style="display: flex; gap: 0.5rem; margin-top: 0.75rem; justify-content: center;">
                <a href="${SITE_CONFIG.contact.phoneLink}" class="btn btn-primary btn-sm">Call Us</a>
                <a href="${SITE_CONFIG.contact.whatsappLink}" target="_blank" rel="noopener" class="btn btn-sm" style="background: #E6F4EA; color: #1E7E34; border: 1px solid #C2E7CB;">WhatsApp</a>
              </div>
            </div>
          </div>

          <!-- Map -->
          <div class="visit-map-wrapper">
            <iframe
              class="map-embed"
              src="${SITE_CONFIG.social.googleMaps}"
              allowfullscreen=""
              loading="lazy"
              referrerpolicy="no-referrer-when-downgrade"
              title="Restaurant Location Map"
            ></iframe>
          </div>
        </div>
      </section>

      <!-- FINAL CTA -->
      <section class="home-cta">
        <div class="container" style="text-align: center;">
          <h2 style="font-size: clamp(1.5rem, 4vw, 2.2rem); color: var(--clr-charcoal); margin-bottom: 0.5rem;">Ready to Order?</h2>
          <p style="color: var(--clr-gray-500); margin-bottom: 2rem; font-size: 1rem;">Fresh sweets and hot meals — just a few clicks away.</p>
          <div class="cta-buttons">
            <a href="#/sweets" class="cta-btn-big cta-btn-sweets">
              🍬 Sweets & Snacks
            </a>
            <a href="#/restaurant" class="cta-btn-big cta-btn-restaurant">
              🍛 Restaurant Menu
            </a>
          </div>
        </div>
      </section>
    </main>
  `;
}
