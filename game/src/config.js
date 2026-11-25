// Sizzle & Serve — Rush Hour Kitchen: tuning, recipes, stations and palette.
// One clear job: every number and name the rest of the game reads lives here.

export const VIEW = { w: 1280, h: 800 };

export const SHIFT_SECONDS = 180;
export const WIN_COINS = 400;
export const MAX_HEARTS = 3;
export const MAX_ORDERS = 4;

export const CHEF_SPEED = 340; // px per second
export const CHEF_RADIUS = 26;

// Ingredient ids. prep: 'none' | 'chop' | 'cook'. cookSeconds only for 'cook'.
export const INGREDIENTS = {
  bun:     { name: 'Bun',     key: '1', prep: 'none', color: '#e8b96a', dark: '#b97f2e', emoji: 'bun' },
  patty:   { name: 'Patty',   key: '2', prep: 'cook', color: '#8a5a3b', dark: '#5d3a24', cookSeconds: 6, emoji: 'patty' },
  lettuce: { name: 'Lettuce', key: '3', prep: 'chop', color: '#7ec850', dark: '#4c8a2e', emoji: 'lettuce' },
  tomato:  { name: 'Tomato',  key: '4', prep: 'chop', color: '#e8543f', dark: '#a92e20', emoji: 'tomato' },
  cheese:  { name: 'Cheese',  key: '5', prep: 'chop', color: '#f7c948', dark: '#c79a1d', emoji: 'cheese' },
  pasta:   { name: 'Pasta',   key: '6', prep: 'cook', color: '#f2d492', dark: '#c9a45a', cookSeconds: 8, emoji: 'pasta' },
  sauce:   { name: 'Sauce',   key: '7', prep: 'none', color: '#c0392b', dark: '#7e2318', emoji: 'sauce' },
};
export const INGREDIENT_ORDER = ['bun', 'patty', 'lettuce', 'tomato', 'cheese', 'pasta', 'sauce'];

export const CHOP_SECONDS = 1.6;
export const BURN_AFTER_SECONDS = 4; // past perfect, a cooked item burns

// A recipe is a list of prepared ingredient ids, in any order.
export const RECIPES = {
  burger: { name: 'Burger', price: 80, items: ['bun', 'patty', 'lettuce'], color: '#e8b96a' },
  salad:  { name: 'Garden Salad', price: 70, items: ['lettuce', 'tomato', 'cheese'], color: '#7ec850' },
  pasta:  { name: 'Pasta Marinara', price: 90, items: ['pasta', 'sauce', 'cheese'], color: '#f2d492' },
  deluxe: { name: 'Deluxe Burger', price: 120, items: ['bun', 'patty', 'lettuce', 'tomato'], color: '#d98a3d' },
};
export const RECIPE_ORDER = ['burger', 'salad', 'pasta', 'deluxe'];

// Which recipes may appear at a given elapsed time (seconds into the shift).
export function recipesUnlockedAt(elapsed) {
  if (elapsed < 45) return ['burger', 'salad'];
  if (elapsed < 100) return ['burger', 'salad', 'pasta'];
  return RECIPE_ORDER;
}

export function orderSpawnInterval(elapsed) {
  // Orders arrive faster as the shift heats up.
  if (elapsed < 45) return 15;
  if (elapsed < 100) return 12;
  return 9;
}

export function orderPatience(elapsed) {
  if (elapsed < 45) return 55;
  if (elapsed < 100) return 45;
  return 36;
}

// Stations: rectangles on the floor plus the point the chef stands at to use them.
export const STATIONS = {
  bins:    { x: 24,  y: 236, w: 150, h: 500, label: 'Ingredients' },
  board:   { x: 230, y: 250, w: 220, h: 130, label: 'Chopping Board', use: { x: 340, y: 420 } },
  stove:   { x: 500, y: 250, w: 260, h: 130, label: 'Stove', use: { x: 630, y: 420 } },
  plate:   { x: 810, y: 250, w: 240, h: 130, label: 'Plating Counter', use: { x: 930, y: 420 } },
  serve:   { x: 1100, y: 250, w: 156, h: 250, label: 'Serving Window', use: { x: 1150, y: 540 } },
  trash:   { x: 1100, y: 700, w: 120, h: 76, label: 'Trash', use: { x: 1160, y: 668 } },
};

// Each ingredient bin is a tile inside the bins station.
export function binRect(index) {
  const cols = 2;
  const bw = 62, bh = 58, gap = 8;
  const col = index % cols, row = Math.floor(index / cols);
  return {
    x: STATIONS.bins.x + 10 + col * (bw + gap),
    y: STATIONS.bins.y + 34 + row * (bh + gap),
    w: bw, h: bh,
  };
}

export const PALETTE = {
  floorA: '#c98f5f', floorB: '#bd8250',
  wall: '#8a5a3b', wallTop: '#6e452c',
  counter: '#7a4a26', counterTop: '#a06a35', counterEdge: '#5d3a1e',
  steel: '#b9c4cc', steelDark: '#7d8891',
  board: '#e8d5a8', boardEdge: '#b89a5e',
  plateWhite: '#f5f2ea', ticket: '#fff8e1', ticketEdge: '#d9c48a',
  ink: '#2e2118', inkSoft: '#5d4a38',
  cream: '#fff6e6', gold: '#f7c948', green: '#58b368', red: '#e8543f',
  timerGreen: '#58b368', timerAmber: '#f2a541', timerRed: '#e8543f',
};

export const CUSTOMERS = [
  { name: 'Maya', skin: '#f2c09a', hair: '#3b2a1e', shirt: '#e8543f' },
  { name: 'Rio', skin: '#c98d64', hair: '#1c1c1c', shirt: '#3f7de8' },
  { name: 'Sari', skin: '#f2c09a', hair: '#6e452c', shirt: '#58b368' },
  { name: 'Ben', skin: '#e8b088', hair: '#8a5a3b', shirt: '#f7c948' },
];
