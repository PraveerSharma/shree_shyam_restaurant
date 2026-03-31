// ============================================
// ADMIN PAGE
// Item/price management dashboard
// ============================================

import {
  adminLogin, isAdminLoggedIn, adminLogout,
  getSweetsItems, getRestaurantItems,
  updateItem, addItem, deleteItem, resetToDefaults
} from '../services/admin.js';
import { formatPrice, getTodayDate, isDueSoon, formatPhoneNumber, getPickupTimeStatus } from '../utils/format.js';
import {
  showToast, unescapeForText, showConfirm
} from '../utils/dom.js';
import { compressImageToDataURL } from '../utils/image.js';
import { getAllOrders, updateOrderStatus, updateOrderItems, createOfflineOrder } from '../services/orders.js';
import { getAllUsersCount, getCurrentUser } from '../services/auth.js';
import {
  getSubscribers, clearOutstandingBill, createAdminSubscriber, generateBillSummary, addManualBill,
  approveQuickOrder, clearPartialAmount,
  getTotalClearedRevenue
} from '../services/subscription.js';

let mainTab = 'menu'; // 'menu', 'orders', 'subscribers'
let activeTab = 'sweets';
let orderFilter = 'all'; // 'all', 'pending', 'delivered', 'cancelled'
let showAddForm = false;
let editingItemId = null;
let offlineCart = [];
let offlineSearchQuery = '';
let selectedSubscriberId = null; // for detail view
let subSearchQuery = '';
let showAddSubForm = false;
let showManualOrderForm = false;
let editingOrderId = null;
let orderSearchQuery = '';
let orderDateFilter = 'all'; // 'all', 'today', 'week', 'month'

export function renderAdminPage() {
  if (!isAdminLoggedIn()) {
    return renderAdminLogin();
  }
  return renderAdminDashboard();
}

function renderAdminLogin() {
  return `
    <main class="page-content page-enter">
      <section class="section">
        <div class="container">
          <div class="admin-login">
            <div style="font-size:3rem;margin-bottom:1rem;">🔐</div>
            <h1>Admin Panel</h1>
            <p>Enter the admin password to manage items and prices</p>
            <form id="admin-login-form" novalidate>
              <div class="form-group">
                <input class="form-input" type="password" id="admin-password" 
                       placeholder="Enter admin password" required autocomplete="off"
                       maxlength="50">
                <div class="form-error" id="admin-login-error"></div>
              </div>
              <button type="submit" class="btn btn-primary" style="width:100%;">
                🔓 Login as Admin
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  `;
}

function renderAdminDashboard() {
  return `
    <main class="page-content page-enter">
      <section class="section admin-page">
        <div class="container">
          <div class="admin-header" style="margin-bottom: 2rem;">
            <div>
              <h1 style="font-size:var(--fs-h2);">⚙️ Admin Dashboard</h1>
              <p style="color:var(--clr-gray-500);">Manage your business, orders, and restaurant menu</p>
            </div>
            <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
              ${mainTab === 'menu' ? `
                <button class="btn btn-outline btn-sm" id="admin-add-btn">
                  ➕ Add Item
                </button>
                <button class="btn btn-ghost btn-sm" id="admin-reset-btn">
                  🔄 Reset to Defaults
                </button>
              ` : ''}
              <button class="btn btn-ghost btn-sm" id="admin-logout-btn" style="color:var(--clr-error);">
                🚪 Logout
              </button>
            </div>
          </div>

          <div class="admin-tab-bar">
            <button class="admin-tab-btn ${mainTab === 'menu' ? 'active' : ''}" data-main-tab="menu">
              📋 Menu
            </button>
            <button class="admin-tab-btn ${mainTab === 'orders' ? 'active' : ''}" data-main-tab="orders">
              📦 Orders
            </button>
            <button class="admin-tab-btn ${mainTab === 'subscribers' ? 'active' : ''}" data-main-tab="subscribers">
              👥 Subscribers
            </button>
            <button class="admin-tab-btn ${mainTab === 'analytics' ? 'active' : ''}" data-main-tab="analytics">
              📊 Analytics
            </button>
          </div>

          ${(() => {
      if (mainTab === 'menu') return renderMenuManagement();
      if (mainTab === 'orders') return renderOrdersDashboard();
      if (mainTab === 'subscribers') return renderSubscribersDashboard();
      if (mainTab === 'analytics') return renderAnalyticsDashboard();
    })()}
        </div>
      </section>
    </main>
  `;
}

