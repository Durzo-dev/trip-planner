/**
 * Schematic map of the day's stops, projected from their real coordinates. Clicking a stop scrolls the
 * schedule to it, so the map doubles as a table of contents.
 */
import type { MapDecor } from "../types";
import type { ResolvedDay } from "../plan";
import { directionsUrl } from "../plan";
import { t } from "../i18n";
import { $, esc, focusCard, highlightStops } from "./dom";

const W = 300;
const H = 340;
const PAD = 22;

/**
 * Schematic map: stops projected from their real coordinates (equirectangular), linked in visiting order.
 * Placeholder until the Google Maps integration.
 */
export function renderMap(day: ResolvedDay, decor: MapDecor | undefined, meetingStop: number | null): void {
  const map = $("map") as unknown as SVGSVGElement;
  const stops = day.stops;
  if (!stops.length) {
    map.innerHTML = "";
    return;
  }
  const lats = stops.map((s) => s.place.lat);
  const lngs = stops.map((s) => s.place.lng);
  const k = Math.cos(((Math.min(...lats) + Math.max(...lats)) / 2) * (Math.PI / 180));
  const minX = Math.min(...lngs) * k;
  const maxX = Math.max(...lngs) * k;
  const minY = Math.min(...lats);
  const maxY = Math.max(...lats);
  const scale = Math.min((W - 2 * PAD) / Math.max(1e-6, maxX - minX), (H - 2 * PAD) / Math.max(1e-6, maxY - minY));
  const ox = (W - (maxX - minX) * scale) / 2;
  const oy = (H - (maxY - minY) * scale) / 2;
  const project = (lat: number, lng: number): [number, number] => [ox + (lng * k - minX) * scale, H - (oy + (lat - minY) * scale)];
  const xy = ([x, y]: [number, number]) => `${x.toFixed(1)},${y.toFixed(1)}`;

  const pts = stops.map((s) => project(s.place.lat, s.place.lng));
  // nudge markers that would overlap
  for (let i = 0; i < pts.length; i++) {
    for (let j = 0; j < i; j++) {
      if (Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]) < 22) {
        pts[i] = [pts[i][0] - 16, pts[i][1] - 13];
        j = -1;
      }
    }
  }

  let svg = "";
  if (decor?.river) {
    const line = decor.river.points.map(([a, b]) => xy(project(a, b))).join(" ");
    svg += `<polyline class="river" points="${line}"/>`;
    if (decor.river.label) {
      const mid = decor.river.points[Math.floor(decor.river.points.length / 2)];
      const [x, y] = project(mid[0], mid[1]);
      const right = x > W / 2;
      svg += `<text class="river-l" text-anchor="${right ? "end" : "start"}" x="${(right ? x - 16 : x + 16).toFixed(0)}" y="${y.toFixed(0)}">${esc(decor.river.label)}</text>`;
    }
  }
  for (let i = 1; i < pts.length; i++) {
    svg += `<line class="route" data-to="${stops[i].n}" x1="${pts[i - 1][0].toFixed(1)}" y1="${pts[i - 1][1].toFixed(1)}" x2="${pts[i][0].toFixed(1)}" y2="${pts[i][1].toFixed(1)}"/>`;
  }
  stops.forEach((s, i) => {
    const x = pts[i][0].toFixed(1);
    const y = pts[i][1].toFixed(1);
    svg += `<g class="mk" data-n="${s.n}" tabindex="0" role="button" aria-label="${esc(`${s.n}. ${s.place.name}`)}">` +
      `<circle class="base" cx="${x}" cy="${y}" r="10.5"/>` +
      `<circle class="ring" cx="${x}" cy="${y}" r="13.5" pathLength="100" stroke-dasharray="0 100" transform="rotate(-90 ${x} ${y})"/>` +
      `<text x="${x}" y="${y}">${s.n}</text></g>`;
  });
  map.setAttribute("viewBox", `0 0 ${W} ${H}`);
  map.innerHTML = svg;

  map.querySelectorAll<SVGGElement>(".mk").forEach((g) => {
    const n = Number(g.dataset.n);
    const name = stops[n - 1].place.name;
    const show = () => {
      highlightStops([n]);
      $("map-legend").textContent = `${n}. ${name}`;
    };
    const go = () => focusCard(document.querySelector(`.card[data-stops~="${n}"]`));
    g.addEventListener("mouseenter", show);
    g.addEventListener("focus", show);
    g.addEventListener("click", go);
    g.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        go();
      }
    });
  });
  map.onmouseleave = () => {
    highlightStops([]);
    $("map-legend").textContent = t.routeHint;
  };
  $("map-legend").textContent = t.routeHint;

  const places = stops.map((s) => s.place);
  ($("route-all") as HTMLAnchorElement).href = directionsUrl(places);
  const fromMeeting = $("route-meet") as HTMLAnchorElement;
  fromMeeting.hidden = meetingStop === null || places.length - meetingStop < 1;
  if (meetingStop !== null) fromMeeting.href = directionsUrl(places.slice(meetingStop - 1));
}
