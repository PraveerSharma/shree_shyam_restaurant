// ============================================
// DOM UTILITIES
// Secure DOM manipulation helpers
// ============================================

// XSS sanitization - strips HTML tags and dangerous patterns
export function sanitizeInput(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// Unescape for display in text content (not innerHTML)
export function unescapeForText(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/');
}

// Safe createElement with properties
export function createElement(tag, props = {}, children = []) {
  const el = document.createElement(tag);
  
  for (const [key, value] of Object.entries(props)) {
    if (key === 'className') {
      el.className = value;
    } else if (key === 'innerHTML') {
      // Only use innerHTML when explicitly needed, content should be pre-sanitized
      el.innerHTML = value;
    } else if (key === 'textContent') {
      el.textContent = value;
    } else if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === 'dataset') {
      Object.entries(value).forEach(([dk, dv]) => {
        el.dataset[dk] = dv;
      });
    } else if (key === 'style' && typeof value === 'object') {
      Object.assign(el.style, value);
    } else {
      el.setAttribute(key, value);
    }
  }
  
  children.forEach(child => {
    if (typeof child === 'string') {
      el.appendChild(document.createTextNode(child));
    } else if (child instanceof Node) {
      el.appendChild(child);
    }
  });
  
  return el;
}

// Query shorthand
export function $(selector, parent = document) {
  return parent.querySelector(selector);
}

export function $$(selector, parent = document) {
  return [...parent.querySelectorAll(selector)];
}

// Show toast notification
let toastContainer = null;
export function showToast(message, type = 'info', duration = 3000) {
  if (!toastContainer) {
    toastContainer = createElement('div', { className: 'toast-container' });
    document.body.appendChild(toastContainer);
  }
  
  const icons = {
    success: '✓',
    error: '✗',
    info: 'ℹ',
  };
  
  const toast = createElement('div', { className: `toast ${type}` }, [
    createElement('span', {}, [icons[type] || 'ℹ']),
    createElement('span', {}, [message]),
  ]);
  
  toastContainer.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// Debounce
export function debounce(fn, delay = 300) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// Custom UI Confirm Modal
export function showConfirm(message, onConfirm) {
  const overlay = createElement('div', { className: 'modal-overlay', style: { zIndex: '9999' } });
  
  const closeBtn = createElement('button', { className: 'modal-close', textContent: '×' });
  closeBtn.addEventListener('click', () => overlay.remove());

  const title = createElement('h3', { className: 'modal-title', textContent: 'Confirm Action', style: { marginBottom: '0.5rem' } });
  const text = createElement('p', { className: 'modal-subtitle', textContent: message, style: { marginBottom: '2rem' } });

  const cancelBtn = createElement('button', { className: 'btn btn-ghost', textContent: 'Cancel' });
  cancelBtn.addEventListener('click', () => overlay.remove());

  const confirmBtn = createElement('button', { className: 'btn btn-primary', textContent: 'Yes, Delete', style: { backgroundColor: 'var(--clr-error)' } });
  confirmBtn.addEventListener('click', () => {
    overlay.remove();
    if (typeof onConfirm === 'function') onConfirm();
  });

  const actions = createElement('div', { style: { display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' } });
  actions.appendChild(cancelBtn);
  actions.appendChild(confirmBtn);

  const modal = createElement('div', { className: 'modal' });
  modal.appendChild(closeBtn);
  modal.appendChild(title);
  modal.appendChild(text);
  modal.appendChild(actions);

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}
