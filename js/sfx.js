import { core } from './core.js';
let ctx;
export function initSfx() {
  const wake = () => { try { ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); ctx.resume(); } catch {} };
  addEventListener('pointerdown', wake, { once: false, passive: true });
}
const P = {
  click: [[520, .04, 'square']], hover: [[900, .015, 'sine']], open: [[300, .06, 'triangle'], [520, .08, 'triangle']],
  close: [[420, .05, 'triangle'], [240, .07, 'triangle']], notify: [[660, .07, 'sine'], [880, .1, 'sine']],
  ach: [[523, .08, 'square'], [659, .08, 'square'], [784, .08, 'square'], [1047, .16, 'square']],
  error: [[160, .14, 'sawtooth']], search: [[740, .03, 'sine']], set: [[600, .04, 'triangle']]
};
export function sfx(name) {
  const vol = core.settings.sfxVol; if (!ctx || !vol || ctx.state !== 'running') return;
  let t = ctx.currentTime;
  for (const [f, d, type] of (P[name] || [])) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = f; g.gain.setValueAtTime(.12 * vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + d + .02); t += d * .9;
  }
}
