/**
 * Development page (preview.html, never built): every screen of the site side by side, with sample
 * data, in desktop and phone sizes, in the chosen language and mode. Each screen is the real page in a
 * frame, opened with ?mock (sample trips and sign-in, see mockDb.ts) and the preview parameters
 * ?lang, ?theme, ?now, ?edit, ?settings, ?sampleWeather and ?frozen, which only exist in development.
 *
 * Light on the machine: a frame loads only when it is on screen and is emptied when it leaves it,
 * frames load one at a time, they never call the weather service, and they ignore the dev server's
 * reloads (?frozen). After a save the page reloads itself only if "Live reload" is on; otherwise it
 * says a reload is waiting and "Reload" refreshes the screens on screen.
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
  { group: "Design system", name: "Tokens and components", url: "./design-system.html" },
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
  live: boolean;
}

const KEY = "preview-options";
function loadOptions(): Options {
  try {
    return { lang: "fr", theme: "light", devices: ["desktop", "phone"], filter: "", live: false, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    return { lang: "fr", theme: "light", devices: ["desktop", "phone"], filter: "", live: false };
  }
}
let opts = loadOptions();

const withParams = (url: string) => `${url}${url.includes("?") ? "&" : "?"}lang=${opts.lang}&theme=${opts.theme}&sampleWeather&frozen`;

function frame(s: Screen, d: Device): string {
  const dev = DEVICES[d];
  const url = withParams(s.url);
  return `<figure class="shot">
    <div class="viewport" style="width:${dev.width * dev.scale}px;height:${dev.height * dev.scale}px">
      <iframe data-src="${url}" title="${s.name} (${dev.label})"
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
        <label title="Reload the screens on screen after each save"><input type="checkbox" id="live"${opts.live ? " checked" : ""}> Live reload</label>
        <span id="waiting" class="waiting" hidden>Files saved</span>
        <button type="button" id="reload">Reload</button>
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
  document.getElementById("live")!.addEventListener("change", (e) => {
    opts = { ...opts, live: (e.target as HTMLInputElement).checked };
    localStorage.setItem(KEY, JSON.stringify(opts));
    if (opts.live && reloadWaiting) location.reload();
  });
  document.getElementById("reload")!.addEventListener("click", () => {
    document.getElementById("waiting")!.hidden = true;
    reloadVisible();
  });
  watchFrames();
}

// ---------- Loading frames: only on screen, one at a time ----------

const queue: HTMLIFrameElement[] = [];
let loading: HTMLIFrameElement | null = null;
let observer: IntersectionObserver | null = null;

function loadNext(): void {
  if (loading) return;
  const frame = queue.shift();
  if (!frame) return;
  loading = frame;
  const done = () => {
    if (loading !== frame) return;
    loading = null;
    loadNext();
  };
  frame.addEventListener("load", done, { once: true });
  setTimeout(done, 8000); // a frame that never finishes must not block the others
  frame.src = frame.dataset.src!;
}

function enqueue(frame: HTMLIFrameElement): void {
  if (frame.dataset.loaded || queue.includes(frame)) return;
  frame.dataset.loaded = "1";
  queue.push(frame);
  loadNext();
}

function unload(frame: HTMLIFrameElement): void {
  const waiting = queue.indexOf(frame);
  if (waiting >= 0) queue.splice(waiting, 1);
  if (!frame.dataset.loaded) return;
  delete frame.dataset.loaded;
  frame.src = "about:blank";
}

function watchFrames(): void {
  observer?.disconnect();
  queue.length = 0;
  loading = null;
  observer = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const frame = e.target as HTMLIFrameElement;
      if (e.isIntersecting) enqueue(frame);
      else unload(frame);
    }
  }, { rootMargin: "300px 0px" });
  document.querySelectorAll<HTMLIFrameElement>("iframe[data-src]").forEach((f) => observer!.observe(f));
}

/** Reloads the frames currently loaded, one at a time. */
function reloadVisible(): void {
  const loaded = [...document.querySelectorAll<HTMLIFrameElement>("iframe[data-loaded]")];
  loaded.forEach((f) => delete f.dataset.loaded);
  loaded.forEach(enqueue);
}

// After a save: with "Live reload" the page reloads (and loads only the screens on screen, one by one);
// without, it stays as it is and says that a reload is waiting. Holding the reload stops Vite's message
// queue for this page, so a later switch to "Live reload" reloads at once.
let reloadWaiting = false;
if (import.meta.hot) {
  import.meta.hot.on("vite:beforeFullReload", () => {
    if (opts.live) return;
    reloadWaiting = true;
    document.getElementById("waiting")!.hidden = false;
    return new Promise<void>(() => {});
  });
}


render();
