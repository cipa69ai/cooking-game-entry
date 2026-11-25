// All drawing: kitchen, stations, chef, customers, tickets, HUD and the
// title / game-over screens. Reads state, draws nothing else.

import {
  VIEW, STATIONS, binRect, INGREDIENTS, INGREDIENT_ORDER, RECIPES,
  CUSTOMERS, PALETTE, SHIFT_SECONDS, WIN_COINS,
} from './config.js';
import { ticketRect } from './logic.js';
import { plateMatchesRecipe, shiftRemaining } from './state.js';

function rr(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, align = 'center', weight = 'bold') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px "Trebuchet MS", Verdana, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

// --- Food icons -----------------------------------------------------------

export function drawIngredient(ctx, id, x, y, size, state) {
  const def = INGREDIENTS[id];
  const s = size / 2;
  ctx.save();
  ctx.translate(x, y);
  if (state === 'burnt') {
    ctx.fillStyle = '#2b2b2b';
    ctx.beginPath(); ctx.arc(0, 0, s, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#555'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-s * 0.5, -s * 0.5); ctx.lineTo(s * 0.5, s * 0.5);
    ctx.moveTo(s * 0.5, -s * 0.5); ctx.lineTo(-s * 0.5, s * 0.5); ctx.stroke();
    ctx.restore();
    return;
  }
  switch (id) {
    case 'bun':
      ctx.fillStyle = def.color;
      ctx.beginPath(); ctx.arc(0, -s * 0.25, s * 0.95, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#f7dc9a';
      ctx.fillRect(-s * 0.95, -s * 0.25, s * 1.9, s * 0.35);
      ctx.fillStyle = def.color;
      ctx.beginPath(); ctx.arc(0, s * 0.55, s * 0.95, 0, Math.PI); ctx.fill();
      ctx.fillStyle = '#fff';
      for (const [sx, sy] of [[-0.4, -0.55], [0.1, -0.7], [0.45, -0.45]]) {
        ctx.beginPath(); ctx.arc(sx * s, sy * s, s * 0.08, 0, Math.PI * 2); ctx.fill();
      }
      break;
    case 'patty':
      ctx.fillStyle = state === 'cooked' ? '#6e4426' : def.color;
      rr(ctx, -s, -s * 0.45, s * 2, s * 0.9, s * 0.4); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      rr(ctx, -s * 0.8, -s * 0.2, s * 1.6, s * 0.18, s * 0.09); ctx.fill();
      break;
    case 'lettuce': {
      ctx.fillStyle = def.color;
      ctx.beginPath();
      for (let i = 0; i <= 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const r = s * (i % 2 === 0 ? 1 : 0.72);
        const px = Math.cos(a) * r, py = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = def.dark; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -s * 0.7); ctx.stroke();
      break;
    }
    case 'tomato':
      ctx.fillStyle = def.color;
      ctx.beginPath(); ctx.arc(0, 0, s * 0.95, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f2836f';
      ctx.beginPath(); ctx.arc(0, 0, s * 0.62, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffd9d0';
      ctx.beginPath(); ctx.arc(-s * 0.2, -s * 0.2, s * 0.2, 0, Math.PI * 2); ctx.fill();
      break;
    case 'cheese':
      ctx.fillStyle = def.color;
      ctx.beginPath(); ctx.moveTo(-s, s * 0.7); ctx.lineTo(s, s * 0.7); ctx.lineTo(0, -s * 0.8); ctx.closePath(); ctx.fill();
      ctx.fillStyle = def.dark;
      for (const [hx, hy] of [[-0.3, 0.25], [0.25, 0.1], [0, 0.45]]) {
        ctx.beginPath(); ctx.arc(hx * s, hy * s, s * 0.11, 0, Math.PI * 2); ctx.fill();
      }
      break;
    case 'pasta':
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(0, s * 0.15, s * 0.95, 0, Math.PI); ctx.fill();
      ctx.strokeStyle = def.color; ctx.lineWidth = s * 0.22; ctx.lineCap = 'round';
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(-s * 0.7, i * s * 0.3);
        ctx.quadraticCurveTo(0, i * s * 0.3 - s * 0.25, s * 0.7, i * s * 0.3);
        ctx.stroke();
      }
      break;
    case 'sauce':
      ctx.fillStyle = def.color;
      ctx.beginPath(); ctx.arc(0, s * 0.2, s * 0.8, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(0, -s * 0.3, s * 0.45, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath(); ctx.arc(-s * 0.25, -s * 0.05, s * 0.18, 0, Math.PI * 2); ctx.fill();
      break;
    default:
      break;
  }
  ctx.restore();
}

// --- Kitchen ---------------------------------------------------------------

function drawFloor(ctx) {
  const tile = 64;
  for (let y = 216; y < 800; y += tile) {
    for (let x = 0; x < 1280; x += tile) {
      const even = ((x / tile) + (y / tile)) % 2 === 0;
      ctx.fillStyle = even ? PALETTE.floorA : PALETTE.floorB;
      ctx.fillRect(x, y, tile, tile);
    }
  }
  // Wall band above the floor.
  ctx.fillStyle = PALETTE.wallTop;
  ctx.fillRect(0, 200, 1280, 16);
  ctx.fillStyle = PALETTE.wall;
  ctx.fillRect(0, 96, 1280, 104);
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.fillRect(0, 196, 1280, 4);
}

// Flat floor dressing: a work rug, a potted herb plant, and the faint dashed
// route that shows the kitchen's flow (bins → board → stove → plate → serve).
function drawFloorDressing(ctx) {
  // Rug.
  ctx.fillStyle = '#a86f3e';
  rr(ctx, 300, 520, 680, 200, 18); ctx.fill();
  ctx.strokeStyle = '#8a5a30'; ctx.lineWidth = 4;
  rr(ctx, 312, 532, 656, 176, 12); ctx.stroke();
  ctx.fillStyle = '#8a5a30';
  ctx.beginPath(); ctx.arc(640, 620, 52, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#c98f5f';
  ctx.beginPath(); ctx.arc(640, 620, 40, 0, Math.PI * 2); ctx.fill();
  text(ctx, 'S & S', 640, 621, 20, '#8a5a30');
  // Potted herb plant, bottom-left.
  ctx.fillStyle = '#b8542e';
  rr(ctx, 216, 700, 44, 40, 6); ctx.fill();
  ctx.fillStyle = '#58b368';
  for (const [lx, ly, lr] of [[228, 690, 16], [248, 678, 18], [238, 668, 14]]) {
    ctx.beginPath(); ctx.arc(lx, ly, lr, 0, Math.PI * 2); ctx.fill();
  }
  // Dashed route: bins → board → stove → plate → serve.
  ctx.strokeStyle = 'rgba(255,246,230,0.30)';
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 10]);
  ctx.beginPath();
  ctx.moveTo(204, 430);
  ctx.lineTo(340, 430);
  ctx.lineTo(630, 430);
  ctx.lineTo(930, 430);
  ctx.lineTo(1150, 500);
  ctx.stroke();
  ctx.setLineDash([]);
  // Small arrowheads along the route.
  ctx.fillStyle = 'rgba(255,246,230,0.35)';
  for (const [ax, ay] of [[272, 430], [485, 430], [780, 430], [1040, 465]]) {
    ctx.beginPath();
    ctx.moveTo(ax, ay - 6); ctx.lineTo(ax + 12, ay); ctx.lineTo(ax, ay + 6);
    ctx.closePath(); ctx.fill();
  }
}

function drawCounter(ctx, st, topColor) {
  ctx.fillStyle = PALETTE.counter;
  rr(ctx, st.x, st.y, st.w, st.h, 10); ctx.fill();
  ctx.fillStyle = topColor || PALETTE.counterTop;
  rr(ctx, st.x + 4, st.y + 4, st.w - 8, 26, 8); ctx.fill();
  ctx.fillStyle = PALETTE.counterEdge;
  ctx.fillRect(st.x + 4, st.y + st.h - 6, st.w - 8, 4);
}

function drawBins(ctx, state) {
  const st = STATIONS.bins;
  drawCounter(ctx, st);
  text(ctx, 'INGREDIENTS', st.x + st.w / 2, st.y + 18, 13, '#fff6e6');
  for (let i = 0; i < INGREDIENT_ORDER.length; i++) {
    const id = INGREDIENT_ORDER[i];
    const r = binRect(i);
    const def = INGREDIENTS[id];
    ctx.fillStyle = '#f5efe0';
    rr(ctx, r.x, r.y, r.w, r.h, 8); ctx.fill();
    ctx.strokeStyle = def.dark; ctx.lineWidth = 2;
    rr(ctx, r.x, r.y, r.w, r.h, 8); ctx.stroke();
    drawIngredient(ctx, id, r.x + r.w / 2, r.y + r.h / 2 - 4, 34);
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(r.x + 10, r.y + 10, 9, 0, Math.PI * 2); ctx.fill();
    text(ctx, def.key, r.x + 10, r.y + 11, 11, PALETTE.ink);
    text(ctx, def.name, r.x + r.w / 2, r.y + r.h - 9, 10, PALETTE.inkSoft);
  }
  // Hover highlight for the bin under the mouse.
  if (state.hover && state.hover.kind === 'bins' && state.hover.id) {
    const i = INGREDIENT_ORDER.indexOf(state.hover.id);
    const r = binRect(i);
    ctx.strokeStyle = PALETTE.gold; ctx.lineWidth = 3;
    rr(ctx, r.x - 2, r.y - 2, r.w + 4, r.h + 4, 10); ctx.stroke();
  }
}

function drawBoard(ctx, state) {
  const st = STATIONS.board;
  drawCounter(ctx, st, PALETTE.board);
  text(ctx, 'CHOPPING BOARD', st.x + st.w / 2, st.y + 18, 12, PALETTE.inkSoft);
  // Knife.
  ctx.save();
  ctx.translate(st.x + 170, st.y + 70);
  ctx.rotate(state.chopping ? Math.sin(state.time * 18) * 0.35 : -0.5);
  ctx.fillStyle = '#d7dee3'; rr(ctx, 0, -6, 46, 12, 4); ctx.fill();
  ctx.fillStyle = '#5d3a1e'; rr(ctx, -22, -5, 24, 10, 4); ctx.fill();
  ctx.restore();
  if (state.chopping) {
    const p = state.chopping.done / state.chopping.total;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.arc(st.x + 80, st.y + 72, 34, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = PALETTE.green; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.arc(st.x + 80, st.y + 72, 30, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2); ctx.stroke();
    drawIngredient(ctx, state.chopping.id, st.x + 80, st.y + 72, 34, 'raw');
    text(ctx, 'CHOPPING…', st.x + st.w / 2, st.y + st.h - 14, 11, PALETTE.inkSoft);
  }
}

function drawStove(ctx, state) {
  const st = STATIONS.stove;
  drawCounter(ctx, st, PALETTE.steel);
  text(ctx, 'STOVE', st.x + st.w / 2, st.y + 18, 12, PALETTE.inkSoft);
  for (let i = 0; i < 2; i++) {
    const cx = st.x + 70 + i * 120;
    const cy = st.y + 65;
    const slot = state.burners[i];
    ctx.fillStyle = '#2e2118';
    ctx.beginPath(); ctx.arc(cx, cy, 44, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = PALETTE.steelDark; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(cx, cy, 44, 0, Math.PI * 2); ctx.stroke();
    if (slot) {
      // Flame ring while cooking.
      if (!slot.done) {
        ctx.fillStyle = 'rgba(242,120,40,0.85)';
        ctx.beginPath(); ctx.arc(cx, cy, 48 + Math.sin(state.time * 10 + i) * 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#2e2118';
        ctx.beginPath(); ctx.arc(cx, cy, 42, 0, Math.PI * 2); ctx.fill();
      }
      const need = INGREDIENTS[slot.id].cookSeconds;
      const p = Math.min(1, slot.cookedFor / need);
      const col = slot.burnt ? '#2b2b2b' : slot.done ? PALETTE.green : PALETTE.gold;
      ctx.strokeStyle = col; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(cx, cy, 38, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2); ctx.stroke();
      drawIngredient(ctx, slot.id, cx, cy, 44, slot.burnt ? 'burnt' : slot.done ? 'cooked' : 'raw');
      if (slot.done && !slot.burnt) text(ctx, 'READY!', cx, st.y + st.h - 12, 12, PALETTE.green);
      if (slot.burnt) text(ctx, 'BURNT!', cx, st.y + st.h - 12, 12, PALETTE.red);
    } else {
      ctx.fillStyle = '#4a4a4a';
      ctx.beginPath(); ctx.arc(cx, cy, 18, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function drawPlateStation(ctx, state) {
  const st = STATIONS.plate;
  drawCounter(ctx, st, PALETTE.plateWhite);
  text(ctx, 'PLATING', st.x + st.w / 2, st.y + 18, 12, PALETTE.inkSoft);
  const cx = st.x + st.w / 2, cy = st.y + 72;
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.ellipse(cx, cy, 74, 30, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#d9d2c2'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(cx, cy, 74, 30, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#ece5d3';
  ctx.beginPath(); ctx.ellipse(cx, cy, 56, 21, 0, 0, Math.PI * 2); ctx.fill();
  // Items on the plate, stacked.
  state.plate.forEach((id, i) => {
    drawIngredient(ctx, id, cx - 34 + i * 34, cy - 6 - (i % 2) * 8, 34);
  });
  const match = state.plate.length > 0 && state.orders.some((o) => plateMatchesRecipe(state.plate, o.recipe));
  if (match) {
    const pulse = 0.6 + 0.4 * Math.sin(state.time * 6);
    ctx.strokeStyle = `rgba(247,201,72,${pulse})`; ctx.lineWidth = 4;
    rr(ctx, st.x - 4, st.y - 4, st.w + 8, st.h + 8, 12); ctx.stroke();
    text(ctx, 'READY TO SERVE!', cx, st.y + st.h - 12, 12, '#7a5b00');
  } else if (state.plate.length > 0) {
    text(ctx, 'building…', cx, st.y + st.h - 12, 11, '#fff6e6');
  }}

function drawServe(ctx, state) {
  const st = STATIONS.serve;
  ctx.fillStyle = '#5d3a1e';
  rr(ctx, st.x, st.y, st.w, st.h, 10); ctx.fill();
  ctx.fillStyle = '#3a2412';
  rr(ctx, st.x + 10, st.y + 10, st.w - 20, st.h - 20, 8); ctx.fill();
  ctx.fillStyle = '#f7c948';
  ctx.beginPath(); ctx.arc(st.x + st.w / 2, st.y + 52, 16, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2e2118';
  ctx.fillRect(st.x + st.w / 2 - 3, st.y + 30, 6, 12);
  text(ctx, 'SERVE', st.x + st.w / 2, st.y + 92, 16, '#fff6e6');
  text(ctx, 'click a ticket', st.x + st.w / 2, st.y + 116, 11, '#d9c48a');
  text(ctx, 'or the window', st.x + st.w / 2, st.y + 134, 11, '#d9c48a');
  // A little bell and a tray.
  ctx.fillStyle = '#b9c4cc';
  rr(ctx, st.x + 28, st.y + 168, st.w - 56, 10, 5); ctx.fill();
  ctx.fillStyle = '#8a97a1';
  ctx.beginPath(); ctx.arc(st.x + st.w / 2, st.y + 196, 18, Math.PI, 0); ctx.fill();
  ctx.fillRect(st.x + st.w / 2 - 18, st.y + 196, 36, 4);
}

function drawTrash(ctx) {
  const st = STATIONS.trash;
  ctx.fillStyle = '#7d8891';
  rr(ctx, st.x, st.y, st.w, st.h, 8); ctx.fill();
  ctx.fillStyle = '#5d666e';
  rr(ctx, st.x - 4, st.y - 8, st.w + 8, 14, 6); ctx.fill();
  text(ctx, 'TRASH', st.x + st.w / 2, st.y + st.h / 2 + 12, 12, '#fff');
}

function drawChef(ctx, state) {
  const c = state.chef;
  const bob = c.moving ? Math.sin(state.time * 14) * 3 : 0;
  const x = c.x, y = c.y + bob * 0.3;
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(x, c.y + 24, 26, 8, 0, 0, Math.PI * 2); ctx.fill();
  // Body (apron).
  ctx.fillStyle = '#f5f2ea';
  rr(ctx, x - 20, y - 8, 40, 40, 12); ctx.fill();
  ctx.fillStyle = '#3f7de8';
  ctx.fillRect(x - 20, y + 14, 40, 6);
  // Head.
  ctx.fillStyle = '#f2c09a';
  ctx.beginPath(); ctx.arc(x, y - 22, 17, 0, Math.PI * 2); ctx.fill();
  // Chef hat.
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(x - 10, y - 36, 10, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 10, y - 36, 10, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x, y - 40, 11, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(x - 14, y - 38, 28, 8);
  // Eyes.
  ctx.fillStyle = '#2e2118';
  ctx.beginPath(); ctx.arc(x - 6 * c.facing, y - 24, 2.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 6 * c.facing, y - 24, 2.2, 0, Math.PI * 2); ctx.fill();
  // Chopping animation: knife arm.
  if (c.busyKind === 'chop' && c.busy > 0) {
    ctx.strokeStyle = '#d7dee3'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    const k = Math.sin(state.time * 18) * 10;
    ctx.beginPath(); ctx.moveTo(x + 18, y - 4); ctx.lineTo(x + 30, y + 8 + k); ctx.stroke();
  }
  // Carried item above the head.
  if (state.carrying) {
    ctx.fillStyle = 'rgba(255,246,230,0.9)';
    ctx.beginPath(); ctx.arc(x, y - 66, 20, 0, Math.PI * 2); ctx.fill();
    drawIngredient(ctx, state.carrying.id, x, y - 66, 30, state.carrying.state);
  }
}

// --- Order board -----------------------------------------------------------

function drawTicket(ctx, state, order, index) {
  const r = ticketRect(index);
  const recipe = RECIPES[order.recipe];
  const cust = CUSTOMERS[order.customer];
  const frac = Math.max(0, order.patience / order.maxPatience);
  const urgent = frac < 0.3;
  ctx.save();
  if (urgent) ctx.translate(Math.sin(state.time * 20) * 1.5, 0);
  ctx.fillStyle = PALETTE.ticket;
  rr(ctx, r.x, r.y, r.w, r.h, 10); ctx.fill();
  ctx.strokeStyle = urgent ? PALETTE.red : PALETTE.ticketEdge; ctx.lineWidth = urgent ? 3 : 2;
  rr(ctx, r.x, r.y, r.w, r.h, 10); ctx.stroke();
  // Customer face.
  ctx.fillStyle = cust.skin;
  ctx.beginPath(); ctx.arc(r.x + 26, r.y + 26, 18, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = cust.hair;
  ctx.beginPath(); ctx.arc(r.x + 26, r.y + 16, 18, Math.PI, 0); ctx.fill();
  ctx.fillStyle = cust.shirt;
  ctx.fillRect(r.x + 10, r.y + 42, 32, 12);
  // Recipe name + items.
  text(ctx, recipe.name.toUpperCase(), r.x + 52, r.y + 18, 13, PALETTE.ink, 'left');
  recipe.items.forEach((id, i) => {
    drawIngredient(ctx, id, r.x + 66 + i * 34, r.y + 46, 28);
  });
  text(ctx, `$${recipe.price}`, r.x + r.w - 12, r.y + 18, 13, '#7a5b00', 'right');
  // Patience bar.
  ctx.fillStyle = '#e5dcc4';
  rr(ctx, r.x + 10, r.y + r.h - 16, r.w - 20, 8, 4); ctx.fill();
  ctx.fillStyle = frac > 0.5 ? PALETTE.timerGreen : frac > 0.25 ? PALETTE.timerAmber : PALETTE.timerRed;
  rr(ctx, r.x + 10, r.y + r.h - 16, (r.w - 20) * frac, 8, 4); ctx.fill();
  // Serve-ready ring.
  if (state.plate.length > 0 && plateMatchesRecipe(state.plate, order.recipe)) {
    const pulse = 0.6 + 0.4 * Math.sin(state.time * 6);
    ctx.strokeStyle = `rgba(88,179,104,${pulse})`; ctx.lineWidth = 4;
    rr(ctx, r.x - 3, r.y - 3, r.w + 6, r.h + 6, 12); ctx.stroke();
    text(ctx, 'SERVE!', r.x + r.w - 12, r.y + r.h - 26, 11, PALETTE.green, 'right');
  }
  ctx.restore();
}

function drawOrderBoard(ctx, state) {
  text(ctx, 'ORDER BOARD', 24, 116, 13, '#d9c48a', 'left');
  if (state.orders.length === 0) {
    ctx.fillStyle = 'rgba(255,248,225,0.25)';
    rr(ctx, 24, 128, 240, 68, 10); ctx.fill();
    text(ctx, 'No orders yet —', 144, 152, 13, '#fff6e6');
    text(ctx, 'the rush is coming…', 144, 172, 13, '#fff6e6');
  }
  state.orders.forEach((o, i) => drawTicket(ctx, state, o, i));
}

// --- HUD -------------------------------------------------------------------

export function pauseButtonRect() { return { x: 1150, y: 24, w: 52, h: 48 }; }
export function muteButtonRect() { return { x: 1210, y: 24, w: 52, h: 48 }; }

function drawHUD(ctx, state) {
  ctx.fillStyle = '#3a2412';
  ctx.fillRect(0, 0, 1280, 96);
  ctx.fillStyle = '#5d3a1e';
  ctx.fillRect(0, 92, 1280, 4);
  // Coins.
  ctx.fillStyle = PALETTE.gold;
  ctx.beginPath(); ctx.arc(48, 48, 20, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#7a5b00';
  text(ctx, '$', 48, 49, 20, '#7a5b00');
  text(ctx, `${state.coins}`, 76, 48, 28, '#fff6e6', 'left');
  text(ctx, `goal ${WIN_COINS} for 3 stars`, 76, 76, 12, '#d9c48a', 'left');
  // Combo.
  if (state.combo > 1) {
    ctx.fillStyle = '#7ec850';
    rr(ctx, 220, 28, 110, 40, 20); ctx.fill();
    text(ctx, `COMBO x${Math.min(2, 1 + (state.combo - 1) * 0.1).toFixed(1)}`, 275, 49, 15, '#fff');
  }
  // Timer.
  const remain = state.frozen ? SHIFT_SECONDS - state.elapsed : shiftRemaining(state);
  const mm = Math.floor(remain / 60), ss = Math.floor(remain % 60);
  const frac = remain / SHIFT_SECONDS;
  const tcol = frac > 0.5 ? PALETTE.timerGreen : frac > 0.25 ? PALETTE.timerAmber : PALETTE.timerRed;
  ctx.fillStyle = '#2e2118';
  rr(ctx, 420, 30, 440, 36, 18); ctx.fill();
  ctx.fillStyle = tcol;
  rr(ctx, 424, 34, 432 * frac, 28, 14); ctx.fill();
  text(ctx, `${mm}:${String(ss).padStart(2, '0')}`, 640, 48, 22, '#fff');
  text(ctx, 'SHIFT', 640, 82, 11, '#d9c48a');
  // Hearts.
  for (let i = 0; i < 3; i++) {
    const hx = 920 + i * 40, hy = 48;
    ctx.fillStyle = i < state.hearts ? PALETTE.red : 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.moveTo(hx, hy + 10);
    ctx.bezierCurveTo(hx - 16, hy - 6, hx - 8, hy - 18, hx, hy - 8);
    ctx.bezierCurveTo(hx + 8, hy - 18, hx + 16, hy - 6, hx, hy + 10);
    ctx.fill();
  }
  text(ctx, 'HEARTS', 958, 82, 11, '#d9c48a');
  // Pause / mute buttons.
  for (const [rect, label, active] of [
    [pauseButtonRect(), state.paused ? '▶' : '❚❚', state.paused],
    [muteButtonRect(), '♪', false],
  ]) {
    ctx.fillStyle = active ? PALETTE.gold : '#5d3a1e';
    rr(ctx, rect.x, rect.y, rect.w, rect.h, 10); ctx.fill();
    ctx.strokeStyle = '#d9c48a'; ctx.lineWidth = 2;
    rr(ctx, rect.x, rect.y, rect.w, rect.h, 10); ctx.stroke();
    text(ctx, label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 1, 18, '#fff6e6');
  }
  if (state.paused) {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 96, 1280, 704);
    text(ctx, 'PAUSED', 640, 380, 54, '#fff6e6');
    text(ctx, 'Press P or the pause button to keep cooking', 640, 430, 18, '#d9c48a');
  }
}

// --- Particles, popups, toast ----------------------------------------------

function drawFx(ctx, state) {
  for (const p of state.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const p of state.popups) {
    ctx.globalAlpha = Math.min(1, p.life);
    text(ctx, p.text, p.x, p.y, 20, p.color);
  }
  ctx.globalAlpha = 1;
  if (state.message) {
    ctx.globalAlpha = Math.min(1, state.message.life);
    ctx.fillStyle = 'rgba(46,33,24,0.85)';
    const w = ctx.measureText(state.message.text).width + 40;
    rr(ctx, 640 - w / 2, 220, w, 40, 20); ctx.fill();
    text(ctx, state.message.text, 640, 241, 16, '#fff6e6');
    ctx.globalAlpha = 1;
  }
}

// --- Screens ---------------------------------------------------------------

function drawTitle(ctx, state) {
  ctx.fillStyle = 'rgba(30,18,10,0.72)';
  ctx.fillRect(0, 96, 1280, 704);
  text(ctx, 'SIZZLE & SERVE', 640, 220, 72, '#f7c948');
  text(ctx, 'R U S H   H O U R   K I T C H E N', 640, 272, 22, '#fff6e6');
  text(ctx, 'Take orders. Chop, cook, plate, serve — before the customers walk out!', 640, 320, 19, '#fff6e6');
  const lines = [
    'CLICK a station to walk there and use it — or WASD to move, SPACE to use',
    'Keys 1–7 grab ingredients · click the chopping board to chop, the stove to cook',
    'Build the dish on the PLATING counter, then click its ticket (or the SERVE window)',
    'Serve fast for tips · keep the combo alive · 3 lost customers ends the shift',
    'Reach 400 coins for 3 stars!',
  ];
  ctx.fillStyle = 'rgba(255,246,230,0.12)';
  rr(ctx, 300, 350, 680, 190, 16); ctx.fill();
  lines.forEach((l, i) => text(ctx, l, 640, 382 + i * 34, 16, '#fff6e6'));
  const pulse = 0.75 + 0.25 * Math.sin(state.time * 4);
  ctx.fillStyle = `rgba(247,201,72,${pulse})`;
  rr(ctx, 490, 570, 300, 64, 32); ctx.fill();
  text(ctx, '▶  START SHIFT', 640, 603, 24, '#3a2412');
  text(ctx, 'A 3-minute shift · recipes get harder as the rush builds', 640, 668, 14, '#d9c48a');
}

function drawStars(ctx, x, y, n) {
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i < n ? PALETTE.gold : 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    for (let k = 0; k < 10; k++) {
      const a = -Math.PI / 2 + (k * Math.PI) / 5;
      const r = k % 2 === 0 ? 26 : 11;
      const px = x + i * 70 + Math.cos(a) * r, py = y + Math.sin(a) * r;
      if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill();
  }
}

function drawGameOver(ctx, state) {
  ctx.fillStyle = 'rgba(30,18,10,0.78)';
  ctx.fillRect(0, 96, 1280, 704);
  text(ctx, state.stars > 0 ? 'SHIFT COMPLETE!' : 'SHIFT OVER', 640, 210, 56, '#f7c948');
  drawStars(ctx, 570, 290, state.stars);
  const rows = [
    ['Coins earned', `${state.coins}`],
    ['Dishes served', `${state.served}`],
    ['Customers lost', `${state.lost}`],
    ['Best combo', `x${Math.min(2, 1 + (state.bestCombo - 1) * 0.1).toFixed(1)} (${state.bestCombo} in a row)`],
    ['Goal', state.coins >= 400 ? '3 stars — kitchen legend!' : state.coins >= 300 ? '2 stars — solid shift!' : state.coins >= 200 ? '1 star — the kitchen survived!' : 'Under 200 coins — the rush won this time'],
  ];
  rows.forEach(([k, v], i) => {
    text(ctx, k, 480, 360 + i * 38, 18, '#d9c48a', 'right');
    text(ctx, v, 510, 360 + i * 38, 18, '#fff6e6', 'left');
  });
  const pulse = 0.75 + 0.25 * Math.sin(state.time * 4);
  ctx.fillStyle = `rgba(247,201,72,${pulse})`;
  rr(ctx, 490, 570, 300, 64, 32); ctx.fill();
  text(ctx, '↻  COOK AGAIN', 640, 603, 24, '#3a2412');
}

// --- Main render ------------------------------------------------------------

export function render(ctx, state) {
  ctx.save();
  ctx.clearRect(0, 0, VIEW.w, VIEW.h);
  if (state.shake > 0) {
    const m = state.shake * 8;
    ctx.translate((Math.random() - 0.5) * m, (Math.random() - 0.5) * m);
  }
  drawFloor(ctx);
  drawFloorDressing(ctx);
  drawBins(ctx, state);
  drawBoard(ctx, state);
  drawStove(ctx, state);
  drawPlateStation(ctx, state);
  drawServe(ctx, state);
  drawTrash(ctx);
  drawOrderBoard(ctx, state);
  drawChef(ctx, state);
  drawFx(ctx, state);
  drawHUD(ctx, state);
  if (state.screen === 'title') drawTitle(ctx, state);
  if (state.screen === 'over') drawGameOver(ctx, state);
  ctx.restore();
}
