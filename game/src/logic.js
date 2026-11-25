// Game logic: one tick of the shift. Movement, station work, cooking,
// chopping, orders, patience, serving and scoring. No drawing here.

import {
  CHEF_SPEED, CHEF_RADIUS, CHOP_SECONDS, BURN_AFTER_SECONDS,
  SHIFT_SECONDS, MAX_HEARTS, STATIONS, binRect, INGREDIENTS,
  INGREDIENT_ORDER, RECIPES, WIN_COINS,
} from './config.js';
import {
  maybeSpawnOrder, preparedId, matchingOrder, addPopup, burst, toast,
  computeStars,
} from './state.js';
import { sfx } from './audio.js';

const FLOOR = { x: 16, y: 216, w: 1248, h: 568 };
const SOLIDS = [STATIONS.bins, STATIONS.board, STATIONS.stove, STATIONS.plate, STATIONS.serve, STATIONS.trash];

const LANE_Y = 540; // the open lane below the counters (all stations end above y=520)
const LANE_X_MIN = 204; // right of the ingredient bins

function expandedSolids() {
  return SOLIDS.map((s) => ({ x: s.x - CHEF_RADIUS + 6, y: s.y - CHEF_RADIUS + 6, w: s.w + (CHEF_RADIUS - 6) * 2, h: s.h + (CHEF_RADIUS - 6) * 2 }));
}

function pointInExpanded(x, y) {
  for (const r of expandedSolids()) {
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return true;
  }
  return false;
}

// Does the straight walk from (x1,y1) to (x2,y2) cut through a counter?
function segmentBlocked(x1, y1, x2, y2) {
  const dist = Math.hypot(x2 - x1, y2 - y1);
  const steps = Math.max(1, Math.ceil(dist / 8));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (pointInExpanded(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t)) return true;
  }
  return false;
}

function clampChef(p) {
  p.x = Math.max(FLOOR.x + CHEF_RADIUS, Math.min(FLOOR.x + FLOOR.w - CHEF_RADIUS, p.x));
  p.y = Math.max(FLOOR.y + CHEF_RADIUS, Math.min(FLOOR.y + FLOOR.h - CHEF_RADIUS, p.y));
}

function collides(x, y) {
  for (const s of SOLIDS) {
    if (x > s.x - CHEF_RADIUS + 6 && x < s.x + s.w + CHEF_RADIUS - 6 &&
        y > s.y - CHEF_RADIUS + 6 && y < s.y + s.h + CHEF_RADIUS - 6) return true;
  }
  return false;
}

function arrive(state) {
  const chef = state.chef;
  // More waypoints left? Head for the next one; otherwise we are there.
  if (chef.wps && chef.wps.length > 0) {
    const [nx, ny] = chef.wps.shift();
    chef.tx = nx; chef.ty = ny;
    chef.stuckFor = 0;
    return;
  }
  chef.x = chef.tx; chef.y = chef.ty;
  chef.moving = false; chef.stuckFor = 0;
  if (chef.onArrive) { const fn = chef.onArrive; chef.onArrive = null; fn(); }
}

function moveChef(state, dt, keys) {
  const chef = state.chef;
  if (chef.busy > 0) return; // chopping keeps the chef at the board
  let dx = 0, dy = 0;
  if (keys.has('ArrowLeft') || keys.has('a') || keys.has('A')) dx -= 1;
  if (keys.has('ArrowRight') || keys.has('d') || keys.has('D')) dx += 1;
  if (keys.has('ArrowUp') || keys.has('w') || keys.has('W')) dy -= 1;
  if (keys.has('ArrowDown') || keys.has('s') || keys.has('S')) dy += 1;
  if (dx !== 0 || dy !== 0) {
    chef.moving = false; // keyboard overrides click-to-move
    chef.wps = []; chef.onArrive = null;
    const len = Math.hypot(dx, dy);
    const step = CHEF_SPEED * dt;
    const nx = chef.x + (dx / len) * step;
    const ny = chef.y + (dy / len) * step;
    if (!collides(nx, chef.y)) chef.x = nx;
    if (!collides(chef.x, ny)) chef.y = ny;
    if (dx !== 0) chef.facing = dx > 0 ? 1 : -1;
    clampChef(chef);
    return;
  }
  if (chef.moving) {
    // Stuck guard: only ticks where the chef barely moved count — a long
    // walk is fine, but hugging a counter edge forever is not.
    if (chef._px !== undefined) {
      const moved = Math.hypot(chef.x - chef._px, chef.y - chef._py);
      chef.stuckFor = moved < 0.5 ? (chef.stuckFor || 0) + dt : 0;
      if (chef.stuckFor > 0.8) {
        chef.moving = false; chef.stuckFor = 0; chef.wps = []; chef.onArrive = null;
        return;
      }
    }
    chef._px = chef.x; chef._py = chef.y;
    const tx = chef.tx, ty = chef.ty;
    const dx2 = tx - chef.x, dy2 = ty - chef.y;
    const dist = Math.hypot(dx2, dy2);
    const step = CHEF_SPEED * dt;
    if (dist <= step + 2) {
      arrive(state);
    } else {
      const nx = chef.x + (dx2 / dist) * step;
      const ny = chef.y + (dy2 / dist) * step;
      if (!collides(nx, chef.y)) chef.x = nx;
      if (!collides(chef.x, ny)) chef.y = ny;
      if (dx2 !== 0) chef.facing = dx2 > 0 ? 1 : -1;
      clampChef(chef);
      if (Math.abs(chef.x - tx) < 4 && Math.abs(chef.y - ty) < 4) arrive(state);
    }
  }
}

