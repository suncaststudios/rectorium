// Shared singletons, filled in by main.js. Apps import this instead of each other.
export const core = {
  data: null, settings: {}, music: null,
  open() {}, notify() {}, unlock() {}, sfx() {}, search: () => [], track() {}, byId: {}
};
