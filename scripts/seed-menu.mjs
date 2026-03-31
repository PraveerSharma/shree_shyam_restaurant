// ============================================
// Seed Menu Items into Supabase
// Run: node scripts/seed-menu.mjs
// ============================================

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dufolyrnrbybeflhdsay.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1Zm9seXJucmJ5YmVmbGhkc2F5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDk3NzY0OSwiZXhwIjoyMDkwNTUzNjQ5fQ.VwNY29hGXj0tSgf_MIWykuFCXBXCqhB8ZYbKnMryCig';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const SWEETS = [
  { id: 'bhujia', name: 'Bhujia', category: 'snacks', description: 'Crispy, thin chickpea flour noodles seasoned with a blend of Rajasthani spices.', price: 80, unit: 'per 250g', image: '/images/sweets/bhujia.png' },
  { id: 'cookies', name: 'Nankhatai Cookies', category: 'snacks', description: 'Traditional Indian shortbread cookies made with ghee, besan, and cardamom.', price: 120, unit: 'per 250g', image: '/images/sweets/cookies.png' },
  { id: 'gulab-jamun', name: 'Gulab Jamun', category: 'sweets', description: 'Soft, golden-brown milk solid dumplings soaked in rose-cardamom sugar syrup.', price: 150, unit: 'per 500g', image: '/images/sweets/gulab-jamun.png' },
  { id: 'rasgulla', name: 'Rasgulla', category: 'sweets', description: 'Soft, spongy cottage cheese balls simmered in light sugar syrup with rose water.', price: 140, unit: 'per 500g', image: '/images/sweets/rasgulla.png' },
  { id: 'kaju-barfi', name: 'Kaju Barfi', category: 'sweets', description: 'Premium diamond-shaped cashew fudge topped with edible silver leaf.', price: 280, unit: 'per 500g', image: '/images/sweets/barfi.png' },
  { id: 'besan-ladoo', name: 'Besan Ladoo', category: 'sweets', description: 'Round golden balls of roasted chickpea flour, ghee, and powdered sugar.', price: 160, unit: 'per 500g', image: '/images/sweets/ladoo.png' },
  { id: 'jalebi', name: 'Jalebi', category: 'sweets', description: 'Bright orange, crispy spiral-shaped deep-fried batter soaked in saffron syrup.', price: 100, unit: 'per 500g', image: '/images/sweets/jalebi.png' },
  { id: 'peda', name: 'Mathura Peda', category: 'sweets', description: 'Traditional milk fudge discs made by slow-cooking khoya with sugar and cardamom.', price: 200, unit: 'per 500g', image: '/images/sweets/peda.png' },
  { id: 'motichoor-ladoo', name: 'Motichoor Ladoo', category: 'sweets', description: 'Vibrant orange ladoos made from tiny boondi drops, shaped into perfect spheres.', price: 180, unit: 'per 500g', image: '/images/sweets/motichoor-ladoo.png' },
  { id: 'samosa', name: 'Samosa', category: 'snacks', description: 'Golden, crispy triangular pastries filled with spiced potatoes, peas, and cumin.', price: 50, unit: 'per 2 pieces', image: '/images/sweets/samosa.png' },
  { id: 'namak-pare', name: 'Namak Pare', category: 'snacks', description: 'Crispy, diamond-shaped savory crackers made with refined flour, ajwain, and salt.', price: 70, unit: 'per 250g', image: '/images/sweets/namak-pare.png' },
  { id: 'mathri', name: 'Mathri', category: 'snacks', description: 'Flaky, layered, crispy Rajasthani crackers spiced with ajwain and black pepper.', price: 90, unit: 'per 250g', image: '/images/sweets/mathri.png' },
];

const RESTAURANT = [
  { id: 'paneer-tikka', name: 'Paneer Tikka', category: 'starters', description: 'Chargrilled cubes of cottage cheese marinated in tandoori spices.', price: 220, unit: 'per plate', image: '/images/restaurant/paneer-tikka.png' },
  { id: 'veg-pakora', name: 'Veg Pakora', category: 'starters', description: 'Crispy golden fritters of fresh vegetables in spiced chickpea flour batter.', price: 120, unit: 'per plate', image: '/images/restaurant/veg-pakora.png' },
  { id: 'dal-makhani', name: 'Dal Makhani', category: 'sabzi', description: 'Creamy, buttery black lentils slow-cooked with tomatoes and spices.', price: 180, unit: 'per bowl', image: '/images/restaurant/dal-makhani.png' },
  { id: 'paneer-butter-masala', name: 'Paneer Butter Masala', category: 'sabzi', description: 'Soft paneer cubes in a luscious, creamy tomato-cashew gravy.', price: 220, unit: 'per bowl', image: '/images/restaurant/paneer-butter-masala.png' },
  { id: 'aloo-gobi', name: 'Aloo Gobi', category: 'sabzi', description: 'Home-style cauliflower and potato curry with turmeric and cumin.', price: 140, unit: 'per bowl', image: '/images/restaurant/aloo-gobi.png' },
  { id: 'plain-roti', name: 'Plain Roti', category: 'roti', description: 'Soft, hand-rolled whole wheat flatbread cooked on a traditional tawa.', price: 20, unit: 'per piece', image: '/images/restaurant/roti-naan.png' },
  { id: 'butter-naan', name: 'Butter Naan', category: 'roti', description: 'Pillowy soft, tandoor-baked naan bread brushed with melted butter.', price: 50, unit: 'per piece', image: '/images/restaurant/roti-naan.png' },
  { id: 'tandoori-roti', name: 'Tandoori Roti', category: 'roti', description: 'Wholesome whole wheat roti cooked in a blazing tandoor oven.', price: 30, unit: 'per piece', image: '/images/restaurant/roti-naan.png' },
  { id: 'regular-thali', name: 'Regular Thali', category: 'thali', description: 'Complete vegetarian meal: 2 sabzis, dal, rice, 3 rotis, raita, salad, and a sweet.', price: 250, unit: 'per thali', image: '/images/restaurant/thali.png' },
  { id: 'deluxe-thali', name: 'Deluxe Thali', category: 'thali', description: 'Premium thali with 3 sabzis, dal makhani, jeera rice, 4 rotis, and 2 desserts.', price: 350, unit: 'per thali', image: '/images/restaurant/thali.png' },
  { id: 'special-thali', name: 'Special Thali', category: 'thali', description: 'Grand thali: 4 sabzis, biryani, unlimited rotis, paneer tikka, and 3 desserts.', price: 450, unit: 'per thali', image: '/images/restaurant/thali.png' },
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