export function walkTo(state, x, y, onArrive) {
  const chef = state.chef;
  // Route around the counters: if the straight walk cuts through one, go
  // down to the open lane (y=540, right of the bins), across, then up.
  const wps = [];
  if (segmentBlocked(chef.x, chef.y, x, y)) {
    const lx = Math.max(LANE_X_MIN, Math.min(1264, chef.x));
    if (Math.abs(chef.y - LANE_Y) > 4) wps.push([lx, LANE_Y]);
    const tx2 = Math.max(LANE_X_MIN, Math.min(1264, x));
    const lastX = wps.length ? wps[wps.length - 1][0] : chef.x;
    if (Math.abs(tx2 - lastX) > 4) wps.push([tx2, LANE_Y]);
    wps.push([x, y]);
  } else {
    wps.push([x, y]);
  }
  chef.wps = wps.slice(1);
  const [fx, fy] = wps[0];
  chef.tx = fx; chef.ty = fy;
  chef.moving = true;
  chef.onArrive = onArrive || null;
}

function nearestStationPoint(x, y) {
  // Return { kind, ... } for the station whose use point is closest.
  const pts = [
    { kind: 'board', ...STATIONS.board.use },
    { kind: 'stove', ...STATIONS.stove.use },
    { kind: 'plate', ...STATIONS.plate.use },
    { kind: 'serve', ...STATIONS.serve.use },
    { kind: 'trash', ...STATIONS.trash.use },
  ];
  let best = null, bestD = Infinity;
  for (const p of pts) {
    const d = Math.hypot(p.x - x, p.y - y);
    if (d < bestD) { bestD = d; best = p; }
  }
  return bestD < 130 ? best : null;
}

function binAt(x, y) {
  for (let i = 0; i < INGREDIENT_ORDER.length; i++) {
    const r = binRect(i);
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return INGREDIENT_ORDER[i];
  }
  return null;
}

function burnerAt(x, y) {
  for (let i = 0; i < 2; i++) {
    const cx = STATIONS.stove.x + 70 + i * 120;
    const cy = STATIONS.stove.y + 65;
    if (Math.hypot(x - cx, y - cy) < 46) return i;
  }
  return -1;
}

function pointIn(r, x, y) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

export function stationAt(x, y) {
  if (pointIn(STATIONS.bins, x, y)) return { kind: 'bins', id: binAt(x, y) };
  if (pointIn(STATIONS.board, x, y)) return { kind: 'board' };
  if (pointIn(STATIONS.stove, x, y)) return { kind: 'stove', burner: burnerAt(x, y) };
  if (pointIn(STATIONS.plate, x, y)) return { kind: 'plate' };
  if (pointIn(STATIONS.serve, x, y)) return { kind: 'serve' };
  if (pointIn(STATIONS.trash, x, y)) return { kind: 'trash' };
  return null;
}

// --- Interactions ---------------------------------------------------------

function grabIngredient(state, id) {
  if (!id) return;
  if (state.carrying) { toast(state, 'Hands full — serve or trash it first'); sfx.error(); return; }
  if (state.chef.busy > 0) return;
  state.carrying = { id, state: 'raw' };
  sfx.pickup();
}

function useBoard(state) {
  const c = state.carrying;
  if (!c) { toast(state, 'Bring something to chop'); return; }
  if (INGREDIENTS[c.id].prep !== 'chop' || c.state !== 'raw') {
    toast(state, `${INGREDIENTS[c.id].name} doesn't need chopping`);
    sfx.error();
    return;
  }
  if (state.chopping) return;
  state.chopping = { id: c.id, done: 0, total: CHOP_SECONDS };
  state.carrying = null;
  state.chef.busy = CHOP_SECONDS;
  state.chef.busyKind = 'chop';
  sfx.chop();
}

