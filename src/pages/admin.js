// ============================================
// ADMIN PAGE
// Item/price management dashboard
// ============================================

import { 
  adminLogin, isAdminLoggedIn, adminLogout, 
  getSweetsItems, getRestaurantItems, 
  updateItem, addItem, deleteItem, resetToDefaults 
} from '../services/admin.js';
import { formatPrice, getTodayDate } from '../utils/format.js';
import { 
  showToast, unescapeForText, showConfirm
} from '../utils/dom.js';
import { compressImageToDataURL } from '../utils/image.js';
import { getAllOrders, updateOrderStatus } from '../services/orders.js';
import { getAllUsersCount } from '../services/auth.js';

let mainTab = 'menu'; // 'menu' or 'orders'
let activeTab = 'sweets';
let orderFilter = 'all'; // 'all', 'pending', 'delivered', 'cancelled'
let showAddForm = false;
let editingItemId = null;
let offlineCart = [];
let offlineSearchQuery = '';

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

          <div style="display: flex; gap: 1rem; margin-bottom: 2rem; border-bottom: 1px solid var(--clr-gray-200); padding-bottom: 1rem; flex-wrap: wrap;">
            <button class="badge-tab ${mainTab === 'menu' ? 'active' : ''}" data-main-tab="menu" style="${mainTab === 'menu' ? 'background: var(--clr-saffron); color: white;' : 'background: transparent; color: var(--clr-gray-600);'} border: none; font-size: 1.1rem; padding: 0.5rem 1rem; border-radius: var(--radius-md); font-weight: 600; cursor: pointer; transition: all 0.2s;">
              📋 Menu Management
            </button>
            <button class="badge-tab ${mainTab === 'orders' ? 'active' : ''}" data-main-tab="orders" style="${mainTab === 'orders' ? 'background: var(--clr-saffron); color: white;' : 'background: transparent; color: var(--clr-gray-600);'} border: none; font-size: 1.1rem; padding: 0.5rem 1rem; border-radius: var(--radius-md); font-weight: 600; cursor: pointer; transition: all 0.2s;">
              📦 Order Tracking
            </button>
            <button class="badge-tab ${mainTab === 'offline' ? 'active' : ''}" data-main-tab="offline" style="${mainTab === 'offline' ? 'background: var(--clr-saffron); color: white;' : 'background: transparent; color: var(--clr-gray-600);'} border: none; font-size: 1.1rem; padding: 0.5rem 1rem; border-radius: var(--radius-md); font-weight: 600; cursor: pointer; transition: all 0.2s;">
              ➕ Offline Order
            </button>
          </div>

          ${(() => {
            if (mainTab === 'menu') return renderMenuManagement();
            if (mainTab === 'orders') return renderOrdersDashboard();
            if (mainTab === 'offline') return renderOfflineOrderForm();
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
  
  // Calculate Insights
  const deliveredOrders = allOrders.filter(o => o.status === 'delivered');
  const totalRevenue = deliveredOrders.reduce((sum, o) => sum + o.total, 0);
  const activeOrdersCount = allOrders.filter(o => o.status === 'pending' || o.status === 'accepted').length;

  let filteredOrders = allOrders;
  if (orderFilter !== 'all') {
    filteredOrders = allOrders.filter(o => o.status === orderFilter);
  }

  const getStatusColor = (status) => {
    switch(status) {
      case 'pending': return 'background:#FFF3CD; color:#856404; border:1px solid #FFEEBA;';
      case 'accepted': return 'background:#D1ECF1; color:#0C5460; border:1px solid #BEE5EB;';
      case 'delivered': return 'background:#D4EDDA; color:#155724; border:1px solid #C3E6CB;';
      case 'cancelled': return 'background:#F8D7DA; color:#721C24; border:1px solid #F5C6CB;';
      default: return 'background:#E2E3E5; color:#383D41; border:1px solid #D6D8DB;';
    }
  };

  return `
    <!-- Insights Row -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
      <div style="background: white; border: 1px solid var(--clr-gray-200); border-radius: var(--radius-lg); padding: 1.5rem; box-shadow: var(--shadow-sm); display:flex; align-items:center; gap: 1rem;">
        <div style="font-size: 2.5rem; background: rgba(46, 204, 113, 0.1); border-radius: var(--radius-md); width: 60px; height: 60px; display:flex; align-items:center; justify-content:center;">💰</div>
        <div>
          <div style="font-size: 0.85rem; color: var(--clr-gray-500); text-transform: uppercase; font-weight: 600;">Total Revenue</div>
          <div style="font-size: 1.5rem; font-weight: 800; color: var(--clr-gray-900);">${formatPrice(totalRevenue)}</div>
        </div>
      </div>
      <div style="background: white; border: 1px solid var(--clr-gray-200); border-radius: var(--radius-lg); padding: 1.5rem; box-shadow: var(--shadow-sm); display:flex; align-items:center; gap: 1rem;">
        <div style="font-size: 2.5rem; background: rgba(52, 152, 219, 0.1); border-radius: var(--radius-md); width: 60px; height: 60px; display:flex; align-items:center; justify-content:center;">📦</div>
        <div>
          <div style="font-size: 0.85rem; color: var(--clr-gray-500); text-transform: uppercase; font-weight: 600;">Active Orders</div>
          <div style="font-size: 1.5rem; font-weight: 800; color: var(--clr-gray-900);">${activeOrdersCount}</div>
        </div>
      </div>
      <div style="background: white; border: 1px solid var(--clr-gray-200); border-radius: var(--radius-lg); padding: 1.5rem; box-shadow: var(--shadow-sm); display:flex; align-items:center; gap: 1rem;">
        <div style="font-size: 2.5rem; background: rgba(155, 89, 182, 0.1); border-radius: var(--radius-md); width: 60px; height: 60px; display:flex; align-items:center; justify-content:center;">👥</div>
        <div>
          <div style="font-size: 0.85rem; color: var(--clr-gray-500); text-transform: uppercase; font-weight: 600;">Total Users</div>
          <div style="font-size: 1.5rem; font-weight: 800; color: var(--clr-gray-900);">${totalUsers}</div>
        </div>
      </div>
    </div>

    <!-- Orders Filter -->
    <div style="display:flex; gap: 0.5rem; margin-bottom: 1.5rem; flex-wrap: wrap;">
      ${['all', 'pending', 'accepted', 'delivered', 'cancelled'].map(filter => `
        <button class="order-filter-btn ${orderFilter === filter ? 'active' : ''}" data-filter="${filter}" style="padding: 0.4rem 1rem; border-radius: var(--radius-full); border: 1px solid var(--clr-gray-300); background: ${orderFilter === filter ? 'var(--clr-saffron)' : 'white'}; color: ${orderFilter === filter ? 'white' : 'var(--clr-gray-700)'}; font-size: 0.85rem; cursor: pointer; font-weight: 500; text-transform: capitalize;">
          ${filter}
        </button>
      `).join('')}
    </div>

    <!-- Orders Table -->
    <div class="admin-table-wrapper">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Order ID / Date</th>
            <th>Customer Info</th>
            <th>Items</th>
            <th>Total Value</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${filteredOrders.length === 0 ? `<tr><td colspan="5" style="text-align:center; padding: 2rem; color: var(--clr-gray-500);">No orders found for this filter.</td></tr>` : 
            filteredOrders.map(order => `
            <tr>
              <td>
                <div style="font-family: var(--ff-accent); font-weight: 700; color: var(--clr-saffron); margin-bottom: 4px; font-size: 0.9rem; display: flex; align-items: center; gap: 8px;">
                  ${order.orderId}
                  ${order.isOffline ? `
                    <span style="background: var(--clr-gray-200); color: var(--clr-gray-700); font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.05em; font-family: sans-serif; font-weight: 700;">
                      🏪 Offline
                    </span>
                  ` : ''}
                </div>
                <div style="font-size: 0.8rem; color: var(--clr-gray-500);">${new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour:'2-digit', minute:'2-digit' })}</div>
              </td>
              <td>
                <div style="font-weight: 600; margin-bottom: 3px;">${order.customerName}</div>
                <div style="display:flex; align-items:center; gap:10px; margin-top: 4px;">
                  <div style="font-size: 0.85rem; color: var(--clr-gray-600);">📞 <a href="tel:${order.customerPhone}" style="color:var(--clr-info); text-decoration:none;">${order.customerPhone}</a></div>
                  
                  ${order.customerPhone && order.customerPhone !== 'N/A' && !order.isOffline ? `
                    <a href="https://wa.me/${order.customerPhone.replace(/[\s\-\+]/g, '').replace(/^91/, '91')}?text=${encodeURIComponent(`Hello ${order.customerName}, regarding your order ${order.orderId} from Shree Shyam Restaurant...`)}" 
                       target="_blank" 
                       class="btn btn-sm" 
                       style="background:#FFF4E6; color:#D35400; border:1px solid #FFD8A8; padding: 4px 12px; font-size: 0.8rem; display:inline-flex; align-items:center; gap:6px; border-radius:var(--radius-md); text-decoration:none; font-weight:700; margin-top:8px; transition: all 0.2s;">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.246 2.248 3.484 5.232 3.484 8.412-.003 6.557-5.338 11.892-11.893 11.892-1.997-.001-3.951-.5-5.688-1.448l-6.309 1.656zm6.29-4.143c1.552.921 3.13 1.411 4.793 1.412 5.204 0 9.444-4.24 9.446-9.443.002-2.521-.979-4.89-2.762-6.67s-4.149-2.765-6.67-2.765c-5.204 0-9.441 4.239-9.443 9.441-.001 1.742.483 3.339 1.398 4.71l-1.01 3.693 3.791-.994zm11.367-7.4c-.31-.154-1.829-.902-2.107-1.003-.278-.101-.48-.153-.68.154-.201.307-.779 1.003-.955 1.205-.175.202-.351.226-.66.073-.31-.153-1.309-.482-2.493-1.54-.92-.821-1.54-1.835-1.72-2.144-.18-.309-.019-.476.136-.629.139-.138.309-.36.464-.54.154-.18.206-.309.309-.515.103-.206.052-.386-.025-.54-.077-.154-.68-1.644-.932-2.253-.245-.592-.495-.511-.68-.521-.176-.009-.379-.011-.581-.011-.202 0-.531.076-.809.381-.278.305-1.062 1.039-1.062 2.535s1.087 2.941 1.239 3.146c.152.206 2.14 3.268 5.184 4.582 2.534 1.095 3.048.877 3.603.824.555-.053 1.829-.747 2.087-1.468.258-.721.258-1.339.181-1.468-.076-.128-.278-.206-.587-.36z"/></svg>
                      Chat
                    </a>
                  ` : ''}
                </div>
                <div style="font-size: 0.85rem; color: var(--clr-gray-600); margin-top:2px;">
                  🗓️ Pickup: <strong style="color:var(--clr-veg);">${order.pickupDate}</strong> 
                  <span style="margin-left: 8px; font-weight: 700; color: var(--clr-saffron);">⏰ ${order.pickupTime || 'No slot'}</span>
                </div>
              </td>
              <td>
                <div style="max-height: 80px; overflow-y: auto; padding-right: 8px;">
                  ${order.items.map(i => `<div style="font-size: 0.85rem; margin-bottom: 2px; color:var(--clr-gray-700); white-space:nowrap; text-overflow:ellipsis; overflow:hidden;">${i.quantity}× ${i.name}</div>`).join('')}
                </div>
              </td>
              <td>
                <div style="font-weight: 700; font-size: 1.05rem;">${formatPrice(order.total)}</div>
                <div style="font-size: 0.75rem; color: var(--clr-gray-500); margin-top: 3px;">${order.paymentMethod}</div>
              </td>
              <td style="min-width: 150px;">
                <select class="form-input status-select" data-id="${order.orderId}" style="${getStatusColor(order.status)}; font-weight: 600; text-transform: capitalize; padding: 6px 10px;">
                  ${['pending', 'accepted', 'delivered', 'cancelled'].map(opt => `
                    <option value="${opt}" ${order.status === opt ? 'selected' : ''} style="background: white; color: black;">${opt}</option>
                  `).join('')}
                </select>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
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

  // Main Tab switching (Menu vs Orders)
  document.querySelectorAll('.badge-tab[data-main-tab]').forEach(tab => {
    tab.addEventListener('click', () => {
      mainTab = tab.dataset.mainTab;
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

  // Order Filters switching
  document.querySelectorAll('.order-filter-btn[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      orderFilter = btn.dataset.filter;
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
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

  // Main Tab Switcher
  document.querySelectorAll('.badge-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      mainTab = btn.dataset.mainTab;
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
  });

  // Offline Order Form Handlers
  if (mainTab === 'offline') {
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

    // Place Offline Order
    document.getElementById('place-offline-order-btn')?.addEventListener('click', () => {
      if (offlineCart.length === 0) {
        showToast('Cart is empty', 'error');
        return;
      }
      const name = document.getElementById('offline-customer-name').value;
      const phone = document.getElementById('offline-customer-phone').value;
      const pickupDate = document.getElementById('offline-pickup-date').value;
      const pickupTime = document.getElementById('offline-pickup-time').value;
      const notes = document.getElementById('offline-order-notes').value;
      
      const { createOfflineOrder } = import.meta.glob('../services/orders.js', { eager: true })['../services/orders.js'];
      const result = createOfflineOrder(offlineCart, { name, phone, pickupDate, pickupTime, notes });
      if (result.success) {
        showToast('Offline order created!', 'success');
        offlineCart = [];
        mainTab = 'orders';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      }
    });
  }
}

function renderOfflineOrderForm() {
  const total = offlineCart.reduce((s, i) => s + (i.price * i.quantity), 0);
  
  return `
    <div class="offline-order-container" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem;">
      <!-- Left: Item Selector -->
      <div style="background: white; padding: 1.5rem; border-radius: var(--radius-lg); border: 1px solid var(--clr-gray-200);">
        <h2 style="margin-bottom: 1rem; font-size: 1.25rem;">🔍 Select Items</h2>
        <div class="form-group">
          <input type="text" class="form-input" id="offline-product-search" placeholder="Search by name..." value="${offlineSearchQuery}">
        </div>
        <div id="offline-search-results" style="max-height: 400px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.5rem; margin-top: 1rem;">
          ${renderOfflineSearchResultsHTML()}
        </div>
      </div>

      <!-- Right: Builder Cart -->
      <div style="background: white; padding: 1.5rem; border-radius: var(--radius-lg); border: 1px solid var(--clr-gray-200); display: flex; flex-direction: column; gap: 1.5rem;">
        <h2 style="margin-bottom: 0.5rem; font-size: 1.25rem;">📦 Order Details</h2>
        
        <div class="offline-cart" style="flex: 1;">
          ${offlineCart.length === 0 ? `
            <div style="text-align: center; padding: 2rem; color: var(--clr-gray-400); border: 2px dashed var(--clr-gray-100); border-radius: 8px;">
              Cart is empty. Add items from the left.
            </div>
          ` : `
            <div id="offline-cart-items" style="display: flex; flex-direction: column; gap: 0.75rem;">
              ${offlineCart.map(i => `
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--clr-gray-50); padding-bottom: 0.5rem;">
                  <div>
                    <div style="font-weight: 600;">${i.name}</div>
                    <div style="font-size: 0.8rem; color: var(--clr-gray-500);">${formatPrice(i.price)}</div>
                  </div>
                  <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <div class="qty-selector" style="height: 32px; padding: 2px;">
                      <button class="qty-btn qty-minus" data-id="${i.id}">−</button>
                      <span class="qty-value" style="font-size: 0.9rem;">${i.quantity}</span>
                      <button class="qty-btn qty-plus" data-id="${i.id}">+</button>
                    </div>
                    <button class="remove-item" data-id="${i.id}" style="background: none; border: none; color: var(--clr-error); cursor: pointer; padding: 4px;">✕</button>
                  </div>
                </div>
              `).join('')}
              <div style="margin-top: 1rem; border-top: 2px solid var(--clr-gray-100); padding-top: 1rem; display: flex; justify-content: space-between; font-weight: 800; font-size: 1.25rem;">
                <span>Total Amount:</span>
                <span>${formatPrice(total)}</span>
              </div>
            </div>
          `}
        </div>

        <div class="offline-customer-info" style="display: flex; flex-direction: column; gap: 1rem; border-top: 1px solid var(--clr-gray-100); padding-top: 1.5rem;">
          <div class="form-group">
            <label class="form-label">Customer Name</label>
            <input type="text" class="form-input" id="offline-customer-name" placeholder="E.g. Mr. Sharma">
          </div>
          <div class="form-group">
            <label class="form-label">Customer Phone (Optional)</label>
            <input type="tel" class="form-input" id="offline-customer-phone" placeholder="98XXXXXXXX">
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="form-group">
              <label class="form-label">📅 Pickup Date</label>
              <input type="date" class="form-input" id="offline-pickup-date" min="${getTodayDate()}" value="${getTodayDate()}">
            </div>
            <div class="form-group">
              <label class="form-label">⏰ Time Slot</label>
              <select class="form-input" id="offline-pickup-time">
                <option value="10:00 AM - 02:00 PM">10:00 AM - 02:00 PM</option>
                <option value="02:00 PM - 06:00 PM">02:00 PM - 06:00 PM</option>
                <option value="06:00 PM - 10:00 PM">06:00 PM - 10:00 PM</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Internal Notes</label>
            <textarea class="form-input" id="offline-order-notes" placeholder="Any special instructions..."></textarea>
          </div>
          <button class="btn btn-primary" id="place-offline-order-btn" style="width: 100%; margin-top: 0.5rem;">
            ✅ Confirm & Create Order
          </button>
        </div>
      </div>
    </div>
  `;
}

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
