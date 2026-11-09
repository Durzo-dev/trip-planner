/** UI language: the viewer's saved choice first, else the browser language when it is French, else English.
 *  Strings live in src/locales (one file per language). Switching language does not reload the page. Trip content (titles, descriptions) is written in
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

/** In development, ?lang= previews a language without saving it (used by the preview page). */
const previewLang = import.meta.env.DEV && typeof location !== "undefined" ? new URLSearchParams(location.search).get("lang") : null;

/** Fired on document when the language changes: each page redraws itself in place, keeping its state. */
export const LANG_CHANGE = "langchange";

const STRINGS = { en, fr };
const LOCALES = { en: "en-GB", fr: "fr-FR" };

// Live bindings: modules that import them always read the current language.
export let lang: Lang = pickLang(previewLang ?? load("lang"), typeof navigator === "undefined" ? undefined : navigator.language);
export let locale = LOCALES[lang];
export let t = STRINGS[lang];

/** Saves the viewer's choice and switches the interface to it without reloading. */
export function setLang(next: Lang): void {
  save("lang", next);
  if (next === lang) return;
  lang = next;
  locale = LOCALES[next];
  t = STRINGS[next];
  document.documentElement.lang = next;
  document.dispatchEvent(new Event(LANG_CHANGE));
}

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