function renderMenuManagement() {
  const items = activeTab === 'sweets' ? getSweetsItems() : getRestaurantItems();

  return `
          <!-- Category Switcher -->
          <div class="category-tabs" style="margin-bottom:1.5rem;">
            <button class="category-tab ${activeTab === 'sweets' ? 'active' : ''}" data-tab="sweets">
              🍬 Sweets & Snacks (${getSweetsItems().length})
            </button>
            <button class="category-tab ${activeTab === 'restaurant' ? 'active' : ''}" data-tab="restaurant">
              🍛 Restaurant Menu (${getRestaurantItems().length})
            </button>
          </div>

          ${showAddForm ? renderAddForm() : ''}
          ${editingItemId ? renderEditForm(editingItemId) : ''}

          <!-- Items Table -->
          <div class="admin-table-wrapper">
            <table class="admin-table" id="admin-items-table">
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Price (₹)</th>
                  <th>Unit</th>
                  <th>Available</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${items.map(item => `
                  <tr data-id="${item.id}">
                    <td><img class="admin-item-img" src="${item.image}" alt="${item.name}" loading="lazy"></td>
                    <td style="font-weight:600;">${item.name}</td>
                    <td><span style="font-size:0.8rem;color:var(--clr-gray-500);text-transform:capitalize;">${item.category}</span></td>
                    <td style="font-size:0.85rem;color:var(--clr-gray-600);max-width:200px;text-overflow:ellipsis;overflow:hidden;white-space:nowrap;" title="${item.description}">${item.description}</td>
                    <td style="font-variant-numeric: tabular-nums;">${item.price}</td>
                    <td style="color:var(--clr-gray-500);font-size:0.9rem;">${item.unit}</td>
                    <td>
                      <label class="admin-toggle">
                        <input type="checkbox" ${item.isAvailable ? 'checked' : ''} data-field="isAvailable" data-id="${item.id}" class="admin-toggle-input">
                        <span class="slider"></span>
                      </label>
                    </td>
                    <td>
                      <button class="btn btn-ghost btn-sm admin-edit-btn" data-id="${item.id}" title="Edit Item">✏️</button>
                      <button class="btn btn-ghost btn-sm admin-delete-btn" data-id="${item.id}" style="color:var(--clr-error);" title="Delete Item">🗑️</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
  `;
}

function renderOrdersDashboard() {
  const allOrders = getAllOrders();
  const totalUsers = getAllUsersCount();

  const deliveredOrders = allOrders.filter(o => o.status === 'delivered');
  const subscriptionRevenue = getTotalClearedRevenue();
  const totalRevenue = deliveredOrders.reduce((sum, o) => sum + o.total, 0) + subscriptionRevenue;
  const pendingCount = allOrders.filter(o => o.status === 'pending').length;
  const activeCount = allOrders.filter(o => o.status === 'pending' || o.status === 'accepted').length;

  let filteredOrders = allOrders.filter(o => o.paymentMethod !== 'Monthly Billing');
  if (orderFilter !== 'all') {
    filteredOrders = filteredOrders.filter(o => o.status === orderFilter);
  }
  // Date filter
  if (orderDateFilter !== 'all') {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    filteredOrders = filteredOrders.filter(o => {
      const d = new Date(o.createdAt);
      if (orderDateFilter === 'today') return d >= startOfToday;
      if (orderDateFilter === 'week') return d >= new Date(startOfToday - 7 * 86400000);
      if (orderDateFilter === 'month') return d >= new Date(startOfToday - 30 * 86400000);
      return true;
    });
  }
  // Search filter
  if (orderSearchQuery) {
    const q = orderSearchQuery.toLowerCase();
    filteredOrders = filteredOrders.filter(o =>
      o.customerName.toLowerCase().includes(q) ||
      o.orderId.toLowerCase().includes(q) ||
      (o.customerPhone || '').includes(q)
    );
  }

  const getSelectStatusStyle = (status) => {
    switch (status) {
      case 'pending': return 'background:#FFF3CD; color:#856404; border-color:#FFEEBA;';
      case 'accepted': return 'background:#D1ECF1; color:#0C5460; border-color:#BEE5EB;';
      case 'delivered': return 'background:#D4EDDA; color:#155724; border-color:#C3E6CB;';
      case 'cancelled': return 'background:#F8D7DA; color:#721C24; border-color:#F5C6CB;';
      default: return '';
    }
  };

  return `
    <div class="orders-dashboard page-enter">
      ${editingOrderId ? renderEditOrderModal(allOrders.find(o => o.orderId === editingOrderId)) : ''}

      <!-- Stats -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
        <div class="sub-stat-card">
          <div class="stat-icon" style="background: #D1FAE5; color: #065F46;">💰</div>
          <div class="stat-label">Revenue</div>
          <div class="stat-value" style="color: var(--clr-veg);">${formatPrice(totalRevenue)}</div>
        </div>
        <div class="sub-stat-card">
          <div class="stat-icon" style="background: #FEF3C7; color: #92400E;">📦</div>
          <div class="stat-label">Pending</div>
          <div class="stat-value" style="color: var(--clr-warning);">${pendingCount}</div>
        </div>
        <div class="sub-stat-card">
          <div class="stat-icon" style="background: #DBEAFE; color: #1E40AF;">🔄</div>
          <div class="stat-label">Active</div>
          <div class="stat-value" style="color: var(--clr-info);">${activeCount}</div>
        </div>
        <div class="sub-stat-card">
          <div class="stat-icon" style="background: #F3E8FF; color: #6B21A8;">👥</div>
          <div class="stat-label">Users</div>
          <div class="stat-value" style="color: #7C3AED;">${totalUsers}</div>
        </div>
      </div>

      <!-- Search + Date + Status Filters -->
      <div style="display: flex; gap: 0.75rem; margin-bottom: 1rem; flex-wrap: wrap; align-items: center;">
        <div style="position: relative; flex: 1; min-width: 180px; max-width: 320px;">
          <span style="position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); color: var(--clr-gray-400); pointer-events: none; font-size: 0.85rem;">🔍</span>
          <input type="text" id="order-search" class="form-input" placeholder="Search name, order ID, phone..." value="${orderSearchQuery}" style="padding-left: 2.2rem; padding-right: 2rem; height: 36px; font-size: 0.85rem;">
          ${orderSearchQuery ? `<button id="order-search-clear" style="position: absolute; right: 0.5rem; top: 50%; transform: translateY(-50%); background: none; border: none; color: var(--clr-gray-400); cursor: pointer; font-size: 1rem; line-height: 1;">✕</button>` : ''}
        </div>
        <div style="display: flex; gap: 0.3rem;">
          ${['all', 'today', 'week', 'month'].map(d => `
            <button class="order-filter-btn order-date-btn ${orderDateFilter === d ? 'active' : ''}" data-date="${d}" style="font-size: 0.78rem; padding: 4px 10px;">
              ${d === 'all' ? 'All Time' : d === 'today' ? 'Today' : d === 'week' ? '7 Days' : '30 Days'}
            </button>
          `).join('')}
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
        <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
          ${['all', 'pending', 'accepted', 'delivered', 'cancelled'].map(filter => `
            <button class="order-filter-btn ${orderFilter === filter ? 'active' : ''}" data-filter="${filter}">
              ${filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}${filter !== 'all' ? ` (${allOrders.filter(o => o.status === filter && o.paymentMethod !== 'Monthly Billing').length})` : ''}
            </button>
          `).join('')}
        </div>
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          ${orderSearchQuery || orderDateFilter !== 'all' ? `<span style="font-size: 0.8rem; color: var(--clr-gray-500);">${filteredOrders.length} result${filteredOrders.length !== 1 ? 's' : ''}</span>` : ''}
          <button class="btn ${showManualOrderForm ? 'btn-ghost' : 'btn-primary'} btn-sm" id="admin-manual-order-toggle">
            ${showManualOrderForm ? '✕ Close' : '+ Manual Order'}
          </button>
        </div>
      </div>

      ${showManualOrderForm ? renderManualOrderForm() : ''}

      <!-- Orders List -->
      ${filteredOrders.length === 0 ? `
        <div class="empty-state" style="background: white; border-radius: var(--radius-lg); border: 1px solid var(--clr-gray-200);">
          <div class="empty-icon">📭</div>
          <h2>No ${orderFilter === 'all' ? '' : orderFilter} orders</h2>
          <p>Orders matching this filter will appear here.</p>
        </div>
      ` : `
        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
          ${filteredOrders.map(order => {
            const waLink = order.customerPhone && order.customerPhone !== 'N/A'
              ? `https://wa.me/${order.customerPhone.replace(/[\s\-\+]/g, '').replace(/^91/, '91')}?text=${encodeURIComponent(`Hi ${order.customerName}, regarding your order ${order.orderId} from Shree Shyam Restaurant...`)}`
              : '';
            return `
            <div class="order-card">
              <div class="order-card-header">
                <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
                  <span style="font-family: var(--ff-accent); font-weight: 700; color: var(--clr-saffron); font-size: 0.9rem;">${order.orderId}</span>
                  ${order.isOffline ? `<span class="badge badge-info">Manual</span>` : ''}
                  ${isDueSoon(order.pickupDate) && order.status !== 'delivered' && order.status !== 'cancelled' ? `
                    <span class="badge badge-error" style="animation: pulse 1.5s infinite;">DUE SOON</span>
                  ` : ''}
                </div>
                <select class="form-input status-select" data-id="${order.orderId}" style="font-weight: 600; text-transform: capitalize; padding: 4px 8px; font-size: 0.8rem; width: auto; min-width: 120px; ${getSelectStatusStyle(order.status)}">
                  ${['pending', 'accepted', 'delivered', 'cancelled'].map(opt => `
                    <option value="${opt}" ${order.status === opt ? 'selected' : ''}>${opt}</option>
                  `).join('')}
                </select>
              </div>

              <div class="order-card-body admin-order-grid">
                <!-- Customer -->
                <div>
                  <div style="font-weight: 700; margin-bottom: 4px;">${order.customerName}</div>
                  <div style="font-size: 0.8rem; color: var(--clr-gray-500);">
                    <a href="tel:${order.customerPhone}" style="color: var(--clr-gray-600); text-decoration: none;">📞 ${formatPhoneNumber(order.customerPhone)}</a>
                  </div>
                  <div style="font-size: 0.8rem; color: var(--clr-gray-500); margin-top: 4px;">
                    🗓 ${order.pickupDate} · <span style="color: var(--clr-saffron); font-weight: 600;">${order.pickupTime || 'No slot'}</span>
                  </div>
                  ${isDueSoon(order.pickupDate) && order.status !== 'delivered' && order.status !== 'cancelled' ? `
                    <div style="font-size: 0.75rem; margin-top: 2px; font-weight: 600; color: var(--clr-error);">
                      ⏳ ${getPickupTimeStatus(order.pickupDate, order.pickupTime)}
                    </div>
                  ` : ''}
                  <div style="display: flex; gap: 0.5rem; margin-top: 8px; flex-wrap: wrap;">
                    ${waLink ? `
                      <a href="${waLink}" target="_blank" rel="noopener" class="btn btn-sm" style="background: #E6F4EA; color: #1E7E34; border: 1px solid #C2E7CB; font-size: 0.75rem; padding: 3px 10px; text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.246 2.248 3.484 5.232 3.484 8.412-.003 6.557-5.338 11.892-11.893 11.892-1.997-.001-3.951-.5-5.688-1.448l-6.309 1.656zm6.29-4.143c1.552.921 3.13 1.411 4.793 1.412 5.204 0 9.444-4.24 9.446-9.443.002-2.521-.979-4.89-2.762-6.67s-4.149-2.765-6.67-2.765c-5.204 0-9.441 4.239-9.443 9.441-.001 1.742.483 3.339 1.398 4.71l-1.01 3.693 3.791-.994zm11.367-7.4c-.31-.154-1.829-.902-2.107-1.003-.278-.101-.48-.153-.68.154-.201.307-.779 1.003-.955 1.205-.175.202-.351.226-.66.073-.31-.153-1.309-.482-2.493-1.54-.92-.821-1.54-1.835-1.72-2.144-.18-.309-.019-.476.136-.629.139-.138.309-.36.464-.54.154-.18.206-.309.309-.515.103-.206.052-.386-.025-.54-.077-.154-.68-1.644-.932-2.253-.245-.592-.495-.511-.68-.521-.176-.009-.379-.011-.581-.011-.202 0-.531.076-.809.381-.278.305-1.062 1.039-1.062 2.535s1.087 2.941 1.239 3.146c.152.206 2.14 3.268 5.184 4.582 2.534 1.095 3.048.877 3.603.824.555-.053 1.829-.747 2.087-1.468.258-.721.258-1.339.181-1.468-.076-.128-.278-.206-.587-.36z"/></svg>
                        WhatsApp
                      </a>
                    ` : ''}
                    ${order.status !== 'delivered' && order.status !== 'cancelled' ? `
                      <button class="btn btn-sm btn-outline edit-items-btn" data-id="${order.orderId}" style="font-size: 0.75rem; padding: 3px 10px;">✏️ Edit</button>
                    ` : ''}
                  </div>
                </div>

                <!-- Items -->
                <div>
                  <div style="font-size: 0.8rem; color: var(--clr-gray-500); margin-bottom: 4px; font-weight: 600;">Items</div>
                  <div style="max-height: 80px; overflow-y: auto;">
                    ${order.items.map(i => `
                      <div style="font-size: 0.8rem; color: var(--clr-gray-700); padding: 2px 0;">
                        <span style="font-weight: 700; color: var(--clr-saffron);">${i.quantity}</span> × ${i.name}
                      </div>
                    `).join('')}
                  </div>
                </div>

                <!-- Total -->
                <div style="text-align: right; white-space: nowrap;">
                  <div style="font-weight: 800; font-size: 1.1rem;">${formatPrice(order.total)}</div>
                  <div style="font-size: 0.7rem; color: var(--clr-gray-400); margin-top: 2px;">${order.paymentMethod}</div>
                  <div style="font-size: 0.7rem; color: var(--clr-gray-400); margin-top: 2px;">${new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                </div>
              </div>
            </div>
          `}).join('')}
        </div>
      `}
    </div>
  `;
}

