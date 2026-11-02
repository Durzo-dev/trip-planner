/**
 * Test bar under the tabs, shown only on example trips (trip.example). It lets a visitor try the page:
 * colour presets and pickers, light/dark mode, illustrations on/off, the one-day / multi-day examples,
 * and a simulated clock (day + time slider) to watch the day unfold. Never shown on a real trip.
 */
import type { Theme, Trip } from "../types";
import { capitalize, formatDate, formatTime, t } from "../i18n";
import { load, save } from "../storage";
import { applyTheme, DEFAULT_THEME, isDark, PRESETS, toggleTheme } from "../theme";
import { toMinutes, type TripClock } from "../time";
import { $, esc } from "./dom";
import { setThemeLabel } from "./tabs";

/** The two bundled examples the "multi-day" toggle switches between. */
export const EXAMPLE_TRIPS = { oneDay: "bordeaux-2026-11-28", multiDay: "bordeaux-weekend-2026-11" };

export interface DemoHandlers {
  /** Simulated clock, or null to go back to the real one. */
  onSimulate(clock: TripClock | null, dayIndex: number | null): void;
}

type StoredColours = Theme & { preset?: string | null };

const isHex = (v: unknown) => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);

/** Colours picked in the test bar override the trip's, on this device only. */
export function storedColours(): StoredColours | null {
  try {
    const c = JSON.parse(load("demo-colors") ?? "null");
    return c && isHex(c.gradientStart) && isHex(c.gradientEnd) && isHex(c.accent) ? c : null;
  } catch {
    return null;
  }
}

const label = (minutes: number) => {
  const h = Math.floor(minutes / 60) % 24;
  return formatTime(`${h}:${String(minutes % 60).padStart(2, "0")}`);
};

