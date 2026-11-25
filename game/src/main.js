// Bootstrap: canvas, input (mouse + keyboard), the game loop, and the
// screenshot hook (?shot=...&seed=...). Wires state, logic and render.

import { VIEW } from './config.js';
import { newState } from './state.js';
import { update, clickAt, interactNearest, grabByKey, stationAt } from './logic.js';
import { render, pauseButtonRect, muteButtonRect } from './render.js';
import { applyShot } from './shots.js';
import { ensureAudio, setMuted, isMuted, sfx } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const params = new URLSearchParams(window.location.search);
const seedParam = Number(params.get('seed'));
const seed = Number.isFinite(seedParam) && seedParam > 0 ? Math.floor(seedParam) : (Date.now() % 2147483647);
const shot = params.get('shot');

const state = newState(seed);
if (shot) {
  document.body.classList.add('shot');
  applyShot(state, shot);
}

const keys = new Set();
let mouse = { x: 0, y: 0 };

function toGameCoords(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (VIEW.w / rect.width),
    y: (e.clientY - rect.top) * (VIEW.h / rect.height),
  };
}

function pointIn(r, x, y) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

function startButtonRect() { return { x: 490, y: 570, w: 300, h: 64 }; }

canvas.addEventListener('pointerdown', (e) => {
  ensureAudio();
  const p = toGameCoords(e);
  // HUD buttons always work.
  if (pointIn(pauseButtonRect(), p.x, p.y)) {
    if (state.screen === 'playing') { state.paused = !state.paused; }
    return;
  }
  if (pointIn(muteButtonRect(), p.x, p.y)) {
    setMuted(!isMuted());
    return;
  }
  if (state.screen === 'title') {
    if (pointIn(startButtonRect(), p.x, p.y)) {
      state.screen = 'playing';
      state.time = 0; state.elapsed = 0;
      sfx.done();
    }
    return;
  }
  if (state.screen === 'over') {
    if (pointIn(startButtonRect(), p.x, p.y)) {
      const fresh = newState((Date.now() % 2147483647) || 1);
      Object.assign(state, fresh);
      state.screen = 'playing';
      sfx.done();
    }
    return;
  }
  clickAt(state, p.x, p.y);
});

canvas.addEventListener('pointermove', (e) => {
  const p = toGameCoords(e);
  mouse = p;
  state.hover = null;
  if (state.screen === 'playing') {
    const st = stationAt(p.x, p.y);
    if (st && st.kind === 'bins') state.hover = st;
  }
});

window.addEventListener('keydown', (e) => {
  ensureAudio();
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
  if (e.key === 'p' || e.key === 'P') {
    if (state.screen === 'playing') state.paused = !state.paused;
    return;
  }
  if (e.key === 'm' || e.key === 'M') { setMuted(!isMuted()); return; }
  if (e.key === ' ' || e.key === 'Enter') {
    if (state.screen === 'title') { state.screen = 'playing'; sfx.done(); return; }
    if (state.screen === 'over') {
      const fresh = newState((Date.now() % 2147483647) || 1);
      Object.assign(state, fresh);
      state.screen = 'playing';
      return;
    }
    interactNearest(state);
    return;
  }
  if (e.key >= '1' && e.key <= '7') {
    if (state.screen === 'playing' && !state.paused) grabByKey(state, e.key);
    return;
  }
  keys.add(e.key);
});

window.addEventListener('keyup', (e) => keys.delete(e.key));
window.addEventListener('blur', () => keys.clear());

// Expose a little for debugging in the console.
window.__kitchen = { state };

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  state.time += dt;
  update(state, dt, keys);
  render(ctx, state);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
