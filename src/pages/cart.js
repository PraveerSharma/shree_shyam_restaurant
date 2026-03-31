// ============================================
// CART & CHECKOUT PAGE
// ============================================

import { getCart, removeFromCart, updateQuantity, getCartTotal } from '../services/cart.js';
import { createOrder, sendToWhatsApp } from '../services/orders.js';
import { formatPrice, getTodayDate } from '../utils/format.js';
import { showToast, sanitizeInput } from '../utils/dom.js';
import { SITE_CONFIG } from '../config/site.js';
import { getCurrentUser, updateUserPhone } from '../services/auth.js';

let orderSuccess = false;
let phoneVerified = true; // DEFAULT TO TRUE TO BYPASS OTP
let resendTimer = 0;
let resendInterval = null;

export function renderCartPage() {
  if (orderSuccess) return renderSuccessScreen();
  
  const cart = getCart();
  const total = getCartTotal();
  const user = getCurrentUser();

  // Auto-fill and auto-verify if already verified in DB
  if (user && user.phoneVerified && !phoneVerified) {
    phoneVerified = true;
  }

  if (cart.length === 0) {
    return `
      <main class="page-content page-enter">
        <section class="section">
          <div class="container">
            <div class="cart-empty">
              <div class="cart-empty-icon">🛒</div>
              <h2>Your Cart is Empty</h2>
              <p>Looks like you haven't added anything yet. Explore our delicious menu!</p>
              <div style="display:flex;gap:1rem;justify-content:center;margin-top:2rem;flex-wrap:wrap;">
                <a href="#/sweets" class="btn btn-primary">🍬 Browse Sweets</a>
                <a href="#/restaurant" class="btn btn-secondary">🍛 Restaurant Menu</a>
              </div>
            </div>
          </div>
        </section>
      </main>
    `;
  }

  return `
    <main class="page-content page-enter">
      <section class="section cart-page">
        <div class="container">
          <h1>🛒 Your Cart</h1>
          
          <div class="cart-layout">
            <!-- Cart Items -->
            <div class="cart-items" id="cart-items-list">
              ${cart.map(item => `
                <div class="cart-item" data-id="${item.id}">
                  <div class="cart-item-img">
                    <img src="${item.image}" alt="${item.name}" loading="lazy" width="90" height="90">
                  </div>
                  <div class="cart-item-info">
                    <h3 class="cart-item-name">${item.name}</h3>
                    <div class="cart-item-price">${formatPrice(item.price)} <small>${item.unit || ''}</small></div>
                    <div style="display:flex;align-items:center;gap:0.5rem;margin-top:8px;">
                      <div class="qty-selector">
                        <button class="qty-btn cart-qty-minus" data-id="${item.id}">−</button>
                        <input class="qty-value" type="text" value="${item.quantity}" readonly>
                        <button class="qty-btn cart-qty-plus" data-id="${item.id}">+</button>
                      </div>
                      <span style="color:var(--clr-gray-500);font-size:0.85rem;">
                        = ${formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                  <button class="cart-item-remove" data-id="${item.id}" title="Remove item" aria-label="Remove ${item.name}">
                    ✕
                  </button>
                </div>
              `).join('')}
            </div>

            <!-- Checkout Panel -->
            <div class="checkout-panel" id="checkout-panel">
              <h2>Order Summary</h2>
              
              ${cart.map(item => `
                <div class="checkout-summary-line">
                  <span>${item.name} × ${item.quantity}</span>
                  <span>${formatPrice(item.price * item.quantity)}</span>
                </div>
              `).join('')}
              
              <div class="checkout-total-line">
                <span>Total</span>
                <span>${formatPrice(total)}</span>
              </div>

              <div class="pickup-note">
                📦 <strong>Pickup Order:</strong> Please pick up your order from our store at the selected date. We'll have it ready for you!
              </div>

              <div class="cod-badge">
                💵 Cash on Delivery — Pay when you pick up
              </div>

              <form id="checkout-form" novalidate>
                <div class="form-group">
                <div class="form-group">
                  <label class="form-label" for="pickup-date">📅 Pickup Date *</label>
                  <input class="form-input" type="date" id="pickup-date" 
                         min="${getTodayDate()}" required 
                         aria-label="Select pickup date">
                  <div class="form-error" id="pickup-date-error"></div>
                </div>

                <div class="form-group">
                  <label class="form-label" for="pickup-time">⏰ Pickup Time Slot *</label>
                  <select class="form-input" id="pickup-time" required aria-label="Select pickup time slot">
                    <option value="" disabled selected>Select a time slot</option>
                    <option value="10:00 AM - 02:00 PM">10:00 AM - 02:00 PM</option>
                    <option value="02:00 PM - 06:00 PM">02:00 PM - 06:00 PM</option>
                    <option value="06:00 PM - 10:00 PM">06:00 PM - 10:00 PM</option>
                  </select>
                  <div class="form-error" id="pickup-time-error"></div>
                </div>

                <div class="form-group">
                  <label class="form-label" for="customer-phone">📱 Mobile Number *</label>
                  <div style="display:flex;gap:8px;">
                    <div class="phone-input-group" style="flex:1;">
                      <span class="phone-prefix">+91</span>
                      <input class="form-input" type="tel" id="customer-phone" 
                             placeholder="86907 56828" required maxlength="10"
                             value="${user?.phone ? user.phone.replace('+91', '').trim() : ''}"
                             aria-label="Your mobile number">
                    </div>
                  </div>
                  <div class="form-error" id="phone-error"></div>
                </div>

                <div class="form-group">
                  <label class="form-label" for="order-notes">📝 Order Notes (optional)</label>
                  <textarea class="form-input" id="order-notes" 
                            placeholder="Any special requests..." 
                            rows="3" maxlength="500"
                            aria-label="Order notes"></textarea>
                </div>

                <button type="submit" class="btn btn-primary btn-lg" style="width:100%;" id="place-order-btn">
                  🚀 Place Order
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </main>
  `;
}


export function initCartPage() {
  const phoneInput = document.getElementById('customer-phone');

  // Quantity controls
  document.querySelectorAll('.cart-qty-minus').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const input = btn.parentElement.querySelector('.qty-value');
      const val = parseInt(input.value) || 1;
      if (val <= 1) {
        removeFromCart(id);
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      } else {
        updateQuantity(id, val - 1);
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      }
    });
  });

  document.querySelectorAll('.cart-qty-plus').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const input = btn.parentElement.querySelector('.qty-value');
      const val = parseInt(input.value) || 1;
      updateQuantity(id, Math.min(val + 1, 10));
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
  });

  // Remove buttons
  document.querySelectorAll('.cart-item-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      removeFromCart(id);
      showToast('Item removed from cart', 'info');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
  });

  // Checkout form
  document.getElementById('checkout-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const phoneInput = document.getElementById('customer-phone');
    const phone = '+91' + phoneInput.value.trim();
    const pickupDate = document.getElementById('pickup-date').value;
    const pickupTime = document.getElementById('pickup-time').value;
    const notes = document.getElementById('order-notes').value.trim();

    // Clear errors
    document.querySelectorAll('.form-error').forEach(el => el.textContent = '');

    // Validate
    let hasError = false;
    if (phoneInput.value.trim().length < 10) {
      document.getElementById('phone-error').textContent = 'Please enter a valid 10-digit mobile number';
      hasError = true;
    }
    if (!pickupDate) {
      document.getElementById('pickup-date-error').textContent = 'Please select a pickup date';
      hasError = true;
    }
    if (!pickupTime) {
      document.getElementById('pickup-time-error').textContent = 'Please select a pickup time slot';
      hasError = true;
    }
    if (hasError) return;

    const cart = getCart();
    const result = createOrder(cart, { phone, pickupDate, pickupTime, notes });
    
    if (result.success) {
      orderSuccess = true;
      window.location.hash = '#/orders';
      showToast('Order placed successfully!', 'success', 5000);
    } else {
      showToast(result.error, 'error');
    }
  });
}

export function resetCartPageState() {
  orderSuccess = false;
}
