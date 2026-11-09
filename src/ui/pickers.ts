/**
 * Date and time fields drawn with the design system instead of the browser's own pickers. Pages keep
 * writing plain <input type="date"> and <input type="time">; enhancePickers() turns them into:
 * - a date: the input becomes hidden (it keeps its name, value, min and listeners) and a .date-btn opens
 *   the calendar of ui/calendar.ts; picking a day sets the value and fires "change";
 * - a time: a text field (typed "930", "9h30", "21:05"… is read as HH:MM on leaving it, arrow keys move
 *   by 5 minutes) with a list of hours and minutes under it.
 * Styles: .picker, .date-btn, .time-input, .timepop in components.css.
 */
import { capitalize, formatDate, t } from "../i18n";
import { attachPeriodPicker } from "./calendar";
import { CALENDAR } from "./icons";
import { esc } from "./dom";

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const pad = (n: number) => String(n).padStart(2, "0");

/** Reads a typed time: "9" → 09:00, "930" / "9h30" / "9:30" → 09:30, "2105" → 21:05; null when it is not one. */
export function parseTime(input: string): string | null {
  const s = input.trim().toLowerCase().replace(/\s+/g, "");
  if (!s) return null;
  const m = s.match(/^(\d{1,2})(?:[:h.]?(\d{2}))?h?$/) ?? s.match(/^(\d{1,2})[:h.](\d)$/);
  let h: number;
  let min: number;
  if (m) {
    h = Number(m[1]);
    min = m[2] === undefined ? 0 : m[2].length === 1 ? Number(m[2]) * 10 : Number(m[2]);
  } else if (/^\d{3,4}$/.test(s)) {
    h = Number(s.slice(0, s.length - 2));
    min = Number(s.slice(-2));
  } else return null;
  return h < 24 && min < 60 ? `${pad(h)}:${pad(min)}` : null;
}

/** Moves a time by n minutes, around the clock. */
export const stepTime = (time: string, n: number) => {
  const [h, m] = (TIME.test(time) ? time : "12:00").split(":").map(Number);
  const total = (((h * 60 + m + n) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
};

export function enhancePickers(root: ParentNode, signal?: AbortSignal): void {
  const today = new Date().toISOString().slice(0, 10);
  const dates = [...root.querySelectorAll<HTMLInputElement>('input[type="date"]')];
  dates.forEach((input) => enhanceDate(input, today, signal));
  root.querySelectorAll<HTMLInputElement>('input[type="time"]').forEach((input) => enhanceTime(input, signal));
  // A hidden input is not checked by the browser: a required date left empty stops the form here
  new Set(dates.map((i) => i.form).filter((f): f is HTMLFormElement => !!f)).forEach((form) =>
    form.addEventListener("submit", (e) => {
      const missing = [...form.querySelectorAll<HTMLInputElement>("input[data-required]")].find((i) => !i.value);
      if (!missing) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const btn = missing.nextElementSibling as HTMLButtonElement;
      btn.classList.add("invalid");
      btn.click();
    }, { capture: true, signal }),
  );
}

const dateText = (iso: string) => (iso ? capitalize(formatDate(iso, { day: "numeric", month: "long", year: "numeric" })) : t.pickDate);

function enhanceDate(input: HTMLInputElement, today: string, signal?: AbortSignal): void {
  const wrap = document.createElement("span");
  wrap.className = "picker";
  input.before(wrap);
  if (input.required) input.dataset.required = "";
  input.type = "hidden";
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "date-btn";
  wrap.append(input, btn);
  btn.innerHTML = `<span></span>${CALENDAR}`;
  const text = btn.firstElementChild as HTMLElement;
  let shown: string | null = null;
  // Touches only the text, and only when the value changed: rewriting the button under a click eats it
  const refresh = () => {
    if (input.value === shown) return;
    shown = input.value;
    text.textContent = dateText(input.value);
    text.classList.toggle("placeholder", !input.value);
    if (input.value) btn.classList.remove("invalid");
  };
  refresh();
  attachPeriodPicker(btn, {
    start: () => input.value,
    min: () => input.min,
    length: () => 1,
    today,
    label: t.pickDate,
    onPick(date) {
      input.value = date;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    },
  }, signal);
  // Another field's listener may set this one (e.g. the last day follows the first)
  (input.form ?? input.closest("section") ?? document).addEventListener("change", refresh, { signal });
}

function enhanceTime(input: HTMLInputElement, signal?: AbortSignal): void {
  const wrap = document.createElement("span");
  wrap.className = "picker";
  input.before(wrap);
  wrap.append(input);
  Object.assign(input, { type: "text", inputMode: "numeric", autocomplete: "off", maxLength: 5, placeholder: "--:--" });
  input.pattern = TIME.source.slice(1, -1);
  input.classList.add("time-input");
  let pop: HTMLElement | null = null;

  const set = (v: string) => {
    if (v === input.value) return;
    input.value = v;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    if (pop) mark();
  };
  const close = () => {
    pop?.remove();
    pop = null;
  };
  const mark = () => {
    const [h, m] = TIME.test(input.value) ? input.value.split(":") : ["", ""];
    pop?.querySelectorAll<HTMLButtonElement>("button").forEach((b) => b.classList.toggle("on", b.dataset.h === h || b.dataset.m === m));
  };
  const open = () => {
    if (pop) return;
    const [, m] = TIME.test(input.value) ? input.value.split(":") : ["", ""];
    const minutes = [...Array(12)].map((_, i) => pad(i * 5));
    if (m && !minutes.includes(m)) minutes.push(m), minutes.sort();
    pop = document.createElement("div");
    pop.className = "timepop";
    pop.innerHTML = `<div class="time-col" aria-label="${esc(t.hours)}">${[...Array(24)].map((_, h) => `<button type="button" tabindex="-1" data-h="${pad(h)}">${pad(h)}</button>`).join("")}</div>` +
      `<div class="time-col" aria-label="${esc(t.minutes)}">${minutes.map((x) => `<button type="button" tabindex="-1" data-m="${x}">${x}</button>`).join("")}</div>`;
    wrap.append(pop);
    mark();
    pop.querySelectorAll<HTMLElement>(".on").forEach((b) => b.parentElement!.scrollTo({ top: b.offsetTop - b.parentElement!.clientHeight / 2 + b.offsetHeight / 2 }));
    // Keep the focus in the field: a click on the list must not blur it
    pop.addEventListener("pointerdown", (e) => e.preventDefault());
    pop.addEventListener("click", (e) => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>("button");
      if (!b) return;
      e.preventDefault(); // inside a <label>: do not re-focus the field
      const [h, m] = TIME.test(input.value) ? input.value.split(":") : ["12", "00"];
      if (b.dataset.h) set(`${b.dataset.h}:${m}`);
      else {
        set(`${h}:${b.dataset.m}`);
        close();
      }
    });
  };

  input.addEventListener("focus", open, { signal });
  input.addEventListener("click", open, { signal });
  input.addEventListener("blur", () => {
    close();
    const v = parseTime(input.value);
    if (v) set(v);
  }, { signal });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
    else if (e.key === "Enter") {
      const v = parseTime(input.value);
      if (v) set(v);
      close();
    } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      set(stepTime(parseTime(input.value) ?? input.value, e.key === "ArrowUp" ? 5 : -5));
    }
  }, { signal });
}
