import { core } from './core.js';
import { el, $, icon } from './util.js';

const layer = () => $('#windows'), list = () => $('#winlist');
const wins = new Map(); let z = 10, cascade = 0, focused = null;
const WORK = () => ({ x: 0, y: 44, w: innerWidth, h: innerHeight - 44 - 52 });

export function openWindow(app, params = {}, opts = {}) {
  const key = opts.key || app.id;
  if (wins.has(key)) { const w = wins.get(key); w.show(); w.focus(); w.inst?.update?.(params); return w; }
  return new Win(key, app, params, opts);
}
export const getWins = () => wins;

class Win {
  constructor(key, app, params, opts) {
    this.key = key; this.app = app; this.max = false; this.min = false; this.prev = null;
    const W = WORK(), small = innerWidth < 760;
    const w = Math.min(opts.w || app.w || 820, W.w - 20), h = Math.min(opts.h || app.h || 560, W.h - 10);
    const x = opts.x ?? Math.max(10, (W.w - w) / 2 + (cascade % 6) * 26 - 60), y = opts.y ?? Math.max(W.y, (W.h - h) / 2 + W.y + (cascade % 6) * 22 - 40);
    cascade++;
    this.body = el('div', { class: 'wb' });
    this.title = el('span', { class: 'ttl' }, opts.title || app.title);
    this.root = el('div', { class: 'win', role: 'dialog', 'aria-label': app.title, style: { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' } },
      this.bar = el('div', { class: 'tb' }, icon(app.icon, 16), this.title,
        el('button', { title: 'Minimize', 'aria-label': 'Minimize', onclick: () => this.minimize() }, icon('min')),
        el('button', { title: 'Maximize', 'aria-label': 'Maximize', onclick: () => this.toggleMax() }, icon('max')),
        el('button', { class: 'x', title: 'Close', 'aria-label': 'Close', onclick: () => this.close() }, icon('close'))),
      this.body, ...['e', 's', 'se'].map(d => el('div', { class: 'rz ' + d, 'data-d': d })));
    layer().append(this.root); wins.set(key, this);
    this.tab = el('button', { class: 'tab', onclick: () => { if (this.min) { this.show(); this.focus(); } else if (focused === this) this.minimize(); else this.focus(); } }, opts.title || app.title);
    list().append(this.tab);
    this.root.addEventListener('pointerdown', () => this.focus(), true);
    this.bar.addEventListener('dblclick', e => { if (!e.target.closest('button')) this.toggleMax(); });
    this.drag(); this.resize();
    if (small) this.toggleMax(true);
    this.inst = app.render(this.body, params, this) || {};
    this.focus(); core.sfx('open'); app.onOpen?.(this);
  }
  setTitle(t) { this.title.textContent = t; this.tab.textContent = t; }
  focus() { if (focused && focused !== this) { focused.root.classList.remove('focus'); focused.tab.classList.remove('on'); } focused = this; this.root.style.zIndex = ++z; this.root.classList.add('focus'); this.tab.classList.add('on'); }
  show() { this.min = false; this.root.classList.remove('hide'); this.tab.classList.remove('min'); }
  minimize() { this.min = true; this.root.classList.add('hide'); this.tab.classList.add('min'); this.tab.classList.remove('on'); core.sfx('close'); }
  close() { this.inst?.destroy?.(); this.root.remove(); this.tab.remove(); wins.delete(this.key); if (focused === this) focused = null; core.sfx('close'); this.app.onClose?.(this); }
  rect() { const s = this.root.style; return { x: parseFloat(s.left), y: parseFloat(s.top), w: parseFloat(s.width), h: parseFloat(s.height) }; }
  setRect(r) { Object.assign(this.root.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' }); }
  toggleMax(force) {
    if (this.max && !force) { this.max = false; if (this.prev) this.setRect(this.prev); return; }
    if (!this.max) this.prev = this.rect(); this.max = true; const W = WORK(); this.setRect({ x: 0, y: W.y, w: W.w, h: W.h });
  }
  snap(side) {
    const W = WORK(); if (!this.max && !this.snapped) this.prev = this.rect();
    this.snapped = true; this.max = false;
    if (side === 'top') { this.max = true; this.setRect({ x: 0, y: W.y, w: W.w, h: W.h }); this.snapped = false; }
    else this.setRect({ x: side === 'left' ? 0 : W.w / 2, y: W.y, w: W.w / 2, h: W.h });
  }
  drag() {
    const hint = $('#snap');
    this.bar.addEventListener('pointerdown', e => {
      if (e.target.closest('button') || e.button) return; this.focus();
      let r = this.rect(); const sx = e.clientX, sy = e.clientY; let moved = false, side = null;
      if (this.max || this.snapped) { // restore size under the pointer
        const pr = this.prev || r, ratio = (e.clientX - r.x) / r.w; this.max = false; this.snapped = false;
        r = { x: e.clientX - pr.w * ratio, y: r.y, w: pr.w, h: pr.h }; this.setRect(r);
      }
      const ox = r.x, oy = r.y; document.body.classList.add('dragging'); this.bar.setPointerCapture(e.pointerId);
      const mv = ev => {
        moved = true; const W = WORK();
        this.root.style.left = (ox + ev.clientX - sx) + 'px'; this.root.style.top = Math.max(W.y - 12, Math.min(innerHeight - 90, oy + ev.clientY - sy)) + 'px';
        side = ev.clientX < 6 ? 'left' : ev.clientX > innerWidth - 6 ? 'right' : ev.clientY < 40 ? 'top' : null;
        if (side) { const hw = side === 'top' ? W.w : W.w / 2; Object.assign(hint.style, { display: 'block', left: (side === 'right' ? W.w / 2 : 0) + 'px', top: W.y + 'px', width: hw + 'px', height: W.h + 'px' }); } else hint.style.display = 'none';
      };
      const up = () => { this.bar.removeEventListener('pointermove', mv); this.bar.removeEventListener('pointerup', up); this.bar.removeEventListener('pointercancel', up); document.body.classList.remove('dragging'); hint.style.display = 'none'; if (moved && side) this.snap(side); };
      this.bar.addEventListener('pointermove', mv); this.bar.addEventListener('pointerup', up); this.bar.addEventListener('pointercancel', up);
    });
  }
  resize() {
    this.root.querySelectorAll('.rz').forEach(h => h.addEventListener('pointerdown', e => {
      e.preventDefault(); e.stopPropagation(); this.focus(); this.max = false; this.snapped = false; const d = h.dataset.d, r = this.rect(), sx = e.clientX, sy = e.clientY; h.setPointerCapture(e.pointerId); document.body.classList.add('dragging');
      const mv = ev => { if (d.includes('e')) this.root.style.width = Math.max(300, r.w + ev.clientX - sx) + 'px'; if (d.includes('s')) this.root.style.height = Math.max(200, r.h + ev.clientY - sy) + 'px'; };
      const up = () => { h.removeEventListener('pointermove', mv); h.removeEventListener('pointerup', up); document.body.classList.remove('dragging'); };
      h.addEventListener('pointermove', mv); h.addEventListener('pointerup', up);
    }));
  }
}
