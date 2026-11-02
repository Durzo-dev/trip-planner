import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { directionsUrl, pollResult, resolveDay } from "./plan";
import type { Poll, Trip } from "./types";

const trip: Trip = JSON.parse(readFileSync(new URL("../public/trips/bordeaux-2026-11-28.json", import.meta.url), "utf8"));
const poll = (counts: number[], def?: number): Poll => ({
  question: "?",
  default: def,
  options: counts.map((n, i) => ({ label: String(i), voters: Array.from({ length: n }, (_, k) => `p${i}${k}`) })),
});

describe("pollResult", () => {
  it("picks the option with the most votes", () => {
    expect(pollResult(poll([1, 3, 0]), undefined)).toMatchObject({ winner: 1, votes: 3, total: 4, tie: false });
  });
  it("counts the viewer's vote", () => {
    expect(pollResult(poll([2, 2]), 1)).toMatchObject({ winner: 1, votes: 3, tie: false });
  });
  it("keeps the organiser's default on a tie", () => {
    expect(pollResult(poll([2, 2], 1), undefined)).toMatchObject({ winner: 1, tie: true });
    expect(pollResult(poll([2, 2]), undefined)).toMatchObject({ winner: 0, tie: true });
  });
});

describe("resolveDay", () => {
  const day = trip.days[0];

  it("numbers the map stops in visiting order", () => {
    const r = resolveDay(trip, day, {}, "Other options");
    expect(r.stops.map((s) => s.n)).toEqual(r.stops.map((_, i) => i + 1));
    expect(r.items[1].stops).toEqual([2, 3, 4]); // the walk visits three places
  });

  it("puts the winning venue in place of the activity", () => {
    const base = resolveDay(trip, day, {}, "Other options");
    expect(base.items[2].venue?.name).toBe("Le Comptoir d'Étienne");
    const flipped = resolveDay({ ...trip, polls: { ...trip.polls, lunch: poll([1, 0, 3]) } }, day, {}, "Other options");
    expect(flipped.items[2].venue?.name).toBe("Copain Comme Canard");
    expect(flipped.items[2].alternatives[0].links.map((l) => l.name)).toEqual(["Le Comptoir d'Étienne", "La Côte de Bœuf"]);
  });

  it("turns the break into a 2nd escape game at the venue that lost", () => {
    const r = resolveDay(trip, day, { escape: 1, second: 0 }, "Other options");
    const escape = r.items.find((i) => i.item.poll === "escape")!;
    const second = r.items.find((i) => i.item.poll === "second")!;
    expect(escape.venue?.name).toBe("La Maison – goodlock");
    expect(second.title).toBe("2e escape game");
    expect(second.venue?.name).toBe("Le Passage");
  });
});

describe("directionsUrl", () => {
  it("builds a walking route with waypoints", () => {
    const url = new URL(directionsUrl(trip.days[0].sections[0].items[1].places!));
    expect(url.searchParams.get("travelmode")).toBe("walking");
    expect(url.searchParams.get("waypoints")).toContain("Cathédrale");
  });
});