function useStove(state, burner) {
  if (burner < 0) return;
  const slot = state.burners[burner];
  if (slot) {
    // Pick the item back up (if it is cooked or burnt).
    if (state.carrying) { toast(state, 'Hands full'); sfx.error(); return; }
    state.carrying = { id: slot.id, state: slot.done ? (slot.burnt ? 'burnt' : 'cooked') : 'raw' };
    state.burners[burner] = null;
    sfx.pickup();
    return;
  }
  const c = state.carrying;
  if (!c) { toast(state, 'Bring something to cook'); return; }
  if (INGREDIENTS[c.id].prep !== 'cook' || c.state !== 'raw') {
    toast(state, `${INGREDIENTS[c.id].name} doesn't go on the stove`);
    sfx.error();
    return;
  }
  state.burners[burner] = { id: c.id, cookedFor: 0, done: false, burnt: false };
  state.carrying = null;
  sfx.sizzle();
}

function usePlate(state) {
  const c = state.carrying;
  if (!c) {
    if (state.plate.length) toast(state, 'Plate holds: ' + state.plate.map((id) => INGREDIENTS[id].name).join(' + '));
    return;
  }
  const ready = preparedId(c);
  if (!ready) {
    toast(state, `${INGREDIENTS[c.id].name} isn't ready yet — chop it or cook it first`);
    sfx.error();
    return;
  }
  if (state.plate.includes(ready)) {
    toast(state, `Already on the plate`);
    sfx.error();
    return;
  }
  state.plate.push(ready);
  state.carrying = null;
  sfx.done();
  burst(state, STATIONS.plate.x + 120, STATIONS.plate.y + 60, '#f7c948', 8);
}

function useServe(state) {
  const match = matchingOrder(state);
  if (!match) {
    if (state.plate.length === 0) toast(state, 'Build a dish on the plate first');
    else toast(state, "That plate doesn't match any order yet");
    sfx.error();
    return;
  }
  serveOrder(state, match);
}

function serveOrder(state, order) {
  const recipe = RECIPES[order.recipe];
  const patienceLeft = Math.max(0, order.patience / order.maxPatience);
  const tip = Math.round(50 * patienceLeft);
  state.combo += 1;
  state.bestCombo = Math.max(state.bestCombo, state.combo);
  const mult = Math.min(2, 1 + (state.combo - 1) * 0.1);
  const earned = Math.round((recipe.price + tip) * mult);
  state.coins += earned;
  state.served += 1;
  state.orders = state.orders.filter((o) => o.id !== order.id);
  state.plate = [];
  const cx = STATIONS.serve.x + 78, cy = STATIONS.serve.y + 120;
  addPopup(state, cx, cy - 40, `+${earned} coins`, '#f7c948');
  if (state.combo > 1) addPopup(state, cx, cy - 10, `Combo x${mult.toFixed(1)}`, '#7ec850');
  burst(state, cx, cy, '#f7c948', 16);
  sfx.serve();
}

function useTrash(state) {
  if (state.carrying) {
    state.carrying = null;
    sfx.error();
    toast(state, 'Tossed it');
    return;
  }
  if (state.plate.length) {
    state.plate = [];
    toast(state, 'Plate cleared');
    sfx.error();
  }
}

// Click (or Space) on a station: walk there, then act.
export function clickAt(state, x, y) {
  if (state.screen !== 'playing' || state.paused || state.chef.busy > 0) return;
  const st = stationAt(x, y);
  if (st && st.kind === 'bins' && st.id) {
    walkTo(state, STATIONS.bins.x + STATIONS.bins.w + 30, (binRect(INGREDIENT_ORDER.indexOf(st.id)).y + 29), () => grabIngredient(state, st.id));
    return;
  }
  if (st && st.kind === 'board') { walkTo(state, STATIONS.board.use.x, STATIONS.board.use.y, () => useBoard(state)); return; }
  if (st && st.kind === 'stove') {
    const b = st.burner;
    walkTo(state, STATIONS.stove.use.x, STATIONS.stove.use.y, () => useStove(state, b));
    return;
  }
  if (st && st.kind === 'plate') { walkTo(state, STATIONS.plate.use.x, STATIONS.plate.use.y, () => usePlate(state)); return; }
  if (st && st.kind === 'serve') { walkTo(state, STATIONS.serve.use.x, STATIONS.serve.use.y, () => useServe(state)); return; }
  if (st && st.kind === 'trash') { walkTo(state, STATIONS.trash.use.x, STATIONS.trash.use.y, () => useTrash(state)); return; }
  // Clicking an order ticket serves it when the plate matches.
  for (const o of state.orders) {
    const r = ticketRect(state.orders.indexOf(o));
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
      walkTo(state, STATIONS.serve.use.x, STATIONS.serve.use.y, () => useServe(state));
      return;
    }
  }
  // Otherwise just walk there.
  walkTo(state, x, y, null);
}

