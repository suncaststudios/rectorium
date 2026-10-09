import { core } from './core.js';
import { reduced } from './util.js';
// Subtle animated ASCII wallpaper. Colour follows the theme; reacts gently to music when enabled.
export function startWall(canvas) {
  const g = canvas.getContext('2d'), ramp = ' .·:-=+*#', cell = 16; let w, h, cols, rows, t = 0, last = 0;
  const color = () => getComputedStyle(document.documentElement).getPropertyValue('--accent-rgb').trim() || '233,233,233';
  function size() { const r = devicePixelRatio || 1; w = canvas.width = innerWidth * r; h = canvas.height = innerHeight * r; cols = Math.ceil(innerWidth / cell); rows = Math.ceil(innerHeight / cell); g.scale(1, 1); }
  addEventListener('resize', size); size();
  function draw(now) {
    requestAnimationFrame(draw);
    const still = reduced(); if (!still && now - last < 66) return; if (still && t) return; last = now;
    const r = devicePixelRatio || 1, lv = core.settings.wallReact && core.music ? core.music.level() : 0;
    g.setTransform(r, 0, 0, r, 0, 0); g.clearRect(0, 0, innerWidth, innerHeight); g.font = '14px ui-monospace,Consolas,monospace'; g.textBaseline = 'top';
    const c = color(); t += .03;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const v = (Math.sin(x * .21 + t) + Math.sin(y * .27 - t * .8) + Math.sin((x + y) * .12 + t * .5) + 3) / 6 + lv * .35 * Math.sin(x * .3 - t * 4);
      const i = Math.max(0, Math.min(ramp.length - 1, Math.floor(v * ramp.length)));
      if (i < 2) continue; g.fillStyle = `rgba(${c},${.035 + i * .009})`; g.fillText(ramp[i], x * cell, y * cell);
    }
    if (still) t = 1;
  }
  requestAnimationFrame(draw);
}
