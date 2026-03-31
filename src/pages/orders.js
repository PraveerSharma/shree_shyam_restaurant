// ============================================
// MY ORDERS & SUBSCRIPTION PAGE
// Handles order history and subscriber dashboard
// ============================================

import { getOrderHistory, updateOrderPickupTime, createQuickOrder } from '../services/orders.js';
import { getCurrentUser } from '../services/auth.js';
import { formatPrice, isDueSoon, formatPhoneNumber } from '../utils/format.js';
import { showToast } from '../utils/dom.js';
import { isSubscriber, getSubscription, subscribeUser } from '../services/subscription.js';
import { SITE_CONFIG } from '../config/site.js';

let activeOrdersTab = 'history'; // 'history' or 'subscription'

export function renderOrdersPage() {
  const user = getCurrentUser();
  if (!user) {
    return `
      <main class="page-content page-enter">
        <section class="section">
          <div class="container" style="text-align:center; padding: 4rem 2rem;">
            <h2>Please login to view your orders</h2>
            <p>Order history and subscriptions are available for registered users only.</p>
            <button class="btn btn-primary" style="margin-top:2rem;" id="orders-login-btn">Login Now</button>
          </div>
        </section>
      </main>
    `;
  }

  const orders = getOrderHistory().filter(o => o.paymentMethod !== 'Monthly Billing');

  return `
    <main class="page-content page-enter">
      <section class="section">
        <div class="container">
          <div class="page-header" style="margin-bottom: 2rem;">
            <h1 class="page-title">📦 My Account</h1>
            <p class="page-subtitle">Manage your orders and subscription details</p>
          </div>

          <div class="orders-page-tabs">
            <button class="orders-page-tab ${activeOrdersTab === 'history' ? 'active' : ''}" id="tab-history">
              My Orders
            </button>
            <button class="orders-page-tab ${activeOrdersTab === 'subscription' ? 'active' : ''}" id="tab-subscription">
              My Subscription
            </button>
          </div>

          <div id="orders-tab-content">
            ${activeOrdersTab === 'history' ? renderOrderHistory(orders) : renderSubscriptionTab(user)}
          </div>
          
        </div>
      </section>
    </main>
  `;
}

