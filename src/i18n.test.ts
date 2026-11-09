import { describe, expect, it } from "vitest";
import { en } from "./locales/en";
import { fr } from "./locales/fr";
import { pickLang } from "./i18n";

describe("pickLang", () => {
  it("prefers the viewer's saved choice over the browser language", () => {
    expect(pickLang("en", "fr-FR")).toBe("en");
    expect(pickLang("fr", "en-US")).toBe("fr");
  });
  it("follows the browser when nothing is saved, English for any other language", () => {
    expect(pickLang(null, "fr-CA")).toBe("fr");
    expect(pickLang(null, "de-DE")).toBe("en");
    expect(pickLang(null, undefined)).toBe("en");
  });
  it("ignores an unknown saved value", () => {
    expect(pickLang("de", "fr-FR")).toBe("fr");
  });
});

describe("locales", () => {
  it("have the same keys, nested ones included", () => {
    const keys = (o: object, p = ""): string[] =>
      Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" && !Array.isArray(v) ? keys(v, `${p}${k}.`) : [`${p}${k}`]));
    expect(keys(fr).sort()).toEqual(keys(en).sort());
  });
});

describe("sectionLabel", () => {
  it("shows the default part names in the interface language, whatever language created them", async () => {
    const { sectionLabel, t } = await import("./i18n");
    expect(sectionLabel("Matin")).toBe(t.sectionLabels[0]);
    expect(sectionLabel(" soirée ")).toBe(t.sectionLabels[2]);
    expect(sectionLabel("Afternoon")).toBe(t.sectionLabels[1]);
  });
  it("keeps a name the organiser chose", async () => {
    const { sectionLabel } = await import("./i18n");
    expect(sectionLabel("Brunch")).toBe("Brunch");
  });
});
