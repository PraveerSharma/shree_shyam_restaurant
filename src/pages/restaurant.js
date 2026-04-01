// ============================================
// RESTAURANT (DINE-IN) PAGE
// Category tabs + e-commerce grid
// ============================================

import { getRestaurantItems } from '../services/admin.js';
import { RESTAURANT_CATEGORIES } from '../config/restaurant-data.js';
import { renderProductsGrid } from '../components/product-card.js';
import { getCartCount, getCartTotal } from '../services/cart.js';
import { formatPrice } from '../utils/format.js';
import { debounce } from '../utils/dom.js';

let currentCategory = 'all';
let currentSort = 'default';
let searchQuery = '';

function getFilteredProducts() {
  let products = getRestaurantItems();
  
  if (currentCategory !== 'all') {
    products = products.filter(p => p.category === currentCategory);
  }
  
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    products = products.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.description.toLowerCase().includes(q)
    );
  }
  
  if (currentSort === 'price-low') {
    products.sort((a, b) => a.price - b.price);
  } else if (currentSort === 'price-high') {
    products.sort((a, b) => b.price - a.price);
  } else if (currentSort === 'name') {
    products.sort((a, b) => a.name.localeCompare(b.name));
  }
  
  return products;
}

export function renderRestaurantPage() {
  const cartCount = getCartCount();
  const cartTotal = getCartTotal();

  return `
    <main class="page-content page-enter">
      <section class="section shop-page">
        <div class="container">
          <div class="shop-page-header">
            <h1>Restaurant Menu</h1>
            <p>Authentic North Indian vegetarian dishes, freshly prepared with love</p>
            <div class="divider"></div>
          </div>

          <!-- Category Tabs -->
          <div class="category-tabs" id="rest-category-tabs">
            ${RESTAURANT_CATEGORIES.map(cat => `
              <button class="category-tab ${currentCategory === cat.id ? 'active' : ''}" 
                      data-category="${cat.id}">
                ${cat.name}
              </button>
            `).join('')}
          </div>

          <!-- Filter Bar -->
          <div class="filter-bar">
            <div class="search-input-wrapper">
              <span class="search-icon">🔍</span>
              <input type="text" class="search-input" id="rest-search" 
                     placeholder="Search dishes..." 
                     value="${searchQuery}"
                     maxlength="100"
                     aria-label="Search dishes">
            </div>
            <select class="filter-select" id="rest-sort" aria-label="Sort by">
              <option value="default" ${currentSort === 'default' ? 'selected' : ''}>Sort by: Default</option>
              <option value="price-low" ${currentSort === 'price-low' ? 'selected' : ''}>Price: Low to High</option>
              <option value="price-high" ${currentSort === 'price-high' ? 'selected' : ''}>Price: High to Low</option>
              <option value="name" ${currentSort === 'name' ? 'selected' : ''}>Name: A to Z</option>
            </select>
          </div>

          <!-- Products Grid -->
          <div class="products-grid" id="rest-products-grid"></div>
        </div>
      </section>

      ${cartCount > 0 ? `
        <div class="cart-summary-sticky" id="cart-summary-sticky">
          <div class="cart-summary-title">🛒 Cart Summary</div>
          <div class="cart-summary-total">
            <span>${cartCount} item(s)</span>
            <span>${formatPrice(cartTotal)}</span>
          </div>
          <a href="#/cart" class="btn btn-primary btn-sm" style="width:100%;margin-top:12px;">
            View Cart →
          </a>
        </div>
      ` : ''}
    </main>
  `;
}

export function initRestaurantPage() {
  const products = getFilteredProducts();
  if (products.length === 0) {
    const grid = document.getElementById('rest-products-grid');
    if (grid) grid.innerHTML = '<div style="text-align:center;padding:3rem;color:var(--clr-gray-500);grid-column:1/-1;">Loading menu items...</div>';
  } else {
    renderProductsGrid(products, 'rest-products-grid');
  }

  // Category tabs
  document.querySelectorAll('#rest-category-tabs .category-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      currentCategory = tab.dataset.category;
      document.querySelectorAll('#rest-category-tabs .category-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderProductsGrid(getFilteredProducts(), 'rest-products-grid');
    });
  });

  // Search
  document.getElementById('rest-search')?.addEventListener('input', debounce((e) => {
    searchQuery = e.target.value.trim();
    renderProductsGrid(getFilteredProducts(), 'rest-products-grid');
  }, 300));

  // Sort
  document.getElementById('rest-sort')?.addEventListener('change', (e) => {
    currentSort = e.target.value;
    renderProductsGrid(getFilteredProducts(), 'rest-products-grid');
  });

  window.addEventListener('cart-updated', updateStickyCart);
}

function updateStickyCart(e) {
  const sticky = document.getElementById('cart-summary-sticky');
  if (e.detail.count > 0) {
    if (!sticky) {
      const div = document.createElement('div');
      div.className = 'cart-summary-sticky';
      div.id = 'cart-summary-sticky';
      div.innerHTML = `
        <div class="cart-summary-title">🛒 Cart Summary</div>
        <div class="cart-summary-total">
          <span>${e.detail.count} item(s)</span>
          <span>${formatPrice(e.detail.total)}</span>
        </div>
        <a href="#/cart" class="btn btn-primary btn-sm" style="width:100%;margin-top:12px;">View Cart →</a>
      `;
      document.querySelector('.page-content')?.appendChild(div);
    } else {
      sticky.querySelector('.cart-summary-total').innerHTML = `
        <span>${e.detail.count} item(s)</span>
        <span>${formatPrice(e.detail.total)}</span>
      `;
    }
  } else if (sticky) {
    sticky.remove();
  }
}

export function cleanupRestaurantPage() {
  window.removeEventListener('cart-updated', updateStickyCart);
  currentCategory = 'all';
  currentSort = 'default';
  searchQuery = '';
}
