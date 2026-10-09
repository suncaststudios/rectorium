import { core } from './core.js';
import { store, shuffle } from './util.js';

// One shared engine: every Music window (compact player or full app) renders this state.
class Music {
  constructor() {
    this.audio = new Audio(); this.audio.preload = 'none';
    this.subs = new Set(); this.windows = new Set();
    this.queue = []; this.idx = 0; this.radio = null; this.mode = 'radio'; this.playing = false;
    this.pendingSeek = 0; this.lastSave = 0; this.ready = false;
    const a = this.audio;
    a.addEventListener('timeupdate', () => { this.emit(); if (Date.now() - this.lastSave > 2000) this.save(); });
    a.addEventListener('ended', () => this.advance(true));
    a.addEventListener('play', () => { this.playing = true; this.emit(); });
    a.addEventListener('pause', () => { this.playing = false; this.emit(); this.save(); });
    a.addEventListener('error', () => { core.notify('PLAYBACK ERROR', 'Could not load that track.'); core.sfx('error'); });
  }
  init() {
    const d = core.data; this.songs = Object.fromEntries(d.songs.map(s => [s.id, s]));
    this.radios = Object.fromEntries(d.radios.map(r => [r.id, r]));
    this.audio.volume = core.settings.musicVol;
    // restore (never autoplay)
    const s = store.get('music', null);
    if (s && this.radios[s.radio] && this.songs[s.song]) {
      this.radio = s.radio; this.mode = s.mode === 'album' ? 'album' : 'radio';
      this.queue = (s.queue || []).filter(id => this.songs[id]); if (!this.queue.includes(s.song)) this.queue = shuffle(this.radios[s.radio].songs);
      this.idx = Math.max(0, this.queue.indexOf(s.song)); this.pendingSeek = this.mode === 'album' ? (s.pos || 0) : 0;
    } else if (d.radios[0]) { this.setRadio(d.radios[0].id, 'radio', true); }
    this.ready = true; this.emit();
  }
  get song() { return this.songs?.[this.queue[this.idx]] || null; }
  get radioObj() { return this.radios?.[this.radio] || null; }
  get canControl() { return this.mode === 'album'; }
  on(fn) { this.subs.add(fn); return () => this.subs.delete(fn); }
  emit() { this.subs.forEach(f => { try { f(this); } catch {} }); }
  save() {
    this.lastSave = Date.now(); if (!this.song) return;
    store.set('music', { radio: this.radio, mode: this.mode, queue: this.queue, song: this.song.id, pos: this.audio.currentTime || this.pendingSeek || 0 });
  }
  setRadio(id, mode = this.mode, silent = false, firstSong = null) {
    const r = this.radios[id]; if (!r) return;
    let q = shuffle(r.songs); if (firstSong && q.includes(firstSong)) q = [firstSong, ...q.filter(x => x !== firstSong)];
    this.radio = id; this.mode = mode; this.queue = q; this.idx = 0; this.pendingSeek = 0; this.loaded = null;
    if (!silent) this.audio.pause(); this.save(); this.emit();
  }
  setMode(mode) { if (mode !== this.mode) { this.mode = mode; if (mode === 'radio') this.pendingSeek = 0; this.save(); this.emit(); } }
  load() {
    const s = this.song; if (!s) return false;
    if (this.loaded !== s.id) { this.audio.src = s.file; this.loaded = s.id; if (this.pendingSeek) { const t = this.pendingSeek; this.audio.addEventListener('loadedmetadata', () => { try { this.audio.currentTime = t; } catch {} }, { once: true }); this.pendingSeek = 0; } }
    return true;
  }
  async play() {
    if (!this.load()) return; this.ensureGraph();
    try { await this.audio.play(); core.unlock('jam'); core.track('play_music', { song: this.song.id }); } catch (e) { if (e.name !== 'AbortError') core.notify('PLAYBACK BLOCKED', 'Press play again.'); }
  }
  // Start a specific song inside a Radio, in the chosen mode.
  async playSong(songId, radioId, mode = 'album') {
    const rid = radioId || this.songs[songId].radios[0]; this.setRadio(rid, mode, true, songId); this.loaded = null; await this.play();
  }
  async tuneIn(radioId) { this.setRadio(radioId, 'radio', true); this.loaded = null; await this.play(); }
  pause() { if (this.canControl) this.audio.pause(); }
  toggle() { if (this.playing) this.pause(); else this.play(); }
  seek(t) { if (this.canControl && this.song) { this.load(); try { this.audio.currentTime = t; } catch {} this.emit(); } }
  advance(auto) {
    if (!auto && !this.canControl) return;
    const was = this.playing || auto;
    this.idx++;
    if (this.idx >= this.queue.length) { // finished the round: reshuffle, avoid repeating the last track first
      const last = this.queue[this.queue.length - 1]; let q = shuffle(this.radioObj.songs);
      if (q.length > 1 && q[0] === last) q.push(q.shift()); this.queue = q; this.idx = 0;
    }
    this.pendingSeek = 0; this.loaded = null; this.save(); this.emit(); if (was) this.play();
  }
  next() { this.advance(false); }
  prev() {
    if (!this.canControl) return;
    if (this.audio.currentTime > 3 || this.idx === 0) { this.audio.currentTime = 0; return; }
    this.idx--; this.pendingSeek = 0; this.loaded = null; this.save(); this.emit(); if (this.playing) this.play();
  }
  setVolume(v) { this.audio.volume = v; core.settings.musicVol = v; store.set('settings', core.settings); this.emit(); }
  stop() { this.save(); this.audio.pause(); this.playing = false; this.emit(); }
  // window registry: closing the last Music window stops playback
  register(id) { this.windows.add(id); }
  unregister(id) { this.windows.delete(id); if (!this.windows.size) this.stop(); }
  ensureGraph() {
    if (this.an) return;
    try {
      const C = window.AudioContext || window.webkitAudioContext; this.ac = new C();
      const src = this.ac.createMediaElementSource(this.audio); this.an = this.ac.createAnalyser(); this.an.fftSize = 256; this.an.smoothingTimeConstant = .8;
      src.connect(this.an); this.an.connect(this.ac.destination); this.buf = new Uint8Array(this.an.frequencyBinCount);
    } catch { this.an = null; }
    if (this.ac) this.ac.resume();
  }
  spectrum() { if (!this.an || !this.playing) return null; this.an.getByteFrequencyData(this.buf); return this.buf; }
  level() { const b = this.spectrum(); if (!b) return 0; let s = 0; for (let i = 0; i < 24; i++) s += b[i]; return s / 24 / 255; }
}
export const music = new Music();
core.music = music;

// shared little visualizer for player/app
export function drawVis(canvas, accent) {
  const g = canvas.getContext('2d'), w = canvas.width = canvas.clientWidth * (devicePixelRatio || 1), h = canvas.height = canvas.clientHeight * (devicePixelRatio || 1);
  g.clearRect(0, 0, w, h); const b = music.spectrum(), n = 32; g.fillStyle = accent;
  for (let i = 0; i < n; i++) { const v = b ? b[i * 2] / 255 : 0.03; const bw = w / n; g.fillRect(i * bw + 1, h - v * h, bw - 2, v * h + 1); }
}