export function renderDemoBar(trip: Trip, dayIndex: number, h: DemoHandlers): void {
  const multi = trip.days.length > 1;
  const starts = trip.days.flatMap((d) => d.sections.flatMap((s) => s.items.map((i) => toMinutes(i.start))));
  const ends = trip.days.flatMap((d) => d.sections.flatMap((s) => s.items.map((i) => toMinutes(i.end))));
  const min = Math.floor((Math.min(...starts) - 30) / 5) * 5;
  const max = Math.ceil((Math.max(...ends) + 30) / 5) * 5;
  const initial = Math.min(max, Math.max(min, 14 * 60 + 45));

  const bar = document.createElement("div");
  bar.className = "demo-bar";
  bar.innerHTML = `<div class="wrap">
    <span>${esc(t.demoNote)}</span>
    <div class="sim">
      <div class="pal" role="group" aria-label="${esc(t.colours)}">
        <span>${esc(t.colours)}</span>
        <span class="sws" id="pal-sw">${Object.entries(PRESETS).map(([key, p]) =>
          `<button type="button" class="sw" data-preset="${key}" title="${esc(p.name)}" aria-label="${esc(p.name)}" ` +
          `style="background:linear-gradient(135deg,${p.gradientStart},${p.gradientEnd})"></button>`).join("")}</span>
        <span class="sep" aria-hidden="true"></span>
        <span class="pick">${esc(t.gradient)} <input type="color" id="c-g1" aria-label="${esc(t.gradientStart)}" title="${esc(t.gradientStart)}"><input type="color" id="c-g2" aria-label="${esc(t.gradientEnd)}" title="${esc(t.gradientEnd)}"></span>
        <span class="pick">${esc(t.accent)} <input type="color" id="c-acc" aria-label="${esc(t.accent)}" title="${esc(t.accent)}"></span>
      </div>
      <button type="button" id="demo-theme"></button>
      <button type="button" id="demo-art" aria-pressed="true">${esc(t.illustrations)}</button>
      <button type="button" id="demo-multi" aria-pressed="${multi}">${esc(t.multiDayDemo)}</button>
      <button type="button" id="demo-sim" aria-pressed="false">${esc(t.simulate)}</button>
      <select id="sim-day" aria-label="${esc(t.simDay)}" hidden>${trip.days.map((d, i) =>
        `<option value="${i}"${i === dayIndex ? " selected" : ""}>${esc(capitalize(formatDate(d.date, { weekday: "long", day: "numeric" })))}</option>`).join("")}</select>
      <label id="sim-wrap" hidden><span class="sr">${esc(t.simTime)}</span>
        <input type="range" id="sim-range" min="${min}" max="${max}" step="5" value="${initial}" aria-label="${esc(t.simTime)}">
        <output id="sim-out" for="sim-range">${esc(label(initial))}</output>
      </label>
    </div>
  </div>`;
  document.querySelector("nav.tabs")!.after(bar);

  // Colours
  const base = trip.theme ?? DEFAULT_THEME;
  const basePreset = Object.keys(PRESETS).find((k) =>
    PRESETS[k].gradientStart === base.gradientStart && PRESETS[k].gradientEnd === base.gradientEnd && PRESETS[k].accent === base.accent);
  let current: StoredColours = storedColours() ?? { ...base, preset: basePreset ?? null };
  const g1 = $<HTMLInputElement>("c-g1");
  const g2 = $<HTMLInputElement>("c-g2");
  const acc = $<HTMLInputElement>("c-acc");
  const sync = () => {
    g1.value = current.gradientStart;
    g2.value = current.gradientEnd;
    acc.value = current.accent;
    bar.querySelectorAll<HTMLElement>(".sw").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.preset === current.preset)));
    const dark = isDark();
    $("demo-theme").textContent = `${dark ? "☀" : "☾"} ${dark ? t.themeLight : t.themeDark}`;
    setThemeLabel();
  };
  const use = (c: StoredColours) => {
    current = c;
    save("demo-colors", JSON.stringify(c));
    applyTheme(c);
    sync();
  };
  bar.querySelectorAll<HTMLElement>(".sw").forEach((b) =>
    b.addEventListener("click", () => use({ ...PRESETS[b.dataset.preset!], preset: b.dataset.preset })));
  [g1, g2, acc].forEach((input) =>
    input.addEventListener("input", () => use({ gradientStart: g1.value, gradientEnd: g2.value, accent: acc.value, preset: null })));
  $("demo-theme").addEventListener("click", () => {
    toggleTheme();
    sync();
  });
  // The theme button in the tab bar changes the mode too: keep this label in step
  $("theme-btn").addEventListener("click", sync);
  sync();

  // Illustrations
  const art = $("demo-art");
  const setArt = (on: boolean) => {
    document.body.classList.toggle("no-art", !on);
    art.setAttribute("aria-pressed", String(on));
    save("demo-art", on ? null : "off");
  };
  setArt(load("demo-art") !== "off");
  art.addEventListener("click", () => setArt(art.getAttribute("aria-pressed") !== "true"));

  // One-day / multi-day example
  $("demo-multi").addEventListener("click", () => {
    const params = new URLSearchParams(location.search);
    params.set("trip", multi ? EXAMPLE_TRIPS.oneDay : EXAMPLE_TRIPS.multiDay);
    location.search = params.toString();
  });

  // Simulated clock
  const simBtn = $("demo-sim");
  const day = $<HTMLSelectElement>("sim-day");
  const range = $<HTMLInputElement>("sim-range");
  const out = $("sim-out");
  let on = false;
  const emit = (dayChanged: boolean) => {
    out.textContent = label(Number(range.value));
    if (!on) return h.onSimulate(null, null);
    const i = Number(day.value);
    h.onSimulate({ date: trip.days[i].date, minutes: Number(range.value) }, dayChanged ? i : null);
  };
  simBtn.addEventListener("click", () => {
    on = !on;
    simBtn.setAttribute("aria-pressed", String(on));
    $("sim-wrap").hidden = !on;
    day.hidden = !(on && multi);
    emit(true);
  });
  day.addEventListener("change", () => emit(true));
  range.addEventListener("input", () => emit(false));
}
