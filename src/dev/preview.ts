/**
 * Development page (preview.html, never built): every screen of the site side by side, with sample
 * data, in desktop and phone sizes, in the chosen language and mode. Each screen is the real page in a
 * frame, opened with ?mock (sample trips and sign-in, see mockDb.ts) and the preview parameters
 * ?lang, ?theme, ?now, ?edit and ?settings, which only exist in development.
 */
import "./preview.css";

interface Screen {
  group: string;
  name: string;
  url: string;
}

const SCREENS: Screen[] = [
  { group: "Trip page", name: "One day, before the trip", url: "./?trip=bordeaux-2026-11-28" },
  { group: "Trip page", name: "One day, during the day", url: "./?trip=bordeaux-2026-11-28&now=2026-11-28T14:45" },
  { group: "Trip page", name: "Several days, second day", url: "./?trip=bordeaux-weekend-2026-11&now=2026-11-28T11:00" },
  { group: "Trip page", name: "Stored trip, empty parts of the day", url: "./?trip=empty-days-2026-12-19&mock" },
  { group: "Trip page", name: "Settings panel, organiser", url: "./?trip=empty-days-2026-12-19&mock&settings" },
  { group: "Trip page", name: "Settings panel, guest", url: "./?trip=guest-view-2026-12-19&mock&settings" },
  { group: "Trip page", name: "Private trip, signed out", url: "./?trip=someone-else-2026-12-01&mock=signed-out" },
  { group: "Admin", name: "Sign in", url: "./admin.html?mock=signed-out" },
  { group: "Admin", name: "My trips", url: "./admin.html?mock" },
  { group: "Admin", name: "No trip yet", url: "./admin.html?mock=no-trips" },
  { group: "Admin", name: "Editor", url: "./admin.html?mock&trip=bordeaux-weekend-2026-11" },
  { group: "Admin", name: "Editor, activity form open", url: "./admin.html?mock&trip=bordeaux-2026-11-28&edit=0,1,0" },
  { group: "Admin", name: "Server not set up", url: "./admin.html?mock=unconfigured" },
];

const DEVICES = {
  desktop: { label: "Desktop", width: 1280, height: 800, scale: 0.45 },
  phone: { label: "Phone", width: 390, height: 780, scale: 0.6 },
};
type Device = keyof typeof DEVICES;

interface Options {
  lang: "en" | "fr";
  theme: "light" | "dark";
  devices: Device[];
  filter: string;
}

const KEY = "preview-options";
function loadOptions(): Options {
  try {
    return { lang: "fr", theme: "light", devices: ["desktop", "phone"], filter: "", ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    return { lang: "fr", theme: "light", devices: ["desktop", "phone"], filter: "" };
  }
}
let opts = loadOptions();

const withParams = (url: string) => `${url}${url.includes("?") ? "&" : "?"}lang=${opts.lang}&theme=${opts.theme}`;

function frame(s: Screen, d: Device): string {
  const dev = DEVICES[d];
  const url = withParams(s.url);
  return `<figure class="shot">
    <div class="viewport" style="width:${dev.width * dev.scale}px;height:${dev.height * dev.scale}px">
      <iframe src="${url}" title="${s.name} (${dev.label})" loading="lazy"
        style="width:${dev.width}px;height:${dev.height}px;transform:scale(${dev.scale})"></iframe>
    </div>
    <figcaption>${dev.label} · <a href="${url}" target="_blank" rel="noopener">open ↗</a></figcaption>
  </figure>`;
}

function render(): void {
  localStorage.setItem(KEY, JSON.stringify(opts));
  const groups = [...new Set(SCREENS.map((s) => s.group))];
  const shown = SCREENS.filter((s) => `${s.group} ${s.name}`.toLowerCase().includes(opts.filter.toLowerCase()));
  const radios = (name: string, values: [string, string][], current: string) =>
    values.map(([v, l]) => `<label><input type="radio" name="${name}" value="${v}"${v === current ? " checked" : ""}> ${l}</label>`).join("");
  document.getElementById("preview")!.innerHTML = `
    <header class="bar">
      <h1>Screen preview</h1>
      <div class="controls">
        <span>${radios("lang", [["fr", "FR"], ["en", "EN"]], opts.lang)}</span>
        <span>${radios("theme", [["light", "Light"], ["dark", "Dark"]], opts.theme)}</span>
        <span>${(Object.keys(DEVICES) as Device[]).map((d) => `<label><input type="checkbox" name="device" value="${d}"${opts.devices.includes(d) ? " checked" : ""}> ${DEVICES[d].label}</label>`).join("")}</span>
        <input type="search" id="filter" placeholder="Filter screens" value="${opts.filter}">
        <button type="button" id="reload">Reload all</button>
      </div>
    </header>
    ${groups.map((g) => {
      const list = shown.filter((s) => s.group === g);
      return list.length ? `<section><h2>${g}</h2>${list.map((s) => `<article class="screen"><h3>${s.name}</h3><div class="shots">${opts.devices.map((d) => frame(s, d)).join("")}</div></article>`).join("")}</section>` : "";
    }).join("")}`;
  document.querySelectorAll<HTMLInputElement>("input[name=lang], input[name=theme]").forEach((i) =>
    i.addEventListener("change", () => {
      opts = { ...opts, [i.name]: i.value };
      render();
    }));
  document.querySelectorAll<HTMLInputElement>("input[name=device]").forEach((i) =>
    i.addEventListener("change", () => {
      opts = { ...opts, devices: [...document.querySelectorAll<HTMLInputElement>("input[name=device]:checked")].map((c) => c.value as Device) };
      render();
    }));
  const filter = document.getElementById("filter") as HTMLInputElement;
  filter.addEventListener("change", () => {
    opts = { ...opts, filter: filter.value };
    render();
  });
  document.getElementById("reload")!.addEventListener("click", render);
}

render();
