// Screenshot demo states: ?shot=start|play|serve|rush (with &seed=N).
// Each builds a fixed, readable scene from the game's own state so the
// screenshots the maker takes are real renders of the game itself.

import { newState, newOrder } from './state.js';
import { RECIPES } from './config.js';

function placeOrder(state, recipe, patienceFrac) {
  const o = newOrder(state);
  o.recipe = recipe;
  o.patience = o.maxPatience * patienceFrac;
  return o;
}

export function applyShot(state, shot) {
  state.frozen = true; // the clock does not run in a screenshot
  if (shot === 'start') {
    state.screen = 'title';
    state.coins = 0;
    placeOrder(state, 'burger', 0.8);
    placeOrder(state, 'salad', 0.6);
    return;
  }
  state.screen = 'playing';
  if (shot === 'play') {
    state.elapsed = 46; state.time = 46;
    state.coins = 240; state.combo = 2; state.bestCombo = 2;
    placeOrder(state, 'burger', 0.75);
    placeOrder(state, 'pasta', 0.55);
    state.plate = ['bun', 'patty'];
    state.carrying = { id: 'lettuce', state: 'raw' };
    state.chef.x = 340; state.chef.y = 470; state.chef.tx = 340; state.chef.ty = 470;
    state.burners[0] = { id: 'pasta', cookedFor: 5, done: false, burnt: false };
    return;
  }
  if (shot === 'serve') {
    state.elapsed = 88; state.time = 88;
    state.coins = 360; state.combo = 4; state.bestCombo = 4;
    placeOrder(state, 'burger', 0.6);
    placeOrder(state, 'salad', 0.85);
    state.plate = ['bun', 'patty', 'lettuce'];
    state.chef.x = 930; state.chef.y = 470; state.chef.tx = 930; state.chef.ty = 470;
    state.burners[1] = { id: 'patty', cookedFor: 6, done: true, burnt: false };
    return;
  }
  if (shot === 'rush') {
    state.elapsed = 133; state.time = 133;
    state.coins = 520; state.combo = 6; state.bestCombo = 6;
    placeOrder(state, 'deluxe', 0.22);
    placeOrder(state, 'pasta', 0.45);
    placeOrder(state, 'burger', 0.65);
    placeOrder(state, 'salad', 0.3);
    state.plate = ['pasta', 'sauce'];
    state.carrying = { id: 'cheese', state: 'chopped' };
    state.chef.x = 930; state.chef.y = 470; state.chef.tx = 930; state.chef.ty = 470;
    state.burners[0] = { id: 'patty', cookedFor: 6, done: true, burnt: false };
    state.burners[1] = { id: 'pasta', cookedFor: 7.2, done: false, burnt: false };
    return;
  }
  // Unknown shot: plain title.
  state.screen = 'title';
}

// The four screenshots the entry ships, in the order they appear in the
// dossier (the first by name is the cover — the play shot, which shows the
// whole game at once: kitchen, order board, ingredients, a dish mid-assembly,
// the timer and the stove at work).
export const SHOT_LIST = [
  { name: '1-play.png', query: '?shot=play&seed=1' },
  { name: '2-serve.png', query: '?shot=serve&seed=1' },
  { name: '3-rush.png', query: '?shot=rush&seed=1' },
  { name: '4-start.png', query: '?shot=start&seed=1' },
];
