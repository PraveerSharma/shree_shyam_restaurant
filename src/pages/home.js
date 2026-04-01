// ============================================
// HOME PAGE
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
          <div class="hero-badge">Serving Golaghat Since 2005</div>
          <h1 class="hero-title">
            Shree Shyam
            <span class="accent">Restaurant</span>
          </h1>
          <p class="hero-subtitle">
            Pure vegetarian sweets, crispy snacks & wholesome thalis — crafted with desi ghee and a whole lot of love.
          </p>
          <div class="hero-cta">
            <a href="#/sweets" class="btn btn-primary btn-lg">
              <span>Explore Sweets</span>
            </a>
            <a href="#/restaurant" class="btn btn-outline btn-lg" style="border-color:rgba(255,255,255,0.4);color:white;">
              <span>View Menu</span>
            </a>
          </div>
        </div>
        <div class="hero-scroll-hint" aria-hidden="true">
          <span></span>
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
              <span class="highlight-icon">👨‍🍳</span>
              <span class="highlight-text">20+ Years of Trust</span>
            </div>
            <div class="highlight-item">
              <span class="highlight-icon">📦</span>
              <span class="highlight-text">Order & Pickup</span>
            </div>
          </div>
        </div>
      </section>

      <!-- WHAT WE OFFER -->
      <section class="home-offerings" id="offerings">
        <div class="container">
          <div class="section-header reveal">
            <span class="section-tag">Our Specialties</span>
            <h2>Something for Every Craving</h2>
            <p>Festive boxes, everyday snacks, or a full family thali — we've got it all.</p>
          </div>

          <div class="offerings-grid">
            <a href="#/sweets" class="offering-card reveal">
              <div class="offering-img">
                <img src="/images/sweets/gulab-jamun.png" alt="Sweets" loading="lazy">
              </div>
              <div class="offering-body">
                <h3>Sweets & Mithai</h3>
                <p>Gulab Jamun, Kaju Barfi, Rasgulla, Peda, Ladoo — freshly prepared every morning.</p>
                <span class="offering-link">Browse Sweets <span class="arrow">&#8594;</span></span>
              </div>
            </a>

            <a href="#/sweets" class="offering-card reveal">
              <div class="offering-img">
                <img src="/images/sweets/samosa.png" alt="Snacks" loading="lazy">
              </div>
              <div class="offering-body">
                <h3>Snacks & Namkeen</h3>
                <p>Samosa, Bhujia, Mathri, Nankhatai — perfect with chai or as festive gift boxes.</p>
                <span class="offering-link">Browse Snacks <span class="arrow">&#8594;</span></span>
              </div>
            </a>

            <a href="#/restaurant" class="offering-card reveal">
              <div class="offering-img">
                <img src="/images/restaurant/thali.png" alt="Thali" loading="lazy">
              </div>
              <div class="offering-body">
                <h3>Restaurant & Thalis</h3>
                <p>Paneer Tikka, Dal Makhani, Butter Naan, and complete thali meals for the family.</p>
                <span class="offering-link">View Full Menu <span class="arrow">&#8594;</span></span>
              </div>
            </a>
          </div>
        </div>
      </section>

      <!-- VISIT US -->
      <section class="home-visit" id="visit-section">
        <div class="container">
          <div class="section-header reveal">
            <span class="section-tag">Find Us</span>
            <h2>Come Say Hello</h2>
          </div>

          <div class="visit-grid reveal">
            <div class="visit-card">
              <div class="visit-icon">📍</div>
              <h3>Our Address</h3>
              <p>${SITE_CONFIG.address.full}</p>
              <a href="${SITE_CONFIG.social.googleMapsSearch}" target="_blank" rel="noopener" class="visit-link">
                Get Directions <span class="arrow">&#8594;</span>
              </a>
            </div>

            <div class="visit-card">
              <div class="visit-icon">🕐</div>
              <h3>Open Hours</h3>
              <p>
                ${SITE_CONFIG.hours.days}<br>
                <strong>${SITE_CONFIG.hours.open} — ${SITE_CONFIG.hours.close}</strong>
              </p>
              <span class="visit-badge-open">We're Open</span>
            </div>

            <div class="visit-card">
              <div class="visit-icon">📞</div>
              <h3>Get in Touch</h3>
              <p>
                <a href="${SITE_CONFIG.contact.phoneLink}" style="color: var(--clr-charcoal); font-weight: 600;">${SITE_CONFIG.contact.phone}</a>
              </p>
              <div style="display: flex; gap: 0.5rem; margin-top: 0.75rem; justify-content: center;">
                <a href="${SITE_CONFIG.contact.phoneLink}" class="btn btn-primary btn-sm">Call Now</a>
                <a href="${SITE_CONFIG.contact.whatsappLink}" target="_blank" rel="noopener" class="btn btn-sm" style="background: #E6F4EA; color: #1E7E34; border: 1px solid #C2E7CB;">WhatsApp</a>
              </div>
            </div>
          </div>

          <!-- Map -->
          <div class="visit-map-wrapper reveal">
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
          <h2 class="reveal" style="font-size: clamp(1.5rem, 4vw, 2.2rem); color: var(--clr-charcoal); margin-bottom: 0.5rem;">Hungry? Let's Fix That.</h2>
          <p class="reveal" style="color: var(--clr-gray-500); margin-bottom: 2rem; font-size: 1rem;">Fresh sweets and hot meals — ready when you are.</p>
          <div class="cta-buttons reveal">
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
