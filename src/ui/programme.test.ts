import { describe, expect, it } from "vitest";
import type { ResolvedDay } from "../plan";
import { liveSection } from "./programme";

const day = (sections: { start: string; end: string }[][]): ResolvedDay => ({
  day: { date: "2026-11-28", sections: sections.map((items, i) => ({ label: `S${i}`, items: items.map((x) => ({ ...x, title: "x" })) })) },
  items: [],
  stops: [],
});

describe("liveSection", () => {
  it("skips a part of the day that has no activity yet", () => {
    const d = day([[], [{ start: "14:00", end: "16:00" }], []]);
    expect(liveSection(d, 15 * 60)).toBe(1);
    expect(liveSection(d, 9 * 60)).toBeNull();
  });
});
