// ============================================
// SWEETS & SNACKS PAGE
// E-commerce grid with filters
// ============================================

import { getSweetsItems } from '../services/admin.js';
import { SWEET_CATEGORIES } from '../config/sweets-data.js';
import { renderProductsGrid } from '../components/product-card.js';
import { getCartCount, getCartTotal } from '../services/cart.js';
import { formatPrice } from '../utils/format.js';
import { debounce } from '../utils/dom.js';

let currentCategory = 'all';
let currentSort = 'default';
let searchQuery = '';

function getFilteredProducts() {
  let products = getSweetsItems();
  
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

export function renderSweetsPage() {
  const cartCount = getCartCount();
  const cartTotal = getCartTotal();

  return `
    <main class="page-content page-enter">
      <section class="section shop-page">
        <div class="container">
          <div class="shop-page-header">
            <h1>Sweets & Snacks</h1>
            <p>Handcrafted with pure ghee, made fresh daily in Golaghat</p>
            <div class="divider"></div>
          </div>

          <!-- Category Tabs -->
          <div class="category-tabs" id="sweet-category-tabs">
            ${SWEET_CATEGORIES.map(cat => `
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
              <input type="text" class="search-input" id="sweet-search" 
                     placeholder="Search sweets & snacks..." 
                     value="${searchQuery}"
                     maxlength="100"
                     aria-label="Search products">
            </div>
            <select class="filter-select" id="sweet-sort" aria-label="Sort by">
              <option value="default" ${currentSort === 'default' ? 'selected' : ''}>Sort by: Default</option>
              <option value="price-low" ${currentSort === 'price-low' ? 'selected' : ''}>Price: Low to High</option>
              <option value="price-high" ${currentSort === 'price-high' ? 'selected' : ''}>Price: High to Low</option>
              <option value="name" ${currentSort === 'name' ? 'selected' : ''}>Name: A to Z</option>
            </select>
          </div>

          <!-- Products Grid -->
          <div class="products-grid" id="sweets-products-grid"></div>
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

export function initSweetsPage() {
  // Render products (may be empty if Supabase sync hasn't completed yet)
  const products = getFilteredProducts();
  if (products.length === 0) {
    const grid = document.getElementById('sweets-products-grid');
    if (grid) grid.innerHTML = '<div style="text-align:center;padding:3rem;color:var(--clr-gray-500);grid-column:1/-1;">Loading menu items...</div>';
  } else {
    renderProductsGrid(products, 'sweets-products-grid');
  }

  // Category tabs
  document.querySelectorAll('#sweet-category-tabs .category-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      currentCategory = tab.dataset.category;
      document.querySelectorAll('#sweet-category-tabs .category-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderProductsGrid(getFilteredProducts(), 'sweets-products-grid');
    });
  });

  // Search
  const searchInput = document.getElementById('sweet-search');
  searchInput?.addEventListener('input', debounce((e) => {
    searchQuery = e.target.value.trim();
    renderProductsGrid(getFilteredProducts(), 'sweets-products-grid');
  }, 300));

  // Sort
  document.getElementById('sweet-sort')?.addEventListener('change', (e) => {
    currentSort = e.target.value;
    renderProductsGrid(getFilteredProducts(), 'sweets-products-grid');
  });

  // Update sticky cart on cart events
  window.addEventListener('cart-updated', updateStickyCart);
}

function updateStickyCart(e) {
  const sticky = document.getElementById('cart-summary-sticky');
  if (e.detail.count > 0) {
    if (!sticky) {
      // Re-render page would be needed but let's just update
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

export function cleanupSweetsPage() {
  window.removeEventListener('cart-updated', updateStickyCart);
  currentCategory = 'all';
  currentSort = 'default';
  searchQuery = '';
}
