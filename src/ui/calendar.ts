/**
 * Calendar for a period or a single day (length 1): a button that opens the month of the period under it, and the next one beside it
 * when the period runs into it (on a wide screen), with a period of fixed length drawn on
 * them. Hovering (or moving the keyboard focus to) a day previews the period starting that day; a
 * click picks it. Escape, a click outside or a pick closes it. Styles: .calendar in components.css.
 */
import { addDays } from "../time";
import { capitalize, formatDate, lang, t } from "../i18n";
import { CHEVRON_BACK, CHEVRON_FORWARD } from "./icons";
import { esc } from "./dom";

export interface PeriodPicker {
  /** First day of the period currently chosen (ISO date), or "" when none is yet. */
  start(): string;
  /** Days before this one (ISO date) cannot be picked. */
  min?(): string;
  /** Number of days in the period. */
  length(): number;
  /** Today, marked on the calendar. */
  today: string;
  onPick(date: string): void;
  /** Name of the calendar for screen readers (default: pick the trip's first day). */
  label?: string;
}

const monthOf = (iso: string) => `${iso.slice(0, 7)}-01`;
const addMonths = (first: string, n: number) => {
  const d = new Date(`${first}T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 10);
};
/** 0 = Monday … 6 = Sunday. */
const weekdayMon0 = (iso: string) => (new Date(`${iso}T12:00:00Z`).getUTCDay() + 6) % 7;

/** Days of one month as grid cells: blanks before the 1st so weeks start on Monday (Sunday in English). */
export function monthCells(first: string, weekStartsMonday: boolean): (string | null)[] {
  const lead = weekStartsMonday ? weekdayMon0(first) : (weekdayMon0(first) + 1) % 7;
  const cells: (string | null)[] = Array(lead).fill(null);
  for (let d = first; d.slice(0, 7) === first.slice(0, 7); d = addDays(d, 1)) cells.push(d);
  return cells;
}

export function attachPeriodPicker(trigger: HTMLButtonElement, p: PeriodPicker, signal?: AbortSignal): void {
  let pop: HTMLElement | null = null;
  /** The day the calendar opens on: the chosen one, else the first allowed one, else today. */
  const anchor = () => p.start() || (p.min?.() ?? "") || p.today;
  let view = monthOf(anchor());
  const monday = lang !== "en";

  const close = (refocus = false) => {
    pop?.remove();
    pop = null;
    trigger.setAttribute("aria-expanded", "false");
    if (refocus) trigger.focus();
  };

  /** Marks the period starting at `from` (the chosen one when null). */
  const mark = (from: string | null) => {
    if (!pop) return;
    const first = from ?? p.start();
    if (!first) return;
    const last = addDays(first, p.length() - 1);
    pop.querySelectorAll<HTMLButtonElement>(".cal-day").forEach((b) => {
      const d = b.dataset.date!;
      b.classList.toggle("in", d >= first && d <= last);
      b.classList.toggle("first", d === first);
      b.classList.toggle("last", d === last);
      b.classList.toggle("preview", from !== null && from !== p.start());
    });
  };

  const month = (first: string, i: number, count: number) => {
    const names = [...Array(7)].map((_, k) => capitalize(formatDate(addDays("2026-11-02", monday ? k : k - 1), { weekday: "short" }).replace(".", "")));
    const head = `<div class="cal-title">${i === 0 ? `<button type="button" class="arrow-btn" data-step="-1" aria-label="${esc(t.prevMonth)}">${CHEVRON_BACK}</button>` : "<span></span>"}` +
      `<span>${esc(capitalize(formatDate(first, { month: "long", year: "numeric" })))}</span>` +
      `${i === count - 1 ? `<button type="button" class="arrow-btn" data-step="1" aria-label="${esc(t.nextMonth)}">${CHEVRON_FORWARD}</button>` : "<span></span>"}</div>`;
    const cells = monthCells(first, monday).map((d) => (d
      ? `<button type="button" class="cal-day${d === p.today ? " today" : ""}" data-date="${d}" tabindex="-1"${d < (p.min?.() ?? "") ? " disabled" : ""} aria-label="${esc(capitalize(formatDate(d, { weekday: "long", day: "numeric", month: "long", year: "numeric" })))}">${Number(d.slice(8))}</button>`
      : `<span></span>`)).join("");
    return `<div class="cal-month">${head}<div class="cal-grid">${names.map((n) => `<span class="cal-wd" aria-hidden="true">${esc(n)}</span>`).join("")}${cells}</div></div>`;
  };

  /** Two months only when the chosen period spans them and the screen is wide enough. */
  const shown = () => {
    const spans = monthOf(anchor()) !== monthOf(addDays(anchor(), p.length() - 1));
    return spans && matchMedia("(min-width: 640px)").matches ? 2 : 1;
  };
  const draw = (focusDate?: string) => {
    if (!pop) return;
    const n = shown();
    pop.innerHTML = `<div class="cal-months">${[...Array(n).keys()].map((i) => month(addMonths(view, i), i, n)).join("")}</div>`;
    mark(null);
    const target = pop.querySelector<HTMLButtonElement>(`.cal-day[data-date="${focusDate ?? anchor()}"]`) ?? pop.querySelector<HTMLButtonElement>(".cal-day:not(:disabled)") ?? pop.querySelector<HTMLButtonElement>(".cal-day")!;
    target.tabIndex = 0;
    if (focusDate) target.focus();
  };

  const open = () => {
    view = monthOf(anchor());
    pop = document.createElement("div");
    pop.className = "calendar";
    pop.setAttribute("role", "dialog");
    pop.setAttribute("aria-label", p.label ?? t.pickStart);
    trigger.after(pop);
    trigger.setAttribute("aria-expanded", "true");
    draw(anchor());

    pop.addEventListener("click", (e) => {
      const el = (e.target as HTMLElement).closest<HTMLButtonElement>("button");
      if (!el) return;
      if (el.dataset.step) {
        view = addMonths(view, Number(el.dataset.step));
        draw();
      } else if (el.dataset.date) {
        p.onPick(el.dataset.date);
        close(true);
      }
    });
    pop.addEventListener("mouseover", (e) => {
      const d = (e.target as HTMLElement).closest<HTMLElement>(".cal-day")?.dataset.date;
      if (d) mark(d);
    });
    pop.addEventListener("mouseleave", () => mark(null));
    pop.addEventListener("focusin", (e) => {
      const d = (e.target as HTMLElement).dataset.date;
      if (d) mark(d);
    });
    // Arrows move by a day or a week, changing month when needed
    pop.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close(true);
        return;
      }
      const d = (e.target as HTMLElement).dataset.date;
      const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
      if (!d || !step) return;
      e.preventDefault();
      const next = addDays(d, step);
      if (next < (p.min?.() ?? "")) return;
      if (next < view || next >= addMonths(view, shown())) view = next < view ? monthOf(next) : addMonths(monthOf(next), 1 - shown());
      draw(next);
    });
  };

  trigger.setAttribute("aria-haspopup", "dialog");
  trigger.setAttribute("aria-expanded", "false");
  trigger.addEventListener("click", () => (pop ? close() : open()), { signal });
  document.addEventListener("pointerdown", (e) => {
    if (pop && !pop.contains(e.target as Node) && !trigger.contains(e.target as Node)) close();
  }, { signal });
  signal?.addEventListener("abort", () => close(), { once: true });
}
