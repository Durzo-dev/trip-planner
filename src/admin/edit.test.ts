import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { Item, Trip } from "../types";
import {
  addDay, addDays, mapsLinkOf, newTrip, parseCoordinates, placeItem, removeDay, removeItem, sectionForTime, setDayDate, shiftTrip, tripId, validateTrip,
} from "./edit";

const LABELS: [string, string, string] = ["Morning", "Afternoon", "Evening"];
const base = (): Trip => newTrip({ title: "Week-end à Bordeaux", timezone: "Europe/Paris", firstDay: "2026-11-27", lastDay: "2026-11-29", sectionLabels: LABELS });
const item = (start: string, end: string, title = "Walk"): Item => ({ start, end, title });

describe("tripId", () => {
  it("drops accents and punctuation and adds the first day", () => {
    expect(tripId("Week-end à Bordeaux !", "2026-11-27")).toBe("week-end-a-bordeaux-2026-11-27");
  });
  it("falls back when the title has no usable letter", () => {
    expect(tripId("!!!", "2026-11-27")).toBe("trip-2026-11-27");
  });
  it("matches the id rule of the database", () => {
    expect(tripId("A".repeat(80), "2026-11-27")).toMatch(/^[a-z0-9][a-z0-9-]{2,63}$/);
  });
});

describe("newTrip", () => {
  it("creates one empty day per date with three parts", () => {
    const t = base();
    expect(t.days.map((d) => d.date)).toEqual(["2026-11-27", "2026-11-28", "2026-11-29"]);
    expect(t.days[0].sections.map((s) => s.label)).toEqual(LABELS);
    expect(validateTrip(t)).toEqual([]);
  });
  it("caps a mistyped range at 31 days", () => {
    expect(newTrip({ title: "x", timezone: "UTC", firstDay: "2026-01-01", lastDay: "2027-01-01", sectionLabels: LABELS }).days).toHaveLength(31);
  });
});

