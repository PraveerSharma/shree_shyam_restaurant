// ============================================
// MY ORDERS & SUBSCRIPTION PAGE
// Handles order history and subscriber dashboard
// ============================================

import { getOrderHistory, updateOrderPickupTime, createQuickOrder } from '../services/orders.js';
import { getCurrentUser } from '../services/auth.js';
import { formatPrice, isDueSoon, formatPhoneNumber } from '../utils/format.js';
import { showToast } from '../utils/dom.js';
import { isSubscriber, getSubscription, subscribeUser } from '../services/subscription.js';
import { getMessages, sendMessage } from '../services/chat.js';

let activeOrdersTab = 'history'; // 'history' or 'subscription'
let activeOrderIdChat = null;

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

          <div class="tabs" style="display: flex; gap: 1rem; margin-bottom: 2rem; border-bottom: 2px solid var(--clr-gray-200); padding-bottom: 0.5rem;">
            <button class="tab-btn ${activeOrdersTab === 'history' ? 'active' : ''}" 
                    style="background: none; border: none; font-weight: 700; cursor: pointer; padding: 0.5rem 1rem; position: relative; color: ${activeOrdersTab === 'history' ? 'var(--clr-primary)' : 'var(--clr-gray-500)'}; transition: all 0.3s;"
                    id="tab-history">
              My Orders
              ${activeOrdersTab === 'history' ? '<div style="position: absolute; bottom: -0.5rem; left: 0; width: 100%; height: 3px; background: var(--clr-primary); border-radius: 4px;"></div>' : ''}
            </button>
            <button class="tab-btn ${activeOrdersTab === 'subscription' ? 'active' : ''}" 
                    style="background: none; border: none; font-weight: 700; cursor: pointer; padding: 0.5rem 1rem; position: relative; color: ${activeOrdersTab === 'subscription' ? 'var(--clr-primary)' : 'var(--clr-gray-500)'}; transition: all 0.3s;"
                    id="tab-subscription">
              My Subscription
              ${activeOrdersTab === 'subscription' ? '<div style="position: absolute; bottom: -0.5rem; left: 0; width: 100%; height: 3px; background: var(--clr-primary); border-radius: 4px;"></div>' : ''}
            </button>
          </div>

          <div id="orders-tab-content">
            ${activeOrdersTab === 'history' ? renderOrderHistory(orders) : renderSubscriptionTab(user)}
          </div>
          
          ${activeOrderIdChat ? renderUserChatWindow(activeOrderIdChat) : ''}
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
    <div class="orders-list" style="display: flex; flex-direction: column; gap: 1.5rem;">
      ${orders.map(order => `
        <div class="order-card" style="background: white; border: 1px solid var(--clr-gray-200); border-radius: var(--radius-lg); overflow: hidden; box-shadow: var(--shadow-sm);">
          <div class="order-header" style="padding: 1.25rem 1.5rem; background: var(--clr-gray-50); border-bottom: 1px solid var(--clr-gray-200); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
            <div>
              <div style="font-size: 0.85rem; color: var(--clr-gray-500); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.25rem;">Order ID</div>
              <div style="font-weight: 700; font-family: var(--ff-accent); color: var(--clr-primary); display: flex; align-items: center; gap: 8px;">
                ${order.orderId}
                ${isDueSoon(order.pickupDate) && order.status !== 'delivered' && order.status !== 'cancelled' ? `
                  <span class="badge badge-error" style="font-size: 0.65rem; padding: 2px 6px; animation: pulse 2s infinite;">⚠️ DUE SOON</span>
                ` : ''}
              </div>
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

            ${order.adminComment ? `
              <div style="background: #FFF9F2; border-left: 4px solid var(--clr-saffron); padding: 1rem; margin-bottom: 1.5rem; border-radius: 4px;">
                <div style="font-size: 0.75rem; color: #D35400; font-weight: 800; text-transform: uppercase; margin-bottom: 4px;">📝 Note from Admin</div>
                <div style="font-size: 0.95rem; color: #873600; line-height: 1.4;">${order.adminComment}</div>
              </div>
            ` : ''}

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; padding-top: 1.5rem; border-top: 1px dashed var(--clr-gray-200);">
              <div>
                <div style="font-size: 0.85rem; color: var(--clr-gray-500); margin-bottom: 0.25rem;">Pickup Schedule</div>
                <div style="font-weight: 600; color: var(--clr-secondary);">🗓️ ${order.pickupDate}</div>
                <div class="time-slot-container" data-id="${order.orderId}" style="margin-top: 4px;">
                  <div style="display: flex; align-items: center; gap: 0.5rem;" class="time-display-wrapper">
                    <div style="font-weight: 600; color: var(--clr-saffron);" class="current-time-slot">⏰ ${order.pickupTime}</div>
                    ${order.status === 'pending' ? `
                      <button class="edit-time-btn" style="font-size: 0.75rem; color: var(--clr-info); text-decoration: underline; background: none; border: none; cursor: pointer; padding: 0;">Edit</button>
                    ` : ''}
                  </div>
                  <div style="display: none; align-items: center; gap: 0.5rem;" class="time-edit-wrapper">
                    <select class="form-input slot-select" style="font-size: 0.8rem; padding: 2px 4px; height: auto; width: auto;">
                      <option value="10:00 AM - 02:00 PM" ${order.pickupTime === '10:00 AM - 02:00 PM' ? 'selected' : ''}>10-2 PM</option>
                      <option value="02:00 PM - 06:00 PM" ${order.pickupTime === '02:00 PM - 06:00 PM' ? 'selected' : ''}>2-6 PM</option>
                      <option value="06:00 PM - 10:00 PM" ${order.pickupTime === '06:00 PM - 10:00 PM' ? 'selected' : ''}>6-10 PM</option>
                    </select>
                    <button class="save-time-btn" data-id="${order.orderId}" style="background: var(--clr-veg); color: white; border: none; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; cursor: pointer;">Save</button>
                    <button class="cancel-time-btn" style="background: var(--clr-gray-200); color: var(--clr-gray-700); border: none; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; cursor: pointer;">✕</button>
                  </div>
                </div>
              </div>
              <div>
                <div style="font-size: 0.85rem; color: var(--clr-gray-500); margin-bottom: 0.25rem;">Payment & Status</div>
                <div style="font-size: 0.9rem; font-weight: 600; margin-bottom: 4px;">💳 ${order.paymentMethod || 'Cash on Delivery'}</div>
                <div class="badge ${order.status === 'delivered' ? 'badge-success' : 'badge-warning'}">
                  ${order.status}
                </div>
              </div>
                <div style="text-align: right;">
                  <div style="font-size: 0.85rem; color: var(--clr-gray-500); margin-bottom: 0.25rem;">Total Amount</div>
                  <div style="font-size: 1.25rem; font-weight: 800; color: var(--clr-gray-900);">${formatPrice(order.total)}</div>
                  <button class="btn btn-sm btn-outline chat-support-btn" data-id="${order.orderId}" style="margin-top: 0.75rem; font-size: 0.75rem; border-radius: 20px; padding: 4px 12px; font-weight: 700;">💬 Chat with Us</button>
                </div>
              </div>
            </div>
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
          Become a regular subscriber and enjoy the convenience of **Monthly Billing**. 
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
    <div class="subscriber-dashboard" style="display: grid; grid-template-columns: 1fr 2fr; gap: 2rem;">
      <div class="sub-profile-card" style="background: white; padding: 2rem; border-radius: var(--radius-lg); border: 1px solid var(--clr-gray-200); position: sticky; top: 100px; height: fit-content;">
        <div style="text-align: center; margin-bottom: 2rem;">
          <div style="width: 80px; height: 80px; background: #FFF4E6; color: #D35400; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; margin: 0 auto 1rem; font-weight: 800;">
            ${sub.name.charAt(0)}
          </div>
          <h3 style="margin-bottom: 0.25rem;">${sub.name}</h3>
          <span style="background: #E6F4EA; color: #1E7E34; font-size: 0.75rem; padding: 4px 12px; border-radius: 100px; font-weight: 700; text-transform: uppercase;">Active Subscriber</span>
        </div>

        <div style="border-top: 1px solid var(--clr-gray-100); padding-top: 1.5rem; margin-bottom: 2rem; text-align: center;">
          <div style="font-size: 0.9rem; color: var(--clr-gray-500); margin-bottom: 0.5rem;">Outstanding Balance</div>
          <div style="font-size: 2rem; font-weight: 800; color: var(--clr-primary);">${formatPrice(sub.outstandingBalance)}</div>
        </div>

        <div style="background: var(--clr-gray-50); padding: 1rem; border-radius: var(--radius-md); font-size: 0.9rem; color: var(--clr-gray-600);">
          <div style="margin-bottom: 0.5rem;">📞 ${formatPhoneNumber(sub.phone)}</div>
          <div>📍 ${sub.address}</div>
        </div>
      </div>

      <div class="sub-history">
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
                   <span style="font-size: 0.7rem; padding: 4px 10px; border-radius: 100px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; background: ${h.status === 'pending' ? '#FEF3C7' : '#D1FAE5'}; color: ${h.status === 'pending' ? '#92400E' : '#065F46'}; border: 1px solid ${h.status === 'pending' ? '#FDE68A' : '#A7F3D0'};">
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
          container.querySelector('.current-time-slot').textContent = `⏰ ${newSlot}`;
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

  // Chat Button Handlers
  document.querySelectorAll('.chat-support-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeOrderIdChat = btn.dataset.id;
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
  });

  if (activeOrderIdChat) {
    document.getElementById('close-chat')?.addEventListener('click', () => {
      activeOrderIdChat = null;
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });

    const sendUserMsg = () => {
      const input = document.getElementById('chat-input');
      const text = input.value;
      if (sendMessage(activeOrderIdChat, text, 'user').success) {
        input.value = '';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
        // Scroll to bottom
        const msgCont = document.getElementById('chat-messages');
        if (msgCont) msgCont.scrollTop = msgCont.scrollHeight;
      }
    };

    document.getElementById('send-msg')?.addEventListener('click', sendUserMsg);
    document.getElementById('chat-input')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendUserMsg();
    });
  }
}

function renderUserChatWindow(orderId) {
  const messages = getMessages(orderId);
  return `
    <div style="position: fixed; bottom: 1.5rem; right: 1.5rem; width: 320px; height: 450px; background: white; border-radius: var(--radius-lg); box-shadow: 0 10px 30px rgba(0,0,0,0.15); z-index: 1000; display: flex; flex-direction: column; border: 1px solid var(--clr-gray-200); overflow: hidden;">
      <div style="background: var(--clr-primary); color: white; padding: 0.85rem 1rem; display: flex; justify-content: space-between; align-items: center;">
        <div style="font-weight: 700; font-size: 0.9rem;">Chat with Support [${orderId.split('-').pop()}]</div>
        <button id="close-chat" style="background: none; border: none; color: white; font-size: 1.25rem; cursor: pointer;">✕</button>
      </div>
      
      <div id="chat-messages" style="flex: 1; padding: 1rem; overflow-y: auto; background: #f8f9fa; display: flex; flex-direction: column; gap: 0.75rem;">
        ${messages.length === 0 ? `
          <div style="text-align: center; color: var(--clr-gray-400); margin-top: 2rem; font-size: 0.85rem; padding: 0 1rem;">
            <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">👋</div>
            How can we help you with your order?
          </div>
        ` : messages.map(msg => `
          <div style="align-self: ${msg.sender === 'user' ? 'flex-end' : 'flex-start'}; max-width: 85%;">
            <div style="background: ${msg.sender === 'user' ? 'var(--clr-primary)' : 'white'}; color: ${msg.sender === 'user' ? 'white' : 'var(--clr-gray-800)'}; padding: 0.65rem 0.85rem; border-radius: 12px; border-bottom-${msg.sender === 'user' ? 'right' : 'left'}-radius: 2px; font-size: 0.9rem; box-shadow: var(--shadow-sm); border: ${msg.sender === 'user' ? 'none' : '1px solid var(--clr-gray-200)'};">
              ${msg.text}
            </div>
          </div>
        `).join('')}
      </div>
      
      <div style="padding: 0.75rem; border-top: 1px solid var(--clr-gray-200); display: flex; gap: 8px;">
        <input type="text" id="chat-input" class="form-input" placeholder="Your message..." style="height: 36px; border-radius: 18px; font-size: 0.9rem; padding: 0 1rem;">
        <button id="send-msg" class="btn btn-primary" style="width: 36px; height: 36px; border-radius: 50%; padding: 0; display: flex; align-items: center; justify-content:center;">➤</button>
      </div>
    </div>
  `;
}
