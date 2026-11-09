/** UI language: the viewer's saved choice first, else the browser language when it is French, else English.
 *  Strings live in src/locales (one file per language). Trip content (titles, descriptions) is written in
 *  the trip file and is not translated. */
import { en } from "./locales/en";
import { fr } from "./locales/fr";
import { load, save } from "./storage";

export type Lang = "en" | "fr";
export const LANGS: Lang[] = ["en", "fr"];

export function pickLang(saved: string | null, browser: string | undefined): Lang {
  if (saved === "en" || saved === "fr") return saved;
  return (browser || "en").toLowerCase().startsWith("fr") ? "fr" : "en";
}

export const lang: Lang = pickLang(load("lang"), typeof navigator === "undefined" ? undefined : navigator.language);

/** Saves the viewer's choice and reloads the page in that language. */
export function setLang(next: Lang): void {
  save("lang", next);
  location.reload();
}

export const locale = lang === "fr" ? "fr-FR" : "en-GB";

export const t = lang === "fr" ? fr : en;

/** "13:05" → "13 h 05" (fr) / "13:05" (en). */
export function formatTime(hm: string): string {
  const [h, m] = hm.split(":");
  return t.timeFormat(Number(h), m);
}

export function formatDate(iso: string, options: Intl.DateTimeFormatOptions): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString(locale, { timeZone: "UTC", ...options });
}

/**
 * A part of the day as shown: the default names (Morning / Matin…) follow the interface language, whatever
 * language the trip was created in; any other name is the organiser's own and is shown as written.
 */
export function sectionLabel(label: string): string {
  const key = label.trim().toLowerCase();
  for (const strings of [en, fr]) {
    const i = strings.sectionLabels.findIndex((l) => l.toLowerCase() === key);
    if (i >= 0) return t.sectionLabels[i];
  }
  return label;
}

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
