/**
 * Derives every colour of the page from three trip colours (gradient start, gradient end, accent),
 * in light and dark mode, so a trip only has to pick its palette.
 */
import type { Theme } from "./types";
import { load, save } from "./storage";

/** Default colours: "Lilas" gradient with a violet accent. */
export const DEFAULT_THEME: Theme = { gradientStart: "#4F93E2", gradientEnd: "#B7A6EE", accent: "#7B61D9" };

type RGB = [number, number, number];
const toRgb = (hex: string): RGB => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as RGB;
const toHex = (c: number[]) => "#" + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
export const mix = (a: string, b: string, t: number) => {
  const A = toRgb(a);
  const B = toRgb(b);
  return toHex(A.map((v, i) => v + (B[i] - v) * t));
};
const luminance = (hex: string) => {
  const c = toRgb(hex).map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const rgba = (hex: string, a: number) => `rgba(${toRgb(hex).join(",")},${a})`;

let current: Theme = DEFAULT_THEME;

export function isDark(): boolean {
  const forced = document.documentElement.getAttribute("data-theme");
  if (forced) return forced === "dark";
  return matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Derives every colour token of the page from the gradient and the accent. */
export function applyTheme(theme: Theme = current): void {
  current = theme;
  const dark = isDark();
  const set = (k: string, v: string) => document.documentElement.style.setProperty(k, v);
  const { accent } = theme;
  const g1 = dark ? mix(theme.gradientStart, "#000000", 0.35) : theme.gradientStart;
  const g2 = dark ? mix(theme.gradientEnd, "#000000", 0.35) : theme.gradientEnd;
  const leftLight = luminance(mix(g1, g2, 0.2)) > 0.38;
  const rightLight = luminance(mix(g1, g2, 0.85)) > 0.35;
  const ink = mix(theme.gradientStart, "#000000", 0.62);
  const inkRight = mix(theme.gradientEnd, "#000000", 0.66);

  set("--banner-grad", `linear-gradient(115deg,${g1} 0%,${g2} 100%)`);
  set("--banner", g1);
  set("--banner-fg", leftLight ? ink : "#FFFFFF");
  set("--banner-soft", leftLight ? rgba(ink, 0.78) : "rgba(255,255,255,.84)");
  set("--chip", leftLight ? rgba(ink, 0.1) : "rgba(255,255,255,.16)");
  set("--chip-live-bg", leftLight ? ink : "#FFFFFF");
  set("--chip-live-fg", leftLight ? "#FFFFFF" : mix(theme.gradientStart, "#000000", 0.15));
  set("--date", rightLight ? inkRight : "#F2CD78");
  set("--date-sub", rightLight ? rgba(inkRight, 0.85) : "#FFFFFF");
  set("--halo", `rgba(255,255,255,${rightLight ? 0.28 : 0.07})`);
  if (!dark) {
    set("--accent", accent);
    set("--accent-ink", luminance(accent) > 0.18 ? mix(accent, "#000000", 0.3) : accent);
    set("--bg", mix(accent, "#FFFFFF", 0.965));
    set("--surface", "#FFFFFF");
    set("--fg", mix(accent, "#141414", 0.88));
    set("--muted", mix(accent, "#666666", 0.8));
    set("--tint", mix(accent, "#FFFFFF", 0.92));
    set("--line", mix(accent, "#FFFFFF", 0.83));
    set("--fill", mix(accent, "#FFFFFF", 0.68));
    set("--prog1", mix(theme.gradientStart, "#FFFFFF", 0.5));
    set("--prog2", mix(theme.gradientEnd, "#FFFFFF", 0.5));
    set("--done", "#B3B8BD");
    set("--gold-soft", "#F4E7CC");
    set("--river", "#CFE3EE");
    set("--art-o", ".13");
    set("color-scheme", "light");
  } else {
    set("--accent", mix(accent, "#FFFFFF", 0.3));
    set("--accent-ink", mix(accent, "#FFFFFF", 0.6));
    set("--bg", mix(accent, "#0E1114", 0.92));
    set("--surface", mix(accent, "#161A1E", 0.9));
    set("--fg", "#ECEFF2");
    set("--muted", mix(accent, "#A3AAB1", 0.8));
    set("--tint", mix(accent, "#161A1E", 0.82));
    set("--line", mix(accent, "#2A3036", 0.86));
    set("--fill", mix(accent, "#161A1E", 0.58));
    set("--prog1", mix(theme.gradientStart, "#161A1E", 0.45));
    set("--prog2", mix(theme.gradientEnd, "#161A1E", 0.45));
    set("--done", "#555B61");
    set("--gold-soft", "#3A3018");
    set("--river", "#1E3440");
    set("--art-o", ".2");
    set("color-scheme", "dark");
  }
}

/** Restores the viewer's light/dark choice and follows the system otherwise. */
export function initTheme(theme: Theme | undefined): void {
  const forced = load("theme");
  if (forced === "dark" || forced === "light") document.documentElement.setAttribute("data-theme", forced);
  applyTheme(theme ?? DEFAULT_THEME);
  matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => applyTheme());
}

export function toggleTheme(): void {
  const next = isDark() ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  save("theme", next);
  applyTheme();
}
