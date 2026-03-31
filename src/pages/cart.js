// ============================================
// CART & CHECKOUT PAGE
// ============================================

import { getCart, removeFromCart, updateQuantity, getCartTotal } from '../services/cart.js';
import { createOrder, sendToWhatsApp } from '../services/orders.js';
import { formatPrice, getTodayDate } from '../utils/format.js';
import { showToast, sanitizeInput } from '../utils/dom.js';
import { SITE_CONFIG } from '../config/site.js';
import { getCurrentUser, updateUserPhone } from '../services/auth.js';
import { sendOTP, verifyOTP } from '../services/otp.js';

let orderSuccess = false;
let phoneVerified = false;
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
                  <label class="form-label" for="pickup-date">📅 Pickup Date *</label>
                  <input class="form-input" type="date" id="pickup-date" 
                         min="${getTodayDate()}" required 
                         aria-label="Select pickup date">
                  <div class="form-error" id="pickup-date-error"></div>
                </div>

                <div class="form-group">
                  <label class="form-label" for="customer-phone">📱 Mobile Number *</label>
                  <div style="display:flex;gap:8px;">
                    <div class="phone-input-group" style="flex:1;">
                      <span class="phone-prefix">+91</span>
                      <input class="form-input" type="tel" id="customer-phone" 
                             placeholder="86907 56828" required maxlength="10"
                             value="${user?.phone ? user.phone.replace('+91', '').trim() : ''}"
                             ${phoneVerified ? 'disabled' : ''}
                             aria-label="Your mobile number">
                    </div>
                    <button type="button" class="btn btn-outline btn-sm" id="send-otp-btn" 
                            ${phoneVerified ? 'disabled' : ''}
                            style="white-space:nowrap; border-radius:var(--radius-md);">
                      ${phoneVerified ? '✅ Verified' : 'Verify via OTP'}
                    </button>
                  </div>
                  <div class="form-error" id="phone-error"></div>
                  
                  <!-- OTP Container -->
                  <div id="otp-container" class="otp-container">
                    <p style="font-size:0.85rem; color:var(--clr-gray-600); margin-bottom:var(--sp-xs);">
                      Enter the 6-digit code sent to your phone:
                    </p>
                    <div class="otp-grid">
                      <input type="text" maxlength="1" class="otp-digit" data-index="0">
                      <input type="text" maxlength="1" class="otp-digit" data-index="1">
                      <input type="text" maxlength="1" class="otp-digit" data-index="2">
                      <input type="text" maxlength="1" class="otp-digit" data-index="3">
                      <input type="text" maxlength="1" class="otp-digit" data-index="4">
                      <input type="text" maxlength="1" class="otp-digit" data-index="5">
                    </div>
                    <div id="resend-timer-container" class="resend-timer">
                      Resend code in <span id="timer-sec">30</span>s
                    </div>
                    <button type="button" class="resend-btn" id="resend-otp-btn" style="display:none; margin: 0 auto;">
                      Didn't get it? Resend OTP
                    </button>
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label" for="order-notes">📝 Order Notes (optional)</label>
                  <textarea class="form-input" id="order-notes" 
                            placeholder="Any special requests..." 
                            rows="3" maxlength="500"
                            aria-label="Order notes"></textarea>
                </div>

                <button type="submit" class="btn btn-primary btn-lg" style="width:100%;" id="place-order-btn" ${!phoneVerified ? 'disabled' : ''}>
                  ${phoneVerified ? '✅ Place Order via WhatsApp' : '🔒 Verify Phone to Order'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </main>
  `;
}

function renderSuccessScreen() {
  return `
    <main class="page-content page-enter">
      <section class="section">
        <div class="container">
          <div class="order-success">
            <div class="order-success-icon">✅</div>
            <h1>Order Placed Successfully!</h1>
            <p>Your order has been sent via WhatsApp. Please check WhatsApp for confirmation and order details.</p>
            <p style="color:var(--clr-gray-400);font-size:0.9rem;">
              Remember to pick up your order on the selected date. Payment will be collected at pickup.
            </p>
            <div style="display:flex;gap:1rem;justify-content:center;margin-top:2rem;flex-wrap:wrap;">
              <a href="#/" class="btn btn-primary" id="back-home-btn">🏠 Back to Home</a>
              <a href="#/sweets" class="btn btn-secondary">🍬 Order More</a>
            </div>
          </div>
        </div>
      </section>
    </main>
  `;
}

export function initCartPage() {
  if (orderSuccess) {
    document.getElementById('back-home-btn')?.addEventListener('click', () => {
      orderSuccess = false;
    });
    return;
  }

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

  // OTP Logic
  const sendOtpBtn = document.getElementById('send-otp-btn');
  const otpContainer = document.getElementById('otp-container');
  const otpDigits = document.querySelectorAll('.otp-digit');
  const resendBtn = document.getElementById('resend-otp-btn');
  const timerSec = document.getElementById('timer-sec');
  const phoneInput = document.getElementById('customer-phone');

  const startResendTimer = () => {
    resendTimer = 30;
    if (resendInterval) clearInterval(resendInterval);
    resendBtn.style.display = 'none';
    document.getElementById('resend-timer-container').style.display = 'block';
    
    resendInterval = setInterval(() => {
      resendTimer--;
      timerSec.textContent = resendTimer;
      if (resendTimer <= 0) {
        clearInterval(resendInterval);
        document.getElementById('resend-timer-container').style.display = 'none';
        resendBtn.style.display = 'block';
      }
    }, 1000);
  };

  sendOtpBtn?.addEventListener('click', () => {
    const phone = phoneInput.value.trim();
    if (phone.length < 10) {
      document.getElementById('phone-error').textContent = 'Please enter a valid 10-digit mobile number';
      return;
    }
    document.getElementById('phone-error').textContent = '';
    
    const result = sendOTP('+91' + phone);
    if (result.success) {
      otpContainer.classList.add('visible');
      startResendTimer();
      otpDigits[0].focus();
    }
  });

  resendBtn?.addEventListener('click', () => {
    const phone = phoneInput.value.trim();
    sendOTP('+91' + phone);
    startResendTimer();
  });

  otpDigits.forEach((digit, idx) => {
    digit.addEventListener('keyup', (e) => {
      if (e.key >= 0 && e.key <= 9) {
        if (idx < 5) otpDigits[idx + 1].focus();
        checkAndVerifyOTP();
      } else if (e.key === 'Backspace') {
        if (idx > 0) otpDigits[idx - 1].focus();
      }
    });
  });

  const checkAndVerifyOTP = () => {
    const code = Array.from(otpDigits).map(d => d.value).join('');
    if (code.length === 6) {
      const phone = '+91' + phoneInput.value.trim();
      const result = verifyOTP(phone, code);
      if (result.success) {
        phoneVerified = true;
        
        // Persist verified phone to User DB if logged in
        updateUserPhone(phone);
        
        otpDigits.forEach(d => {
          d.classList.add('success');
          d.disabled = true;
        });
        clearInterval(resendInterval);
        otpContainer.style.opacity = '0.5';
        document.getElementById('resend-timer-container').style.display = 'none';
        resendBtn.style.display = 'none';
        
        // Refresh UI to enable Place Order
        window.dispatchEvent(new HashChangeEvent('hashchange'));
        showToast('Mobile number verified!', 'success');
      } else {
        showToast(result.error, 'error');
        otpDigits.forEach(d => d.value = '');
        otpDigits[0].focus();
      }
    }
  };

  // Checkout form
  document.getElementById('checkout-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    
    if (!phoneVerified) {
      showToast('Please verify your phone number via OTP first', 'warning');
      return;
    }

    const phone = '+91' + document.getElementById('customer-phone').value.trim();
    const pickupDate = document.getElementById('pickup-date').value;
    const notes = document.getElementById('order-notes').value.trim();

    // Clear errors
    document.querySelectorAll('.form-error').forEach(el => el.textContent = '');

    // Validate
    let hasError = false;
    if (!pickupDate) {
      document.getElementById('pickup-date-error').textContent = 'Please select a pickup date';
      hasError = true;
    }
    if (hasError) return;

    const cart = getCart();
    const result = createOrder(cart, { phone, pickupDate, notes });
    
    if (result.success) {
      sendToWhatsApp(result.order);
      orderSuccess = true;
      phoneVerified = false; // Reset for next time
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      showToast('Order placed! Check WhatsApp for confirmation.', 'success', 5000);
    } else {
      showToast(result.error, 'error');
    }
  });
}

export function resetCartPageState() {
  orderSuccess = false;
}
