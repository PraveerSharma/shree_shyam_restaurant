// ============================================
// PRODUCT CARD COMPONENT
// Reusable card with add-to-cart
// Shows "Add to Cart" first, then qty controls
// ============================================

import { addToCart, getCart, removeFromCart, updateQuantity } from '../services/cart.js';
import { formatPrice } from '../utils/format.js';
import { showToast } from '../utils/dom.js';
import { isLoggedIn } from '../services/auth.js';
import { showAuthModal } from './auth-modal.js';

function getCartQty(productId) {
  const cart = getCart();
  const item = cart.find(i => i.id === productId);
  return item ? item.quantity : 0;
}

export function renderProductCard(product) {
  const card = document.createElement('div');
  card.className = `product-card ${!product.isAvailable ? 'disabled' : ''}`;
  card.id = `product-${product.id}`;
  
  const existingQty = getCartQty(product.id);

  card.innerHTML = `
    <div class="product-card-img">
      <img data-src="${product.image}" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='225' viewBox='0 0 300 225'%3E%3Crect fill='%23f2f2f6' width='300' height='225'/%3E%3Ctext fill='%23c4c4d0' font-family='sans-serif' font-size='14' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3ELoading...%3C/text%3E%3C/svg%3E" 
           alt="${product.name}" 
           loading="lazy" 
           width="300" 
           height="225">
      <div class="product-card-veg">
        <span class="veg-dot" aria-hidden="true"></span>
        Pure Veg
      </div>
    </div>
    <div class="product-card-body">
      <h3 class="product-card-name">${product.name}</h3>
      <p class="product-card-desc">${product.description}</p>
      <div class="product-card-price">
        ${formatPrice(product.price)}
        <small>${product.unit}</small>
      </div>
      <div class="product-card-actions">
        ${!product.isAvailable ? `
          <button disabled style="width:100%; cursor:not-allowed; background:var(--clr-gray-200); color:var(--clr-gray-500); border:none; padding:10px 16px; border-radius:var(--radius-full); font-weight:600; font-size: 0.9rem;" aria-label="Out of stock: ${product.name}">Out of Stock</button>
        ` : (existingQty > 0 ? `
          <div class="qty-selector active" data-id="${product.id}">
            <button class="qty-btn qty-minus" data-id="${product.id}" aria-label="Decrease quantity of ${product.name}">−</button>
            <input type="number" class="qty-input" value="${existingQty}" min="1" max="999" data-id="${product.id}" aria-label="Quantity for ${product.name}" style="width: 50px; text-align: center; border: none; background: transparent; font-weight: 700; color: var(--clr-primary); font-size: 1rem;">
            <button class="qty-btn qty-plus" data-id="${product.id}" aria-label="Increase quantity of ${product.name}">+</button>
          </div>
        ` : `
          <button class="add-to-cart-btn" data-id="${product.id}" aria-label="Add ${product.name} to cart">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
            Add to Cart
          </button>
        `)}
      </div>
    </div>
  `;

  // Lazy load image
  const img = card.querySelector('img');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
        observer.unobserve(img);
      }
    });
  }, { rootMargin: '200px' });
  observer.observe(img);

  // Bind events based on current state (only if available)
  if (product.isAvailable) {
    const addBtn = card.querySelector('.add-to-cart-btn');
    const qtySelector = card.querySelector('.qty-selector');

    if (addBtn) {
      // Initial state: "Add to Cart" button
      addBtn.addEventListener('click', () => {
        if (!isLoggedIn()) {
          showAuthModal('login', () => {
            addToCart(product, 1);
            showToast(`${product.name} added to cart`, 'success');
            switchToQtyControls(card, product, 1);
          });
          return;
        }
        addToCart(product, 1);
        showToast(`${product.name} added to cart`, 'success');
        switchToQtyControls(card, product, 1);
      });
    }

    if (qtySelector) {
      // Already in cart: bind +/- controls
      bindQtyControls(card, product, existingQty);
    }
  }

  return card;
}

function switchToQtyControls(card, product, qty) {
  const actionsDiv = card.querySelector('.product-card-actions');
  actionsDiv.innerHTML = `
    <div class="qty-selector active" data-id="${product.id}">
      <button class="qty-btn qty-minus" data-id="${product.id}" aria-label="Decrease quantity">−</button>
      <input type="number" class="qty-input" value="${qty}" min="1" max="999" data-id="${product.id}" style="width: 50px; text-align: center; border: none; background: transparent; font-weight: 700; color: var(--clr-primary); font-size: 1rem;">
      <button class="qty-btn qty-plus" data-id="${product.id}" aria-label="Increase quantity">+</button>
    </div>
  `;
  // Trigger entry animation
  const selector = actionsDiv.querySelector('.qty-selector');
  selector.classList.add('animate-in');
  bindQtyControls(card, product, qty);
}

function switchToAddButton(card, product) {
  const actionsDiv = card.querySelector('.product-card-actions');
  actionsDiv.innerHTML = `
    <button class="add-to-cart-btn" data-id="${product.id}" aria-label="Add ${product.name} to cart">
      <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
      Add to Cart
    </button>
  `;
  const addBtn = actionsDiv.querySelector('.add-to-cart-btn');
  addBtn.addEventListener('click', () => {
    if (!isLoggedIn()) {
      showAuthModal('login', () => {
        addToCart(product, 1);
        showToast(`${product.name} added to cart`, 'success');
        switchToQtyControls(card, product, 1);
      });
      return;
    }
    addToCart(product, 1);
    showToast(`${product.name} added to cart`, 'success');
    switchToQtyControls(card, product, 1);
  });
}

function bindQtyControls(card, product, currentQty) {
  let qty = currentQty;
  const qtyInput = card.querySelector('.qty-input');
  
  card.querySelector('.qty-minus').addEventListener('click', () => {
    qty--;
    if (qty <= 0) {
      // Remove from cart and revert to "Add to Cart" button
      removeFromCart(product.id);
      showToast(`${product.name} removed from cart`, 'info');
      switchToAddButton(card, product);
      return;
    }
    if (qtyInput) qtyInput.value = qty;
    updateQuantity(product.id, qty);
  });

  card.querySelector('.qty-plus').addEventListener('click', () => {
    if (qty >= 999) return;
    qty++;
    if (qtyInput) qtyInput.value = qty;
    addToCart(product, 1);
  });

  if (qtyInput) {
    qtyInput.addEventListener('change', (e) => {
      const newVal = Math.min(Math.max(parseInt(e.target.value) || 1, 1), 999);
      qty = newVal;
      e.target.value = qty;
      updateQuantity(product.id, qty);
    });
  }
}

export function renderProductsGrid(products, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = '';
  
  if (products.length === 0) {
    container.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--clr-gray-500);">
        <div style="font-size:3rem;margin-bottom:1rem;">🔍</div>
        <h3>No items found</h3>
        <p>Try adjusting your filters or search terms.</p>
      </div>
    `;
    return;
  }

  products.forEach(product => {
    container.appendChild(renderProductCard(product));
  });
}