function renderOrderHistory(orders) {
  if (orders.length === 0) {
    return `
      <div class="empty-state" style="text-align:center; padding: 4rem 2rem; background: var(--clr-gray-100); border-radius: var(--radius-lg);">
        <div style="font-size: 4rem; margin-bottom: 1.5rem;">🛍️</div>
        <h2>No orders yet</h2>
        <p>You haven't placed any orders yet. Our delicious food is waiting for you!</p>
        <div style="margin-top: 2rem;">
          <a href="#/sweets" class="btn btn-primary">Browse Sweets</a>
        </div>
      </div>
    `;
  }

  return `
    <div class="orders-list" style="display: flex; flex-direction: column; gap: 1.25rem;">
      ${orders.map(order => `
        <div class="order-card">
          <div class="order-card-header">
            <div>
              <div style="font-size: 0.75rem; color: var(--clr-gray-500); text-transform: uppercase; letter-spacing: 0.04em;">Order</div>
              <div style="font-weight: 700; font-family: var(--ff-accent); color: var(--clr-saffron); display: flex; align-items: center; gap: 6px;">
                ${order.orderId}
                ${isDueSoon(order.pickupDate) && order.status !== 'delivered' && order.status !== 'cancelled' ? `
                  <span class="badge badge-error" style="font-size: 0.65rem; padding: 2px 6px; animation: pulse 2s infinite;">DUE SOON</span>
                ` : ''}
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <span class="badge ${order.status === 'delivered' ? 'badge-success' : order.status === 'cancelled' ? 'badge-error' : 'badge-warning'}" style="text-transform: capitalize;">
                ${order.status}
              </span>
              <span style="font-size: 0.85rem; color: var(--clr-gray-500);">${new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
            </div>
          </div>

          <div class="order-card-body">
            <div class="order-card-items">
              ${order.items.map(item => `
                <div style="display: flex; justify-content: space-between; font-size: 0.9rem;">
                  <span>${item.name} <span style="color: var(--clr-gray-400);">x${item.quantity}</span></span>
                  <span style="font-weight: 600;">${formatPrice(item.price * item.quantity)}</span>
                </div>
              `).join('')}
            </div>

            ${order.adminComment ? `
              <div style="background: var(--clr-ivory); border-left: 3px solid var(--clr-saffron); padding: 0.75rem 1rem; border-radius: 0 var(--radius-sm) var(--radius-sm) 0; margin-bottom: 0.75rem;">
                <div style="font-size: 0.75rem; color: var(--clr-saffron-dark); font-weight: 700; margin-bottom: 4px;">Restaurant Note</div>
                <div style="font-size: 0.85rem; color: var(--clr-gray-700); font-style: italic;">"${order.adminComment}"</div>
              </div>
            ` : ''}

            <div style="display: flex; gap: 1.5rem; flex-wrap: wrap; font-size: 0.85rem; color: var(--clr-gray-600);">
              <div>
                <span style="color: var(--clr-gray-400);">Pickup:</span>
                <span style="font-weight: 600;"> ${order.pickupDate}</span>
                <div class="time-slot-container" data-id="${order.orderId}" style="margin-top: 2px;">
                  <div style="display: flex; align-items: center; gap: 0.5rem;" class="time-display-wrapper">
                    <span style="font-weight: 600; color: var(--clr-saffron);" class="current-time-slot">${order.pickupTime}</span>
                    ${order.status === 'pending' ? `
                      <button class="edit-time-btn" style="font-size: 0.7rem; color: var(--clr-info); text-decoration: underline; background: none; border: none; cursor: pointer; padding: 0;">Edit</button>
                    ` : ''}
                  </div>
                  <div style="display: none; align-items: center; gap: 0.5rem;" class="time-edit-wrapper">
                    <select class="form-input slot-select" style="font-size: 0.8rem; padding: 2px 4px; height: auto; width: auto;">
                      <option value="10:00 AM - 02:00 PM" ${order.pickupTime === '10:00 AM - 02:00 PM' ? 'selected' : ''}>10-2 PM</option>
                      <option value="02:00 PM - 06:00 PM" ${order.pickupTime === '02:00 PM - 06:00 PM' ? 'selected' : ''}>2-6 PM</option>
                      <option value="06:00 PM - 10:00 PM" ${order.pickupTime === '06:00 PM - 10:00 PM' ? 'selected' : ''}>6-10 PM</option>
                    </select>
                    <button class="save-time-btn" data-id="${order.orderId}" style="background: var(--clr-veg); color: white; border: none; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; cursor: pointer;">Save</button>
                    <button class="cancel-time-btn" style="background: var(--clr-gray-200); color: var(--clr-gray-700); border: none; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; cursor: pointer;">X</button>
                  </div>
                </div>
              </div>
              <div><span style="color: var(--clr-gray-400);">Payment:</span> ${order.paymentMethod || 'Cash on Delivery'}</div>
            </div>
          </div>

          <div class="order-card-footer">
            <div style="font-size: 1.15rem; font-weight: 800; color: var(--clr-charcoal);">${formatPrice(order.total)}</div>
            <a href="${SITE_CONFIG.contact.whatsappLink}?text=${encodeURIComponent(`Hi, I have a query about my order ${order.orderId}.`)}"
               target="_blank" rel="noopener" class="btn btn-sm"
               style="font-size: 0.75rem; border-radius: 20px; padding: 4px 12px; background: #E6F4EA; color: #1E7E34; border: 1px solid #C2E7CB; text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.246 2.248 3.484 5.232 3.484 8.412-.003 6.557-5.338 11.892-11.893 11.892-1.997-.001-3.951-.5-5.688-1.448l-6.309 1.656zm6.29-4.143c1.552.921 3.13 1.411 4.793 1.412 5.204 0 9.444-4.24 9.446-9.443.002-2.521-.979-4.89-2.762-6.67s-4.149-2.765-6.67-2.765c-5.204 0-9.441 4.239-9.443 9.441-.001 1.742.483 3.339 1.398 4.71l-1.01 3.693 3.791-.994zm11.367-7.4c-.31-.154-1.829-.902-2.107-1.003-.278-.101-.48-.153-.68.154-.201.307-.779 1.003-.955 1.205-.175.202-.351.226-.66.073-.31-.153-1.309-.482-2.493-1.54-.92-.821-1.54-1.835-1.72-2.144-.18-.309-.019-.476.136-.629.139-.138.309-.36.464-.54.154-.18.206-.309.309-.515.103-.206.052-.386-.025-.54-.077-.154-.68-1.644-.932-2.253-.245-.592-.495-.511-.68-.521-.176-.009-.379-.011-.581-.011-.202 0-.531.076-.809.381-.278.305-1.062 1.039-1.062 2.535s1.087 2.941 1.239 3.146c.152.206 2.14 3.268 5.184 4.582 2.534 1.095 3.048.877 3.603.824.555-.053 1.829-.747 2.087-1.468.258-.721.258-1.339.181-1.468-.076-.128-.278-.206-.587-.36z"/></svg>
              WhatsApp
            </a>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderSubscriptionTab(user) {
  const isSub = isSubscriber(user.id);

  if (!isSub) {
    return `
      <div class="subscription-promo" style="background: linear-gradient(135deg, #FFF9F2 0%, #FFF1E0 100%); padding: 3rem; border-radius: var(--radius-lg); border: 2px solid #FFD8A8; text-align: center;">
        <div style="font-size: 4rem; margin-bottom: 1.5rem;">⭐</div>
        <h2 style="color: #D35400; margin-bottom: 1rem;">Join Our Regular Guests Program</h2>
        <p style="color: #873600; max-width: 600px; margin: 0 auto 2rem; line-height: 1.6;">
          Become a regular subscriber and enjoy the convenience of <strong>Monthly Billing</strong>.
          Order throughout the month and pay collectively whenever it's convenient for you.
        </p>
        <div style="background: white; padding: 2rem; border-radius: var(--radius-md); box-shadow: var(--shadow-md); text-align: left; max-width: 500px; margin: 0 auto;">
          <h3 style="margin-bottom: 1.5rem; text-align: center;">Subscription Form</h3>
          <form id="subscribe-form">
            <div class="form-group">
              <label class="form-label">Full Name</label>
              <input type="text" class="form-input" id="sub-name" value="${user.name}" required>
            </div>
            <div class="form-group">
              <label class="form-label">Mobile Number</label>
              <input type="tel" class="form-input" id="sub-phone" value="${formatPhoneNumber(user.phone)}" required>
            </div>
            <div class="form-group">
              <label class="form-label">Residential Address</label>
              <textarea class="form-input" id="sub-address" placeholder="E.g. Sector 12, Vidhyadhar Nagar" required></textarea>
            </div>
            <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 1rem;">Confirm Subscription</button>
          </form>
        </div>
      </div>
    `;
  }

  const sub = getSubscription(user.id);
  return `
    <div class="sub-dashboard">
      <div class="sub-profile-card">
        <div style="text-align: center; margin-bottom: 1.5rem;">
          <div class="sub-avatar" style="width: 72px; height: 72px; font-size: 2rem; margin: 0 auto 0.75rem;">
            ${sub.name.charAt(0)}
          </div>
          <h3 style="margin-bottom: 0.25rem;">${sub.name}</h3>
          <span class="badge badge-success" style="font-size: 0.7rem; text-transform: uppercase;">Active Subscriber</span>
        </div>

        <div style="border-top: 1px solid var(--clr-gray-100); padding-top: 1.25rem; margin-bottom: 1.5rem; text-align: center;">
          <div style="font-size: 0.8rem; color: var(--clr-gray-500); margin-bottom: 0.25rem;">Outstanding Balance</div>
          <div style="font-size: 1.75rem; font-weight: 800; color: ${sub.outstandingBalance > 0 ? 'var(--clr-error)' : 'var(--clr-veg)'};">${formatPrice(sub.outstandingBalance)}</div>
        </div>

        <div style="background: var(--clr-gray-50); padding: 0.75rem; border-radius: var(--radius-md); font-size: 0.85rem; color: var(--clr-gray-600);">
          <div style="margin-bottom: 0.5rem;">📞 ${formatPhoneNumber(sub.phone)}</div>
          <div>📍 ${sub.address}</div>
        </div>
      </div>

      <div class="sub-history-section">
        <!-- Quick Order Form -->
        <div style="background: #F0F9FF; padding: 2rem; border-radius: var(--radius-lg); border: 2px solid #BAE6FD; margin-bottom: 2.5rem; box-shadow: var(--shadow-sm);">
          <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem;">
            <span style="font-size: 1.5rem;">⚡</span>
            <h3 style="color: #0369A1; margin: 0;">Quick Order on Bill</h3>
          </div>
          <p style="font-size: 0.9rem; color: #0C4A6E; margin-bottom: 1.5rem; line-height: 1.5;">
            Need something quickly? Just type what you want (e.g. "2 Samosas and 1 Chai") and we'll add it to your monthly bill.
          </p>
          <form id="quick-order-form" style="display: flex; gap: 1rem;">
            <input type="text" class="form-input" id="quick-order-desc" placeholder="What would you like today?" required style="flex: 1; border-color: #7DD3FC;">
            <button type="submit" class="btn btn-primary" style="background: #0EA5E9; border-color: #0EA5E9; white-space: nowrap;">Place Order</button>
          </form>
        </div>

        <h3 style="margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.5rem;">
          📜 Billing History
        </h3>
        
        ${sub.billingHistory.length === 0 ? `
          <div style="background: var(--clr-gray-100); padding: 3rem; text-align: center; border-radius: var(--radius-lg); border: 1px dashed var(--clr-gray-300);">
            No billing history yet.
          </div>
        ` : `
          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            ${sub.billingHistory.map(h => `
              <div style="background: white; padding: 1.25rem; border-radius: var(--radius-md); border: 1px solid var(--clr-gray-200); display: flex; justify-content: space-between; align-items: center; transition: transform 0.2s; cursor: default;">
                <div style="flex: 1;">
                  <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
                    <div style="font-weight: 700; color: var(--clr-primary);">${h.description || 'Order'}</div>
                    <div style="font-size: 0.7rem; color: var(--clr-gray-400); font-family: var(--ff-accent); background: var(--clr-gray-50); padding: 2px 6px; border-radius: 4px;">#${h.orderId.split('-').pop()}</div>
                  </div>
                  <div style="font-size: 0.8rem; color: var(--clr-gray-500);">${new Date(h.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                </div>
                <div style="display: flex; align-items: center; gap: 1.5rem; text-align: right;">
                   <div style="font-weight: 800; font-size: 1.1rem; min-width: 80px;">${formatPrice(h.amount)}</div>
                   <span class="badge ${h.status === 'pending' ? 'badge-warning' : 'badge-success'}">
                    ${h.status === 'pending' ? 'Unpaid' : 'Paid'}
                   </span>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    </div>
  `;
}

export function initOrdersPage() {
  const user = getCurrentUser();
  if (!user) {
    document.getElementById('orders-login-btn')?.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('show-auth-modal', { detail: 'login' }));
    });
    return;
  }

  // Tab switching
  document.getElementById('tab-history')?.addEventListener('click', () => {
    activeOrdersTab = 'history';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
  document.getElementById('tab-subscription')?.addEventListener('click', () => {
    activeOrdersTab = 'subscription';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });

  // Subscribe form
  document.getElementById('subscribe-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = {
      name: document.getElementById('sub-name').value,
      phone: document.getElementById('sub-phone').value,
      address: document.getElementById('sub-address').value
    };
    const res = subscribeUser(user.id, data);
    if (res.success) {
      showToast('Welcome to the regular guests program!', 'success');
      activeOrdersTab = 'subscription';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }
  });

  // Edit Time Handlers
  const ordersList = document.querySelector('.orders-list');
  if (ordersList) {
    ordersList.addEventListener('click', (e) => {
      const target = e.target;
      const container = target.closest('.time-slot-container');
      if (!container) return;

      const displayWrapper = container.querySelector('.time-display-wrapper');
      const editWrapper = container.querySelector('.time-edit-wrapper');

      if (target.classList.contains('edit-time-btn')) {
        displayWrapper.style.display = 'none';
        editWrapper.style.display = 'flex';
      }
      else if (target.classList.contains('cancel-time-btn')) {
        displayWrapper.style.display = 'flex';
        editWrapper.style.display = 'none';
      }
      else if (target.classList.contains('save-time-btn')) {
        const orderId = target.dataset.id;
        const newSlot = container.querySelector('.slot-select').value;

        if (updateOrderPickupTime(orderId, newSlot)) {
          showToast('Pickup time updated!', 'success');
          container.querySelector('.current-time-slot').textContent = newSlot;
          displayWrapper.style.display = 'flex';
          editWrapper.style.display = 'none';
        }
      }
    });
  }

  // Quick Order Handler
  document.getElementById('quick-order-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const desc = document.getElementById('quick-order-desc').value;
    const res = createQuickOrder(user.id, desc);
    if (res.success) {
      showToast('Quick order placed! It will be added to your bill.', 'success');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }
  });

}
