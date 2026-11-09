/**
 * Weather panel: five hours spread over the day's schedule, at the first stop of the day.
 */
import type { ResolvedDay } from "../plan";
import { fetchWeather, slotHours, type Sky } from "../weather";
import { formatDate, formatTime, t } from "../i18n";
import { toMinutes } from "../time";
import { $, esc } from "./dom";

const SKY: Record<Sky, string> = {
  sun: '<circle cx="13" cy="13" r="5" style="fill:var(--sky-sun)"/><g style="stroke:var(--sky-sun)" stroke-width="1.6" stroke-linecap="round"><path d="M13 2v3M13 21v3M2 13h3M21 13h3M5 5l2 2M19 19l2 2M5 21l2-2M19 7l2-2"/></g>',
  partly: '<circle cx="10" cy="10" r="4.5" style="fill:var(--sky-sun)"/><path d="M8 20h11a4 4 0 0 0 0-8 5.5 5.5 0 0 0-10.4 1.6A3.3 3.3 0 0 0 8 20z" style="fill:var(--sky-cloud)"/>',
  cloud: '<path d="M7 19h12a4.5 4.5 0 0 0 0-9 6 6 0 0 0-11.4 1.8A3.6 3.6 0 0 0 7 19z" style="fill:var(--sky-cloud)"/>',
  rain: '<path d="M7 15h12a4.5 4.5 0 0 0 0-9 6 6 0 0 0-11.4 1.8A3.6 3.6 0 0 0 7 15z" style="fill:var(--sky-cloud-dark)"/><g style="stroke:var(--sky-rain)" stroke-width="1.6" stroke-linecap="round"><path d="M9 18l-1 3M13 18l-1 3M17 18l-1 3"/></g>',
};

let requestId = 0;

/** Live forecast for the day, at the first stop of the day. */
export async function renderWeather(day: ResolvedDay, today: string, timezone: string): Promise<void> {
  const id = ++requestId;
  const box = $("wx-box");
  const foot = $("wx-foot");
  const place = day.stops[0]?.place;
  if (!place || !day.items.length) {
    box.innerHTML = `<p class="wx-msg">${esc(t.weatherNoPlace)}</p>`;
    foot.innerHTML = "";
    return;
  }
  box.innerHTML = `<p class="wx-msg">${esc(t.weatherLoading)}</p>`;
  foot.innerHTML = "";
  const items = day.items.map((r) => r.item);
  const first = Math.floor(toMinutes(items[0].start) / 60);
  const last = Math.ceil(toMinutes(items[items.length - 1].end) / 60);
  const state = await fetchWeather(place.lat, place.lng, day.day.date, today, timezone, slotHours(first, last));
  if (id !== requestId) return; // a newer day was selected meanwhile

  if (state.kind === "ok") {
    box.innerHTML = `<div class="wx">${state.slots.map((s) =>
      `<div><span class="h">${s.hour} h</span><svg viewBox="0 0 26 26" aria-hidden="true">${SKY[s.sky]}</svg>` +
      `<span class="t">${s.temperature}°</span><br><span class="r">${s.rainChance} % ${esc(t.rain)}</span></div>`).join("")}</div>`;
    foot.innerHTML = state.sunset ? `<span>${esc(t.sunset(formatTime(state.sunset)))}</span>` : "";
  } else {
    const msg = state.kind === "tooFar"
      ? t.weatherTooFar(formatDate(state.availableFrom, { day: "numeric", month: "long" }))
      : state.kind === "past" ? t.weatherPast : t.weatherUnavailable;
    box.innerHTML = `<p class="wx-msg">${esc(msg)}</p>`;
  }
}
