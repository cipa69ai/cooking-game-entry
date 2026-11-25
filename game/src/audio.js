// Tiny synthesized sound effects with plain WebAudio — no audio files.
// Everything is guarded: no AudioContext exists until the player's first
// gesture, and every call is a no-op while muted or unavailable.

let ctx = null;
let muted = false;

export function setMuted(value) { muted = value; }
export function isMuted() { return muted; }

export function ensureAudio() {
  if (ctx || muted) return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) ctx = new AC();
  } catch (_e) { ctx = null; }
}

function tone(freq, dur, type, vol, when = 0) {
  if (!ctx || muted) return;
  try {
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  } catch (_e) { /* sound is decoration; never break the game */ }
}

function noise(dur, vol, when = 0) {
  if (!ctx || muted) return;
  try {
    const t0 = ctx.currentTime + when;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(gain); gain.connect(ctx.destination);
    src.start(t0);
  } catch (_e) { /* sound is decoration */ }
}

export const sfx = {
  pickup() { tone(520, 0.08, 'triangle', 0.12); },
  chop() { noise(0.09, 0.18); tone(180, 0.06, 'square', 0.05); },
  sizzle() { noise(0.35, 0.10); },
  done() { tone(660, 0.1, 'sine', 0.14); tone(880, 0.14, 'sine', 0.14, 0.09); },
  serve() { tone(523, 0.1, 'triangle', 0.16); tone(659, 0.1, 'triangle', 0.16, 0.08); tone(784, 0.18, 'triangle', 0.16, 0.16); },
  error() { tone(160, 0.18, 'sawtooth', 0.10); },
  angry() { tone(220, 0.2, 'sawtooth', 0.12); tone(180, 0.25, 'sawtooth', 0.12, 0.15); },
  tick() { tone(880, 0.05, 'sine', 0.08); },
  win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.16, i * 0.12)); },
  lose() { [392, 330, 262].forEach((f, i) => tone(f, 0.25, 'triangle', 0.14, i * 0.14)); },
};
