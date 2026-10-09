import { put } from '../util.js';
import { core } from '../core.js';
import { el, cover, pills } from '../util.js';

const STATUSES = ['IN DEVELOPMENT', 'PLANNING STAGES', 'RELEASED', 'IN DEMO', 'EARLY ACCESS', 'ON HOLD', 'CANCELLED', 'FINISHED'];
const gameCover = g => g.cover ? cover(g.cover) : g.coverRemote ? el('img', { src: g.coverRemote, alt: g.title, referrerpolicy: 'no-referrer', loading: 'lazy', onerror: e => e.target.replaceWith(el('div', { class: 'noimg' }, g.title)) }) : el('div', { class: 'noimg' }, g.title);
const stPill = s => el('span', { class: 'pill st' + (s === 'CANCELLED' ? ' bad' : '') }, s);

export default {
  id: 'games', title: 'GameStore v8.21', icon: 'games', w: 860, h: 580,
  render(body, params) {
    const all = core.data.games.filter(g => g.visibility === 'PUBLISHED');
    const S = { q: '', status: '', tag: '', sort: 'newest', open: null };
    const root = el('div', { class: 'app' }); body.append(root);
    const tags = [...new Set(all.flatMap(g => g.tags))].sort();
    const q = el('input', { type: 'search', placeholder: 'Search games…', 'aria-label': 'Search games', oninput: e => { S.q = e.target.value; S.open = null; draw(); } });
    const mk = (opts, label, key) => el('select', { 'aria-label': label, onchange: e => { S[key] = e.target.value; draw(); } }, opts.map(([v, t]) => el('option', { value: v }, t)));
    const stSel = mk([['', 'All status'], ...STATUSES.filter(s => all.some(g => g.status === s)).map(s => [s, s])], 'Filter by status', 'status');
    const tgSel = mk([['', 'All genres / tags'], ...tags.map(t => [t, '#' + t])], 'Filter by tag', 'tag');
    const soSel = mk([['newest', 'Newest'], ['oldest', 'Oldest'], ['az', 'A–Z'], ['updated', 'Recently updated']], 'Sort', 'sort');
    const tools = el('div', { class: 'tools' }, q, stSel, tgSel, soSel), main = el('div', { class: 'scroll' });
    root.append(tools, main);

    function card(g) {
      return el('button', { class: 'card', onclick: () => { S.open = g.id; draw(); core.sfx('click'); } },
        el('div', { class: 'im' }, gameCover(g)), el('div', { class: 'cb' }, el('b', {}, g.title), stPill(g.status)));
    }
    function list() {
      let L = all.slice(); if (S.q) { const ids = new Set(core.search(S.q, { types: ['game'] }).map(r => r.id)); L = L.filter(g => ids.has(g.id)); }
      if (S.status) L = L.filter(g => g.status === S.status); if (S.tag) L = L.filter(g => g.tags.includes(S.tag));
      const idx = g => all.indexOf(g);
      L.sort((a, b) => S.sort === 'oldest' ? idx(a) - idx(b) : S.sort === 'az' ? a.title.localeCompare(b.title) : idx(b) - idx(a));
      return [...L.filter(g => g.status !== 'CANCELLED'), ...L.filter(g => g.status === 'CANCELLED')]; // cancelled stay at the bottom, labelled
    }
    function page(g) {
      const posts = core.data.posts.filter(p => p.status === 'PUBLISHED' && (p.games || []).includes(g.id));
      const arts = core.data.art.filter(a => a.status === 'PUBLISHED' && a.game === g.id);
      const meta = [['Engine', g.engine], ['Platform', g.platform], ['Price', g.price], ['Version', g.updated]].filter(m => m[1]);
      put(main, el('button', { class: 'back', onclick: () => { S.open = null; draw(); } }, '← ALL GAMES'),
        el('div', { class: 'gpage' }, el('div', {}, el('div', { class: 'cover' }, gameCover(g))),
          el('div', { class: 'prose' }, el('h2', {}, g.title), el('div', {}, stPill(g.status), pills(g.tags, t => { S.open = null; S.tag = t; tgSel.value = t; draw(); })),
            el('p', { style: { marginTop: '10px' } }, g.description),
            meta.length ? el('div', {}, meta.map(([k, v]) => el('div', {}, el('span', { class: 'dim' }, k + ': '), v))) : null,
            g.details?.length ? [el('div', { class: 'sec' }, 'Features'), el('ul', { class: 'plain' }, g.details.map(d => el('li', {}, d)))] : null,
            g.links?.length ? [el('div', { class: 'sec' }, 'Links'), el('div', { class: 'rel' }, g.links.map(l => el('a', { href: l.url, target: '_blank', rel: 'noopener noreferrer' }, el('button', {}, l.label + ' ↗'))))] : null,
            (posts.length || arts.length) ? el('div', { class: 'sec' }, 'Related') : null,
            el('div', { class: 'rel' },
              posts.map(p => el('button', { onclick: () => core.open('blog', { open: p.id }) }, `${p.type}: ${p.title}`)),
              arts.length ? el('button', { onclick: () => core.open('gallery', { project: g.id }) }, `Art (${arts.length})`) : null))));
      core.unlock('firstlook'); core.track('open_game', { game: g.id });
    }
    function draw() {
      tools.style.display = S.open ? 'none' : '';
      if (S.open) { const g = all.find(x => x.id === S.open); if (g) return page(g); }
      const L = list(); if (!L.length) return put(main, el('div', { class: 'empty' }, 'No games match.'));
      const fresh = !S.q && !S.status && !S.tag, feat = fresh ? L.filter(g => g.status !== 'CANCELLED').slice(0, 3) : [], rest = L.filter(g => !feat.includes(g));
      put(main, 
        feat.length ? [el('div', { class: 'sec', style: { marginTop: 0 } }, 'Featured'), el('div', { class: 'feat' }, feat.map(card))] : null,
        rest.length ? [el('div', { class: 'sec' }, feat.length ? 'More games' : 'Results'), el('div', { class: 'grid' }, rest.map(card))] : null);
    }
    const inst = { update(p) { if (p.open) S.open = p.open; if (p.q != null) { S.q = p.q; q.value = p.q; } draw(); } };
    inst.update(params || {}); return inst;
  }
};
