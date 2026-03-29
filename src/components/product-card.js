// ============================================
// PRODUCT CARD COMPONENT
// Reusable card with add-to-cart
// ============================================

import { addToCart } from '../services/cart.js';
import { formatPrice } from '../utils/format.js';
import { showToast } from '../utils/dom.js';

export function renderProductCard(product) {
  const card = document.createElement('div');
  card.className = 'product-card';
  card.id = `product-${product.id}`;
  
  card.innerHTML = `
    <div class="product-card-img">
      <img data-src="${product.image}" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='225' viewBox='0 0 300 225'%3E%3Crect fill='%23f2f2f6' width='300' height='225'/%3E%3Ctext fill='%23c4c4d0' font-family='sans-serif' font-size='14' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3ELoading...%3C/text%3E%3C/svg%3E" 
           alt="${product.name}" 
           loading="lazy" 
           width="300" 
           height="225">
      <div class="product-card-veg">
        <span class="veg-dot"></span>
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
        <div class="qty-selector">
          <button class="qty-btn qty-minus" data-id="${product.id}" aria-label="Decrease quantity">−</button>
          <input class="qty-value" type="text" value="1" readonly data-id="${product.id}" aria-label="Quantity">
          <button class="qty-btn qty-plus" data-id="${product.id}" aria-label="Increase quantity">+</button>
        </div>
        <button class="add-to-cart-btn" data-id="${product.id}" aria-label="Add ${product.name} to cart">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
          Add to Cart
        </button>
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

  // Quantity controls
  const qtyInput = card.querySelector('.qty-value');
  card.querySelector('.qty-minus').addEventListener('click', () => {
    const val = parseInt(qtyInput.value) || 1;
    qtyInput.value = Math.max(1, val - 1);
  });
  card.querySelector('.qty-plus').addEventListener('click', () => {
    const val = parseInt(qtyInput.value) || 1;
    qtyInput.value = Math.min(10, val + 1);
  });

  // Add to cart
  const addBtn = card.querySelector('.add-to-cart-btn');
  addBtn.addEventListener('click', () => {
    const qty = parseInt(qtyInput.value) || 1;
    addToCart(product, qty);
    
    // Visual feedback
    addBtn.classList.add('added');
    addBtn.innerHTML = `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg> Added!`;
    
    showToast(`${product.name} × ${qty} added to cart`, 'success');
    
    setTimeout(() => {
      addBtn.classList.remove('added');
      addBtn.innerHTML = `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg> Add to Cart`;
      qtyInput.value = 1;
    }, 1500);
  });

  return card;
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
    if (product.isAvailable) {
      container.appendChild(renderProductCard(product));
    }
  });
}