describe("dates", () => {
  it("crosses month and year ends", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("shifts every day and the meeting point, without touching the original", () => {
    const t = placeItem(base(), 1, null, item("12:30", "14:00"));
    t.meetingPoint = { date: "2026-11-28", time: "12:30" };
    const s = shiftTrip(t, 7);
    expect(s.days.map((d) => d.date)).toEqual(["2026-12-04", "2026-12-05", "2026-12-06"]);
    expect(s.meetingPoint).toEqual({ date: "2026-12-05", time: "12:30" });
    expect(t.days[0].date).toBe("2026-11-27");
    expect(validateTrip(s)).toEqual([]);
  });

  it("moving one day keeps days in date order and takes the meeting point along", () => {
    const t = placeItem(base(), 0, null, item("10:00", "11:00"));
    t.meetingPoint = { date: "2026-11-27", time: "10:00" };
    const s = setDayDate(t, 0, "2026-11-30");
    expect(s.days.map((d) => d.date)).toEqual(["2026-11-28", "2026-11-29", "2026-11-30"]);
    expect(s.days[2].sections[0].items[0].title).toBe("Walk");
    expect(s.meetingPoint?.date).toBe("2026-11-30");
  });

  it("adds a day after the last one and removes one with its meeting point", () => {
    expect(addDay(base(), LABELS).days.at(-1)?.date).toBe("2026-11-30");
    const t = base();
    t.days[1].sections[0].items.push(item("09:00", "10:00"));
    t.meetingPoint = { date: "2026-11-28", time: "09:00" };
    const r = removeDay(t, 1);
    expect(r.days.map((d) => d.date)).toEqual(["2026-11-27", "2026-11-29"]);
    expect(r.meetingPoint).toBeUndefined();
  });
});

describe("activities", () => {
  it("keeps activities sorted by start time, after-midnight ones last", () => {
    let t = base();
    t = placeItem(t, 0, null, item("00:30", "01:30", "Last drink"));
    t = placeItem(t, 0, null, item("21:00", "23:00", "Games"));
    t = placeItem(t, 0, null, item("19:00", "20:30", "Dinner"));
    expect(t.days[0].sections[2].items.map((i) => i.title)).toEqual(["Dinner", "Games", "Last drink"]);
  });

  it("editing an activity's start moves the meeting point with it", () => {
    let t = placeItem(base(), 0, null, item("12:30", "14:00"));
    t.meetingPoint = { date: "2026-11-27", time: "12:30" };
    t = placeItem(t, 0, [1, 0], item("13:00", "14:30"));
    expect(t.meetingPoint?.time).toBe("13:00");
  });

  it("removing the meeting activity removes the meeting point; removing a poll's last activity removes the poll", () => {
    let t = placeItem(base(), 0, null, { ...item("12:30", "14:00"), poll: "lunch", choices: [{ title: "A" }] });
    t.polls = { lunch: { question: "Where?", options: [{ label: "A", voters: [] }] } };
    t.meetingPoint = { date: "2026-11-27", time: "12:30" };
    t = removeItem(t, 0, 1, 0);
    expect(t.meetingPoint).toBeUndefined();
    expect(t.polls).toEqual({});
  });
});

describe("parseCoordinates", () => {
  it.each([
    ["44.8412, -0.5800", { lat: 44.8412, lng: -0.58 }],
    ["44.8412 -0.58", { lat: 44.8412, lng: -0.58 }],
    ["https://www.google.com/maps/place/X/@44.8412,-0.5800,17z/data=!3d44.8411!4d-0.5799", { lat: 44.8411, lng: -0.5799 }],
    ["https://www.google.com/maps/@44.8412,-0.58,15z", { lat: 44.8412, lng: -0.58 }],
    ["https://maps.google.com/?q=44.8412,-0.58", { lat: 44.8412, lng: -0.58 }],
    ["https://www.google.com/maps/search/44.8412,+-0.58?entry=tts", { lat: 44.8412, lng: -0.58 }],
    ["https://www.google.com/maps/search/?api=1&query=44.8412%2C-0.58", { lat: 44.8412, lng: -0.58 }],
    ["https://www.google.com/maps/dir//44.8412,-0.58/@44.84,-0.6,15z", { lat: 44.8412, lng: -0.58 }],
    ["https://www.google.fr/maps/place/Cit%C3%A9+du+Vin/@44.8625,-0.5508,17z/data=!4m6!3m5!1s0x0:0x0!8m2!3d44.8624!4d-0.5502", { lat: 44.8624, lng: -0.5502 }],
  ])("reads %s", (input, expected) => {
    expect(parseCoordinates(input)).toEqual(expected);
  });
  it.each(["", "Place de la Bourse", "95, 10", "44.8, 200", "https://maps.app.goo.gl/AbCdEf123", "https://www.google.com/maps/place/Place+de+la+Bourse"])("refuses %j", (input) => {
    expect(parseCoordinates(input)).toBeNull();
  });
  it("keeps a pasted Google Maps link as the place's link, not typed coordinates", () => {
    expect(mapsLinkOf(" https://www.google.com/maps/@44.8,-0.5,15z ")).toBe("https://www.google.com/maps/@44.8,-0.5,15z");
    expect(mapsLinkOf("https://maps.google.fr/?q=44.8,-0.5")).toBe("https://maps.google.fr/?q=44.8,-0.5");
    expect(mapsLinkOf("https://maps.app.goo.gl/9rxEU5DzW29hXVRj7")).toBe("https://maps.app.goo.gl/9rxEU5DzW29hXVRj7");
    expect(mapsLinkOf("44.8, -0.5")).toBeUndefined();
    expect(mapsLinkOf("https://example.com/maps/@44.8,-0.5")).toBeUndefined();
  });
});

describe("validateTrip", () => {
  it("accepts every bundled trip file", () => {
    const dir = join(__dirname, "../../public/trips");
    for (const f of readdirSync(dir)) {
      const trip = JSON.parse(readFileSync(join(dir, f), "utf8")) as Trip;
      expect(validateTrip(trip), f).toEqual([]);
    }
  });

  it("reports each blocking problem with where it is", () => {
    const t = base();
    t.title = " ";
    t.days[2].date = "2026-11-28";
    t.days[0].sections[0].items.push(item("10:00", "09:00", ""), item("25:00", "26:00"));
    t.days[0].sections[1].items.push({ ...item("14:00", "15:00"), places: [{ name: "Bourse", address: "", lat: 44.8, lng: -0.57 }] });
    t.meetingPoint = { date: "2026-11-27", time: "08:00" };
    expect(validateTrip(t)).toEqual([
      { code: "title" },
      { code: "itemTitle", day: 0, section: 0, item: 0 },
      { code: "endBeforeStart", day: 0, section: 0, item: 0 },
      { code: "time", day: 0, section: 0, item: 1 },
      { code: "place", day: 0, section: 1, item: 0 },
      { code: "dayOrder", day: 2 },
      { code: "meetingPoint" },
    ]);
  });

  it("accepts an activity that runs past midnight", () => {
    expect(validateTrip(placeItem(base(), 0, null, item("23:00", "01:00")))).toEqual([]);
  });

  it("refuses an impossible date", () => {
    const t = base();
    t.days[0].date = "2026-02-30";
    expect(validateTrip(t)).toContainEqual({ code: "date", day: 0 });
  });
});

describe("parts of the day", () => {
  it("files an activity by its start time: before noon, until 6 pm, then evening", () => {
    expect(["06:00", "11:59", "12:00", "17:59", "18:00", "23:30", "00:30", "05:59"].map((s) => sectionForTime(s, 3))).toEqual([0, 0, 1, 1, 2, 2, 2, 2]);
  });
  it("puts later activities in the last part of a day with fewer parts", () => {
    expect(sectionForTime("20:00", 2)).toBe(1);
    expect(sectionForTime("20:00", 1)).toBe(0);
  });
  it("moves an edited activity to the part its new time belongs to, meeting point included", () => {
    let t = placeItem(base(), 0, null, item("10:00", "11:00", "Coffee"));
    t.meetingPoint = { date: "2026-11-27", time: "10:00" };
    t = placeItem(t, 0, [0, 0], item("19:00", "20:00", "Coffee"));
    expect(t.days[0].sections.map((s) => s.items.map((i) => i.title))).toEqual([[], [], ["Coffee"]]);
    expect(t.meetingPoint?.time).toBe("19:00");
  });
});
