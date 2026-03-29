// ============================================
// SITE CONFIGURATION
// Centralized restaurant info & settings
// ============================================

export const SITE_CONFIG = {
  name: 'Shree Shyam Restaurant',
  tagline: 'Authentic Vegetarian Delights',
  description: 'Best Vegetarian Food in Sikar - Traditional sweets, snacks, sabzis, rotis, and thalis',
  
  address: {
    line1: 'Main Market Road',
    line2: 'Near Bus Stand',
    city: 'Sikar',
    state: 'Rajasthan',
    pin: '332001',
    country: 'India',
    get full() {
      return `${this.line1}, ${this.line2}, ${this.city}, ${this.state} ${this.pin}`;
    },
  },

  contact: {
    phone: '+91-XXXXXXXXXX',
    phoneClean: '+91XXXXXXXXXX',
    whatsapp: '+91XXXXXXXXXX',
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
    googleMaps: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d28344.54!2d75.13!3d27.62!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x396c9b0c0c0c0c0%3A0x0!2sSikar%2C+Rajasthan!5e0!3m2!1sen!2sin!4v1',
    googleMapsSearch: 'https://maps.google.com/?q=Shree+Shyam+Restaurant+Sikar+Rajasthan',
  },

  seo: {
    title: 'Shree Shyam Restaurant - Best Vegetarian Food in Sikar',
    description: 'Order authentic Indian vegetarian sweets, snacks, sabzis & thalis from Shree Shyam Restaurant, Sikar, Rajasthan. Fresh, hygienic & traditionally prepared.',
    keywords: 'Shree Shyam Restaurant, Sikar, vegetarian food, Indian sweets, thali, Rajasthan, restaurant',
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
