import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { Day, Item, Label, Trip } from "./types";
import { applyLabelRules, hasLabel, meetingOf, migrateTrip, setLabel } from "./labels";

const it_ = (start: string, title: string, labels?: Label[]): Item => ({ start, end: start, title, ...(labels ? { labels } : {}) });
const day = (date: string, ...items: Item[]): Day => ({
  date,
  sections: [
    { label: "Morning", items: items.filter((i) => i.start < "12:00" && i.start >= "06:00") },
    { label: "Afternoon", items: items.filter((i) => i.start >= "12:00" && i.start < "18:00") },
    { label: "Evening", items: items.filter((i) => i.start >= "18:00" || i.start < "06:00") },
  ],
});
const trip = (...days: Day[]): Trip => ({ id: "x-2026-11-28", title: "x", timezone: "Europe/Paris", participants: [], days });
const labelsOf = (d: Day) => d.sections.flatMap((s) => s.items.map((i) => `${i.title}:${(i.labels ?? []).join("+")}`));

describe("setLabel", () => {
  it("keeps the display order and drops an empty list", () => {
    const i = it_("10:00", "A");
    setLabel(i, "booking", true);
    setLabel(i, "optional", true);
    expect(i.labels).toEqual(["optional", "booking"]);
    setLabel(i, "optional", false);
    setLabel(i, "booking", false);
    expect(i).not.toHaveProperty("labels");
  });
});

describe("applyLabelRules", () => {
  it("gives each day with activities a meeting point, the earliest by default, and none to an empty day", () => {
    const t = applyLabelRules(trip(day("2026-11-28", it_("10:00", "A"), it_("14:00", "B")), day("2026-11-29"), day("2026-11-30", it_("09:00", "C"))));
    expect(t.days.map((d) => meetingOf(d)?.title)).toEqual(["A", undefined, "C"]);
  });

  it("makes the activities before the day's meeting point optional, and never the meeting point itself", () => {
    const t = applyLabelRules(trip(day("2026-11-28", it_("10:00", "A", ["paid"]), it_("12:30", "B", ["meeting", "optional"]), it_("19:00", "C"))));
    expect(labelsOf(t.days[0])).toEqual(["A:optional+paid", "B:meeting", "C:"]);
  });

  it("keeps the activities after the meeting point optional when they were marked so", () => {
    const t = applyLabelRules(trip(day("2026-11-28", it_("12:30", "A"), it_("00:30", "Last drink", ["optional"]))));
    expect(labelsOf(t.days[0])).toEqual(["A:meeting", "Last drink:optional"]);
  });

  it("moves the meeting point to the activity just chosen, and gives back the ones only the old one made optional", () => {
    let t = applyLabelRules(trip(day("2026-11-28", it_("10:00", "A"), it_("12:30", "B"), it_("15:00", "C"), it_("19:00", "D"))));
    // Choose D: A, B and C become optional
    t.days[0].sections[2].items[0].labels = ["meeting"];
    t = applyLabelRules(t, { day: 0, item: t.days[0].sections[2].items[0] });
    expect(labelsOf(t.days[0])).toEqual(["A:optional", "B:optional", "C:optional", "D:meeting"]);
    // Back to B: C is no longer before the meeting point; A still is
    t.days[0].sections[1].items[0].labels = ["meeting"];
    t = applyLabelRules(t, { day: 0, item: t.days[0].sections[1].items[0] });
    expect(labelsOf(t.days[0])).toEqual(["A:optional", "B:meeting", "C:", "D:"]);
  });

  it("falls back to the first activity that is not optional when the meeting activity is gone", () => {
    const t = applyLabelRules(trip(day("2026-11-28", it_("10:00", "A", ["optional"]), it_("15:00", "C"))));
    expect(meetingOf(t.days[0])?.title).toBe("C");
  });
});

describe("migrateTrip", () => {
  it("turns the free labels and the single meeting point into the fixed labels, day by day", () => {
    const legacy = {
      ...trip(
        day("2026-11-28", { ...it_("10:00", "Market"), tag: "OPTIONAL", tagStyle: "optional" } as Item, { ...it_("12:30", "Lunch"), tag: "EVERYONE", tagStyle: "all" } as Item, { ...it_("15:00", "Walk"), tag: "FREE" } as Item),
        day("2026-11-29", it_("09:00", "Brunch"), { ...it_("11:00", "Museum"), tag: "EVERYONE", tagStyle: "all" } as Item),
      ),
      meetingPoint: { date: "2026-11-28", time: "12:30" },
    };
    const t = migrateTrip(legacy);
    expect(t).not.toHaveProperty("meetingPoint");
    expect(labelsOf(t.days[0])).toEqual(["Market:optional", "Lunch:meeting", "Walk:"]);
    expect(labelsOf(t.days[1])).toEqual(["Brunch:optional", "Museum:meeting"]);
    expect(JSON.stringify(t)).not.toMatch(/"tag/);
  });

  it("leaves a trip already in the current format as it is", () => {
    const t = applyLabelRules(trip(day("2026-11-28", it_("10:00", "A", ["booking"]), it_("12:30", "B"))));
    expect(migrateTrip(t)).toEqual(t);
  });

  it("finds every bundled trip file already in the current format", () => {
    const dir = join(__dirname, "../public/trips");
    for (const f of readdirSync(dir)) {
      const t = JSON.parse(readFileSync(join(dir, f), "utf8")) as Trip;
      expect(migrateTrip(t), f).toEqual(t);
      expect(t.days.filter((d) => d.sections.some((s) => s.items.length)).every((d) => d.sections.flatMap((s) => s.items).filter((i) => hasLabel(i, "meeting")).length === 1), f).toBe(true);
    }
  });
});
