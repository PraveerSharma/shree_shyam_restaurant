// ============================================
// Seed Menu Items into Supabase
// Run: node scripts/seed-menu.mjs
// ============================================

import { createClient } from '@supabase/supabase-js';

// Usage: SUPABASE_URL=... SERVICE_ROLE_KEY=... node scripts/seed-menu.mjs
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing env vars. Run with:\n  SUPABASE_URL=https://xxx.supabase.co SERVICE_ROLE_KEY=eyJ... node scripts/seed-menu.mjs');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const SWEETS = [
  { id: 'bhujia', name: 'Bhujia', category: 'snacks', description: 'Our signature thin-sev bhujia — crispy chickpea flour noodles tossed in a secret Rajasthani masala blend. A Shree Shyam bestseller.', price: 80, unit: 'per 250g', image: '/images/sweets/bhujia.png' },
  { id: 'cookies', name: 'Nankhatai Cookies', category: 'snacks', description: 'Buttery, crumbly desi shortbread baked fresh daily with pure ghee, roasted besan, and crushed cardamom.', price: 120, unit: 'per 250g', image: '/images/sweets/cookies.png' },
  { id: 'gulab-jamun', name: 'Gulab Jamun', category: 'sweets', description: 'Pillowy soft khoya dumplings, golden-fried and drenched in warm rose-cardamom sugar syrup.', price: 150, unit: 'per 500g', image: '/images/sweets/gulab-jamun.png' },
  { id: 'rasgulla', name: 'Rasgulla', category: 'sweets', description: 'Feather-light, spongy chenna balls simmered gently in a delicate rosewater sugar syrup.', price: 140, unit: 'per 500g', image: '/images/sweets/rasgulla.png' },
  { id: 'kaju-barfi', name: 'Kaju Barfi', category: 'sweets', description: 'Velvety smooth cashew fudge cut into perfect diamonds and adorned with edible silver vark.', price: 280, unit: 'per 500g', image: '/images/sweets/barfi.png' },
  { id: 'besan-ladoo', name: 'Besan Ladoo', category: 'sweets', description: 'Aromatic golden ladoos made by slow-roasting chickpea flour in desi ghee with almonds.', price: 160, unit: 'per 500g', image: '/images/sweets/ladoo.png' },
  { id: 'jalebi', name: 'Jalebi', category: 'sweets', description: 'Crispy, juicy spirals fried to a bright saffron orange and dunked in hot sugar syrup.', price: 100, unit: 'per 500g', image: '/images/sweets/jalebi.png' },
  { id: 'peda', name: 'Mathura Peda', category: 'sweets', description: 'Rich, dense milk fudge discs crafted by slow-reducing fresh khoya with cardamom and saffron.', price: 200, unit: 'per 500g', image: '/images/sweets/peda.png' },
  { id: 'motichoor-ladoo', name: 'Motichoor Ladoo', category: 'sweets', description: 'Melt-in-your-mouth ladoos shaped from hundreds of tiny pearl-like boondi drops with saffron.', price: 180, unit: 'per 500g', image: '/images/sweets/motichoor-ladoo.png' },
  { id: 'samosa', name: 'Samosa', category: 'snacks', description: 'Shatteringly crispy pastry shells stuffed with spicy hand-mashed potatoes, peas, and cumin.', price: 50, unit: 'per 2 pieces', image: '/images/sweets/samosa.png' },
  { id: 'namak-pare', name: 'Namak Pare', category: 'snacks', description: 'Crunchy diamond-shaped crackers made with maida, ajwain seeds, and just the right salt.', price: 70, unit: 'per 250g', image: '/images/sweets/namak-pare.png' },
  { id: 'mathri', name: 'Mathri', category: 'snacks', description: 'Flaky, layered Rajasthani crackers seasoned with ajwain and coarse black pepper.', price: 90, unit: 'per 250g', image: '/images/sweets/mathri.png' },
];

