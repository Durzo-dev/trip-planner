/**
 * Activity labels: a fixed set, chosen by the organiser (an activity can have several), plus "poll",
 * which an activity has whenever it is decided by a poll.
 *
 * Rules, for each day that has activities:
 * - exactly one activity is the day's meeting point: the earliest one that is not optional by default;
 * - the activities before it are optional; the meeting point itself never is.
 */
import type { Day, Item, Label, Trip } from "./types";

/** The labels an organiser picks from, in display order. */
export const LABELS: readonly Label[] = ["meeting", "optional", "paid", "booking"];

export const hasLabel = (item: Item, label: Label): boolean => item.labels?.includes(label) ?? false;

/** Adds or removes a label, keeping the display order and dropping an empty list. */
export function setLabel(item: Item, label: Label, on: boolean): void {
  const next = LABELS.filter((l) => (l === label ? on : hasLabel(item, l)));
  if (next.length) item.labels = next;
  else delete item.labels;
}

/** The day's activities in schedule order (parts of the day, then start time). */
const dayItems = (day: Day): Item[] => day.sections.flatMap((s) => s.items);

/** The day's meeting point, if the day has activities. */
export const meetingOf = (day: Day): Item | undefined => dayItems(day).find((it) => hasLabel(it, "meeting"));

/**
 * Applies the rules to every day. `chosen` is an activity the organiser just made the meeting point
 * (compared by content): it wins over the day's previous one, and when it is earlier, the activities
 * between the two stop being optional, since only the old meeting point made them so.
 */
export function applyLabelRules(trip: Trip, chosen?: { day: number; item: Item }): Trip {
  const t = structuredClone(trip);
  const same = (a: Item, b: Item) => JSON.stringify(a) === JSON.stringify(b);
  t.days.forEach((day, di) => {
    const items = dayItems(day);
    if (!items.length) return;
    const meetings = items.map((it, i) => (hasLabel(it, "meeting") ? i : -1)).filter((i) => i >= 0);
    let at = -1;
    if (chosen?.day === di) {
      at = items.findIndex((it) => hasLabel(it, "meeting") && same(it, chosen.item));
      const old = meetings.find((i) => i !== at);
      if (at >= 0 && old !== undefined && old > at) items.slice(at + 1, old).forEach((it) => setLabel(it, "optional", false));
    }
    if (at < 0) at = meetings[0] ?? -1;
    if (at < 0) {
      at = items.findIndex((it) => !hasLabel(it, "optional"));
      if (at < 0) at = 0;
    }
    items.forEach((it, i) => {
      setLabel(it, "meeting", i === at);
      if (i < at) setLabel(it, "optional", true);
      if (i === at) setLabel(it, "optional", false);
    });
  });
  return t;
}

/**
 * The meeting point the trip header announces: today's, else the next day's, else (trip over) the
 * first one.
 */
export function headlineMeeting(trip: Trip, today: string): { dayIndex: number; date: string; item: Item } | null {
  const all = trip.days.map((d, dayIndex) => ({ dayIndex, date: d.date, item: meetingOf(d) })).filter((m): m is { dayIndex: number; date: string; item: Item } => !!m.item);
  return all.find((m) => m.date >= today) ?? all[0] ?? null;
}

/** Fields of the first trip format, before labels. */
interface LegacyTrip extends Omit<Trip, "days"> {
  meetingPoint?: { date: string; time: string };
  days: (Omit<Day, "sections"> & { sections: { label: string; note?: string; items: (Item & { tag?: string; tagStyle?: "all" | "optional" })[] }[] })[];
}

/**
 * Reads a trip saved in the first format: its free labels become the fixed ones ("everyone" became the
 * meeting point, "optional" stays), the trip's single meeting point marks its day's meeting, and the
 * rules then complete every day.
 */
export function migrateTrip(input: Trip | LegacyTrip): Trip {
  const legacy = structuredClone(input) as LegacyTrip;
  const mp = legacy.meetingPoint;
  delete legacy.meetingPoint;
  for (const day of legacy.days) {
    const fromMeetingPoint = mp?.date === day.date;
    for (const s of day.sections) {
      for (const it of s.items) {
        if (it.tagStyle === "optional") setLabel(it, "optional", true);
        if (it.tagStyle === "all" && !fromMeetingPoint) setLabel(it, "meeting", true);
        if (fromMeetingPoint && it.start === mp!.time) setLabel(it, "meeting", true);
        delete it.tag;
        delete it.tagStyle;
      }
    }
  }
  return applyLabelRules(legacy as Trip);
}
