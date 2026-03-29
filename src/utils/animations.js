// ============================================
// ANIMATION UTILITIES
// Scroll-based reveal animations
// ============================================

export function initScrollReveal() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
  );

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  
  return observer;
}

export function initLazyLoading() {
  const imgObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
            img.classList.add('loaded');
          }
          imgObserver.unobserve(img);
        }
      });
    },
    { rootMargin: '200px' }
  );

  document.querySelectorAll('img[data-src]').forEach(img => imgObserver.observe(img));
  
  return imgObserver;
}
