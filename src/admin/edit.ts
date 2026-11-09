/**
 * Edits an organiser makes to a trip, as pure functions: each returns a new trip and never touches the
 * one it was given, so the admin page can compare, undo or discard. validateTrip says what still blocks
 * saving; nothing is saved while it returns errors.
 */
import type { Day, Item, Place, Section, Trip } from "../types";
import { toMinutes } from "../time";

const clone = <T>(v: T): T => structuredClone(v);

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const isDate = (s: string) => DATE.test(s) && addDays(s, 0) === s;

/** Trip id from its title and first day: "Saturday in Bordeaux", 2026-11-28 → "saturday-in-bordeaux-2026-11-28". */
export function tripId(title: string, firstDay: string): string {
  const slug = title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40)
    .replace(/-$/, "");
  return `${slug || "trip"}-${firstDay}`;
}

export interface NewTrip {
  title: string;
  timezone: string;
  firstDay: string;
  lastDay: string;
  /** Labels of the three parts of a day, in the organiser's language. */
  sectionLabels: [string, string, string];
}

export function newTrip(n: NewTrip): Trip {
  const days: Day[] = [];
  for (let d = n.firstDay; d <= n.lastDay && days.length < 31; d = addDays(d, 1)) {
    days.push({ date: d, sections: n.sectionLabels.map((label) => ({ label, items: [] })) });
  }
  return { id: tripId(n.title, n.firstDay), title: n.title.trim(), timezone: n.timezone, participants: [], days };
}

/** Moves the whole trip by n days (negative = earlier): every day and the meeting point follow. */
export function shiftTrip(trip: Trip, n: number): Trip {
  const t = clone(trip);
  t.days.forEach((d) => (d.date = addDays(d.date, n)));
  if (t.meetingPoint) t.meetingPoint.date = addDays(t.meetingPoint.date, n);
  return t;
}

/** Changes one day's date; the meeting point follows its day. Days are kept in date order. */
export function setDayDate(trip: Trip, dayIndex: number, date: string): Trip {
  const t = clone(trip);
  const old = t.days[dayIndex].date;
  t.days[dayIndex].date = date;
  if (t.meetingPoint?.date === old) t.meetingPoint.date = date;
  t.days.sort((a, b) => a.date.localeCompare(b.date));
  return t;
}

/** Adds a day after the last one, with the same parts of the day as the last one (empty). */
export function addDay(trip: Trip, sectionLabels: [string, string, string]): Trip {
  const t = clone(trip);
  const last = t.days[t.days.length - 1];
  const labels = last ? last.sections.map((s) => s.label) : sectionLabels;
  t.days.push({ date: last ? addDays(last.date, 1) : new Date().toISOString().slice(0, 10), sections: labels.map((label) => ({ label, items: [] })) });
  return t;
}

export function removeDay(trip: Trip, dayIndex: number): Trip {
  const t = clone(trip);
  const [gone] = t.days.splice(dayIndex, 1);
  if (t.meetingPoint?.date === gone.date) delete t.meetingPoint;
  return t;
}

const byStart = (a: Item, b: Item) => toMinutes(a.start) - toMinutes(b.start);

/** Adds an activity (itemIndex null) or replaces one; activities stay sorted by start time. */
export function saveItem(trip: Trip, dayIndex: number, sectionIndex: number, itemIndex: number | null, item: Item): Trip {
  const t = clone(trip);
  const items = t.days[dayIndex].sections[sectionIndex].items;
  const old = itemIndex === null ? null : items[itemIndex];
  if (itemIndex === null) items.push(clone(item));
  else items[itemIndex] = clone(item);
  if (old && t.meetingPoint && t.meetingPoint.date === t.days[dayIndex].date && t.meetingPoint.time === old.start) {
    t.meetingPoint.time = item.start;
  }
  items.sort(byStart);
  return t;
}

export function removeItem(trip: Trip, dayIndex: number, sectionIndex: number, itemIndex: number): Trip {
  const t = clone(trip);
  const [gone] = t.days[dayIndex].sections[sectionIndex].items.splice(itemIndex, 1);
  if (t.meetingPoint && t.meetingPoint.date === t.days[dayIndex].date && t.meetingPoint.time === gone.start) delete t.meetingPoint;
  if (gone.poll && !t.days.some((d) => d.sections.some((s) => s.items.some((i) => i.poll === gone.poll)))) delete t.polls?.[gone.poll];
  return t;
}

/**
 * Reads coordinates typed by hand ("43.61, 3.87") or found in a Google Maps link
 * (".../@43.61,3.87,15z", "...!3d43.61!4d3.87", "?q=43.61,3.87").
 */
export function parseCoordinates(input: string): { lat: number; lng: number } | null {
  const s = input.trim();
  const patterns = [/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/, /@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/, /[?&](?:q|query|ll)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/, /^(-?\d+(?:\.\d+)?)\s*[,; ]\s*(-?\d+(?:\.\d+)?)$/];
  for (const p of patterns) {
    const m = s.match(p);
    if (!m) continue;
    const lat = Number(m[1]);
    const lng = Number(m[2]);
    if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng };
  }
  return null;
}

export type TripError =
  | { code: "title" }
  | { code: "noDays" }
  | { code: "date"; day: number }
  | { code: "dayOrder"; day: number }
  | { code: "itemTitle"; day: number; section: number; item: number }
  | { code: "time"; day: number; section: number; item: number }
  | { code: "endBeforeStart"; day: number; section: number; item: number }
  | { code: "place"; day: number; section: number; item: number }
  | { code: "meetingPoint" };

const placeOk = (p: Place) => p.name.trim() !== "" && p.address.trim() !== "" && Number.isFinite(p.lat) && Number.isFinite(p.lng);

/** What blocks saving. An empty list means the trip can be saved. */
export function validateTrip(trip: Trip): TripError[] {
  const errors: TripError[] = [];
  if (!trip.title.trim()) errors.push({ code: "title" });
  if (!trip.days.length) errors.push({ code: "noDays" });
  trip.days.forEach((d, di) => {
    if (!isDate(d.date)) errors.push({ code: "date", day: di });
    else if (di > 0 && isDate(trip.days[di - 1].date) && d.date <= trip.days[di - 1].date) errors.push({ code: "dayOrder", day: di });
    d.sections.forEach((s: Section, si) =>
      s.items.forEach((it, ii) => {
        const at = { day: di, section: si, item: ii };
        if (!it.title.trim()) errors.push({ code: "itemTitle", ...at });
        if (!TIME.test(it.start) || !TIME.test(it.end)) errors.push({ code: "time", ...at });
        else if (toMinutes(it.end) < toMinutes(it.start)) errors.push({ code: "endBeforeStart", ...at });
        if (it.places?.some((p) => !placeOk(p))) errors.push({ code: "place", ...at });
      }),
    );
  });
  const mp = trip.meetingPoint;
  if (mp && !trip.days.some((d) => d.date === mp.date && d.sections.some((s) => s.items.some((i) => i.start === mp.time)))) {
    errors.push({ code: "meetingPoint" });
  }
  return errors;
}
