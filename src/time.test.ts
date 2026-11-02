import { describe, expect, it } from "vitest";
import { daysBetween, minutesForDay, parseNowOverride, progress, toMinutes, tripClock } from "./time";

describe("toMinutes", () => {
  it("counts hours after midnight as the same night", () => {
    expect(toMinutes("12:30")).toBe(750);
    expect(toMinutes("00:30")).toBe(24 * 60 + 30);
  });
});

describe("progress", () => {
  it("is 0 before, 1 after and linear during a slot", () => {
    expect(progress(600, "12:30", "14:30")).toBe(0);
    expect(progress(810, "12:30", "14:30")).toBe(0.5);
    expect(progress(900, "12:30", "14:30")).toBe(1);
  });
  it("handles slots crossing midnight", () => {
    expect(progress(toMinutes("01:00"), "00:30", "01:30")).toBe(0.5);
  });
});

describe("tripClock", () => {
  it("returns the local date and time in the trip time zone", () => {
    expect(tripClock("Europe/Paris", new Date("2026-11-28T13:45:00Z"))).toEqual({ date: "2026-11-28", minutes: 14 * 60 + 45 });
  });
  it("keeps the night on the previous trip day before 6 am", () => {
    expect(tripClock("Europe/Paris", new Date("2026-11-29T00:15:00Z"))).toEqual({ date: "2026-11-28", minutes: 25 * 60 + 15 });
  });
});

describe("parseNowOverride", () => {
  it("parses a local date-time", () => {
    expect(parseNowOverride("2026-11-28T14:45")).toEqual({ date: "2026-11-28", minutes: 885 });
    expect(parseNowOverride("2026-11-29T01:00")).toEqual({ date: "2026-11-28", minutes: 25 * 60 });
  });
  it("ignores malformed values", () => {
    expect(parseNowOverride("tomorrow")).toBeNull();
    expect(parseNowOverride(null)).toBeNull();
  });
});

describe("minutesForDay", () => {
  it("is -Infinity before the day and Infinity after it", () => {
    const clock = { date: "2026-11-28", minutes: 800 };
    expect(minutesForDay(clock, "2026-11-29")).toBe(-Infinity);
    expect(minutesForDay(clock, "2026-11-27")).toBe(Infinity);
    expect(minutesForDay(clock, "2026-11-28")).toBe(800);
  });
});

describe("daysBetween", () => {
  it("counts calendar days", () => {
    expect(daysBetween("2026-11-02", "2026-11-28")).toBe(26);
  });
});
