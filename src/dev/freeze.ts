/**
 * Development only. A page opened with ?frozen ignores the dev server's full reloads: it holds Vite's
 * "before full reload" step open forever, so the reload never runs. The preview page freezes its frames
 * (and itself) and reloads them one at a time when it decides to, instead of 26 pages at once.
 */
export function freezeIfAsked(): void {
  if (!import.meta.hot || !new URLSearchParams(location.search).has("frozen")) return;
  import.meta.hot.on("vite:beforeFullReload", () => new Promise<void>(() => {}));
}