function renderAddForm() {
  const categories = activeTab === 'sweets'
    ? ['sweets', 'snacks']
    : ['starters', 'sabzi', 'roti', 'thali'];

  return `
    <div class="admin-add-form" id="admin-add-form">
      <h2>➕ Add New Item</h2>
      <form id="add-item-form" novalidate>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Name *</label>
            <input class="form-input" type="text" id="new-item-name" required maxlength="100" placeholder="Item name">
          </div>
          <div class="form-group">
            <label class="form-label">Category *</label>
            <select class="form-input" id="new-item-category">
              ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Description</label>
            <textarea class="form-input" id="new-item-desc" rows="2" maxlength="500" placeholder="Item description"></textarea>
          </div>
          <div class="form-group" style="display:flex; flex-direction:column; justify-content:center; align-items:flex-start;">
            <label class="form-label">Available (In Stock)</label>
            <label class="admin-toggle" style="display:inline-block;">
              <input type="checkbox" id="new-item-available" checked>
              <span class="slider"></span>
            </label>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Price (₹) *</label>
            <input class="form-input" type="number" id="new-item-price" min="0" max="99999" required placeholder="100">
          </div>
          <div class="form-group">
            <label class="form-label">Unit</label>
            <input class="form-input" type="text" id="new-item-unit" maxlength="50" placeholder="per piece" value="per piece">
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Image URL</label>
            <input class="form-input" type="url" id="new-item-image" placeholder="/images/sweets/item.png OR https://...">
            <div style="margin-top: 0.5rem;">
              <label class="form-label" style="font-size: 0.8rem;">Or Upload Image (Auto-compressed for safe storage)</label>
              <input type="file" id="new-item-upload" accept="image/*" class="form-input" style="padding: 0.4rem;">
            </div>
          </div>
          <div class="form-group" style="display:flex; align-items:flex-end;">
            <img id="new-item-preview" src="/images/sweets/samosa.png" alt="Preview" style="height:80px; width:100%; object-fit:contain; border-radius:var(--radius-sm); border:1px solid var(--clr-gray-200); background:#fff;">
          </div>
        </div>

        <div style="display:flex;gap:0.5rem; margin-top:1rem;">
          <button type="submit" class="btn btn-primary">Add Item</button>
          <button type="button" class="btn btn-ghost" id="cancel-add-btn">Cancel</button>
        </div>
      </form>
    </div>
  `;
}