export function ticketRect(index) {
  return { x: 24 + index * 256, y: 104, w: 240, h: 92 };
}

export function interactNearest(state) {
  if (state.screen !== 'playing' || state.paused || state.chef.busy > 0) return;
  const near = nearestStationPoint(state.chef.x, state.chef.y);
  if (!near) return;
  if (near.kind === 'board') useBoard(state);
  else if (near.kind === 'stove') {
    const b = state.burners[0] ? (state.burners[1] ? -1 : 1) : 0;
    useStove(state, b);
  } else if (near.kind === 'plate') usePlate(state);
  else if (near.kind === 'serve') useServe(state);
  else if (near.kind === 'trash') useTrash(state);
}

export function grabByKey(state, key) {
  const id = INGREDIENT_ORDER.find((ing) => INGREDIENTS[ing].key === key);
  if (!id) return;
  const i = INGREDIENT_ORDER.indexOf(id);
  walkTo(state, STATIONS.bins.x + STATIONS.bins.w + 30, binRect(i).y + 29, () => grabIngredient(state, id));
}

// --- Per-frame update -----------------------------------------------------

function updateCooking(state, dt) {
  for (let i = 0; i < 2; i++) {
    const slot = state.burners[i];
    if (!slot) continue;
    slot.cookedFor += dt;
    const need = INGREDIENTS[slot.id].cookSeconds;
    if (!slot.done && slot.cookedFor >= need) {
      slot.done = true;
      sfx.done();
      burst(state, STATIONS.stove.x + 70 + i * 120, STATIONS.stove.y + 65, '#7ec850', 8);
    }
    if (slot.done && !slot.burnt && slot.cookedFor >= need + BURN_AFTER_SECONDS) {
      slot.burnt = true;
      sfx.angry();
      toast(state, `${INGREDIENTS[slot.id].name} burnt! Trash it.`);
    }
  }
  if (state.chopping) {
    state.chopping.done += dt;
    state.chef.busy = Math.max(0, state.chef.busy - dt);
    if (state.chopping.done >= state.chopping.total) {
      const id = state.chopping.id;
      state.chopping = null;
      state.chef.busy = 0;
      state.chef.busyKind = null;
      state.carrying = { id, state: 'chopped' };
      sfx.done();
      burst(state, STATIONS.board.x + 110, STATIONS.board.y + 65, '#7ec850', 10);
    }
  }
}

function updateOrders(state, dt) {
  maybeSpawnOrder(state, dt);
  for (const o of [...state.orders]) {
    o.patience -= dt;
    if (o.patience <= 0) {
      state.orders = state.orders.filter((x) => x.id !== o.id);
      state.lost += 1;
      state.combo = 0;
      state.hearts -= 1;
      state.shake = 0.4;
      sfx.angry();
      toast(state, `${RECIPES[o.recipe].name} walked out! -1 heart`);
      if (state.hearts <= 0) endShift(state);
    }
  }
}

function endShift(state) {
  state.shiftOver = true;
  state.screen = 'over';
  state.stars = computeStars(state.coins);
  if (state.stars > 0) sfx.win(); else sfx.lose();
}

export function update(state, dt, keys) {
  if (state.screen !== 'playing' || state.paused || state.frozen) {
    updateFx(state, dt);
    return;
  }
  state.elapsed += dt;
  state.time += dt;
  const remain = SHIFT_SECONDS - state.elapsed;
  const sec = Math.ceil(remain);
  if (sec !== state.lastTickSecond) {
    state.lastTickSecond = sec;
    if (sec <= 10 && sec > 0) sfx.tick();
  }
  if (remain <= 0) { endShift(state); return; }

  moveChef(state, dt, keys);
  updateCooking(state, dt);
  updateOrders(state, dt);
  updateFx(state, dt);
}

function updateFx(state, dt) {
  for (const p of state.particles) {
    p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 160 * dt; p.life -= dt;
  }
  state.particles = state.particles.filter((p) => p.life > 0);
  for (const p of state.popups) { p.y -= 30 * dt; p.life -= dt; }
  state.popups = state.popups.filter((p) => p.life > 0);
  if (state.message) {
    state.message.life -= dt;
    if (state.message.life <= 0) state.message = null;
  }
  if (state.shake > 0) state.shake = Math.max(0, state.shake - dt);
}

export { WIN_COINS, MAX_HEARTS };
