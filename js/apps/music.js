import { put } from '../util.js';
import { core } from '../core.js';
import { music, drawVis } from '../audio.js';
import { el, cover, img, fmtTime, pills, icon, reduced } from '../util.js';

const accent = () => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#fff';
const radioTitle = s => s.radios.map(r => core.byId.radio[r].title).join(', ');
const modeBadge = () => el('span', { class: 'pill st' }, music.mode === 'radio' ? 'RADIO MODE' : 'ALBUM MODE');

// Shared transport: used by both the compact player and the full app's now-playing bar.
function transport() {
  const prog = el('input', { type: 'range', class: 'prog', min: 0, max: 1000, value: 0, 'aria-label': 'Seek', oninput: e => { const d = music.audio.duration || music.song?.duration || 0; music.seek(e.target.value / 1000 * d); } });
  const tcur = el('span', { class: 'dim' }, '0:00'), tdur = el('span', { class: 'dim' }, '0:00');
  const bPrev = el('button', { 'aria-label': 'Previous', onclick: () => music.prev() }, icon('prev', 14)), bNext = el('button', { 'aria-label': 'Next', onclick: () => music.next() }, icon('next', 14));
  const bPlay = el('button', { 'aria-label': 'Play / pause', onclick: () => { core.sfx('click'); music.toggle(); } });
  const vol = el('input', { type: 'range', min: 0, max: 100, value: Math.round(core.settings.musicVol * 100), 'aria-label': 'Music volume', style: { width: '90px' }, oninput: e => music.setVolume(e.target.value / 100) });
  const mode = el('button', { title: 'Switch between RADIO mode (live, no controls) and ALBUM mode', onclick: () => music.setMode(music.mode === 'radio' ? 'album' : 'radio') });
  const node = el('div', {}, el('div', { class: 'ctl' }, bPrev, bPlay, bNext, mode, el('span', { class: 'sp', style: { flex: 1 } }), icon('sound', 14), vol), el('div', { class: 'ctl' }, tcur, prog, tdur));
  prog.style.flex = 1;
  const upd = () => {
    const can = music.canControl, d = music.audio.duration || music.song?.duration || 0;
    bPrev.disabled = bNext.disabled = !can; prog.disabled = !can; bPlay.disabled = !can && music.playing;
    put(bPlay, icon(music.playing ? 'pause' : 'play', 14)); mode.textContent = music.mode === 'radio' ? 'RADIO' : 'ALBUM';
    tcur.textContent = fmtTime(music.audio.currentTime); tdur.textContent = fmtTime(d); if (document.activeElement !== prog) prog.value = d ? music.audio.currentTime / d * 1000 : 0;
  };
  return { node, upd };
}
function loop(canvas, until) {
  let raf; const f = () => { if (!canvas.isConnected) return; if (!reduced()) drawVis(canvas, accent()); raf = requestAnimationFrame(f); }; f(); return () => cancelAnimationFrame(raf);
}

export const player = {
  id: 'player', title: 'PLAYER', icon: 'music', w: 330, h: 470,
  onOpen: () => {},
  render(body, params, win) {
    music.register(win.key);
    const t = transport(), cv = el('div', { class: 'cov' }), name = el('b', {}), sub = el('div', { class: 'dim' }), vis = el('canvas', { class: 'vis' }), badge = el('div');
    const root = el('div', { class: 'pl' }, cv, el('div', {}, name, sub, badge), vis, t.node,
      el('div', { class: 'ctl' }, el('button', { onclick: () => core.open('music', { radio: music.radio, song: music.song?.id }) }, 'EXPAND'), el('button', { onclick: () => core.open('music', { radio: music.radio }) }, 'OPEN RADIO'), el('button', { onclick: () => win.minimize() }, 'HIDE')));
    body.append(root); let shown = null;
    const upd = () => {
      const s = music.song; if (!s) return; if (shown !== s.id) { shown = s.id; put(cv, img(s.cover, s.title, true)); name.textContent = s.title; sub.textContent = radioTitle(s); put(badge, modeBadge()); win.setTitle('♪ ' + s.title); }
      put(badge, modeBadge()); cv.classList.toggle('pulse', music.playing && !reduced()); t.upd();
    };
    const off = music.on(upd); upd(); const stopVis = loop(vis);
    return { destroy() { off(); stopVis(); music.unregister(win.key); } };
  }
};

