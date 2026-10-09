export const $ = (s, r = document) => r.querySelector(s);
export function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    e.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return e;
}
export const store = {
  get(k, d) { try { const v = localStorage.getItem('rectorium:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('rectorium:' + k, JSON.stringify(v)); } catch {} }
};
export const fmtTime = s => { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
export function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
export const thumb = id => `assets/img/thumb/${id}.webp`;
export const full = id => `assets/img/full/${id}.webp`;
export const reduced = () => document.body.classList.contains('reduce');
export function img(id, alt = '', big = false) {
  return el('img', { src: big ? full(id) : thumb(id), alt, loading: 'lazy', draggable: 'false', oncontextmenu: e => e.preventDefault() });
}
export function cover(id, label = 'NO COVER') { return id ? img(id) : el('div', { class: 'noimg' }, label); }
export function pills(list, onclick) {
  return (list || []).map(t => onclick ? el('button', { class: 'pill', onclick: () => onclick(t) }, '#' + t) : el('span', { class: 'pill' }, '#' + t));
}
export { icon } from './icons.js';
// Like replaceChildren, but accepts nested arrays / null / strings (same rules as el()).
export function put(parent, ...kids) {
  parent.replaceChildren(...kids.flat(Infinity).filter(k => k != null && k !== false).map(k => k.nodeType ? k : document.createTextNode(String(k))));
}
