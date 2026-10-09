const P = {
  games: '<rect x="6" y="14" width="36" height="22" rx="8"/><path d="M15 22v8M11 26h8"/><circle cx="31" cy="24" r="2"/><circle cx="37" cy="28" r="2"/>',
  gallery: '<rect x="6" y="8" width="36" height="32"/><circle cx="17" cy="19" r="4"/><path d="M6 34l12-10 9 8 6-5 9 8"/>',
  music: '<path d="M10 28v-4a14 14 0 0128 0v4"/><rect x="7" y="28" width="8" height="12"/><rect x="33" y="28" width="8" height="12"/>',
  blog: '<rect x="9" y="6" width="30" height="36"/><path d="M15 15h18M15 22h18M15 29h11"/>',
  about: '<rect x="5" y="10" width="38" height="28"/><circle cx="17" cy="21" r="4"/><path d="M10 33c1-5 12-5 14 0M29 19h9M29 26h9"/>',
  archive: '<path d="M5 12h14l4 5h20v23H5z"/><path d="M5 22h38"/>',
  socials: '<path d="M20 28l8-8"/><path d="M22 14l4-4a8 8 0 0111 11l-4 4M26 34l-4 4a8 8 0 01-11-11l4-4"/>',
  gear: '<circle cx="24" cy="24" r="6"/><path d="M24 4v6M24 38v6M4 24h6M38 24h6M10 10l4 4M34 34l4 4M38 10l-4 4M14 34l-4 4"/>',
  search: '<circle cx="21" cy="21" r="12"/><path d="M30 30l12 12"/>',
  bell: '<path d="M12 34V22a12 12 0 0124 0v12l4 4H8z"/><path d="M20 42h8"/>',
  sound: '<path d="M6 18h8l10-8v28l-10-8H6z"/><path d="M32 16a12 12 0 010 16M37 11a19 19 0 010 26"/>',
  game: '<rect x="6" y="14" width="36" height="22" rx="8"/><path d="M15 22v8M11 26h8"/>',
  close: '<path d="M8 8l32 32M40 8L8 40"/>', min: '<path d="M6 36h36"/>', max: '<rect x="8" y="8" width="32" height="32"/>',
  play: '<path d="M14 8l28 16-28 16z" fill="currentColor"/>', pause: '<path d="M14 8v32M34 8v32" stroke-width="7"/>',
  next: '<path d="M10 8l24 16-24 16zM40 8v32" />', prev: '<path d="M38 8L14 24l24 16zM8 8v32" />'
};
export function icon(name, size) {
  const d = document.createElement('div');
  d.innerHTML = `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">${P[name] || P.archive}</svg>`;
  const s = d.firstChild; if (size) { s.style.width = s.style.height = size + 'px'; } return s;
}
