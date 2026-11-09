import { describe, expect, it } from "vitest";
import { parseTime, stepTime } from "./pickers";

describe("parseTime", () => {
  it.each([
    ["9", "09:00"], ["09", "09:00"], ["9h", "09:00"], ["930", "09:30"], ["9h30", "09:30"], ["9:30", "09:30"], ["9.30", "09:30"],
    ["9:3", "09:30"], ["2105", "21:05"], ["21 h 05", "21:05"], ["00:30", "00:30"], ["12:30", "12:30"],
  ])("reads %j as %s", (input, expected) => {
    expect(parseTime(input)).toBe(expected);
  });
  it.each(["", "24", "2460", "9:75", "abc", "12:345"])("refuses %j", (input) => {
    expect(parseTime(input)).toBeNull();
  });
});

describe("stepTime", () => {
  it("moves by minutes around the clock", () => {
    expect(stepTime("12:30", 5)).toBe("12:35");
    expect(stepTime("23:58", 5)).toBe("00:03");
    expect(stepTime("00:00", -5)).toBe("23:55");
  });
});
