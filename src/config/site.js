// ============================================
// SITE CONFIGURATION
// Centralized restaurant info & settings
// ============================================

export const SITE_CONFIG = {
  name: 'Shree Shyam Restaurant',
  tagline: 'Authentic Vegetarian Delights',
  description: 'Best Vegetarian Food in Golaghat - Traditional sweets, snacks, sabzis, rotis, and thalis',
  
  address: {
    line1: 'NRL Road',
    line2: 'Telagaram',
    city: 'Golaghat',
    state: 'Assam',
    pin: '785699',
    country: 'India',
    get full() {
      return `${this.line1}, ${this.line2}, ${this.city}, ${this.state} ${this.pin}`;
    },
  },

  contact: {
    phone: '+91 86907 56828',
    phoneClean: '+918690756828',
    whatsapp: '+918690756828',
    get whatsappLink() {
      return `https://wa.me/${this.whatsapp}`;
    },
    get phoneLink() {
      return `tel:${this.phoneClean}`;
    },
  },

  hours: {
    open: '10:00 AM',
    close: '11:00 PM',
    days: 'Monday - Sunday',
    get display() {
      return `${this.days}: ${this.open} - ${this.close}`;
    },
  },

  social: {
    instagram: 'https://instagram.com/shreeshyamrestaurant',
    facebook: 'https://facebook.com/shreeshyamrestaurant',
    googleMaps: 'https://share.google/XMipNElHF5Ap7e8QQ',
    googleMapsSearch: 'https://share.google/XMipNElHF5Ap7e8QQ',
  },

  seo: {
    title: 'Shree Shyam Restaurant - Best Vegetarian Food in Golaghat, Assam',
    description: 'Order authentic Indian vegetarian sweets, snacks, sabzis & thalis from Shree Shyam Restaurant, Golaghat, Assam. Fresh, hygienic & traditionally prepared.',
    keywords: 'Shree Shyam Restaurant, Golaghat, vegetarian food, Indian sweets, thali, Assam, restaurant',
    ogImage: '/images/hero-bg.png',
  },

  admin: {
    // In production, use proper hashing. This is a simple demo password.
    passwordHash: 'c2hyZWVzaHlhbWFkbWluMTIz', // base64 of 'shreeshyamadmin123'
    password: 'admin@123', // plaintext for demo (validated via hash in production)
  },

  currency: {
    symbol: '₹',
    code: 'INR',
  },

  orderPrefix: 'SSR',
};