function renderEditForm(itemId) {
  const items = activeTab === 'sweets' ? getSweetsItems() : getRestaurantItems();
  const item = items.find(i => i.id === itemId);
  if (!item) return '';

  const categories = activeTab === 'sweets'
    ? ['sweets', 'snacks']
    : ['starters', 'sabzi', 'roti', 'thali'];

  return `
    <div class="admin-add-form" id="admin-edit-form" style="border-color: var(--clr-primary);">
      <h2>✏️ Edit Item</h2>
      <form id="edit-item-form" data-id="${item.id}" novalidate>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Name *</label>
            <input class="form-input" type="text" id="edit-item-name" required maxlength="100" value="${item.name}">
          </div>
          <div class="form-group">
            <label class="form-label">Category *</label>
            <select class="form-input" id="edit-item-category">
              ${categories.map(c => `<option value="${c}" ${c === item.category ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Image URL</label>
            <input class="form-input" type="url" id="edit-item-image" placeholder="/images/sweets/item.png OR https://..." value="${item.image}">
            <div style="margin-top: 0.5rem;">
              <label class="form-label" style="font-size: 0.8rem;">Or Upload Image (Auto-compressed)</label>
              <input type="file" id="edit-item-upload" accept="image/*" class="form-input" style="padding: 0.4rem;">
            </div>
          </div>
          <div class="form-group" style="display:flex; align-items:flex-end;">
            <img id="edit-item-preview" src="${item.image}" alt="Preview" style="height:80px; width:100%; object-fit:contain; border-radius:var(--radius-sm); border:1px solid var(--clr-gray-200); background:#fff;">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Description</label>
            <textarea class="form-input" id="edit-item-desc" rows="2" maxlength="500">${item.description || ''}</textarea>
          </div>
          <div class="form-group" style="display:flex; flex-direction:column; justify-content:center; align-items:flex-start;">
            <label class="form-label">Available (In Stock)</label>
            <label class="admin-toggle" style="display:inline-block;">
              <input type="checkbox" id="edit-item-available" ${item.isAvailable ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Price (₹) *</label>
            <input class="form-input" type="number" id="edit-item-price" min="0" max="99999" required value="${item.price}">
          </div>
          <div class="form-group">
            <label class="form-label">Unit</label>
            <input class="form-input" type="text" id="edit-item-unit" maxlength="50" value="${item.unit || ''}">
          </div>
        </div>
        <div style="display:flex;gap:0.5rem; margin-top:1rem;">
          <button type="submit" class="btn btn-primary" style="background-color: var(--clr-success);">Save Changes</button>
          <button type="button" class="btn btn-ghost" id="cancel-edit-btn">Cancel</button>
        </div>
      </form>
    </div>
  `;
}

export function initAdminPage() {
  if (!isAdminLoggedIn()) {
    // Login form
    document.getElementById('admin-login-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const password = document.getElementById('admin-password').value;
      if (adminLogin(password)) {
        showToast('Admin access granted', 'success');
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      } else {
        document.getElementById('admin-login-error').textContent = 'Invalid password';
      }
    });
    return;
  }

  // Main Tab switching
  document.querySelectorAll('.admin-tab-btn[data-main-tab]').forEach(tab => {
    tab.addEventListener('click', () => {
      mainTab = tab.dataset.mainTab;
      showManualOrderForm = false;
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
  });

  // Category Tab switching (Sweets vs Restaurant)
  document.querySelectorAll('.category-tab[data-tab]').forEach(tab => {
    tab.addEventListener('click', () => {
      activeTab = tab.dataset.tab;
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
  });

  // Order status filter
  document.querySelectorAll('.order-filter-btn[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      orderFilter = btn.dataset.filter;
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
  });

  // Order date filter
  document.querySelectorAll('.order-date-btn[data-date]').forEach(btn => {
    btn.addEventListener('click', () => {
      orderDateFilter = btn.dataset.date;
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
  });

  // Order search
  let orderSearchTimer = null;
  document.getElementById('order-search')?.addEventListener('input', (e) => {
    orderSearchQuery = e.target.value.trim();
    clearTimeout(orderSearchTimer);
    orderSearchTimer = setTimeout(() => {
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }, 300);
  });

  document.getElementById('order-search-clear')?.addEventListener('click', () => {
    orderSearchQuery = '';
    const input = document.getElementById('order-search');
    if (input) { input.value = ''; input.focus(); }
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });

  // Order Status update
  document.querySelectorAll('.status-select').forEach(select => {
    select.addEventListener('change', (e) => {
      const orderId = e.target.dataset.id;
      const newStatus = e.target.value;
      if (updateOrderStatus(orderId, newStatus)) {
        showToast('Order status updated', 'success');
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      }
    });
  });

  // Logout
  document.getElementById('admin-logout-btn')?.addEventListener('click', () => {
    adminLogout();
    showToast('Logged out', 'info');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });

  // Add item button
  document.getElementById('admin-add-btn')?.addEventListener('click', () => {
    showAddForm = !showAddForm;
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });

  // Cancel add
  document.getElementById('cancel-add-btn')?.addEventListener('click', () => {
    showAddForm = false;
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });

  // Add item form
  document.getElementById('add-item-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const item = {
      name: document.getElementById('new-item-name').value,
      category: document.getElementById('new-item-category').value,
      description: document.getElementById('new-item-desc').value,
      price: document.getElementById('new-item-price').value,
      unit: document.getElementById('new-item-unit').value,
      image: document.getElementById('new-item-image').value || undefined,
      isAvailable: document.getElementById('new-item-available').checked
    };
    if (!item.name || !item.price) {
      showToast('Name and price are required', 'error');
      return;
    }
    addItem(activeTab, item);
    showAddForm = false;
    showToast('Item added successfully', 'success');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });

  // Show edit form
  document.querySelectorAll('.admin-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      editingItemId = btn.dataset.id;
      showAddForm = false; // Close add form if open
      window.dispatchEvent(new HashChangeEvent('hashchange'));

      // Scroll to edit form
      setTimeout(() => {
        document.getElementById('admin-edit-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
    });
  });

  // Handle file uploads (Add form)
  document.getElementById('new-item-upload')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageToDataURL(file);
      document.getElementById('new-item-image').value = dataUrl;
      const preview = document.getElementById('new-item-preview');
      if (preview) preview.src = dataUrl;
      showToast('Image locally compressed and ready for upload', 'info');
    } catch (err) {
      showToast('Image processing failed', 'error');
      console.error(err);
    }
  });

  // Handle URL change to update preview (Add form)
  document.getElementById('new-item-image')?.addEventListener('input', (e) => {
    const preview = document.getElementById('new-item-preview');
    if (preview && e.target.value) preview.src = e.target.value;
  });

  // Handle file uploads (Edit form)
  document.getElementById('edit-item-upload')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageToDataURL(file);
      document.getElementById('edit-item-image').value = dataUrl;
      const preview = document.getElementById('edit-item-preview');
      if (preview) preview.src = dataUrl;
      showToast('Image locally compressed and ready to save', 'info');
    } catch (err) {
      showToast('Image processing failed', 'error');
      console.error(err);
    }
  });

  // Handle URL change to update preview (Edit form)
  document.getElementById('edit-item-image')?.addEventListener('input', (e) => {
    const preview = document.getElementById('edit-item-preview');
    if (preview && e.target.value) preview.src = e.target.value;
  });

  // Cancel edit
  document.getElementById('cancel-edit-btn')?.addEventListener('click', () => {
    editingItemId = null;
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });

  // Edit item form submit
  document.getElementById('edit-item-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = e.target.dataset.id;
    const updates = {
      name: document.getElementById('edit-item-name').value,
      category: document.getElementById('edit-item-category').value,
      description: document.getElementById('edit-item-desc').value,
      price: parseFloat(document.getElementById('edit-item-price').value),
      unit: document.getElementById('edit-item-unit').value,
      image: document.getElementById('edit-item-image').value,
      isAvailable: document.getElementById('edit-item-available').checked
    };

    if (!updates.name || isNaN(updates.price)) {
      showToast('Name and valid price are required', 'error');
      return;
    }

    updateItem(activeTab, id, updates);
    editingItemId = null;
    showToast('Item updated successfully', 'success');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });

  // Fast availability toggle
  document.querySelectorAll('.admin-toggle-input').forEach(input => {
    input.addEventListener('change', () => {
      const id = input.dataset.id;
      updateItem(activeTab, id, { isAvailable: input.checked });
      showToast(input.checked ? 'Marked as Available' : 'Marked as Unavailable', 'success');
    });
  });

  // Delete items
  document.querySelectorAll('.admin-delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      showConfirm('Are you sure you want to delete this item?', () => {
        deleteItem(activeTab, id);
        showToast('Item deleted', 'info');
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      });
    });
  });

  // Reset
  document.getElementById('admin-reset-btn')?.addEventListener('click', () => {
    showConfirm(`Reset all ${activeTab} items to defaults? Custom changes will be lost.`, () => {
      resetToDefaults(activeTab);
      showToast('Reset to defaults', 'info');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
  });

  // Manual Order Toggle (within Orders tab)
  document.getElementById('admin-manual-order-toggle')?.addEventListener('click', () => {
    showManualOrderForm = !showManualOrderForm;
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });

  // Manual Order Form Handlers
  if (mainTab === 'orders' && showManualOrderForm) {
    // Search Menu
    document.getElementById('offline-product-search')?.addEventListener('input', (e) => {
      offlineSearchQuery = e.target.value.toLowerCase().trim();
      renderOfflineSearchResults();
    });

    // Handle dynamically added search results
    document.getElementById('offline-search-results')?.addEventListener('click', (e) => {
      const addBtn = e.target.closest('.add-offline-item');
      if (addBtn) {
        const product = JSON.parse(decodeURIComponent(addBtn.dataset.item));
        addOfflineItem(product);
      }
    });

    // Handle offline cart actions
    document.getElementById('offline-cart-items')?.addEventListener('click', (e) => {
      const btn = e.target;
      const id = btn.dataset.id;
      if (!id) return;

      if (btn.classList.contains('qty-minus')) updateOfflineQty(id, -1);
      if (btn.classList.contains('qty-plus')) updateOfflineQty(id, 1);
      if (btn.classList.contains('remove-item')) removeOfflineItem(id);
    });

    // Handle offline cart manual input
    document.getElementById('offline-cart-items')?.addEventListener('change', (e) => {
      const input = e.target;
      const id = input.dataset.id;
      if (!id || !input.classList.contains('qty-input')) return;
      const val = Math.min(Math.max(parseInt(input.value) || 1, 1), 999);
      const item = offlineCart.find(i => i.id === id);
      if (item) {
        item.quantity = val;
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      }
    });

    // Place Manual Order
    document.getElementById('place-offline-order-btn')?.addEventListener('click', () => {
      if (offlineCart.length === 0) {
        showToast('Cart is empty', 'error');
        return;
      }
      const name = document.getElementById('offline-customer-name').value;
      const phone = document.getElementById('offline-customer-phone').value;
      const pickupDate = document.getElementById('offline-pickup-date').value;
      const pickupTime = document.getElementById('offline-pickup-time').value;

      const result = createOfflineOrder(offlineCart, { name, phone, pickupDate, pickupTime });
      if (result.success) {
        showToast('Manual order created successfully!', 'success');
        offlineCart = [];
        showManualOrderForm = false;
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      }
    });
  }
  
  // ============================================
  // ORDER ACTIONS & MODALS (Works across tabs)
  // ============================================

  // Handle Orders Dashboard Actions (Tracking & Subscribers)
  document.querySelector('.orders-dashboard')?.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const id = btn.dataset.id;

    if (btn.classList.contains('edit-items-btn')) {
      editingOrderId = id;
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }
  });

  // Handle Edit Modal Actions
  if (editingOrderId) {
    document.getElementById('close-edit-items')?.addEventListener('click', () => {
      editingOrderId = null;
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    document.getElementById('cancel-edit-items')?.addEventListener('click', () => {
      editingOrderId = null;
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });

    const order = getAllOrders().find(o => o.orderId === editingOrderId);
    if (order) {
      // Quantity Buttons
      document.getElementById('edit-order-items-list')?.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        const index = parseInt(btn.dataset.index);
        const newItems = [...order.items];

        if (btn.classList.contains('plus-edit-item')) {
          newItems[index].quantity++;
        } else if (btn.classList.contains('minus-edit-item')) {
          newItems[index].quantity = Math.max(1, newItems[index].quantity - 1);
        } else if (btn.classList.contains('remove-edit-item')) {
          newItems.splice(index, 1);
        }

        updateOrderItems(editingOrderId, newItems);
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      });

      // Search & Add
      document.getElementById('edit-item-search')?.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const allProducts = [...getSweetsItems(), ...getRestaurantItems()];
        const filtered = allProducts.filter(p => p.name.toLowerCase().includes(query)).slice(0, 5);
        const resultsCont = document.getElementById('edit-item-search-results');
        if (resultsCont) {
          resultsCont.innerHTML = filtered.map(p => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; border: 1px solid var(--clr-gray-100); border-radius: 6px; font-size: 0.9rem;">
              <div>
                <div style="font-weight: 600;">${p.name}</div>
                <div style="font-size: 0.8rem; color: var(--clr-gray-500);">${formatPrice(p.price)} / ${p.unit || ''}</div>
              </div>
              <button class="btn btn-sm btn-outline add-suggested-item" data-item="${encodeURIComponent(JSON.stringify(p))}" style="padding: 2px 8px; height: auto;">Add</button>
            </div>
          `).join('');
        }
      });

      document.getElementById('edit-item-search-results')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.add-suggested-item');
        if (btn) {
          const product = JSON.parse(decodeURIComponent(btn.dataset.item));
          const newItems = [...order.items];
          const existing = newItems.find(i => i.name === product.name);
          if (existing) {
            existing.quantity++;
          } else {
            newItems.push({ name: product.name, quantity: 1, price: product.price, unit: product.unit || '' });
          }
          updateOrderItems(editingOrderId, newItems);
          window.dispatchEvent(new HashChangeEvent('hashchange'));
        }
      });

      document.getElementById('save-edit-items')?.addEventListener('click', () => {
        const adminComment = document.getElementById('edit-order-comment')?.value || '';
        const currentOrder = getAllOrders().find(o => o.orderId === editingOrderId);
        if (currentOrder) {
          updateOrderItems(editingOrderId, currentOrder.items, adminComment);
          showToast('Changes saved successfully', 'success');
          editingOrderId = null;
          window.dispatchEvent(new HashChangeEvent('hashchange'));
        }
      });
    }
  }

  // Subscribers Tab Handlers
  if (mainTab === 'subscribers') {

    let subSearchTimer = null;
    document.getElementById('sub-search')?.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      subSearchQuery = val;
      clearTimeout(subSearchTimer);
      subSearchTimer = setTimeout(() => updateSubSearchResults(val), 150);
    });

    document.getElementById('sub-search-clear')?.addEventListener('click', () => {
      const input = document.getElementById('sub-search');
      if (input) {
        input.value = '';
        input.focus();
      }
      subSearchQuery = '';
      updateSubSearchResults('');
    });

    document.getElementById('add-sub-btn')?.addEventListener('click', () => {
      showAddSubForm = true;
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });

    document.getElementById('add-sub-btn-empty')?.addEventListener('click', () => {
      showAddSubForm = true;
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });

    document.getElementById('cancel-sub-btn')?.addEventListener('click', () => {
      showAddSubForm = false;
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });

    document.getElementById('new-sub-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = {
        name: document.getElementById('new-sub-name').value,
        phone: document.getElementById('new-sub-phone').value,
        address: document.getElementById('new-sub-address').value
      };
      const res = createAdminSubscriber(data);
      if (res.success) {
        showToast('New subscriber added successfully!', 'success');
        showAddSubForm = false;
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      }
    });

    document.getElementById('back-to-subs-btn')?.addEventListener('click', () => {
      selectedSubscriberId = null;
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });

    // Delegated actions for subscriber list
    document.querySelector('.subscribers-dashboard')?.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const id = btn.dataset.id;
      if (!id) return;

      if (btn.classList.contains('view-sub-btn') || btn.classList.contains('quick-add-bill-btn')) {
        selectedSubscriberId = id;
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      }

      if (btn.classList.contains('clear-sub-btn')) {
        showConfirm('Clear all outstanding bills for this subscriber?', () => {
          if (clearOutstandingBill(id).success) {
            showToast('Account balance cleared', 'success');
            window.dispatchEvent(new HashChangeEvent('hashchange'));
          }
        });
      }

      if (btn.classList.contains('share-sub-btn')) {
        const sub = getSubscribers().find(s => s.userId === id);
        if (sub) {
          const text = generateBillSummary(sub);
          const url = `https://wa.me/${sub.phone.replace(/[\s\-\+]/g, '').replace(/^91/, '91')}?text=${encodeURIComponent(text)}`;
          window.open(url, '_blank');
        }
      }
    });

    // Delegated actions for subscriber detail view
    document.querySelector('.subscriber-detail')?.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const id = btn.dataset.id;
      if (!id) return;

      if (btn.classList.contains('clear-sub-btn')) {
        showConfirm('Clear all outstanding bills for this subscriber?', () => {
          if (clearOutstandingBill(id).success) {
            showToast('Account balance cleared', 'success');
            window.dispatchEvent(new HashChangeEvent('hashchange'));
          }
        });
      }

      if (btn.classList.contains('share-sub-btn')) {
        const sub = getSubscribers().find(s => s.userId === id);
        if (sub) {
          const text = generateBillSummary(sub);
          const url = `https://wa.me/${sub.phone.replace(/[\s\-\+]/g, '').replace(/^91/, '91')}?text=${encodeURIComponent(text)}`;
          window.open(url, '_blank');
        }
      }
    });

    // Handle manual bill form
    document.getElementById('add-manual-bill-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const userId = e.target.dataset.id;
      const description = document.getElementById('manual-bill-desc').value;
      const amount = parseFloat(document.getElementById('manual-bill-amount').value);

      if (!description || isNaN(amount) || amount <= 0) {
        showToast('Please enter a valid description and amount', 'error');
        return;
      }

      const res = addManualBill(userId, amount, description);
      if (res.success) {
        showToast(`Bill of ${formatPrice(amount)} added successfully!`, 'success');
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      }
    });

    // Handle Quick Order Approval
    document.querySelectorAll('.approve-bill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const userId = btn.dataset.userId;
        const orderId = btn.dataset.orderId;
        const input = document.querySelector(`.price-input[data-order-id="${orderId}"]`);
        const amount = parseFloat(input.value);

        if (isNaN(amount) || amount <= 0) {
          showToast('Please enter a valid price', 'error');
          return;
        }

        const res = approveQuickOrder(userId, orderId, amount);
        if (res.success) {
          showToast('Order priced and approved!', 'success');
          window.dispatchEvent(new HashChangeEvent('hashchange'));
        }
      });
    });

    // Handle Partial Clear
    document.querySelectorAll('.clear-partial-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const container = btn.closest('div');
        const input = container.querySelector('.clear-amount-input');
        const amount = parseFloat(input.value);
        const sub = getSubscribers().find(s => s.userId === id);

        if (isNaN(amount) || amount <= 0) {
          showToast('Please enter a valid amount to clear', 'error');
          return;
        }

        if (sub && amount > sub.outstandingBalance) {
          showToast(`Amount cannot exceed outstanding balance of ${formatPrice(sub.outstandingBalance)}`, 'error');
          return;
        }

        const res = clearPartialAmount(id, amount);
        if (res.success) {
          showToast(`Cleared ${formatPrice(amount)} from balance.`, 'success');
          window.dispatchEvent(new HashChangeEvent('hashchange'));
        }
      });
    });
  }
}

