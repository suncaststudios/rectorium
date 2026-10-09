import { put } from '../util.js';
import { core } from '../core.js';
import { el, cover, pills, store, icon } from '../util.js';
import { setAnalytics, analyticsAllowed } from '../analytics.js';

export const about = {
  id: 'about', title: 'About / Info', icon: 'about', w: 620, h: 560,
  render(body) {
    const a = core.data.about; core.unlock('about');
    body.append(el('div', { class: 'scroll prose' },
      el('h2', { class: 'acc', style: { fontSize: '26px' } }, a.handle), el('div', { class: 'dim' }, 'also known as ' + a.alt + ' (music)'), el('p', { style: { marginTop: '10px' } }, el('b', {}, a.tagline)), a.bio.map(t => el('p', {}, t)),
      a.likes?.length ? [el('div', { class: 'sec' }, 'Likes'), el('div', {}, a.likes.map(l => el('span', { class: 'pill st' }, l)))] : null,
      a.dislikes?.length ? [el('div', { class: 'sec' }, 'Dislikes'), el('div', {}, a.dislikes.map(l => el('span', { class: 'pill' }, l)))] : null,
      el('div', { class: 'sec' }, 'Find me'), el('div', { class: 'rel' }, core.data.socials.map(s => el('a', { href: s.url, target: '_blank', rel: 'noopener noreferrer' }, el('button', {}, s.label + ' ↗'))))));
    return {};
  }
};

export const socials = {
  id: 'socials', title: 'Socials', icon: 'socials', w: 560, h: 420,
  render(body) {
    body.append(el('div', { class: 'scroll' }, core.data.socials.map(s => el('a', { href: s.url, target: '_blank', rel: 'noopener noreferrer', style: { textDecoration: 'none', color: 'inherit' }, onclick: () => core.track('click_social', { social: s.id }) },
      el('div', { class: 'bcard' }, icon(s.icon || 'socials', 36), el('div', { class: 't' }, el('b', {}, s.label), el('div', { class: 'acc' }, '@' + s.handle), s.description ? el('div', { class: 'dim' }, s.description) : null), el('span', { class: 'dim' }, '↗'))))));
    return {};
  }
};

export const archive = {
  id: 'archive', title: 'Archive', icon: 'archive', w: 700, h: 520,
  render(body, params) {
    const S = { open: null }, main = el('div', { class: 'scroll' }); body.append(main); core.unlock('archivist');
    const row = a => el('button', { class: 'bcard', onclick: () => { S.open = a.id; draw(); } }, el('div', { style: { width: '56px', height: '56px', flex: 'none' } }, cover(a.cover, a.kind)), el('div', { class: 't' }, el('b', {}, a.title), el('div', {}, el('span', { class: 'pill' }, a.kind), el('span', { class: 'pill bad' }, a.status))));
    function draw() {
      const a = core.data.archive.find(x => x.id === S.open);
      if (!a) return put(main, el('div', { class: 'dim', style: { marginBottom: '10px' } }, 'Where cancelled, scrapped and retired projects rest. Solwave Studios history lives here.'), core.data.archive.map(row));
      const arts = core.data.art.filter(x => x.status === 'PUBLISHED' && x.game === a.id);
      put(main, el('button', { class: 'back', onclick: () => { S.open = null; draw(); } }, '← ARCHIVE'),
        el('div', { class: 'gpage' }, el('div', { class: 'cover' }, cover(a.cover, a.kind)), el('div', { class: 'prose' }, el('h2', {}, a.title), el('div', {}, el('span', { class: 'pill' }, a.kind), el('span', { class: 'pill bad' }, a.status)), el('p', { style: { marginTop: '10px' } }, a.description), pills(a.tags),
          el('div', { class: 'rel', style: { marginTop: '10px' } }, (a.links || []).map(l => el('a', { href: l.url, target: '_blank', rel: 'noopener noreferrer' }, el('button', {}, l.label + ' ↗'))),
            arts.length ? el('button', { onclick: () => core.open('gallery', { project: a.id }) }, `Art (${arts.length})`) : null, (a.related_games || []).map(g => el('button', { onclick: () => core.open('games', { open: g }) }, 'Game: ' + core.byId.game[g].title))))));
    }
    const inst = { update(p) { if (p.open) S.open = p.open; draw(); } }; inst.update(params || {}); return inst;
  }
};

export const settings = {
  id: 'settings', title: 'Settings', icon: 'gear', w: 520, h: 600,
  render(body) {
    const st = core.settings, save = () => { store.set('settings', st); core.applySettings(); };
    const themes = { mono: '#e9e9e9', cyan: '#4df2ff', magenta: '#ff4dd8', violet: '#a58bff', amber: '#ffb347', green: '#6bff8e' };
    const sw = el('div', { class: 'sw' }), drawSw = () => put(sw, ...Object.entries(themes).map(([k, c]) => el('button', { title: k, 'aria-label': 'Theme ' + k, class: st.theme === k ? 'on' : '', style: { '--c': c }, onclick: () => { st.theme = k; save(); drawSw(); core.sfx('set'); } })));
    drawSw();
    const range = (key, label) => el('div', { class: 'row' }, el('label', {}, label), el('input', { type: 'range', min: 0, max: 100, value: Math.round(st[key] * 100), 'aria-label': label, oninput: e => { st[key] = e.target.value / 100; if (key === 'musicVol') core.music.audio.volume = st[key]; save(); }, onchange: () => core.sfx('set') }));
    const check = (key, label, note) => el('div', { class: 'row' }, el('label', { for: 'ck-' + key }, label, note ? el('div', { class: 'dim', style: { fontSize: '12px' } }, note) : null), el('input', { type: 'checkbox', id: 'ck-' + key, checked: !!st[key], onchange: e => { st[key] = e.target.checked; save(); core.sfx('set'); if (key === 'analytics') setAnalytics(st.analytics); } }));
    const ach = el('div'), drawAch = () => { const un = core.achieved(); put(ach, ...core.data.achievements.map(a => { const ok = un.includes(a.id); return el('div', { class: 'ach' + (ok ? '' : ' lock') }, el('span', { class: 'acc' }, ok ? '★' : '☆'), el('div', {}, el('b', {}, ok || !a.secret ? a.name : '????????'), el('div', { class: 'dim' }, ok || !a.secret ? a.desc : '???'))); })); };
    drawAch(); const off = core.onAchieve(drawAch);
    body.append(el('div', { class: 'scroll' },
      el('div', { class: 'row' }, el('label', {}, 'Colour theme'), sw), range('musicVol', 'Music volume'), range('sfxVol', 'Sound effects volume'),
      check('reduceMotion', 'Reduce motion', 'Freezes the wallpaper and turns off animations and visualizers.'), check('wallReact', 'Wallpaper reacts to music'),
      analyticsAllowed() ? check('analytics', 'Anonymous usage stats', 'Counts page and app opens. No personal data. Off automatically if your browser sends Do Not Track.') : null,
      el('div', { class: 'row' }, el('label', {}, 'Prefer a normal website?'), el('a', { href: 'portfolio.html' }, el('button', {}, 'OPEN SIMPLE PORTFOLIO'))),
      el('div', { class: 'sec' }, 'Achievements'), ach,
      el('div', { class: 'row', style: { marginTop: '12px' } }, el('label', {}, 'Reset achievements & saved music position'), el('button', { onclick: () => { core.resetProgress(); drawAch(); } }, 'RESET'))));
    return { destroy() { off(); } };
  }
};
