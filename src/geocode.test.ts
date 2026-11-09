import { describe, expect, it } from "vitest";
import { readNominatim } from "./geocode";

describe("readNominatim", () => {
  it("reads the first result (Nominatim sends numbers as strings)", () => {
    expect(readNominatim([{ lat: "44.8624", lon: "-0.5502", display_name: "Cité du Vin" }, { lat: "1", lon: "1" }])).toEqual({ lat: 44.8624, lng: -0.5502 });
  });
  it.each([[[]], [null], [{}], [[{ lat: "abc", lon: "1" }]], [[{ lat: "95", lon: "1" }]]])("finds nothing in %j", (body) => {
    expect(readNominatim(body)).toBeNull();
  });
});