export default {
  id: 'music', title: 'Mus.IC', icon: 'music', w: 880, h: 600,
  render(body, params, win) {
    music.register(win.key); const D = core.data;
    const S = { tab: 'RADIOS', q: '', tag: '', sort: 'newest', radio: null, song: null };
    const root = el('div', { class: 'app' }), tabs = el('div', { class: 'tabs' }), main = el('div', { class: 'scroll' });
    const t = transport(), vis = el('canvas', { class: 'vis', style: { width: '120px', height: '40px' } }), npImg = el('div'), npT = el('b'), npS = el('div', { class: 'dim' });
    const np = el('div', { class: 'np' }, npImg, el('div', { style: { minWidth: '120px', flex: '0 1 180px' } }, npT, npS), el('div', { style: { flex: 1, minWidth: '240px' } }, t.node), vis);
    root.append(tabs, main, np); body.append(root);

    const songRow = s => el('button', { class: 'track' + (music.song?.id === s.id ? ' now' : ''), onclick: () => { S.song = s.id; draw(); core.sfx('click'); } }, el('span', { class: 'dim', style: { width: '22px' } }, s.track), img(s.cover, s.title), el('div', { class: 't' }, el('b', {}, s.title), el('span', { class: 'dim' }, radioTitle(s))), el('span', { class: 'dim' }, fmtTime(s.duration)));
    const radioCard = r => el('button', { class: 'card', onclick: () => { S.radio = r.id; draw(); core.sfx('click'); } }, el('div', { class: 'im' }, img(r.cover, r.title)), el('div', { class: 'cb' }, el('b', {}, r.title), el('span', { class: 'dim' }, r.songs.length + ' tracks')));
    const sortSongs = L => L.slice().sort((a, b) => S.sort === 'az' ? a.title.localeCompare(b.title) : S.sort === 'oldest' ? D.songs.indexOf(a) - D.songs.indexOf(b) : D.songs.indexOf(b) - D.songs.indexOf(a));
    const sortSel = () => el('select', { 'aria-label': 'Sort', onchange: e => { S.sort = e.target.value; draw(); } }, [['newest', 'Newest'], ['oldest', 'Oldest'], ['az', 'A–Z']].map(([v, tt]) => el('option', { value: v, selected: v === S.sort }, tt)));

    function songPage(s) {
      const arts = D.art.filter(a => a.status === 'PUBLISHED' && a.song === s.id);
      put(main, el('button', { class: 'back', onclick: () => { S.song = null; draw(); } }, '← BACK'),
        el('div', { class: 'gpage big' }, el('div', {}, img(s.cover, s.title, true)), el('div', { class: 'prose' }, el('h2', {}, s.title), el('div', { class: 'dim' }, s.artist + ' · ' + radioTitle(s) + ' · ' + fmtTime(s.duration)),
          el('div', { style: { margin: '8px 0' } }, pills(s.tags)), s.description ? el('p', {}, s.description) : null, s.lyrics ? [el('div', { class: 'sec' }, 'Lyrics'), el('pre', {}, s.lyrics)] : null,
          el('div', { class: 'rel' }, el('button', { class: 'pill st', style: { padding: '6px 16px' }, onclick: () => { music.playSong(s.id, S.radio && s.radios.includes(S.radio) ? S.radio : s.radios[0], 'album'); core.ensurePlayer(); } }, '▶ PLAY'),
            s.radios.map(r => el('button', { onclick: () => { S.song = null; S.radio = r; draw(); } }, 'Radio: ' + core.byId.radio[r].title)), arts.length ? el('button', { onclick: () => core.open('gallery', { q: s.title }) }, 'Related art') : null))));
    }
    function radioPage(r) {
      const songs = r.songs.map(id => core.byId.song[id]);
      put(main, el('button', { class: 'back', onclick: () => { S.radio = null; draw(); } }, '← RADIOS'),
        el('div', { class: 'gpage big' }, el('div', {}, img(r.cover, r.title, true)), el('div', { class: 'prose' }, el('h2', {}, r.title), el('div', { class: 'dim' }, `${songs.length} tracks · ${fmtTime(songs.reduce((a, s) => a + s.duration, 0))}`), r.description ? el('p', {}, r.description) : null,
          el('div', { class: 'rel', style: { margin: '10px 0' } }, el('button', { class: 'pill st', style: { padding: '6px 16px' }, onclick: () => { music.tuneIn(r.id); core.ensurePlayer(); } }, '📻 TUNE IN (RADIO MODE)'), el('button', { onclick: () => { music.setRadio(r.id, 'album'); music.play(); core.ensurePlayer(); } }, '▶ ALBUM MODE'),
            r.external ? el('a', { href: r.external, target: '_blank', rel: 'noopener noreferrer' }, el('button', {}, 'SoundCloud ↗')) : null))),
        el('div', { class: 'sec' }, 'Tracks'), songs.map(songRow));
    }
    function draw() {
      put(tabs, ...['RADIOS', 'SONGS', 'SEARCH'].map(tt => el('button', { class: S.tab === tt && !S.song && !S.radio ? 'on' : '', onclick: () => { S.tab = tt; S.song = S.radio = null; draw(); } }, tt)));
      if (S.song) return songPage(core.byId.song[S.song]); if (S.radio) return radioPage(core.byId.radio[S.radio]);
      if (S.tab === 'RADIOS') put(main, el('div', { class: 'grid' }, D.radios.map(radioCard)), el('div', { class: 'dim', style: { marginTop: '14px', fontSize: '12px' } }, 'RADIO MODE plays a shuffled station: no pausing, skipping or seeking. ALBUM MODE shuffles within a collection with full controls.'));
      else if (S.tab === 'SONGS') put(main, el('div', { class: 'tools', style: { padding: '0 0 8px', border: 0 } }, el('span', { class: 'dim' }, 'Sort'), sortSel()), sortSongs(D.songs).map(songRow));
      else {
        const inp = el('input', { type: 'search', placeholder: 'Search songs & Radios…', value: S.q, 'aria-label': 'Search music', oninput: e => { S.q = e.target.value; res(); } }), out = el('div');
        const tags = [...new Set(D.songs.flatMap(s => s.tags))].sort();
        const res = () => { let L = S.q ? core.search(S.q, { types: ['song', 'radio'] }) : D.songs.map(s => ({ type: 'song', id: s.id })); if (S.tag) L = L.filter(r => r.type === 'radio' || core.byId.song[r.id].tags.includes(S.tag));
          put(out, L.length ? L.map(r => r.type === 'radio' ? el('button', { class: 'track', onclick: () => { S.radio = r.id; draw(); } }, img(core.byId.radio[r.id].cover), el('div', { class: 't' }, el('b', {}, core.byId.radio[r.id].title), el('span', { class: 'dim' }, 'Radio'))) : songRow(core.byId.song[r.id])) : el('div', { class: 'empty' }, 'Nothing found.')); };
        put(main, el('div', { class: 'tools', style: { padding: '0 0 8px', border: 0 } }, inp, el('select', { 'aria-label': 'Filter by tag', onchange: e => { S.tag = e.target.value; res(); } }, el('option', { value: '' }, 'All tags'), tags.map(tg => el('option', { value: tg, selected: tg === S.tag }, '#' + tg)))), out); res();
      }
    }
    let shown = null; const upd = () => {
      const s = music.song; if (!s) return; if (shown !== s.id) { shown = s.id; put(npImg, img(s.cover, s.title)); npImg.firstChild.style.cssText = 'width:52px;height:52px;object-fit:cover'; npT.textContent = s.title; npS.textContent = radioTitle(s) + ' · ' + (music.mode === 'radio' ? 'RADIO' : 'ALBUM'); main.querySelectorAll('.track').forEach(() => {}); }
      npS.textContent = radioTitle(s) + ' · ' + (music.mode === 'radio' ? 'RADIO' : 'ALBUM'); t.upd();
    };
    const off = music.on(upd); upd(); const stopVis = loop(vis);
    const inst = { update(p) { S.tab = 'RADIOS'; S.song = S.radio = null; if (p.q != null) { S.tab = 'SEARCH'; S.q = p.q; } if (p.song) S.song = p.song; else if (p.radio) S.radio = p.radio; draw(); }, destroy() { off(); stopVis(); music.unregister(win.key); } };
    inst.update(params || {}); return inst;
  }
};
