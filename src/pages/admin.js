// ============================================
// ADMIN PAGE
// Item/price management dashboard
// ============================================

import { 
  adminLogin, isAdminLoggedIn, adminLogout, 
  getSweetsItems, getRestaurantItems, 
  updateItem, addItem, deleteItem, resetToDefaults 
} from '../services/admin.js';
import { formatPrice } from '../utils/format.js';
import { 
  showToast, unescapeForText, showConfirm
} from '../utils/dom.js';

let activeTab = 'sweets';
let showAddForm = false;
let editingItemId = null;

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
  const items = activeTab === 'sweets' ? getSweetsItems() : getRestaurantItems();

  return `
    <main class="page-content page-enter">
      <section class="section admin-page">
        <div class="container">
          <div class="admin-header">
            <div>
              <h1 style="font-size:var(--fs-h2);">⚙️ Admin Dashboard</h1>
              <p style="color:var(--clr-gray-500);">Manage items, prices, and availability</p>
            </div>
            <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
              <button class="btn btn-outline btn-sm" id="admin-add-btn">
                ➕ Add Item
              </button>
              <button class="btn btn-ghost btn-sm" id="admin-reset-btn">
                🔄 Reset to Defaults
              </button>
              <button class="btn btn-ghost btn-sm" id="admin-logout-btn" style="color:var(--clr-error);">
                🚪 Logout
              </button>
            </div>
          </div>

          <!-- Tab Switcher -->
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
        </div>
      </section>
    </main>
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
        <div class="form-group">
          <label class="form-label">Description</label>
          <textarea class="form-input" id="new-item-desc" rows="2" maxlength="500" placeholder="Item description"></textarea>
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
        </div>
        <div style="display:flex;gap:0.5rem;">
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
            <div class="form-hint" style="margin-top:0.25rem;">Provide an absolute URL or a path relative to the site root.</div>
          </div>
          <div class="form-group">
            <img src="${item.image}" alt="Preview" style="height:60px; object-fit:contain; border-radius:var(--radius-sm); border:1px solid var(--clr-gray-200); background:#fff;">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Description</label>
          <textarea class="form-input" id="edit-item-desc" rows="2" maxlength="500">${item.description || ''}</textarea>
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
        <div style="display:flex;gap:0.5rem;">
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

  // Tab switching
  document.querySelectorAll('.category-tab[data-tab]').forEach(tab => {
    tab.addEventListener('click', () => {
      activeTab = tab.dataset.tab;
      window.dispatchEvent(new HashChangeEvent('hashchange'));
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
}
