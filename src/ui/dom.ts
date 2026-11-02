/**
 * Small DOM helpers shared by the views: escaping, links, scrolling to a card, highlighting stops.
 */
export const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

export const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/** External link opened in a new tab. */
export const extLink = (label: string, url: string, cls = "maps") =>
  `<a class="${cls}" href="${esc(url)}" target="_blank" rel="noopener">${esc(label)}</a>`;

/** Scrolls the schedule to a card and flashes it. */
export function focusCard(card: Element | null): void {
  if (!(card instanceof HTMLElement)) return;
  card.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", block: "start" });
  card.classList.remove("flash");
  void card.offsetWidth;
  card.classList.add("flash");
  window.clearTimeout(Number(card.dataset.flash));
  card.dataset.flash = String(window.setTimeout(() => card.classList.remove("flash"), 1600));
}

/** Highlights the cards and map markers of the given stops. */
export function highlightStops(stops: number[], cards = true): void {
  document.querySelectorAll<SVGGElement>("#map .mk").forEach((g) => g.classList.toggle("on", stops.includes(Number(g.dataset.n))));
  document.querySelectorAll<HTMLElement>(".card").forEach((c) => {
    const own = (c.dataset.stops || "").split(" ").filter(Boolean).map(Number);
    c.classList.toggle("hl", cards && own.some((n) => stops.includes(n)));
  });
}
