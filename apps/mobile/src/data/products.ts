import type { Product } from '../types';

export const PRODUCTS: Product[] = [
  // Hot Food
  { id: 'beef-pie', name: 'Beef Pie', category: 'Hot Food', priceCents: 450, isAvailable: true },
  { id: 'sausage-roll', name: 'Sausage Roll', category: 'Hot Food', priceCents: 380, isAvailable: true },
  { id: 'chicken-nuggets', name: 'Chicken Nuggets (6 pack)', category: 'Hot Food', priceCents: 500, isAvailable: true },
  { id: 'hot-chips', name: 'Hot Chips', category: 'Hot Food', priceCents: 350, isAvailable: false },
  { id: 'pizza-slice', name: 'Margherita Pizza Slice', category: 'Hot Food', priceCents: 400, isAvailable: true },

  // Sandwiches & Wraps
  { id: 'ham-salad-sandwich', name: 'Ham & Salad Sandwich', category: 'Sandwiches & Wraps', priceCents: 550, isAvailable: true },
  { id: 'chicken-caesar-wrap', name: 'Chicken Caesar Wrap', category: 'Sandwiches & Wraps', priceCents: 650, isAvailable: false },
  { id: 'vegemite-sandwich', name: 'Vegemite Sandwich', category: 'Sandwiches & Wraps', priceCents: 300, isAvailable: true },
  { id: 'cheese-tomato-toastie', name: 'Cheese & Tomato Toastie', category: 'Sandwiches & Wraps', priceCents: 480, isAvailable: true },

  // Snacks
  { id: 'fruit-salad-cup', name: 'Fruit Salad Cup', category: 'Snacks', priceCents: 350, isAvailable: true },
  { id: 'banana-bread', name: 'Banana Bread Slice', category: 'Snacks', priceCents: 300, isAvailable: true },
  { id: 'yoghurt-pouch', name: 'Yoghurt Pouch', category: 'Snacks', priceCents: 280, isAvailable: true },

  // Drinks
  { id: 'plain-milk', name: 'Plain Milk 300ml', category: 'Drinks', priceCents: 280, isAvailable: true },
  { id: 'chocolate-milk', name: 'Chocolate Milk 300ml', category: 'Drinks', priceCents: 320, isAvailable: false },
  { id: 'orange-juice', name: 'Orange Juice Popper', category: 'Drinks', priceCents: 300, isAvailable: true },
];
