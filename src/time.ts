/** A trip day runs from 06:00 to 05:59 the next morning, so a night out still belongs to its evening. */
export const DAY_ROLLOVER_HOUR = 6;

/** "HH:MM" → minutes since the start of the trip day (01:30 → 25 h 30). */
export function toMinutes(hm: string): number {
  const [h, m] = hm.split(":").map(Number);
  return (h < DAY_ROLLOVER_HOUR ? h + 24 : h) * 60 + m;
}

/** 0 before start, 1 after end, linear in between. */
export function progress(now: number, start: string, end: string): number {
  const s = toMinutes(start);
  const e = toMinutes(end);
  return Math.max(0, Math.min(1, (now - s) / Math.max(1, e - s)));
}

export interface TripClock {
  /** Trip-day date, YYYY-MM-DD. */
  date: string;
  /** Minutes since midnight of that date (may exceed 24 h before the rollover). */
  minutes: number;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Current trip-day date and time in the trip's time zone. */
export function tripClock(timeZone: string, at: Date = new Date()): TripClock {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(at).map((p) => [p.type, p.value]),
  );
  let h = Number(parts.hour);
  const m = Number(parts.minute);
  let d = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)));
  if (h < DAY_ROLLOVER_HOUR) {
    d = new Date(d.getTime() - 86_400_000);
    h += 24;
  }
  return { date: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`, minutes: h * 60 + m };
}

/** Parses a "?now=2026-11-28T14:45" override (trip-local time) for previews and tests. */
export function parseNowOverride(value: string | null): TripClock | null {
  const match = value?.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})$/);
  if (!match) return null;
  const h = Number(match[2]);
  const m = Number(match[3]);
  if (h < DAY_ROLLOVER_HOUR) {
    const d = new Date(`${match[1]}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 1);
    return { date: d.toISOString().slice(0, 10), minutes: (h + 24) * 60 + m };
  }
  return { date: match[1], minutes: h * 60 + m };
}

/** Minutes to use for a given day: the clock time on that day, before/after everything otherwise. */
export function minutesForDay(clock: TripClock, dayDate: string): number {
  if (clock.date < dayDate) return -Infinity;
  if (clock.date > dayDate) return Infinity;
  return clock.minutes;
}

/** Whole days between two ISO dates (b - a). */
/** The ISO date n days later (earlier when negative). */
export function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);
}
