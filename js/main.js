import { core } from './core.js';
import { $, el, store, icon, thumb, put } from './util.js';
import { sfx, initSfx } from './sfx.js';
import { music } from './audio.js';
import { buildIndex, runSearch } from './search.js';
import { startWall } from './wall.js';
import { openWindow, getWins } from './wm.js';
import { setAnalytics, logEvent } from './analytics.js';
import games from './apps/games.js';
import gallery from './apps/gallery.js';
import music_app, { player } from './apps/music.js';
import blog from './apps/blog.js';
import { about, socials, archive, settings } from './apps/misc.js';

const APPS = { games, gallery, music: music_app, player, blog, about, archive, socials, settings };
const ICONS = [ // fixed desktop objects: [app, label, left%, top%]
  ['games', 'GameStore v8.21', 12, 30], ['gallery', 'gall3000', 12, 52], ['music', 'Mus.IC', 12, 74],
  ['blog', 'blogPOST.app', 88, 22], ['about', 'About / Info', 88, 40], ['socials', 'Socials', 88, 58], ['archive', 'Archive', 88, 76]];
const VISIT = { games: 1, gallery: 1, music: 1, blog: 1 };

async function main() {
  const res = await fetch('data/content.json'); const data = await res.json(); core.data = data;
  const rm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  core.settings = { theme: 'mono', musicVol: .7, sfxVol: .5, reduceMotion: rm, wallReact: true, analytics: true, ...store.get('settings', {}) };
  core.byId = { game: Object.fromEntries(data.games.map(x => [x.id, x])), archive: Object.fromEntries(data.archive.map(x => [x.id, x])), radio: Object.fromEntries(data.radios.map(x => [x.id, x])), song: Object.fromEntries(data.songs.map(x => [x.id, x])) };
  core.index = buildIndex(data); core.search = runSearch;
  core.applySettings = () => { document.documentElement.dataset.theme = core.settings.theme; document.body.classList.toggle('reduce', !!core.settings.reduceMotion); music.audio.volume = core.settings.musicVol; };
  core.applySettings(); initSfx(); core.sfx = sfx; music.init();
  core.track = (n, p) => { if (core.settings.analytics) logEvent(n, p); };
  $('#clock-name').textContent = data.site.name; $('#clock-desc').textContent = data.site.description; document.title = data.site.name;

  // ---- notifications + achievements ----
  const hist = []; let unread = 0; const badge = $('#notifbtn .n'), panel = $('#notifpanel');
  core.notify = (title, text = '', kind) => {
    hist.unshift({ title, text }); unread++; badge.textContent = unread; badge.style.display = '';
    const t = el('div', { class: 'toast', role: 'status' }, el('b', {}, title), text ? el('small', {}, text) : null); const tb = $('#toasts'); tb.append(t); while (tb.children.length > 3) tb.firstChild.remove(); setTimeout(() => t.remove(), 3800); sfx(kind === 'ach' ? 'ach' : 'notify');
  };
  let have = new Set(store.get('ach', [])); const listeners = new Set();
  core.achieved = () => [...have]; core.onAchieve = f => { listeners.add(f); return () => listeners.delete(f); };
  core.unlock = id => { if (!id || have.has(id)) return; const a = data.achievements.find(x => x.id === id); if (!a) return; have.add(id); store.set('ach', [...have]); core.notify('ACHIEVEMENT: ' + a.name, a.desc, 'ach'); listeners.forEach(f => f()); };
  core.resetProgress = () => { have = new Set(); store.set('ach', []); store.set('opened', []); store.set('music', null); listeners.forEach(f => f()); core.notify('PROGRESS RESET'); };
  $('#notifbtn').addEventListener('click', () => {
    put(panel, ...(hist.length ? hist.map(h => el('div', { class: 'it' }, el('b', {}, h.title), h.text ? el('div', { class: 'dim' }, h.text) : null)) : [el('div', { class: 'it dim' }, 'No notifications.')]));
    panel.classList.toggle('open'); unread = 0; badge.style.display = 'none'; sfx('click');
  });
  badge.style.display = 'none';
  addEventListener('pointerdown', e => { if (!e.target.closest('#notifpanel,#notifbtn')) panel.classList.remove('open'); });

  // ---- opening apps ----
  const opened = new Set(store.get('opened', []));
  core.open = (id, params = {}, opts) => {
    const app = APPS[id]; if (!app) return; const w = openWindow(app, params, opts);
    if (!opened.has(id) && id !== 'player') { opened.add(id); store.set('opened', [...opened]); core.track('open_app', { app: id }); }
    if ([...opened].filter(x => x !== 'player').length >= 5) core.unlock('shopping');
    if (Object.keys(VISIT).every(k => opened.has(k))) core.unlock('rounded');
    if (location.hash && id !== 'player') history.replaceState(null, '', location.pathname + location.search);
    return w;
  };
  core.ensurePlayer = () => { const w = getWins(); if (!w.has('music') && !w.has('player')) openWindow(player, {}); };

  // ---- desktop ----
  const box = $('#icons');
  ICONS.forEach(([id, label, x, y]) => { const b = el('button', { class: 'icon', style: { left: x + '%', top: y + '%' }, onclick: () => { core.open(id); sfx('click'); }, onmouseenter: () => sfx('hover') }, icon(id), el('span', {}, label)); box.append(b); });
  $('#gear').append(icon('gear')); $('#gear').onclick = () => { core.open('settings'); sfx('click'); };
  $('#notifbtn').prepend(icon('bell')); $('#searchwrap').prepend(icon('search'));
  const tick = () => { const d = new Date(); $('#clock').textContent = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); $('#date').textContent = d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }); };
  tick(); setInterval(tick, 10000); startWall($('#wall'));

  // ---- global search ----
  const input = $('#gsearch'), out = $('#results'); let sel = -1, cur = [];
  const KIND = { game: 'GAME', art: 'ART', album: 'ALBUM', song: 'SONG', radio: 'RADIO', post: 'POST', archive: 'ARCHIVE', social: 'SOCIAL', about: 'ABOUT' };
  const openRec = r => { const p = r.params || (r.type === 'about' || r.type === 'social' ? {} : { open: r.id }); core.open(r.app, p); out.classList.remove('open'); input.blur(); core.track('search_open', { type: r.type }); };
  const paint = () => {
    const q = input.value.trim(); if (!q) { out.classList.remove('open'); return; }
    cur = runSearch(q).slice(0, 14); sel = cur.length ? 0 : -1; out.classList.add('open');
    put(out, ...(cur.length ? cur.map((r, i) => el('button', { class: 'res' + (i === sel ? ' sel' : ''), onclick: () => openRec(r), onmouseenter: () => sfx('hover') }, r.cover ? el('img', { src: thumb(r.cover), alt: '' }) : el('span', { style: { width: '34px' } }), el('div', { class: 't' }, el('b', {}, r.title), el('small', {}, r.sub || '')), el('span', { class: 'k' }, KIND[r.type]))) : [el('div', { class: 'nores' }, 'No results for “' + q + '”.')]));
  };
  input.addEventListener('input', () => { paint(); });
  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') { out.classList.remove('open'); input.blur(); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (!cur.length) return; sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + cur.length) % cur.length; [...out.children].forEach((c, i) => c.classList.toggle('sel', i === sel)); out.children[sel]?.scrollIntoView({ block: 'nearest' }); }
    if (e.key === 'Enter') {
      const q = input.value.trim().toLowerCase(); if (EGGS[q]) { EGGS[q](); input.value = ''; out.classList.remove('open'); input.blur(); return; }
      if (cur[sel]) openRec(cur[sel]); else sfx('error');
    }
  });
  addEventListener('keydown', e => { if (e.key === '/' && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); input.focus(); sfx('search'); } });
  addEventListener('pointerdown', e => { if (!e.target.closest('#searchwrap')) out.classList.remove('open'); });
  input.addEventListener('focus', () => { if (input.value) paint(); });

  // ---- easter egg: advertisements.com (exact match + Enter only, never affects normal search) ----
  const ADS = [['HOT SINGLES', 'in your area! (they are all just Damage Roll cards)'], ['DOWNLOAD MORE RAM', '100% real. Trust me.'], ['YOU WON!!!', "You are visitor #1,000,000. Prize: this ad."], ['LISTEN TO vivi4nite', 'Music so good it has its own ad.'], ['PLAY DAMAGE ROLL', 'Everything is decided by a 1d6. Fair!'], ['YOUR PC HAS 0 VIRUSES', 'Click to get 1 free.'], ['ONE WEIRD TRICK', 'Close this ad. Doctors hate it.'], ['FREE WALLPAPER', 'You are already looking at it.'], ['BUY 1 GET 1 SOUNDWAVE', 'Limited time. Time is a construct.'], ['LOCAL ASCII WANTS TO MEET', 'It is only 12 characters away.'], ['CLICK HERE', 'No, really. Here.'], ['ARE YOU BORED?', 'Open an app. Any app.']];
  function ads() {
    core.unlock('adblock'); const layer = $('#ads'), clear = $('#adclear'); const n = core.settings.reduceMotion ? 8 : 14; clear.style.display = 'block';
    for (let i = 0; i < n; i++) setTimeout(() => {
      const [t, d] = ADS[Math.floor(Math.random() * ADS.length)], ad = el('div', { class: 'ad', style: { left: Math.random() * Math.max(10, innerWidth - 250) + 'px', top: 50 + Math.random() * Math.max(10, innerHeight - 220) + 'px' } },
        el('div', { class: 'ah' }, el('span', {}, 'AD'), el('button', { 'aria-label': 'Close ad', onclick: () => { ad.remove(); sfx('close'); if (!layer.children.length) clear.style.display = 'none'; } }, 'X')), el('div', { class: 'ab' }, el('b', {}, t), d));
      layer.append(ad); sfx('error');
    }, core.settings.reduceMotion ? 0 : i * 220);
    core.notify('ADVERTISEMENTS.COM', 'Oh no. Ads.');
  }
  const EGGS = { 'advertisements.com': ads, 'https://advertisements.com': ads, 'www.advertisements.com': ads };
  $('#adclear').onclick = () => { $('#ads').replaceChildren(); $('#adclear').style.display = 'none'; sfx('close'); };

  // ---- boot + deep links ----
  const route = () => {
    const m = location.hash.match(/^#([a-z]+)(?:\/([\w.\-]+))?/); if (!m || !APPS[m[1]] || m[1] === 'player') return;
    const p = m[2] ? (m[1] === 'music' ? { song: m[2] } : { open: m[2] }) : {}; core.open(m[1], p);
  };
  addEventListener('hashchange', route);
  const boot = $('#boot'); setTimeout(() => { boot.classList.add('off'); route(); }, core.settings.reduceMotion ? 50 : 800); setTimeout(() => boot.remove(), 1400);
  if (core.settings.analytics) setAnalytics(true);
  window.rectorium = core; // handy for debugging in the console
}
main().catch(e => { console.error(e); document.getElementById('boot').innerHTML = '<pre>BOOT FAILED\n' + e.message + '\n(open this site over http, not file://)</pre>'; });
