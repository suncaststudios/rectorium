import { core } from './core.js';

// Builds one flat index over every content record. Records point at the app/params that open them.
export function buildIndex(d) {
  const recs = [], gameIds = new Set(d.games.map(g => g.id)), archIds = new Set(d.archive.map(a => a.id));
  const gkey = id => gameIds.has(id) ? 'game:' + id : archIds.has(id) ? 'archive:' + id : null;
  const add = r => { r.text = [r.title, r.sub, r.desc, (r.tags || []).join(' '), r.date].filter(Boolean).join(' ').toLowerCase(); r.key = r.type + ':' + r.id; recs.push(r); };
  d.games.filter(g => g.visibility !== 'DRAFT').forEach(g => add({ type: 'game', id: g.id, app: 'games', title: g.title, sub: g.status, desc: g.description + ' ' + (g.details || []).join(' '), tags: g.tags, cover: g.cover, refs: [] }));
  d.art.filter(a => a.status === 'PUBLISHED').forEach(a => add({ type: 'art', id: a.id, app: 'gallery', title: a.title, sub: a.category, desc: a.description, tags: a.tags, cover: a.id, date: a.date, refs: [a.game && gkey(a.game), a.radio && 'radio:' + a.radio, a.song && 'song:' + a.song].filter(Boolean) }));
  d.albums.forEach(a => add({ type: 'album', id: a.id, app: 'gallery', params: { album: a.id }, title: a.title, sub: 'Art album', desc: a.description, tags: [], cover: a.cover, refs: [] }));
  d.radios.forEach(r => add({ type: 'radio', id: r.id, app: 'music', params: { radio: r.id }, title: r.title, sub: 'Radio', desc: r.description, tags: r.tags, cover: r.cover, refs: [] }));
  d.songs.forEach(s => add({ type: 'song', id: s.id, app: 'music', params: { song: s.id }, title: s.title, sub: s.artist + ' · ' + s.radios.map(r => core.byId.radio?.[r]?.title || r).join(', '), desc: '', tags: s.tags, cover: s.cover, refs: s.radios.map(r => 'radio:' + r) }));
  d.posts.filter(p => p.status === 'PUBLISHED').forEach(p => add({ type: 'post', id: p.id, app: 'blog', title: p.title, sub: p.type, desc: p.summary + ' ' + p.body.join(' '), tags: p.tags, date: p.date, refs: (p.games || []).map(g => 'game:' + g) }));
  d.archive.forEach(a => add({ type: 'archive', id: a.id, app: 'archive', title: a.title, sub: a.kind, desc: a.description, tags: a.tags, cover: a.cover, refs: (a.related_games || []).map(g => 'game:' + g) }));
  d.socials.forEach(s => add({ type: 'social', id: s.id, app: 'socials', title: s.label, sub: s.handle, desc: s.description, tags: [], refs: [] }));
  add({ type: 'about', id: 'about', app: 'about', title: 'About / Info', sub: d.about.handle, desc: d.about.bio.join(' ') + ' ' + d.about.likes.join(' '), tags: ['about', 'r3ctrr313', 'vivi4nite'], refs: [] });
  return recs;
}
const norm = s => s.toLowerCase().replace(/#/g, ' ').split(/[^a-z0-9_.+]+/).filter(Boolean);
export function runSearch(q, opts = {}) {
  const recs = core.index, toks = norm(q), types = opts.types; if (!toks.length) return [];
  const phrase = toks.join(' '), scored = new Map();
  for (const r of recs) {
    let s = 0, ok = true; const title = r.title.toLowerCase(), tags = (r.tags || []).join(' ').toLowerCase();
    for (const t of toks) {
      let hit = 0; if (title.includes(t)) hit += 30; if (tags.includes(t)) hit += 15; if (r.text.includes(t)) hit += 4;
      if (!hit) { ok = false; break; } s += hit;
    }
    if (ok) { if (title === phrase) s += 60; else if (title.includes(phrase)) s += 20; scored.set(r.key, s); }
  }
  // related content: anything referencing a strongly matched record shows up too (e.g. DAMAGE ROLL -> its posts, art, songs)
  const strong = [...scored].filter(([, s]) => s >= 30).map(([k]) => k);
  for (const r of recs) { if (scored.has(r.key)) continue; if (r.refs.some(k => strong.includes(k))) scored.set(r.key, 12); }
  // two-hop (radio -> song -> art)
  const mid = recs.filter(r => scored.get(r.key) === 12).map(r => r.key);
  for (const r of recs) { if (!scored.has(r.key) && r.refs.some(k => mid.includes(k))) scored.set(r.key, 6); }
  let out = recs.filter(r => scored.has(r.key) && (!types || types.includes(r.type))).sort((a, b) => scored.get(b.key) - scored.get(a.key));
  return out;
}
