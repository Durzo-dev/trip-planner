import { describe, expect, it } from "vitest";
import { monthCells } from "./calendar";

describe("monthCells", () => {
  it("starts weeks on Monday, with blanks before the 1st", () => {
    const c = monthCells("2026-12-01", true); // a Tuesday
    expect(c.slice(0, 2)).toEqual([null, "2026-12-01"]);
    expect(c.at(-1)).toBe("2026-12-31");
    expect(c).toHaveLength(32);
  });
  it("starts weeks on Sunday when asked", () => {
    expect(monthCells("2026-12-01", false).slice(0, 3)).toEqual([null, null, "2026-12-01"]);
    expect(monthCells("2026-11-01", false)[0]).toBe("2026-11-01"); // a Sunday
  });
  it("knows February's length", () => {
    expect(monthCells("2028-02-01", true).filter(Boolean)).toHaveLength(29);
  });
});
