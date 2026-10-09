import { put } from '../util.js';
import { core } from '../core.js';
import { el, pills } from '../util.js';

const TABS = { 'ALL POSTS': null, REVIEWS: 'REVIEW', DEVLOGS: 'DEVLOG', UPDATES: 'UPDATE' };
const stars = r => r && r.value != null ? `${r.value}/${r.scale}` : null;
export default {
  id: 'blog', title: 'blogPOST.app', icon: 'blog', w: 860, h: 600,
  render(body, params) {
    const posts = core.data.posts.filter(p => p.status === 'PUBLISHED').slice().sort((a, b) => (b.date || '').localeCompare(a.date || '') || core.data.posts.indexOf(b) - core.data.posts.indexOf(a));
    const S = { tab: 'ALL POSTS', q: '', tag: '', sort: 'newest', open: null, scroll: 0 };
    const root = el('div', { class: 'app' }), tabs = el('div', { class: 'tabs' }), tools = el('div', { class: 'tools' }), main = el('div', { class: 'scroll' });
    root.append(tabs, tools, main); body.append(root);
    const tags = [...new Set(posts.flatMap(p => p.tags))].sort();
    const q = el('input', { type: 'search', placeholder: 'Search posts…', 'aria-label': 'Search posts', oninput: e => { S.q = e.target.value; draw(); } });
    const tg = el('select', { 'aria-label': 'Filter by tag', onchange: e => { S.tag = e.target.value; draw(); } }, el('option', { value: '' }, 'All tags'), tags.map(t => el('option', { value: t }, '#' + t)));
    const so = el('select', { 'aria-label': 'Sort', onchange: e => { S.sort = e.target.value; draw(); } }, [['newest', 'Newest'], ['oldest', 'Oldest'], ['az', 'A–Z']].map(([v, t]) => el('option', { value: v }, t)));
    tools.append(q, tg, so);
    const gameName = id => core.byId.game[id]?.title || id;
    const card = (p, big) => el('button', { class: 'bcard', onclick: () => { S.scroll = main.scrollTop; S.open = p.id; draw(); core.sfx('click'); } }, el('div', { class: 't' },
      el('div', {}, el('span', { class: 'pill st' }, p.type), p.date ? el('span', { class: 'dim' }, p.date) : null, p.rating ? el('span', { class: 'rating' }, ' ' + stars(p.rating)) : null),
      el(big ? 'h2' : 'b', {}, p.title), el('div', { class: 'dim' }, p.summary)));
    function list() {
      let L = posts.slice(); const type = TABS[S.tab]; if (type) L = L.filter(p => p.type === type);
      if (S.q) { const ids = new Map(core.search(S.q, { types: ['post'] }).map((r, i) => [r.id, i])); L = L.filter(p => ids.has(p.id)).sort((a, b) => ids.get(a.id) - ids.get(b.id)); }
      else if (S.sort === 'oldest') L.reverse(); else if (S.sort === 'az') L.sort((a, b) => a.title.localeCompare(b.title));
      if (S.tag) L = L.filter(p => p.tags.includes(S.tag)); return L;
    }
    function page(p) {
      core.unlock(p.type === 'REVIEW' ? 'critic' : p.type === 'DEVLOG' ? 'behind' : ''); core.track('read_post', { post: p.id, type: p.type });
      const rel = posts.filter(o => o.id !== p.id && o.tags.some(t => p.tags.includes(t))).slice(0, 3);
      put(main, el('button', { class: 'back', onclick: () => { S.open = null; draw(); main.scrollTop = S.scroll; } }, '← BACK TO FEED'),
        el('article', { class: 'post prose' }, el('div', {}, el('span', { class: 'pill st' }, p.type), p.version ? el('span', { class: 'pill' }, p.version) : null, p.date ? el('span', { class: 'dim' }, p.date) : null),
          el('h2', {}, p.title), p.subject ? el('div', { class: 'dim' }, 'Subject: ' + p.subject) : null, p.rating ? el('div', { class: 'rating' }, 'RATING ' + stars(p.rating)) : null,
          p.spoilers ? el('div', { class: 'pill bad' }, 'SPOILERS') : null, el('div', { style: { margin: '12px 0' } }, p.body.map(t => el('p', {}, t))),
          p.pros?.length ? [el('div', { class: 'sec' }, 'Pros'), el('ul', { class: 'plain' }, p.pros.map(x => el('li', {}, x)))] : null, p.cons?.length ? [el('div', { class: 'sec' }, 'Cons'), el('ul', { class: 'plain' }, p.cons.map(x => el('li', {}, x)))] : null,
          p.changes?.length ? [el('div', { class: 'sec' }, 'Changes'), el('ul', { class: 'plain' }, p.changes.map(x => el('li', {}, x)))] : null,
          el('div', { style: { margin: '12px 0' } }, pills(p.tags, t => { S.open = null; S.tag = t; tg.value = t; draw(); })),
          el('div', { class: 'rel' }, (p.games || []).map(g => el('button', { onclick: () => core.open('games', { open: g }) }, 'Game: ' + gameName(g))),
            el('button', { onclick: async e => { const url = location.origin + location.pathname + '#blog/' + p.id; try { await navigator.clipboard.writeText(url); e.target.textContent = 'COPIED ✓'; } catch { prompt('Copy this link:', url); } } }, 'COPY LINK')),
          rel.length ? [el('div', { class: 'sec' }, 'Related posts'), rel.map(o => card(o))] : null)); main.scrollTop = 0;
    }
    function draw() {
      put(tabs, ...Object.keys(TABS).map(t => el('button', { class: S.tab === t ? 'on' : '', onclick: () => { S.tab = t; S.open = null; draw(); } }, t)));
      tools.style.display = S.open ? 'none' : '';
      if (S.open) { const p = posts.find(x => x.id === S.open); if (p) return page(p); }
      const L = list(); if (!L.length) return put(main, el('div', { class: 'empty' }, S.tab === 'ALL POSTS' && !S.q && !S.tag ? 'No posts yet.' : `No ${S.tab === 'ALL POSTS' ? 'posts' : S.tab.toLowerCase()} yet.`));
      const feat = !S.q && !S.tag && S.tab === 'ALL POSTS' && S.sort === 'newest' ? L[0] : null;
      put(main, feat ? [el('div', { class: 'sec', style: { marginTop: 0 } }, 'Featured'), card(feat, true), el('div', { class: 'sec' }, 'Library')] : null, L.filter(p => p !== feat).map(p => card(p)));
      if (S.scroll && !S.open) { main.scrollTop = S.scroll; S.scroll = 0; }
    }
    const inst = { update(p) { if (p.open) S.open = p.open; if (p.q != null) { S.q = p.q; q.value = p.q; S.open = null; } draw(); } };
    inst.update(params || {}); return inst;
  }
};
