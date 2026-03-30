// ============================================
// MY ORDERS PAGE
// Displays user-specific order history
// ============================================

import { getOrderHistory } from '../services/orders.js';
import { getCurrentUser } from '../services/auth.js';
import { formatPrice } from '../utils/format.js';

export function renderOrdersPage() {
  const user = getCurrentUser();
  
  if (!user) {
    // This should be handled by the router, but as a fallback:
    return `
      <main class="page-content page-enter">
        <section class="section">
          <div class="container" style="text-align:center; padding: 4rem 2rem;">
            <h2>Please login to view your orders</h2>
            <p>Order history is available for registered users only.</p>
            <button class="btn btn-primary" style="margin-top:2rem;" id="orders-login-btn">Login Now</button>
          </div>
        </section>
      </main>
    `;
  }

  const orders = getOrderHistory();

  return `
    <main class="page-content page-enter">
      <section class="section">
        <div class="container">
          <div class="page-header" style="margin-bottom: 3rem;">
            <h1 class="page-title">📦 My Orders</h1>
            <p class="page-subtitle">Track your previous orders and pickup details</p>
          </div>

          ${orders.length === 0 ? `
            <div class="empty-state" style="text-align:center; padding: 4rem 2rem; background: var(--clr-gray-100); border-radius: var(--radius-lg);">
              <div style="font-size: 4rem; margin-bottom: 1.5rem;">🛍️</div>
              <h2>No orders yet</h2>
              <p>You haven't placed any orders yet. Our delicious food is waiting for you!</p>
              <div style="margin-top: 2rem;">
                <a href="#/sweets" class="btn btn-primary">Browse Sweets</a>
              </div>
            </div>
          ` : `
            <div class="orders-list" style="display: flex; flex-direction: column; gap: 1.5rem;">
              ${orders.map(order => `
                <div class="order-card" style="background: white; border: 1px solid var(--clr-gray-200); border-radius: var(--radius-lg); overflow: hidden; box-shadow: var(--shadow-sm);">
                  <div class="order-header" style="padding: 1.25rem 1.5rem; background: var(--clr-gray-50); border-bottom: 1px solid var(--clr-gray-200); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                    <div>
                      <div style="font-size: 0.85rem; color: var(--clr-gray-500); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.25rem;">Order ID</div>
                      <div style="font-weight: 700; font-family: var(--ff-accent); color: var(--clr-primary);">${order.orderId}</div>
                    </div>
                    <div style="text-align: right;">
                      <div style="font-size: 0.85rem; color: var(--clr-gray-500); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.25rem;">Date Placed</div>
                      <div style="font-weight: 600;">${new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                    </div>
                  </div>
                  
                  <div class="order-body" style="padding: 1.5rem;">
                    <div class="order-items-summary" style="margin-bottom: 1.5rem;">
                      <div style="font-weight: 600; margin-bottom: 0.75rem; color: var(--clr-gray-700);">Items</div>
                      <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                        ${order.items.map(item => `
                          <div style="display: flex; justify-content: space-between; font-size: 0.95rem;">
                            <span>${item.name} <span style="color: var(--clr-gray-400);">× ${item.quantity}</span></span>
                            <span>${formatPrice(item.price * item.quantity)}</span>
                          </div>
                        `).join('')}
                      </div>
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; padding-top: 1.5rem; border-top: 1px dashed var(--clr-gray-200);">
                      <div>
                        <div style="font-size: 0.85rem; color: var(--clr-gray-500); margin-bottom: 0.25rem;">Pickup Date</div>
                        <div style="font-weight: 600; color: var(--clr-secondary);">🗓️ ${order.pickupDate}</div>
                      </div>
                      <div>
                        <div style="font-size: 0.85rem; color: var(--clr-gray-500); margin-bottom: 0.25rem;">Status</div>
                        <div style="display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.25rem 0.75rem; background: #fff8e1; color: #f57c00; border-radius: 100px; font-size: 0.85rem; font-weight: 600;">
                          <span style="width: 8px; height: 8px; background: #f57c00; border-radius: 50%;"></span>
                          Pending Pickup
                        </div>
                      </div>
                      <div style="text-align: right;">
                        <div style="font-size: 0.85rem; color: var(--clr-gray-500); margin-bottom: 0.25rem;">Total Amount</div>
                        <div style="font-size: 1.25rem; font-weight: 800; color: var(--clr-gray-900);">${formatPrice(order.total)}</div>
                      </div>
                    </div>
                  </div>

                  ${order.notes ? `
                    <div class="order-footer" style="padding: 1rem 1.5rem; background: #fafafa; border-top: 1px solid var(--clr-gray-100); font-size: 0.9rem; color: var(--clr-gray-600);">
                      <strong>Note:</strong> ${order.notes}
                    </div>
                  ` : ''}
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </section>
    </main>
  `;
}

export function initOrdersPage() {
  document.getElementById('orders-login-btn')?.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('show-auth-modal', { detail: 'login' }));
  });
}
