import { put } from '../util.js';
import { core } from '../core.js';
import { el, img, pills, icon, cover, full } from '../util.js';

export default {
  id: 'gallery', title: 'gall3000', icon: 'gallery', w: 900, h: 600,
  render(body, params) {
    const D = core.data, items = D.art.filter(a => a.status === 'PUBLISHED');
    const S = { tab: 'ALL ART', q: '', sort: 'newest', album: null, project: null };
    const root = el('div', { class: 'app' }); body.append(root);
    const projName = id => core.byId.game?.[id]?.title || core.byId.archive?.[id]?.title || core.byId.radio?.[id]?.title || id;
    const projOf = a => a.game || a.radio || null;
    const q = el('input', { type: 'search', placeholder: 'Search art…', 'aria-label': 'Search art', oninput: e => { S.q = e.target.value; S.tab = 'ALL ART'; draw(); } });
    const so = el('select', { 'aria-label': 'Sort', onchange: e => { S.sort = e.target.value; draw(); } }, [['newest', 'Newest'], ['oldest', 'Oldest'], ['az', 'A–Z']].map(([v, t]) => el('option', { value: v }, t)));
    const tabs = el('div', { class: 'tabs', role: 'tablist' }), tools = el('div', { class: 'tools' }, q, so), main = el('div', { class: 'scroll' });
    root.append(tabs, tools, main);

    function filtered() {
      let L = items.slice();
      if (S.q) { const rk = core.search(S.q, { types: ['art'] }); const rank = new Map(rk.map((r, i) => [r.id, i])); L = L.filter(a => rank.has(a.id)).sort((a, b) => rank.get(a.id) - rank.get(b.id)); }
      if (S.album) L = L.filter(a => a.albums.includes(S.album)); if (S.project) L = L.filter(a => projOf(a) === S.project);
      if (!S.q) { const i = a => items.indexOf(a); L.sort((a, b) => S.sort === 'az' ? a.title.localeCompare(b.title) : (a.date && b.date && a.date !== b.date) ? (S.sort === 'oldest' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)) : S.sort === 'oldest' ? i(b) - i(a) : i(a) - i(b)); }
      return L;
    }
    const tile = (a, L) => el('button', { class: 'card', 'aria-label': a.title, onclick: () => { lightbox(L, L.indexOf(a)); core.sfx('click'); } }, el('div', { class: 'im' }, img(a.id, a.title)), el('div', { class: 'cb' }, el('b', {}, a.title)));
    const group = (title, count, coverId, desc, onclick) => el('button', { class: 'card', onclick }, el('div', { class: 'im' }, cover(coverId)), el('div', { class: 'cb' }, el('b', {}, title), el('span', { class: 'dim' }, count + (count === 1 ? ' work' : ' works'))));

    function draw() {
      put(tabs, ...['ALL ART', 'ALBUMS', 'PROJECTS'].map(t => el('button', { role: 'tab', class: S.tab === t ? 'on' : '', onclick: () => { S.tab = t; S.album = S.project = null; draw(); } }, t)));
      tools.style.display = S.tab === 'ALL ART' ? '' : 'none';
      if (S.tab === 'ALBUMS') return put(main, el('div', { class: 'grid' }, D.albums.map(al => { const n = items.filter(a => a.albums.includes(al.id)).length; return n ? group(al.title, n, al.cover, al.description, () => { S.tab = 'ALL ART'; S.album = al.id; draw(); }) : null; })));
      if (S.tab === 'PROJECTS') {
        const ids = [...new Set(items.map(projOf).filter(Boolean))];
        return put(main, el('div', { class: 'grid' }, ids.map(id => { const L = items.filter(a => projOf(a) === id); return group(projName(id), L.length, L[0].id, '', () => { S.tab = 'ALL ART'; S.project = id; draw(); }); })));
      }
      const L = filtered(), chips = [];
      if (S.album) chips.push(['Album: ' + D.albums.find(a => a.id === S.album).title, () => { S.album = null; draw(); }]);
      if (S.project) chips.push(['Project: ' + projName(S.project), () => { S.project = null; draw(); }]);
      put(main, 
        chips.length ? el('div', { style: { marginBottom: '10px' } }, chips.map(([t, f]) => el('button', { class: 'pill st', onclick: f }, t + ' ✕'))) : null,
        L.length ? el('div', { class: 'grid' }, L.map(a => tile(a, L))) : el('div', { class: 'empty' }, 'No art found.'),
        el('div', { class: 'dim', style: { marginTop: '14px', fontSize: '12px' } }, 'Most pieces are digital collage: stickers combined in Picsart, then edited in Glitch Lab.'));
    }

    // ---- viewer / lightbox ----
    function lightbox(L, i) {
      inst.closeViewer?.(); let z = 1, px = 0, py = 0, timer = null, details = false, secs = 5;
      const stage = el('div', { class: 'stage', tabindex: 0 }), image = el('img', { draggable: 'false', alt: '' }), info = el('div', { class: 'info' }), count = el('span', { class: 'dim' });
      stage.append(image); const xf = () => image.style.transform = `translate(${px}px,${py}px) scale(${z})`;
      const zoom = d => { z = Math.max(1, Math.min(6, z * d)); if (z === 1) px = py = 0; xf(); };
      const go = d => { i = (i + d + L.length) % L.length; z = 1; px = py = 0; show(); };
      const stop = () => { clearInterval(timer); timer = null; put(play, icon('play', 14)); play.title = 'Start slideshow'; };
      const play = el('button', { title: 'Start slideshow', 'aria-label': 'Toggle slideshow', onclick: () => { if (timer) return stop(); timer = setInterval(() => go(1), secs * 1000); put(play, icon('pause', 14)); play.title = 'Pause slideshow'; } }, icon('play', 14));
      const sel = el('select', { 'aria-label': 'Slideshow speed', onchange: e => { secs = +e.target.value; if (timer) { stop(); play.click(); } } }, [3, 5, 8, 12].map(s => el('option', { value: s, selected: s === 5 }, s + 's')));
      const bar = el('div', { class: 'bar' }, el('button', { onclick: () => go(-1), 'aria-label': 'Previous' }, '◀'), el('button', { onclick: () => go(1), 'aria-label': 'Next' }, '▶'), count, el('div', { class: 'sp' }),
        el('button', { onclick: () => zoom(1 / 1.4), 'aria-label': 'Zoom out' }, '−'), el('button', { onclick: () => zoom(1.4), 'aria-label': 'Zoom in' }, '+'), play, sel,
        el('button', { onclick: () => { details = !details; show(); } }, 'DETAILS'), el('button', { onclick: close }, 'CLOSE'));
      const lb = el('div', { class: 'lb', role: 'dialog', 'aria-label': 'Art viewer' }, stage, info, bar);
      function show() {
        const a = L[i]; image.src = full(a.id); image.alt = a.title; xf(); count.textContent = `${i + 1} / ${L.length} · ${a.title}`;
        info.style.display = details ? '' : 'none';
        if (details) {
          const rel = []; if (a.game) { const g = core.byId.game?.[a.game], ar = core.byId.archive?.[a.game]; if (g) rel.push(el('button', { onclick: () => core.open('games', { open: g.id }) }, 'Game: ' + g.title)); else if (ar) rel.push(el('button', { onclick: () => core.open('archive', { open: ar.id }) }, 'Archive: ' + ar.title)); }
          if (a.radio) rel.push(el('button', { onclick: () => core.open('music', { radio: a.radio }) }, 'Radio: ' + core.byId.radio[a.radio].title)); if (a.song) rel.push(el('button', { onclick: () => core.open('music', { song: a.song }) }, 'Song: ' + core.byId.song[a.song].title));
          put(info, el('h3', {}, a.title), el('div', { class: 'dim' }, [a.date, a.category].filter(Boolean).join(' · ')), a.description ? el('p', {}, a.description) : null,
            el('div', {}, a.albums.map(id => D.albums.find(x => x.id === id)).filter(Boolean).map(al => el('button', { class: 'pill', onclick: () => { close(); S.tab = 'ALL ART'; S.album = al.id; draw(); } }, 'Album: ' + al.title)), pills(a.tags)), rel.length ? el('div', { class: 'rel', style: { marginTop: '8px' } }, rel) : null);
        }
      }
      function close() { stop(); lb.remove(); }
      stage.addEventListener('wheel', e => { e.preventDefault(); zoom(e.deltaY < 0 ? 1.15 : 1 / 1.15); }, { passive: false });
      stage.addEventListener('dblclick', () => { z = z > 1 ? 1 : 2.5; if (z === 1) px = py = 0; xf(); });
      stage.addEventListener('contextmenu', e => e.preventDefault());
      stage.addEventListener('pointerdown', e => { if (z <= 1) return; stage.setPointerCapture(e.pointerId); stage.classList.add('pan'); const sx = e.clientX - px, sy = e.clientY - py; const mv = ev => { px = ev.clientX - sx; py = ev.clientY - sy; xf(); }; const up = () => { stage.classList.remove('pan'); stage.removeEventListener('pointermove', mv); stage.removeEventListener('pointerup', up); }; stage.addEventListener('pointermove', mv); stage.addEventListener('pointerup', up); });
      lb.addEventListener('keydown', e => { if (e.key === 'Escape') close(); else if (e.key === 'ArrowRight') go(1); else if (e.key === 'ArrowLeft') go(-1); else if (e.key === '+' || e.key === '=') zoom(1.4); else if (e.key === '-') zoom(1 / 1.4); });
      body.append(lb); show(); stage.focus(); core.track('open_art', { art: L[i].id });
      inst.closeViewer = close;
    }
    const inst = {
      update(p) {
        if (p.album) { S.tab = 'ALL ART'; S.album = p.album; S.project = null; } if (p.project) { S.tab = 'ALL ART'; S.project = p.project; S.album = null; }
        if (p.q != null) { S.q = p.q; q.value = p.q; S.tab = 'ALL ART'; } draw();
        if (p.open) { const L = filtered(), at = L.findIndex(a => a.id === p.open); if (at >= 0) lightbox(L, at); else { const all = items, k = all.findIndex(a => a.id === p.open); if (k >= 0) lightbox(all, k); } }
      },
      destroy() { inst.closeViewer?.(); }
    };
    inst.update(params || {}); return inst;
  }
};
