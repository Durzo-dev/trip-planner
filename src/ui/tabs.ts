/**
 * Tabs under the banner, and the light/dark switch next to them.
 */
import type { Trip } from "../types";
import { capitalize, formatDate, formatTime, t } from "../i18n";
import { isDark, toggleTheme } from "../theme";
import { $, esc, reducedMotion } from "./dom";

/**
 * One-day trip: one tab per part of the day (Morning / Afternoon / Evening); clicking scrolls to it and the
 * active tab follows the scroll. Multi-day trip: one tab per day; clicking shows that day. Today is always the
 * first tab on the left, past days sit further left (greyed), future days to the right.
 */
export function renderTabs(trip: Trip, dayIndex: number, today: string, onDay: (i: number) => void): void {
  const wrap = $("tabs");
  const nav = wrap.closest("nav")!;
  const multi = trip.days.length > 1;
  const spacer = `<span class="spacer-end"></span>`;
  setThemeLabel();

  if (multi) {
    nav.setAttribute("aria-label", t.dayTabs);
    wrap.innerHTML =
      trip.days.map((d, i) => {
        const past = d.date < today;
        const isToday = d.date === today;
        const label = capitalize(formatDate(d.date, { weekday: "short", day: "numeric", month: "short" }));
        return `<button type="button" class="tab${past ? " past" : ""}" role="tab" id="tab-${i}" aria-selected="${i === dayIndex}">` +
          `<span class="dot" hidden></span>${esc(label)}${isToday ? `<em class="now-lbl">${esc(t.todayBadge)}</em>` : ""}` +
          `${d.label ? `<small>${esc(d.label)}</small>` : ""}</button>`;
      }).join("") + spacer;
    wrap.querySelectorAll<HTMLButtonElement>(".tab").forEach((b, i) => b.addEventListener("click", () => onDay(i)));
    scrollTodayToStart(wrap, trip, today);
  } else {
    nav.setAttribute("aria-label", t.partTabs);
    const sections = trip.days[0].sections;
    wrap.innerHTML =
      sections.map((s, i) => {
        const range = `${formatTime(s.items[0].start)} – ${formatTime(s.items[s.items.length - 1].end)}`;
        return `<button type="button" class="tab" role="tab" id="tab-${i}" aria-controls="sec-${i}" aria-selected="${i === 0}">` +
          `<span class="dot" hidden></span>${esc(s.label)}<small>${esc(range)}</small></button>`;
      }).join("") + spacer;
    wrap.querySelectorAll<HTMLButtonElement>(".tab").forEach((b, i) => b.addEventListener("click", () => {
      document.getElementById(`sec-${i}`)?.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", block: "start" });
      selectTab(i);
    }));
  }
  $("theme-btn").onclick = () => {
    toggleTheme();
    setThemeLabel();
  };
}

export function setThemeLabel(): void {
  const label = isDark() ? t.themeLight : t.themeDark;
  const btn = $("theme-btn");
  btn.innerHTML = `<span aria-hidden="true">${isDark() ? "☀" : "☾"}</span><span class="lbl"> ${esc(label)}</span>`;
  btn.setAttribute("aria-label", label);
  btn.title = label;
}

function scrollTodayToStart(wrap: HTMLElement, trip: Trip, today: string): void {
  let i = trip.days.findIndex((d) => d.date === today);
  if (i < 0) i = today < trip.days[0].date ? 0 : trip.days.length - 1;
  const target = document.getElementById(`tab-${i}`);
  const first = document.getElementById("tab-0");
  if (!target || !first) return;
  const want = target.offsetLeft - first.offsetLeft;
  const tabs = wrap.querySelectorAll<HTMLElement>(".tab");
  const lastTab = tabs[tabs.length - 1];
  const content = lastTab.offsetLeft + lastTab.offsetWidth - first.offsetLeft;
  const cs = getComputedStyle(wrap);
  const gap = want + wrap.clientWidth - (parseFloat(cs.paddingLeft) + content + parseFloat(cs.paddingRight));
  // let today reach the left edge even when the tabs would otherwise fit
  (wrap.querySelector(".spacer-end") as HTMLElement).style.minWidth = gap > 0 ? `${Math.ceil(gap)}px` : "";
  wrap.scrollLeft = want;
}

export function selectTab(i: number): void {
  document.querySelectorAll("#tabs .tab").forEach((b, k) => b.setAttribute("aria-selected", String(k === i)));
}

/** One-day trips: the active tab follows the scroll position. */
export function syncTabWithScroll(trip: Trip): void {
  if (trip.days.length > 1) return;
  const scroller = $("scroll");
  const inner = getComputedStyle(scroller).overflowY === "auto";
  const top = inner ? scroller.getBoundingClientRect().top : 0;
  const n = trip.days[0].sections.length;
  let current = 0;
  for (let i = 0; i < n; i++) {
    const el = document.getElementById(`sec-${i}`);
    if (el && el.getBoundingClientRect().top - top <= 80) current = i;
  }
  const atEnd = inner
    ? scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 4
    : innerHeight + scrollY >= document.documentElement.scrollHeight - 4;
  selectTab(atEnd ? n - 1 : current);
}