function renderManualOrderForm() {
  const total = offlineCart.reduce((s, i) => s + (i.price * i.quantity), 0);

  return `
    <div class="manual-order-container page-enter">
      <!-- Left: Item Selector -->
      <div style="background: white; padding: 1.25rem; border-radius: var(--radius-md); border: 1px solid var(--clr-gray-200);">
        <h2 style="margin-bottom: 1rem; font-size: 1.1rem; color: var(--clr-primary);">🔍 Search Menu Items</h2>
        <div class="form-group">
          <input type="text" class="form-input" id="offline-product-search" placeholder="Search dish name..." value="${offlineSearchQuery}">
        </div>
        <div id="offline-search-results" style="max-height: 300px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.5rem; margin-top: 1rem;">
          ${renderOfflineSearchResultsHTML()}
        </div>
      </div>

      <!-- Right: Builder Cart -->
      <div style="background: white; padding: 1.25rem; border-radius: var(--radius-md); border: 1px solid var(--clr-gray-200); display: flex; flex-direction: column; gap: 1rem;">
        <h2 style="margin-bottom: 0.5rem; font-size: 1.1rem; color: var(--clr-saffron);">📦 Order Builder</h2>
        
        <div class="offline-cart" style="flex: 1; max-height: 250px; overflow-y: auto;">
          ${offlineCart.length === 0 ? `
            <div style="text-align: center; padding: 1.5rem; color: var(--clr-gray-400); border: 2px dashed var(--clr-gray-100); border-radius: 8px; font-size: 0.9rem;">
              Builder is empty. Add items from the search.
            </div>
          ` : `
            <div id="offline-cart-items" style="display: flex; flex-direction: column; gap: 0.5rem;">
              ${offlineCart.map(i => `
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--clr-gray-50); padding-bottom: 0.5rem;">
                  <div style="flex: 1; min-width: 0; padding-right: 10px;">
                    <div style="font-weight: 600; font-size: 0.9rem; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${i.name}</div>
                    <div style="font-size: 0.75rem; color: var(--clr-gray-500);">${formatPrice(i.price)}</div>
                  </div>
                  <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <div class="qty-selector" style="height: 28px; padding: 2px;">
                      <button class="qty-btn qty-minus" data-id="${i.id}" style="width: 24px;">−</button>
                      <input type="number" class="qty-input" value="${i.quantity}" min="1" max="999" data-id="${i.id}" style="width: 35px; text-align: center; border: none; background: transparent; font-weight: 700; font-size: 0.85rem;">
                      <button class="qty-btn qty-plus" data-id="${i.id}" style="width: 24px;">+</button>
                    </div>
                    <button class="remove-item" data-id="${i.id}" style="background: none; border: none; color: var(--clr-error); cursor: pointer; padding: 4px;">✕</button>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>

        <div style="border-top: 1px solid var(--clr-gray-100); padding-top: 1rem;">
          <div style="display: flex; justify-content: space-between; font-weight: 800; font-size: 1.1rem; margin-bottom: 1rem;">
            <span>Total:</span>
            <span style="color: var(--clr-primary);">${formatPrice(total)}</span>
          </div>
          
          <div class="offline-customer-info" style="display: flex; flex-direction: column; gap: 0.75rem;">
            <div class="form-row-2col">
              <div class="form-group" style="margin:0;">
                <label class="form-label" style="font-size: 0.75rem;">Customer Name</label>
                <input type="text" class="form-input" id="offline-customer-name" placeholder="Name" style="padding: 6px 10px;">
              </div>
              <div class="form-group" style="margin:0;">
                <label class="form-label" style="font-size: 0.75rem;">Phone (Optional)</label>
                <input type="tel" class="form-input" id="offline-customer-phone" placeholder="98XXXXXXXX" style="padding: 6px 10px;">
              </div>
            </div>

            <div class="form-row-2col">
              <div class="form-group" style="margin:0;">
                <label class="form-label" style="font-size: 0.75rem;">📅 Pickup Date</label>
                <input type="date" class="form-input" id="offline-pickup-date" min="${getTodayDate()}" value="${getTodayDate()}" style="padding: 6px 10px;">
              </div>
              <div class="form-group" style="margin:0;">
                <label class="form-label" style="font-size: 0.75rem;">⏰ Time Slot</label>
                <select class="form-input" id="offline-pickup-time" style="padding: 6px 10px;">
                  <option value="10:00 AM - 12:00 PM">10:00 AM - 12:00 PM</option>
                  <option value="10:00 AM - 02:00 PM">10:00 AM - 02:00 PM</option>
                  <option value="02:00 PM - 06:00 PM">02:00 PM - 06:00 PM</option>
                  <option value="06:00 PM - 10:00 PM">06:00 PM - 10:00 PM</option>
                </select>
              </div>
            </div>
            
            <button class="btn btn-primary" id="place-offline-order-btn" style="width: 100%; margin-top: 0.5rem; background: var(--clr-veg); border-color: var(--clr-veg);">
              ✅ Create Manual Order
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderSubscribersDashboard() {
  if (selectedSubscriberId) return renderSubscriberDetail();

  const subs = getSubscribers();
  const totalOutstanding = subs.reduce((sum, s) => sum + (s.outstandingBalance || 0), 0);
  const filtered = filterSubscribers(subs, subSearchQuery);

  return `
    <div class="subscribers-dashboard page-enter">
      <!-- Stats Row -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
        <div class="sub-stat-card">
          <div class="stat-icon" style="background: #D1FAE5; color: #065F46;">💰</div>
          <div class="stat-label">Revenue (Cleared)</div>
          <div class="stat-value" style="color: var(--clr-veg);">${formatPrice(getTotalClearedRevenue())}</div>
        </div>
        <div class="sub-stat-card">
          <div class="stat-icon" style="background: #FEE2E2; color: #991B1B;">📊</div>
          <div class="stat-label">Outstanding</div>
          <div class="stat-value" style="color: var(--clr-error);">${formatPrice(totalOutstanding)}</div>
        </div>
        <div class="sub-stat-card">
          <div class="stat-icon" style="background: #DBEAFE; color: #1E40AF;">👥</div>
          <div class="stat-label">Subscribers</div>
          <div class="stat-value" style="color: var(--clr-info);">${subs.length}</div>
        </div>
      </div>

      <!-- Search & Add -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; gap: 1rem; flex-wrap: wrap;">
        <div style="position: relative; flex: 1; min-width: 200px; max-width: 400px;">
          <span style="position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: var(--clr-gray-400); pointer-events: none;">🔍</span>
          <input type="text" id="sub-search" class="form-input" placeholder="Search name, phone, or address..." value="${subSearchQuery}" style="padding-left: 2.5rem; padding-right: 2.5rem;">
          <button id="sub-search-clear" style="position: absolute; right: 0.75rem; top: 50%; transform: translateY(-50%); background: none; border: none; color: var(--clr-gray-400); cursor: pointer; font-size: 1.1rem; padding: 2px; line-height: 1; display: ${subSearchQuery ? 'block' : 'none'};">✕</button>
        </div>
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <span id="sub-search-count" style="font-size: 0.8rem; color: var(--clr-gray-500);">${subSearchQuery ? `${filtered.length} of ${subs.length}` : ''}</span>
          <button class="btn btn-primary" id="add-sub-btn" style="white-space: nowrap;">+ New Subscriber</button>
        </div>
      </div>

      <!-- Add Form -->
      ${showAddSubForm ? `
        <div class="add-sub-form">
          <h3>Add New Subscriber</h3>
          <form id="new-sub-form">
            <div class="form-row">
              <div class="form-group" style="margin: 0;">
                <label class="form-label">Full Name</label>
                <input type="text" class="form-input" id="new-sub-name" required placeholder="E.g. Rajesh Kumar">
              </div>
              <div class="form-group" style="margin: 0;">
                <label class="form-label">Phone Number</label>
                <input type="tel" class="form-input" id="new-sub-phone" required placeholder="98XXXXXXXX">
              </div>
              <div class="form-group" style="margin: 0;">
                <label class="form-label">Address</label>
                <input type="text" class="form-input" id="new-sub-address" placeholder="E.g. Vaishali Nagar">
              </div>
            </div>
            <div class="form-actions">
              <button type="button" class="btn btn-ghost" id="cancel-sub-btn">Cancel</button>
              <button type="submit" class="btn btn-primary">Save Subscriber</button>
            </div>
          </form>
        </div>
      ` : ''}

      <!-- Subscriber Cards -->
      <div id="sub-cards-container">
        ${renderSubscriberCards(filtered, subSearchQuery, subs.length)}
      </div>
    </div>
  `;
}

function filterSubscribers(subs, query) {
  if (!query) return subs;
  const q = query.toLowerCase().replace(/[\s\-\+]/g, '');
  return subs.filter(s => {
    const name = s.name.toLowerCase();
    const phone = s.phone.replace(/[\s\-\+]/g, '');
    const address = (s.address || '').toLowerCase();
    return name.includes(q) || phone.includes(q) || address.includes(q);
  });
}

function renderSubscriberCards(filtered, query, totalCount) {
  if (filtered.length === 0) {
    return `
      <div class="empty-state">
        <div class="empty-icon">👥</div>
        <h2>${query ? 'No results found' : 'No subscribers yet'}</h2>
        <p>${query ? `No subscribers match "${query}"` : 'Add your first regular subscriber to start managing monthly billing.'}</p>
        ${!query ? '<button class="btn btn-primary" id="add-sub-btn-empty">+ Add First Subscriber</button>' : ''}
      </div>
    `;
  }

  return `
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem;">
      ${filtered.map(sub => `
        <div class="sub-card" data-sub-id="${sub.userId}">
          <div class="sub-card-header">
            <div style="display: flex; gap: 0.75rem; align-items: center;">
              <div class="sub-avatar">${sub.name.charAt(0).toUpperCase()}</div>
              <div>
                <div class="sub-name">${sub.name}</div>
                <div class="sub-meta">📞 ${formatPhoneNumber(sub.phone)} ${sub.address ? `· 📍 ${sub.address}` : ''}</div>
              </div>
            </div>
            <div class="sub-balance" style="color: ${sub.outstandingBalance > 0 ? 'var(--clr-error)' : 'var(--clr-veg)'};">
              ${formatPrice(sub.outstandingBalance)}
            </div>
          </div>
          <div style="font-size: 0.75rem; color: var(--clr-gray-400); margin-bottom: 0.5rem;">Joined ${new Date(sub.joinedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
          <div class="sub-card-actions">
            <button class="btn btn-sm btn-outline view-sub-btn" data-id="${sub.userId}">View Details</button>
            <button class="btn btn-sm btn-outline quick-add-bill-btn" data-id="${sub.userId}">+ Add Bill</button>
            <button class="btn btn-sm share-sub-btn" data-id="${sub.userId}" style="background: #E6F4EA; color: #1E7E34; border: 1px solid #C2E7CB;">Share</button>
            ${sub.outstandingBalance > 0 ? `
              <button class="btn btn-sm clear-sub-btn" data-id="${sub.userId}" style="background: var(--clr-info); color: white; border: none;">Clear All</button>
            ` : ''}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function updateSubSearchResults(query) {
  const subs = getSubscribers();
  const filtered = filterSubscribers(subs, query);
  const container = document.getElementById('sub-cards-container');
  if (container) {
    container.innerHTML = renderSubscriberCards(filtered, query, subs.length);
  }
  // Update result count
  const countEl = document.getElementById('sub-search-count');
  if (countEl) {
    countEl.textContent = query ? `${filtered.length} of ${subs.length}` : '';
  }
  // Show/hide clear button
  const clearBtn = document.getElementById('sub-search-clear');
  if (clearBtn) {
    clearBtn.style.display = query ? 'block' : 'none';
  }
}

function renderSubscriberDetail() {
  const sub = getSubscribers().find(s => s.userId === selectedSubscriberId);
  if (!sub) {
    selectedSubscriberId = null;
    return renderSubscribersDashboard();
  }

  const pendingCount = sub.billingHistory.filter(h => h.status === 'pending' || h.status === 'pending_price').length;

  return `
    <div class="subscriber-detail page-enter">
      <button class="btn btn-ghost btn-sm" id="back-to-subs-btn" style="margin-bottom: 1rem;">← Back to Subscribers</button>

      <!-- Profile Header -->
      <div style="background: white; border: 1px solid var(--clr-gray-200); border-radius: var(--radius-lg); padding: 1.5rem; margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
        <div style="display: flex; gap: 1rem; align-items: center;">
          <div class="sub-avatar" style="width: 56px; height: 56px; font-size: 1.4rem;">${sub.name.charAt(0).toUpperCase()}</div>
          <div>
            <h2 style="margin: 0; font-size: 1.5rem; color: var(--clr-charcoal);">${sub.name}</h2>
            <div style="display: flex; gap: 1.5rem; color: var(--clr-gray-500); font-size: 0.9rem; margin-top: 4px; flex-wrap: wrap;">
              <span>📞 ${formatPhoneNumber(sub.phone)}</span>
              ${sub.address ? `<span>📍 ${sub.address}</span>` : ''}
            </div>
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 0.75rem; color: var(--clr-gray-500); text-transform: uppercase; letter-spacing: 0.04em;">Outstanding</div>
          <div style="font-size: 2rem; font-weight: 800; color: ${sub.outstandingBalance > 0 ? 'var(--clr-error)' : 'var(--clr-veg)'}; line-height: 1.2;">${formatPrice(sub.outstandingBalance)}</div>
          ${sub.outstandingBalance > 0 ? `<div style="font-size: 0.75rem; color: var(--clr-gray-400); margin-top: 2px;">${pendingCount} pending item${pendingCount !== 1 ? 's' : ''}</div>` : ''}
        </div>
      </div>

      <!-- Actions Row -->
      <div class="sub-detail-actions">
        <div style="background: white; padding: 1.25rem; border-radius: var(--radius-lg); border: 1px solid var(--clr-gray-200);">
          <h3 style="margin-bottom: 1rem; font-size: 1rem; color: var(--clr-charcoal);">Add Bill Item</h3>
          <form id="add-manual-bill-form" data-id="${sub.userId}" style="display: flex; flex-direction: column; gap: 0.75rem;">
            <input type="text" class="form-input" id="manual-bill-desc" placeholder="Description (e.g. Event Catering)" required>
            <div style="display: flex; gap: 0.5rem;">
              <input type="number" class="form-input" id="manual-bill-amount" placeholder="Amount (₹)" step="0.01" required style="flex: 1;">
              <button type="submit" class="btn btn-primary">Add</button>
            </div>
          </form>
        </div>
        <div style="background: var(--clr-gray-50); padding: 1.25rem; border-radius: var(--radius-lg); border: 1px solid var(--clr-gray-200); display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 0.75rem; text-align: center;">
          <p style="font-size: 0.85rem; color: var(--clr-gray-500); margin: 0;">Share balance summary via WhatsApp</p>
          <button class="btn share-sub-btn" data-id="${sub.userId}" style="background: #E6F4EA; color: #1E7E34; border: 1px solid #C2E7CB;">📤 Share on WhatsApp</button>
          ${sub.outstandingBalance > 0 ? `
            <button class="btn btn-sm clear-sub-btn" data-id="${sub.userId}" style="background: var(--clr-info); color: white; border: none; margin-top: 4px;">Clear Full Balance</button>
          ` : ''}
        </div>
      </div>

      <!-- Billing History -->
      <div class="admin-table-container" style="padding: 1.25rem;">
        <h3 style="margin-bottom: 1rem; font-size: 1rem; color: var(--clr-charcoal);">Billing History</h3>
        <table class="admin-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${sub.billingHistory.length === 0 ? `
              <tr><td colspan="4" style="text-align: center; padding: 2.5rem; color: var(--clr-gray-400);">No billing history yet.</td></tr>
            ` : sub.billingHistory.map(h => `
              <tr>
                <td style="white-space: nowrap;">${new Date(h.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                <td>
                  <div style="font-weight: 600;">${h.description || 'Manual Entry'}</div>
                  <div style="font-size: 0.7rem; color: var(--clr-gray-400); font-family: var(--ff-accent);">${h.orderId}</div>
                  ${h.status === 'pending_price' ? `
                    <div style="margin-top: 6px; display: flex; gap: 4px; align-items: center;">
                      <input type="number" class="price-input form-input" data-order-id="${h.orderId}" placeholder="₹ Price" style="width: 90px; padding: 4px 8px; font-size: 0.85rem;">
                      <button class="btn btn-sm btn-primary approve-bill-btn" data-user-id="${sub.userId}" data-order-id="${h.orderId}">Set Price</button>
                    </div>
                  ` : ''}
                </td>
                <td style="font-weight: 700; color: ${h.status === 'pending' || h.status === 'pending_price' ? 'var(--clr-error)' : 'var(--clr-veg)'};">
                  ${h.status === 'pending_price' ? '---' : formatPrice(h.amount)}
                </td>
                <td>
                  <span class="badge ${h.status === 'pending' || h.status === 'pending_price' ? 'badge-warning' : 'badge-success'}">
                    ${h.status === 'pending_price' ? 'Needs Price' : (h.status === 'pending' ? 'Outstanding' : 'Cleared')}
                  </span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ============================================
// ANALYTICS DASHBOARD
// ============================================

function renderAnalyticsDashboard() {
  const allOrders = getAllOrders();
  const subs = getSubscribers();
  const sweetsItems = getSweetsItems();
  const restaurantItems = getRestaurantItems();

  // Revenue calculations
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday - 7 * 86400000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const todayOrders = allOrders.filter(o => new Date(o.createdAt) >= startOfToday);
  const weekOrders = allOrders.filter(o => new Date(o.createdAt) >= startOfWeek);
  const monthOrders = allOrders.filter(o => new Date(o.createdAt) >= startOfMonth);

  const todayRevenue = todayOrders.filter(o => o.status === 'delivered').reduce((s, o) => s + o.total, 0);
  const weekRevenue = weekOrders.filter(o => o.status === 'delivered').reduce((s, o) => s + o.total, 0);
  const monthRevenue = monthOrders.filter(o => o.status === 'delivered').reduce((s, o) => s + o.total, 0);
  const totalRevenue = allOrders.filter(o => o.status === 'delivered').reduce((s, o) => s + o.total, 0) + getTotalClearedRevenue();

  // Popular items (from all orders)
  const itemCounts = {};
  allOrders.forEach(o => {
    (o.items || []).forEach(item => {
      if (!itemCounts[item.name]) itemCounts[item.name] = { name: item.name, qty: 0, revenue: 0 };
      itemCounts[item.name].qty += item.quantity;
      itemCounts[item.name].revenue += item.price * item.quantity;
    });
  });
  const topItems = Object.values(itemCounts).sort((a, b) => b.qty - a.qty).slice(0, 10);

  // Order status breakdown
  const statusCounts = { pending: 0, accepted: 0, delivered: 0, cancelled: 0 };
  allOrders.forEach(o => { if (statusCounts[o.status] !== undefined) statusCounts[o.status]++; });

  // Daily orders for last 7 days
  const dailyData = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date(startOfToday - i * 86400000);
    const dayEnd = new Date(day.getTime() + 86400000);
    const dayOrders = allOrders.filter(o => {
      const d = new Date(o.createdAt);
      return d >= day && d < dayEnd;
    });
    dailyData.push({
      label: day.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      orders: dayOrders.length,
      revenue: dayOrders.filter(o => o.status === 'delivered').reduce((s, o) => s + o.total, 0),
    });
  }
  const maxDailyOrders = Math.max(...dailyData.map(d => d.orders), 1);

  return `
    <div class="analytics-dashboard page-enter">
      <!-- Revenue Stats -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
        <div class="sub-stat-card">
          <div class="stat-icon" style="background: #D1FAE5; color: #065F46;">💰</div>
          <div class="stat-label">Today</div>
          <div class="stat-value" style="color: var(--clr-veg); font-size: 1.4rem;">${formatPrice(todayRevenue)}</div>
          <div style="font-size: 0.75rem; color: var(--clr-gray-500); margin-top: 4px;">${todayOrders.length} orders</div>
        </div>
        <div class="sub-stat-card">
          <div class="stat-icon" style="background: #DBEAFE; color: #1E40AF;">📅</div>
          <div class="stat-label">This Week</div>
          <div class="stat-value" style="color: var(--clr-info); font-size: 1.4rem;">${formatPrice(weekRevenue)}</div>
          <div style="font-size: 0.75rem; color: var(--clr-gray-500); margin-top: 4px;">${weekOrders.length} orders</div>
        </div>
        <div class="sub-stat-card">
          <div class="stat-icon" style="background: #FEF3C7; color: #92400E;">📊</div>
          <div class="stat-label">This Month</div>
          <div class="stat-value" style="color: var(--clr-saffron); font-size: 1.4rem;">${formatPrice(monthRevenue)}</div>
          <div style="font-size: 0.75rem; color: var(--clr-gray-500); margin-top: 4px;">${monthOrders.length} orders</div>
        </div>
        <div class="sub-stat-card">
          <div class="stat-icon" style="background: #F3E8FF; color: #6B21A8;">🏆</div>
          <div class="stat-label">All Time</div>
          <div class="stat-value" style="color: #7C3AED; font-size: 1.4rem;">${formatPrice(totalRevenue)}</div>
          <div style="font-size: 0.75rem; color: var(--clr-gray-500); margin-top: 4px;">${allOrders.length} total orders</div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 2rem;">
        <!-- Orders Chart (last 7 days) -->
        <div style="background: white; border: 1px solid var(--clr-gray-200); border-radius: var(--radius-lg); padding: 1.25rem;">
          <h3 style="font-size: 1rem; color: var(--clr-charcoal); margin-bottom: 1rem;">Orders — Last 7 Days</h3>
          <div style="display: flex; align-items: flex-end; gap: 6px; height: 120px;">
            ${dailyData.map(d => `
              <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px;">
                <div style="font-size: 0.65rem; font-weight: 700; color: var(--clr-saffron);">${d.orders}</div>
                <div style="width: 100%; background: var(--clr-saffron); border-radius: 4px 4px 0 0; height: ${Math.max((d.orders / maxDailyOrders) * 100, 4)}px; min-height: 4px; transition: height 0.3s ease;"></div>
                <div style="font-size: 0.6rem; color: var(--clr-gray-500); white-space: nowrap;">${d.label}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Order Status Breakdown -->
        <div style="background: white; border: 1px solid var(--clr-gray-200); border-radius: var(--radius-lg); padding: 1.25rem;">
          <h3 style="font-size: 1rem; color: var(--clr-charcoal); margin-bottom: 1rem;">Order Status</h3>
          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            ${Object.entries(statusCounts).map(([status, count]) => {
              const pct = allOrders.length ? Math.round(count / allOrders.length * 100) : 0;
              const color = status === 'delivered' ? '#2ECC71' : status === 'pending' ? '#F39C12' : status === 'accepted' ? '#3498DB' : '#E74C3C';
              return `
                <div>
                  <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 4px;">
                    <span style="text-transform: capitalize; font-weight: 600;">${status}</span>
                    <span style="color: var(--clr-gray-500);">${count} (${pct}%)</span>
                  </div>
                  <div style="height: 8px; background: var(--clr-gray-100); border-radius: 4px; overflow: hidden;">
                    <div style="height: 100%; width: ${pct}%; background: ${color}; border-radius: 4px; transition: width 0.5s ease;"></div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>

      <!-- Popular Items -->
      <div style="background: white; border: 1px solid var(--clr-gray-200); border-radius: var(--radius-lg); padding: 1.25rem; margin-bottom: 2rem;">
        <h3 style="font-size: 1rem; color: var(--clr-charcoal); margin-bottom: 1rem;">Top Selling Items</h3>
        ${topItems.length === 0 ? `
          <p style="color: var(--clr-gray-400); text-align: center; padding: 1.5rem;">No order data yet.</p>
        ` : `
          <div class="admin-table-container">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Item</th>
                  <th>Qty Sold</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                ${topItems.map((item, i) => `
                  <tr>
                    <td style="font-weight: 700; color: ${i < 3 ? 'var(--clr-saffron)' : 'var(--clr-gray-500)'};">${i + 1}</td>
                    <td style="font-weight: 600;">${item.name}</td>
                    <td>${item.qty}</td>
                    <td style="font-weight: 700;">${formatPrice(item.revenue)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>

      <!-- Business Summary -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
        <div style="background: white; border: 1px solid var(--clr-gray-200); border-radius: var(--radius-lg); padding: 1.25rem; text-align: center;">
          <div style="font-size: 0.8rem; color: var(--clr-gray-500); text-transform: uppercase; margin-bottom: 0.5rem;">Menu Items</div>
          <div style="font-size: 1.75rem; font-weight: 800; color: var(--clr-charcoal);">${sweetsItems.length + restaurantItems.length}</div>
          <div style="font-size: 0.75rem; color: var(--clr-gray-400);">${sweetsItems.length} sweets · ${restaurantItems.length} restaurant</div>
        </div>
        <div style="background: white; border: 1px solid var(--clr-gray-200); border-radius: var(--radius-lg); padding: 1.25rem; text-align: center;">
          <div style="font-size: 0.8rem; color: var(--clr-gray-500); text-transform: uppercase; margin-bottom: 0.5rem;">Subscribers</div>
          <div style="font-size: 1.75rem; font-weight: 800; color: var(--clr-charcoal);">${subs.length}</div>
          <div style="font-size: 0.75rem; color: var(--clr-gray-400);">${formatPrice(subs.reduce((s, sub) => s + (sub.outstandingBalance || 0), 0))} outstanding</div>
        </div>
        <div style="background: white; border: 1px solid var(--clr-gray-200); border-radius: var(--radius-lg); padding: 1.25rem; text-align: center;">
          <div style="font-size: 0.8rem; color: var(--clr-gray-500); text-transform: uppercase; margin-bottom: 0.5rem;">Avg Order Value</div>
          <div style="font-size: 1.75rem; font-weight: 800; color: var(--clr-charcoal);">
            ${allOrders.filter(o => o.status === 'delivered').length > 0
              ? formatPrice(totalRevenue / allOrders.filter(o => o.status === 'delivered').length)
              : formatPrice(0)}
          </div>
          <div style="font-size: 0.75rem; color: var(--clr-gray-400);">per delivered order</div>
        </div>
      </div>
    </div>
  `;
}

// ============================================
// OFFLINE ORDER HELPERS
// ============================================

function renderOfflineSearchResultsHTML() {
  if (!offlineSearchQuery) return `<div style="text-align: center; color: var(--clr-gray-400); padding: 1rem;">Start typing to search items...</div>`;

  const allItems = [...getSweetsItems(), ...getRestaurantItems()];
  const filtered = allItems.filter(i => i.name.toLowerCase().includes(offlineSearchQuery));

  if (filtered.length === 0) return `<div style="text-align: center; color: var(--clr-gray-400); padding: 1rem;">No items found matching "${offlineSearchQuery}"</div>`;

  return filtered.map(i => `
    <div style="padding: 0.75rem; border: 1px solid var(--clr-gray-100); border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <div style="font-weight: 600;">${i.name}</div>
        <div style="font-size: 0.85rem; color: var(--clr-gray-500);">${formatPrice(i.price)} / ${i.unit}</div>
      </div>
      <button class="add-offline-item btn btn-outline btn-sm" data-item="${encodeURIComponent(JSON.stringify(i))}" style="padding: 4px 12px; height: auto;">Add</button>
    </div>
  `).join('');
}

function renderOfflineSearchResults() {
  const container = document.getElementById('offline-search-results');
  if (container) container.innerHTML = renderOfflineSearchResultsHTML();
}

function addOfflineItem(product) {
  const existing = offlineCart.find(i => i.id === product.id);
  if (existing) {
    existing.quantity++;
  } else {
    offlineCart.push({ ...product, quantity: 1 });
  }
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

function updateOfflineQty(id, delta) {
  const item = offlineCart.find(i => i.id === id);
  if (item) {
    item.quantity = Math.max(1, item.quantity + delta);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }
}

function removeOfflineItem(id) {
  offlineCart = offlineCart.filter(i => i.id !== id);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

function renderEditOrderModal(order) {
  if (!order) return '';
  const allProducts = [...getSweetsItems(), ...getRestaurantItems()];

  return `
    <div class="modal-backdrop" id="edit-items-modal">
      <div class="modal-content" style="width: 90%; max-width: 800px; padding: 1.5rem;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1.5rem; border-bottom: 1px solid var(--clr-gray-200); padding-bottom: 1rem;">
          <h2 style="color: var(--clr-primary);">✏️ Edit Order ${order.orderId}</h2>
          <button class="btn btn-ghost" id="close-edit-items" style="font-size: 1.5rem; padding: 0;">✕</button>
        </div>

        <div class="edit-modal-grid">
          <!-- Left: Current Items -->
          <div>
            <h3 style="font-size: 1rem; margin-bottom: 1rem;">Current Items</h3>
            <div id="edit-order-items-list" style="display: flex; flex-direction: column; gap: 0.75rem;">
              ${order.items.map((item, index) => `
                <div style="display: flex; justify-content: space-between; align-items: center; background: var(--clr-gray-50); padding: 0.75rem; border-radius: 8px; border: 1px solid var(--clr-gray-200);">
                  <div style="flex: 1;">
                    <div style="font-weight: 600;">${item.name} ${item.unit ? `<span style="font-size: 0.75rem; color: var(--clr-gray-500);">(${item.unit})</span>` : ''}</div>
                    <div style="font-size: 0.85rem; color: var(--clr-gray-600);">${formatPrice(item.price)}</div>
                  </div>
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="display: flex; align-items: center; background: white; border-radius: 4px; border: 1px solid var(--clr-gray-300);">
                      <button class="minus-edit-item" data-index="${index}" style="padding: 2px 8px; border: none; background: none; cursor: pointer;">-</button>
                      <span style="padding: 0 8px; font-weight: 700;">${item.quantity}</span>
                      <button class="plus-edit-item" data-index="${index}" style="padding: 2px 8px; border: none; background: none; cursor: pointer;">+</button>
                    </div>
                    <button class="remove-edit-item" data-index="${index}" style="background: none; border: none; color: var(--clr-error); cursor: pointer; font-size: 1.1rem;">🗑️</button>
                  </div>
                </div>
              `).join('')}
            </div>
            
            <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 2px dashed var(--clr-gray-200);">
              <h3 style="font-size: 1rem; margin-bottom: 0.5rem; color: var(--clr-saffron-dark);">📝 Admin Note / Reason for edit</h3>
              <p style="font-size: 0.8rem; color: var(--clr-gray-500); margin-bottom: 0.75rem;">This message will be shown to the customer in their "My Orders" section.</p>
              <textarea id="edit-order-comment" class="form-input" rows="2" placeholder="Ex: Added extra pieces as requested, Price adjusted for weight variation..." style="font-size: 0.9rem;">${order.adminComment || ''}</textarea>
            </div>

            <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--clr-gray-200); display: flex; justify-content: space-between; align-items: center;">
              <span style="font-weight: 700; font-size: 1.1rem;">Estimated Total:</span>
              <span style="font-size: 1.5rem; font-weight: 800; color: var(--clr-saffron);">${formatPrice(order.total)}</span>
            </div>
          </div>

          <!-- Right: Add New Items -->
          <div>
            <h3 style="font-size: 1rem; margin-bottom: 1rem;">Add Items</h3>
            <input type="text" id="edit-item-search" class="form-input" placeholder="Search menu..." style="margin-bottom: 1rem;">
            <div id="edit-item-search-results" style="max-height: 300px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.5rem;">
              ${allProducts.slice(0, 5).map(p => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; border: 1px solid var(--clr-gray-100); border-radius: 6px; font-size: 0.9rem;">
                  <div>
                    <div style="font-weight: 600;">${p.name}</div>
                    <div style="font-size: 0.8rem; color: var(--clr-gray-500);">${formatPrice(p.price)}</div>
                  </div>
                  <button class="btn btn-sm btn-outline add-suggested-item" data-item="${encodeURIComponent(JSON.stringify(p))}" style="padding: 2px 8px; height: auto;">Add</button>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <div style="margin-top: 2rem; display: flex; justify-content: flex-end; gap: 1rem;">
          <button class="btn btn-ghost" id="cancel-edit-items">Cancel</button>
          <button class="btn btn-primary" id="save-edit-items" style="padding: 0.75rem 2rem;">Save Changes</button>
        </div>
      </div>
    </div>
  `;
}


