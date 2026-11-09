/**
 * Settings: a gear button that opens a panel to choose the interface language and the appearance
 * (auto, light, dark), both remembered on the device, and, for a trip's organisers, the way to its
 * admin page. Shared by the trip and admin pages.
 */
import { lang, LANG_CHANGE, LANGS, setLang, t, type Lang } from "../i18n";
import { setThemeMode, THEME_CHANGE, THEME_MODES, themeMode, type ThemeMode } from "../theme";
import { esc } from "./dom";

const GEAR = `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>`;

const LANG_NAMES: Record<Lang, string> = { en: "English", fr: "Français" };

function modeLabel(m: ThemeMode): string {
  return m === "system" ? t.themeSystem : m === "light" ? t.themeLight : t.themeDark;
}

let dialog: HTMLDialogElement | null = null;
let adminUrl: string | null = null;

/** Builds the panel once; later openings only refresh which choices are selected. */
function panel(): HTMLDialogElement {
  if (dialog) return dialog;
  dialog = document.createElement("dialog");
  dialog.className = "dialog settings";
  dialog.setAttribute("aria-labelledby", "settings-h");
  dialog.innerHTML = `<form method="dialog" class="dialog-body">
    <div class="dialog-head"><h2 id="settings-h">${esc(t.settings)}</h2>
      <button type="submit" class="dialog-close" aria-label="${esc(t.close)}">✕</button></div>
    <fieldset><legend>${esc(t.language)}</legend>
      <div class="seg">${LANGS.map((l) => `<label><input type="radio" name="lang" value="${l}"><span>${esc(LANG_NAMES[l])}</span></label>`).join("")}</div>
    </fieldset>
    <fieldset><legend>${esc(t.appearance)}</legend>
      <div class="seg">${THEME_MODES.map((m) => `<label><input type="radio" name="theme" value="${m}"><span>${esc(modeLabel(m))}</span></label>`).join("")}</div>
    </fieldset>
    ${adminUrl ? `<fieldset><legend>${esc(t.organisation)}</legend><a class="btn fill" href="${esc(adminUrl)}">${esc(t.openAdmin)}</a></fieldset>` : ""}
  </form>`;
  document.body.append(dialog);
  dialog.querySelectorAll<HTMLInputElement>("input[name=lang]").forEach((r) =>
    r.addEventListener("change", () => setLang(r.value as Lang)));
  dialog.querySelectorAll<HTMLInputElement>("input[name=theme]").forEach((r) =>
    r.addEventListener("change", () => setThemeMode(r.value as ThemeMode)));
  // Close when clicking outside the panel
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog!.close();
  });
  return dialog;
}

document.addEventListener(THEME_CHANGE, refresh);
// The panel is written in the old language: rebuild it, and keep it open if it was
document.addEventListener(LANG_CHANGE, () => {
  if (!dialog) return;
  const wasOpen = dialog.open;
  dialog.remove();
  dialog = null;
  if (wasOpen) {
    openSettings();
    dialog!.querySelector<HTMLInputElement>("input[name=lang]:checked")?.focus();
  }
  document.querySelectorAll<HTMLElement>(".settings-btn").forEach((b) => {
    b.setAttribute("aria-label", t.settings);
    b.title = t.settings;
  });
});

function refresh(): void {
  if (!dialog) return;
  dialog.querySelectorAll<HTMLInputElement>("input[name=lang]").forEach((r) => (r.checked = r.value === lang));
  dialog.querySelectorAll<HTMLInputElement>("input[name=theme]").forEach((r) => (r.checked = r.value === themeMode()));
}

export function openSettings(): void {
  const d = panel();
  refresh();
  d.showModal();
}

/**
 * Appends the gear button to a container (the chips under the trip title, the admin header).
 * With an admin address, the panel also offers the way to the trip's admin page.
 */
export function mountSettingsButton(container: HTMLElement, className = "chip settings-btn", admin: string | null = null): void {
  if (admin !== adminUrl) {
    adminUrl = admin;
    dialog?.remove();
    dialog = null;
  }
  const b = document.createElement("button");
  b.type = "button";
  b.className = className;
  b.innerHTML = GEAR;
  b.setAttribute("aria-label", t.settings);
  b.title = t.settings;
  b.addEventListener("click", openSettings);
  container.append(b);
  // Preview page: ?settings opens the panel straight away
  if (import.meta.env.DEV && new URLSearchParams(location.search).has("settings")) openSettings();
}
