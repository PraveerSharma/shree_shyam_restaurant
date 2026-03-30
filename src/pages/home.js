// ============================================
// HOME PAGE
// Hero + Info Cards + CTAs
// ============================================

import { SITE_CONFIG } from '../config/site.js';

export function renderHomePage() {
  return `
    <main class="page-content page-enter">
      <!-- HERO SECTION -->
      <section class="hero" id="hero-section">
        <div class="hero-bg">
          <img src="/images/hero-bg.png" alt="Indian Thali Spread" width="1920" height="1080" loading="eager">
        </div>
        <div class="hero-overlay"></div>
        <div class="hero-content">
          <img src="/images/logo.png" alt="${SITE_CONFIG.name}" class="hero-logo" width="160" height="160">
          <div class="hero-badge">✦ Since Sikar, Rajasthan ✦</div>
          <h1 class="hero-title">
            <span class="accent">Pure Veg · Sweets · Thalis</span>
          </h1>
          <p class="hero-subtitle">
            Traditional Rajasthani flavors, made with pure ghee & love.
          </p>
          <div class="hero-cta">
            <a href="#/sweets" class="btn btn-primary btn-lg">
              🍬 Order Sweets & Snacks
            </a>
            <a href="#/restaurant" class="btn btn-outline btn-lg" style="border-color:rgba(255,255,255,0.5);color:white;">
              🍛 Explore Dine-In Menu
            </a>
          </div>
        </div>
      </section>

      <!-- INFO CARDS -->
      <section class="info-section" id="info-section">
        <div class="container">
          <div class="info-grid stagger">
            <!-- Hours Card -->
            <div class="info-card reveal">
              <div class="info-card-icon">🕐</div>
              <h3>Opening Hours</h3>
              <p>
                <strong>${SITE_CONFIG.hours.days}</strong><br>
                ${SITE_CONFIG.hours.open} — ${SITE_CONFIG.hours.close}<br><br>
                Open every day of the week!<br>
                Dine-in, takeaway & pickup available.
              </p>
            </div>

            <!-- Address Card -->
            <div class="info-card reveal">
              <div class="info-card-icon">📍</div>
              <h3>Our Location</h3>
              <p>
                ${SITE_CONFIG.address.line1}<br>
                ${SITE_CONFIG.address.line2}<br>
                ${SITE_CONFIG.address.city}, ${SITE_CONFIG.address.state} ${SITE_CONFIG.address.pin}
              </p>
              <a href="${SITE_CONFIG.social.googleMapsSearch}" target="_blank" rel="noopener" style="display:inline-block;margin-top:12px;">
                📌 Open in Google Maps →
              </a>
              <iframe 
                class="map-embed" 
                src="${SITE_CONFIG.social.googleMaps}" 
                allowfullscreen="" 
                loading="lazy" 
                referrerpolicy="no-referrer-when-downgrade"
                title="Restaurant Location Map"
              ></iframe>
            </div>

            <!-- Contact Card -->
            <div class="info-card reveal">
              <div class="info-card-icon">📞</div>
              <h3>Get in Touch</h3>
              <p>
                📱 <a href="${SITE_CONFIG.contact.phoneLink}">${SITE_CONFIG.contact.phone}</a><br><br>
                💬 <a href="${SITE_CONFIG.contact.whatsappLink}" target="_blank">Chat on WhatsApp</a><br><br>
              </p>
              <a href="${SITE_CONFIG.contact.phoneLink}" class="btn btn-primary btn-sm" style="margin-top:8px;">
                📞 Call to Book
              </a>
              <br><br>
              <a href="${SITE_CONFIG.contact.whatsappLink}" target="_blank" class="btn btn-outline btn-sm" style="border-color:#25D366;color:#25D366;">
                💬 WhatsApp Us
              </a>
            </div>
          </div>
        </div>
      </section>

      <!-- CTA SECTION -->
      <section class="cta-section reveal" id="cta-section">
        <div class="container">
          <h2>What Are You Craving Today?</h2>
          <p>Choose from our delicious sweets & snacks or explore our full restaurant menu</p>
          <div class="cta-buttons">
            <a href="#/sweets" class="cta-btn-big cta-btn-sweets">
              🍬 Order Sweets & Snacks
            </a>
            <a href="#/restaurant" class="cta-btn-big cta-btn-restaurant">
              🍛 Dine-In Menu
            </a>
          </div>
        </div>
      </section>
    </main>
  `;
}
