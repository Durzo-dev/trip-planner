import { describe, expect, it } from "vitest";
import { arrowState, dragScrollLeft } from "./dragScroll";

describe("dragScrollLeft", () => {
  it("moves the strip opposite to the pointer, like dragging paper", () => {
    expect(dragScrollLeft(100, 300, 200, 500)).toBe(200);
    expect(dragScrollLeft(100, 300, 350, 500)).toBe(50);
  });
  it("stops at both ends", () => {
    expect(dragScrollLeft(100, 300, 800, 500)).toBe(0);
    expect(dragScrollLeft(400, 300, 0, 500)).toBe(500);
  });
});

describe("arrowState", () => {
  it("shows no arrow when everything fits", () => {
    expect(arrowState(0, 500, 500)).toEqual({ back: false, forward: false });
  });
  it("shows the arrow of each end that hides something", () => {
    expect(arrowState(0, 300, 500)).toEqual({ back: false, forward: true });
    expect(arrowState(100, 300, 500)).toEqual({ back: true, forward: true });
    expect(arrowState(200, 300, 500)).toEqual({ back: true, forward: false });
  });
  it("ignores a fraction of a pixel left by zoom rounding", () => {
    expect(arrowState(199.5, 300, 500)).toEqual({ back: true, forward: false });
    expect(arrowState(0.5, 300, 500)).toEqual({ back: false, forward: true });
  });
});
