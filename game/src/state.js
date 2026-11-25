// Game state: everything that changes while a shift runs, and the helpers
// that read it. No drawing and no input here — logic.js mutates it,
// render.js reads it.

import {
  SHIFT_SECONDS, MAX_HEARTS, MAX_ORDERS, recipesUnlockedAt,
  orderSpawnInterval, orderPatience, INGREDIENTS, RECIPES,
} from './config.js';
import { mulberry32, pick } from './random.js';

let orderId = 0;

export function newState(seed) {
  const rng = mulberry32(seed);
  return {
    seed,
    rng,
    screen: 'title', // 'title' | 'playing' | 'over'
    paused: false,
    frozen: false, // screenshot mode: the clock does not run
    time: 0, // seconds since the shift started (playing time)
    elapsed: 0,
    coins: 0,
    hearts: MAX_HEARTS,
    combo: 0,
    bestCombo: 0,
    served: 0,
    lost: 0,
    stars: 0,
    shiftOver: false,
    chef: { x: 640, y: 560, tx: 640, ty: 560, moving: false, busy: 0, busyKind: null, facing: 1 },
    carrying: null, // { id, state: 'raw' | 'chopped' | 'cooked' | 'burnt' }
    plate: [], // prepared ingredient ids sitting on the plating counter
    burners: [null, null], // { id, cookedFor, done } or null
    chopping: null, // { id, done, total } while the board is in use
    orders: [], // { id, recipe, customer, patience, maxPatience, served }
    spawnIn: 6, // seconds until the first order arrives
    particles: [], // { x, y, vx, vy, life, maxLife, color, size }
    popups: [], // { x, y, text, life, color }
    shake: 0,
    lastTickSecond: -1,
    message: null, // { text, life } centre-screen toast
    hover: null, // station id under the mouse, for highlight
  };
}

export function newOrder(state) {
  const unlocked = recipesUnlockedAt(state.elapsed);
  const recipe = pick(state.rng, unlocked);
  const customer = pick(state.rng, [0, 1, 2, 3]);
  const patience = orderPatience(state.elapsed);
  const order = {
    id: ++orderId,
    recipe,
    customer,
    patience,
    maxPatience: patience,
    born: state.elapsed,
  };
  state.orders.push(order);
  return order;
}

export function maybeSpawnOrder(state, dt) {
  if (state.orders.length >= MAX_ORDERS) { state.spawnIn = 4; return; }
  state.spawnIn -= dt;
  if (state.spawnIn <= 0) {
    newOrder(state);
    state.spawnIn = orderSpawnInterval(state.elapsed);
  }
}

// The prepared form an ingredient must be in to count for a recipe.
export function preparedId(item) {
  const def = INGREDIENTS[item.id];
  if (def.prep === 'none') return item.id;
  if (def.prep === 'chop' && item.state === 'chopped') return item.id;
  if (def.prep === 'cook' && item.state === 'cooked') return item.id;
  return null;
}

// Does the plate hold exactly the recipe's items (any order)?
export function plateMatchesRecipe(plate, recipeId) {
  const need = [...RECIPES[recipeId].items].sort();
  const have = plate.slice().sort();
  if (need.length !== have.length) return false;
  return need.every((id, i) => id === have[i]);
}

// Which order (if any) does the current plate complete?
export function matchingOrder(state) {
  return state.orders.find((o) => plateMatchesRecipe(state.plate, o.recipe)) || null;
}

export function addPopup(state, x, y, text, color) {
  state.popups.push({ x, y, text, life: 1.4, color: color || '#fff6e6' });
}

export function burst(state, x, y, color, n = 10) {
  for (let i = 0; i < n; i++) {
    const a = state.rng() * Math.PI * 2;
    const speed = 40 + state.rng() * 120;
    state.particles.push({
      x, y,
      vx: Math.cos(a) * speed, vy: Math.sin(a) * speed - 40,
      life: 0.5 + state.rng() * 0.5, maxLife: 1,
      color, size: 3 + state.rng() * 4,
    });
  }
}

export function toast(state, text) {
  state.message = { text, life: 2.2 };
}

export function shiftRemaining(state) {
  return Math.max(0, SHIFT_SECONDS - state.elapsed);
}

export function computeStars(coins) {
  if (coins >= 400) return 3;
  if (coins >= 300) return 2;
  if (coins >= 200) return 1;
  return 0;
}
