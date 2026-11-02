/**
 * Entry point: loads the trip named in ?trip=, builds the page shell and keeps the views in sync
 * (selected day, votes, live progress). ?now= freezes the clock to preview a day; on example trips the
 * test bar can simulate the clock too.
 */
import "./styles.css";
import type { Trip } from "./types";
import { lang, t } from "./i18n";
import { resolveDay, type MyVotes, type ResolvedDay } from "./plan";
import { load, save } from "./storage";
import { initTheme } from "./theme";
import { renderDemoBar, storedColours } from "./ui/demoBar";
import { minutesForDay, parseNowOverride, tripClock, type TripClock } from "./time";
import { $, esc, focusCard, highlightStops } from "./ui/dom";
import { renderHeader } from "./ui/header";
import { renderMap } from "./ui/map";
import { applyProgress, liveSection, renderProgramme } from "./ui/programme";
import { renderTabs, selectTab, syncTabWithScroll } from "./ui/tabs";
import { renderWeather } from "./ui/weatherPanel";

const DEFAULT_TRIP = "bordeaux-2026-11-28";

const SHELL = `
<header class="banner">
  <div class="wrap">
    <div>
      <h1 id="t-title"></h1>
      <p class="tagline" id="t-tag"></p>
      <div class="chips" id="t-chips"></div>
    </div>
    <div class="datebox"><div class="d" id="t-day"></div><div class="m" id="t-month"></div></div>
  </div>
</header>
<nav class="tabs"><div class="wrap tabs-row"><div class="tab-list" id="tabs" role="tablist"></div><button type="button" class="theme-btn" id="theme-btn"></button></div></nav>
<main class="wrap main">
  <aside class="side">
    <section class="panel" aria-labelledby="wx-h">
      <h2 id="wx-h">${esc(t.weatherTitle)}</h2>
      <div id="wx-box"></div>
      <div class="wx-foot" id="wx-foot"></div>
    </section>
    <section class="panel map-panel" aria-labelledby="map-h">
      <h2 id="map-h">${esc(t.routeTitle)}</h2>
      <p class="sub">${esc(t.routeHint)}</p>
      <svg class="map" id="map" role="img" aria-label="${esc(t.routeTitle)}"></svg>
      <p class="map-legend" id="map-legend"></p>
      <div class="btns">
        <a class="btn fill" id="route-all" target="_blank" rel="noopener">${esc(t.fullRoute)} ↗</a>
        <a class="btn" id="route-meet" target="_blank" rel="noopener">${esc(t.fromMeeting)} ↗</a>
      </div>
    </section>
  </aside>
  <div class="scroll" id="scroll"><div class="prog" id="prog"></div></div>
</main>`;

interface State {
  trip: Trip;
  dayIndex: number;
  day: ResolvedDay;
  votes: MyVotes;
}

const params = new URLSearchParams(location.search);
const override = parseNowOverride(params.get("now"));
/** Clock set from the test bar of an example trip. */
let simulated: TripClock | null = null;
const clock = (trip: Trip): TripClock => simulated ?? override ?? tripClock(trip.timezone);

async function loadTrip(id: string): Promise<Trip> {
  if (!/^[a-z0-9-]+$/.test(id)) throw new Error("Invalid trip id");
  const res = await fetch(`${import.meta.env.BASE_URL}trips/${id}.json`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function loadVotes(trip: Trip): MyVotes {
  const votes: MyVotes = {};
  for (const key of Object.keys(trip.polls ?? {})) {
    const v = load(`vote:${trip.id}:${key}`);
    if (v !== null && trip.polls![key].options[Number(v)]) votes[key] = Number(v);
  }
  return votes;
}

/** Day shown first: today if the trip is under way, else the first day (or the last once it is over). */
function initialDay(trip: Trip, today: string): number {
  const i = trip.days.findIndex((d) => d.date === today);
  if (i >= 0) return i;
  return today > trip.days[trip.days.length - 1].date ? trip.days.length - 1 : 0;
}

function meetingStop(s: State): number | null {
  const mp = s.trip.meetingPoint;
  if (!mp || s.day.day.date !== mp.date) return null;
  const r = s.day.items.find((it) => it.item.start === mp.time);
  return r?.stops[0] ?? null;
}

function render(s: State, keepScroll = true): void {
  const scroller = $("scroll");
  const top = scroller.scrollTop;
  const winY = scrollY;
  s.day = resolveDay(s.trip, s.trip.days[s.dayIndex], s.votes, t.otherOptions);
  renderMap(s.day, s.trip.mapDecor, meetingStop(s));
  renderProgramme(s.trip, s.day, s.votes, { onVote: (key, i) => vote(s, key, i) });
  tick(s);
  if (keepScroll) {
    scroller.scrollTop = top;
    window.scrollTo(0, winY);
  }
}

function tick(s: State): void {
  const now = minutesForDay(clock(s.trip), s.day.day.date);
  const multi = s.trip.days.length > 1;
  applyProgress(s.day, now, (n) => (multi ? (Number.isFinite(n) && liveSection(s.day, n) !== null ? s.dayIndex : null) : liveSection(s.day, n)));
}

function vote(s: State, key: string, option: number): void {
  s.votes[key] = s.votes[key] === option ? undefined : option;
  save(`vote:${s.trip.id}:${key}`, s.votes[key] === undefined ? null : String(s.votes[key]));
  render(s);
  document.getElementById(`opt-${key}-${option}`)?.focus({ preventScroll: true });
}

function showDay(s: State, i: number): void {
  s.dayIndex = i;
  const today = clock(s.trip).date;
  renderTabs(s.trip, i, today, (k) => showDay(s, k));
  render(s, false);
  $("scroll").scrollTop = 0;
  void renderWeather(s.day, tripClock(s.trip.timezone).date, s.trip.timezone);
}

async function start(): Promise<void> {
  document.documentElement.lang = lang;
  const app = $("app");
  let trip: Trip;
  try {
    trip = await loadTrip(params.get("trip") ?? DEFAULT_TRIP);
  } catch {
    initTheme(undefined);
    app.innerHTML = `<p class="error">${esc(t.loadError)}</p>`;
    return;
  }
  initTheme((trip.example && storedColours()) || trip.theme);
  app.outerHTML = SHELL;
  const today = clock(trip).date;
  const s: State = { trip, dayIndex: initialDay(trip, today), day: undefined as unknown as ResolvedDay, votes: loadVotes(trip) };

  renderHeader(trip, today, {
    onMeetingHover(active) {
      const stop = meetingStop(s);
      highlightStops(active && stop !== null ? [stop] : []);
    },
    onMeetingClick() {
      const mp = trip.meetingPoint!;
      const di = trip.days.findIndex((d) => d.date === mp.date);
      if (di >= 0 && di !== s.dayIndex) showDay(s, di);
      const r = s.day.items.find((it) => it.item.start === mp.time);
      if (r) focusCard(document.querySelector(`.card[data-i="${r.index}"]`));
    },
  });
  showDay(s, s.dayIndex);
  if (trip.days.length === 1) selectTab(0);
  if (trip.example) {
    renderDemoBar(trip, s.dayIndex, {
      onSimulate(c, dayIndex) {
        simulated = c;
        if (dayIndex !== null || !c) showDay(s, c ? dayIndex! : initialDay(trip, clock(trip).date));
        else tick(s);
      },
    });
  }

  $("scroll").addEventListener("scroll", () => syncTabWithScroll(trip), { passive: true });
  addEventListener("scroll", () => syncTabWithScroll(trip), { passive: true });
  if (!override) setInterval(() => { if (!simulated) tick(s); }, 30_000);
}

void start();