const RESTAURANT = [
  { id: 'paneer-tikka', name: 'Paneer Tikka', category: 'starters', description: 'Thick-cut paneer cubes marinated in smoky tandoori spice paste, chargrilled until caramelized.', price: 220, unit: 'per plate', image: '/images/restaurant/paneer-tikka.png' },
  { id: 'veg-pakora', name: 'Veg Pakora', category: 'starters', description: 'Crispy platter of mixed vegetable fritters in spiced besan batter, served with coriander-mint dip.', price: 120, unit: 'per plate', image: '/images/restaurant/veg-pakora.png' },
  { id: 'dal-makhani', name: 'Dal Makhani', category: 'sabzi', description: 'Whole black urad dal and rajma slow-simmered for hours with cream and butter. A Shree Shyam signature.', price: 180, unit: 'per bowl', image: '/images/restaurant/dal-makhani.png' },
  { id: 'paneer-butter-masala', name: 'Paneer Butter Masala', category: 'sabzi', description: 'Soft paneer in silky tomato-cashew gravy finished with butter and kasuri methi.', price: 220, unit: 'per bowl', image: '/images/restaurant/paneer-butter-masala.png' },
  { id: 'aloo-gobi', name: 'Aloo Gobi', category: 'sabzi', description: 'Tender cauliflower and golden potato chunks in home-style turmeric-cumin masala.', price: 140, unit: 'per bowl', image: '/images/restaurant/aloo-gobi.png' },
  { id: 'plain-roti', name: 'Plain Roti', category: 'roti', description: 'Hand-rolled whole wheat roti puffed fresh on a hot tawa — the ideal companion for any sabzi.', price: 20, unit: 'per piece', image: '/images/restaurant/roti-naan.png' },
  { id: 'butter-naan', name: 'Butter Naan', category: 'roti', description: 'Pillowy naan baked in our clay tandoor with beautiful charred spots, brushed with melted butter.', price: 50, unit: 'per piece', image: '/images/restaurant/roti-naan.png' },
  { id: 'tandoori-roti', name: 'Tandoori Roti', category: 'roti', description: 'Wholesome atta roti pressed thin and cooked in a roaring tandoor. Slight crackle outside, soft inside.', price: 30, unit: 'per piece', image: '/images/restaurant/roti-naan.png' },
  { id: 'regular-thali', name: 'Regular Thali', category: 'thali', description: 'A satisfying everyday meal: 2 seasonal sabzis, tadka dal, steamed rice, 3 rotis, raita, salad, and a sweet.', price: 250, unit: 'per thali', image: '/images/restaurant/thali.png' },
  { id: 'deluxe-thali', name: 'Deluxe Thali', category: 'thali', description: '3 premium sabzis, dal makhani, jeera rice, 4 rotis/naan, raita, papad, pickle, salad, and 2 desserts.', price: 350, unit: 'per thali', image: '/images/restaurant/thali.png' },
  { id: 'special-thali', name: 'Special Thali', category: 'thali', description: 'The full Shree Shyam royal experience: 4 special sabzis, biryani, unlimited rotis, paneer tikka, 3 desserts, and buttermilk.', price: 450, unit: 'per thali', image: '/images/restaurant/thali.png' },
];

async function seed() {
  console.log('Seeding menu items...\n');

  // Transform to DB format
  const allItems = [
    ...SWEETS.map((item, i) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      unit: item.unit,
      category: item.category,
      menu_type: 'sweets',
      description: item.description,
      image: item.image,
      available: true,
      sort_order: i,
    })),
    ...RESTAURANT.map((item, i) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      unit: item.unit,
      category: item.category,
      menu_type: 'restaurant',
      description: item.description,
      image: item.image,
      available: true,
      sort_order: i,
    })),
  ];

  // Upsert to avoid duplicates on re-run
  const { data, error } = await supabase
    .from('menu_items')
    .upsert(allItems, { onConflict: 'id' });

  if (error) {
    console.error('Error seeding:', error.message);
    return;
  }

  console.log(`Seeded ${allItems.length} menu items (${SWEETS.length} sweets + ${RESTAURANT.length} restaurant)`);

  // Verify
  const { count } = await supabase
    .from('menu_items')
    .select('*', { count: 'exact', head: true });

  console.log(`Total items in database: ${count}`);
}

seed().catch(console.error);
