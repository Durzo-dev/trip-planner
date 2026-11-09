/**
 * Admin page (admin.html): sign in, list the trips you organise, create one, and edit it (title,
 * dates, days, activities, meeting point). Edits stay in a draft until "Save"; the draft is checked by
 * validateTrip and saved over the version that was loaded, so two organisers cannot overwrite each other.
 */
import "../styles.css";
import "./admin.css";
import type { Item, Place, Trip } from "../types";
import { capitalize, formatDate, formatTime, lang, LANGS, sectionLabel, setLang, t } from "../i18n";
import { initTheme, toggleTheme } from "../theme";
import { $, esc } from "../ui/dom";
import { setThemeLabel } from "../ui/tabs";
import type { StoredTrip } from "../db";
import {
  addDay, newTrip, parseCoordinates, removeDay, removeItem, saveItem, setDayDate, shiftTrip, validateTrip, type TripError,
} from "./edit";

const configured = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
const googleEnabled = import.meta.env.VITE_AUTH_GOOGLE === "true";
const dbModule = () => import("../db");

const root = $("admin");
const here = () => location.href.split("#")[0].split("?")[0];
const viewerUrl = (id: string) => `./?trip=${encodeURIComponent(id)}`;

// ---------- Page chrome: language, theme, signed-in user ----------

function initChrome(): void {
  document.documentElement.lang = lang;
  document.title = t.adminTitle;
  $("brand").textContent = t.adminTitle;
  const select = $<HTMLSelectElement>("lang");
  select.setAttribute("aria-label", t.language);
  select.innerHTML = LANGS.map((l) => `<option value="${l}"${l === lang ? " selected" : ""}>${l.toUpperCase()}</option>`).join("");
  select.addEventListener("change", () => setLang(select.value as typeof lang));
  initTheme(undefined);
  setThemeLabel();
  $("theme-btn").addEventListener("click", () => {
    toggleTheme();
    setThemeLabel();
  });
}

async function showUser(email: string | null): Promise<void> {
  const el = $("user");
  if (!email) {
    el.textContent = "";
    return;
  }
  el.innerHTML = `${esc(t.signedInAs(email))}<button type="button" id="sign-out">${esc(t.signOut)}</button>`;
  $("sign-out").addEventListener("click", async () => {
    const { db } = await dbModule();
    await db().auth.signOut();
    location.href = here();
  });
}

// ---------- Two-step delete buttons ----------

/** First click arms the button ("Really delete?"), second click within 4 s runs the action. */
function armable(button: HTMLButtonElement, run: () => void): void {
  const label = button.textContent ?? "";
  button.addEventListener("click", () => {
    if (button.dataset.armed) {
      run();
      return;
    }
    button.dataset.armed = "1";
    button.textContent = t.confirmRemove;
    window.setTimeout(() => {
      delete button.dataset.armed;
      button.textContent = label;
    }, 4000);
  });
}

// ---------- Sign in ----------

function renderSignIn(): void {
  root.innerHTML = `<section class="panel form">
    <h1>${esc(t.signInTitle)}</h1>
    <p class="hint">${esc(t.signInHint)}</p>
    <form class="row" id="otp">
      <label class="field">${esc(t.email)}<input type="email" name="email" required autocomplete="email"></label>
      <button class="btn fill" type="submit">${esc(t.sendLink)}</button>
    </form>
    <div id="otp-msg"></div>
    ${googleEnabled ? `<div><button class="btn" type="button" id="google">${esc(t.signInWithGoogle)}</button></div>` : ""}
  </section>`;
  $("otp").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = String(new FormData(e.target as HTMLFormElement).get("email")).trim();
    const { db } = await dbModule();
    const { error } = await db().auth.signInWithOtp({ email, options: { emailRedirectTo: location.href.split("#")[0] } });
    $("otp-msg").innerHTML = `<p class="msg${error ? " bad" : ""}">${esc(error ? error.message : t.linkSent(email))}</p>`;
  });
  document.getElementById("google")?.addEventListener("click", async () => {
    const { db } = await dbModule();
    await db().auth.signInWithOAuth({ provider: "google", options: { redirectTo: location.href.split("#")[0] } });
  });
}

// ---------- Trip list and creation ----------

const dateRange = (trip: Trip) => {
  const a = trip.days[0]?.date;
  const b = trip.days[trip.days.length - 1]?.date;
  if (!a) return "";
  const f = (d: string) => formatDate(d, { day: "numeric", month: "short", year: "numeric" });
  return a === b ? f(a) : `${f(a)} – ${f(b)}`;
};

async function renderList(): Promise<void> {
  const { listMyTrips } = await dbModule();
  const trips = await listMyTrips();
  const admin = trips.filter((s) => s.role === "owner" || s.role === "organiser");
  const today = new Date().toISOString().slice(0, 10);
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  root.innerHTML = `<section class="panel">
      <h2>${esc(t.myTrips)}</h2>
      ${admin.length ? `<div class="trip-list">${admin.map((s) => `<div class="trip-row">
          <div><b>${esc(s.data.title)}</b><small>${esc(dateRange(s.data))}</small></div>
          <div class="row"><a class="btn" href="${viewerUrl(s.id)}">${esc(t.open)}</a><a class="btn fill" href="?trip=${encodeURIComponent(s.id)}">${esc(t.edit)}</a></div>
        </div>`).join("")}</div>` : `<p class="hint">${esc(t.noTrips)}</p>`}
    </section>
    <section class="panel">
      <h2>${esc(t.newTrip)}</h2>
      <form class="form" id="create">
        <label class="field">${esc(t.tripTitle)}<input name="title" required maxlength="80"></label>
        <div class="row">
          <label class="field narrow">${esc(t.firstDay)}<input type="date" name="first" required min="${today}"></label>
          <label class="field narrow">${esc(t.lastDay)}<input type="date" name="last" required min="${today}"></label>
          <label class="field">${esc(t.timezone)}<input name="zone" required value="${esc(zone)}"></label>
        </div>
        <div><button class="btn fill" type="submit">${esc(t.create)}</button></div>
        <div id="create-msg"></div>
      </form>
    </section>`;
  const form = $<HTMLFormElement>("create");
  const input = (name: string) => form.elements.namedItem(name) as HTMLInputElement;
  const first = input("first");
  const last = input("last");
  first.addEventListener("change", () => {
    if (!last.value || last.value < first.value) last.value = first.value;
    last.min = first.value;
  });
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const trip = newTrip({ title: input("title").value, timezone: input("zone").value.trim(), firstDay: first.value, lastDay: last.value, sectionLabels: t.sectionLabels });
    const { createTrip, TripExists } = await dbModule();
    try {
      await createTrip(trip);
      location.search = `?trip=${encodeURIComponent(trip.id)}`;
    } catch (err) {
      $("create-msg").innerHTML = `<p class="msg bad">${esc(err instanceof TripExists ? t.tripExists : t.saveError)}</p>`;
    }
  });
}

// ---------- Trip editor ----------

interface Editor {
  stored: StoredTrip;
  draft: Trip;
  /** Activity whose form is open: [day, section, item or null for a new one]. */
  open: [number, number, number | null] | null;
  saving: boolean;
}

const isDirty = (e: Editor) => JSON.stringify(e.draft) !== JSON.stringify(e.stored.data);

function activityName(trip: Trip, d: number, s: number, i: number): string {
  const it = trip.days[d]?.sections[s]?.items[i];
  return it ? `${formatTime(it.start || "00:00")} ${it.title || "…"}` : "";
}

function describe(err: TripError, trip: Trip): string {
  const e = t.errors;
  switch (err.code) {
    case "title": return e.title;
    case "noDays": return e.noDays;
    case "meetingPoint": return e.meetingPoint;
    case "date": return e.date(err.day + 1);
    case "dayOrder": return e.dayOrder(err.day + 1);
    default: return e[err.code](err.day + 1, activityName(trip, err.day, err.section, err.item));
  }
}

function dayTitle(date: string): string {
  return capitalize(formatDate(date, { weekday: "long", day: "numeric", month: "long" }));
}

function meetingOptions(trip: Trip): string {
  const mp = trip.meetingPoint;
  const opts = trip.days.flatMap((d) => d.sections.flatMap((s) => s.items.map((it) => {
    const value = `${d.date}|${it.start}`;
    const sel = mp && mp.date === d.date && mp.time === it.start ? " selected" : "";
    return `<option value="${esc(value)}"${sel}>${esc(`${dayTitle(d.date)} · ${formatTime(it.start)} · ${it.title}`)}</option>`;
  })));
  return `<option value="">${esc(t.meetingNone)}</option>${opts.join("")}`;
}

function placeRow(p?: Place): string {
  const coords = p ? `${p.lat}, ${p.lng}` : "";
  return `<div class="place-row">
    <label class="field">${esc(t.placeName)}<input data-k="name" value="${esc(p?.name ?? "")}"></label>
    <label class="field">${esc(t.placeAddress)}<input data-k="address" value="${esc(p?.address ?? "")}"></label>
    <label class="field">${esc(t.placeCoordinates)}<input data-k="coords" value="${esc(coords)}" placeholder="44.84, -0.57"></label>
    <button type="button" class="btn small danger" data-remove-place>${esc(t.removePlace)}</button>
  </div>`;
}

function itemForm(it: Item | null): string {
  const v = (s?: string) => esc(s ?? "");
  const style = it?.tagStyle ?? "";
  return `<form class="item-form form" id="item-form">
    <div class="row">
      <label class="field tiny">${esc(t.start)}<input type="time" name="start" required value="${v(it?.start)}"></label>
      <label class="field tiny">${esc(t.end)}<input type="time" name="end" required value="${v(it?.end)}"></label>
      <label class="field">${esc(t.activityTitle)}<input name="title" required value="${v(it?.title)}"></label>
    </div>
    <div class="row">
      <label class="field">${esc(t.tag)}<input name="tag" value="${v(it?.tag)}"></label>
      <label class="field narrow">${esc(t.tagStyle)}<select name="tagStyle">
        <option value=""${style === "" ? " selected" : ""}>${esc(t.tagStyleNone)}</option>
        <option value="all"${style === "all" ? " selected" : ""}>${esc(t.tagStyleAll)}</option>
        <option value="optional"${style === "optional" ? " selected" : ""}>${esc(t.tagStyleOptional)}</option>
      </select></label>
    </div>
    <label class="field">${esc(t.description)}<textarea name="text">${v(it?.text)}</textarea></label>
    <label class="field">${esc(t.addressLine)}<input name="addressLine" value="${v(it?.addressLine)}"></label>
    ${it?.poll ? `<p class="note">${esc(t.pollNote)}</p>` : `<div class="form"><span class="field">${esc(t.places)}</span><div class="form" id="places">${(it?.places ?? []).map(placeRow).join("")}</div>
      <div><button type="button" class="btn small" id="add-place">${esc(t.addPlace)}</button></div></div>`}
    <div class="row"><button class="btn fill" type="submit">${esc(t.done)}</button><button class="btn" type="button" id="cancel-item">${esc(t.back)}</button></div>
  </form>`;
}

/** Reads the open activity form into an Item, keeping the fields the form does not show (poll, photos…). */
function readItemForm(form: HTMLFormElement, original: Item | null): Item {
  const get = (n: string) => String(new FormData(form).get(n) ?? "").trim();
  const item: Item = { ...(original ?? { start: "", end: "", title: "" }), start: get("start"), end: get("end"), title: get("title") };
  for (const k of ["tag", "text", "addressLine"] as const) {
    const val = get(k);
    if (val) item[k] = val;
    else delete item[k];
  }
  const style = get("tagStyle");
  if (style === "all" || style === "optional") item.tagStyle = style;
  else delete item.tagStyle;
  const rows = form.querySelectorAll<HTMLElement>(".place-row");
  if (!original?.poll) {
    const places: Place[] = [...rows].map((r) => {
      const val = (k: string) => (r.querySelector<HTMLInputElement>(`[data-k="${k}"]`)?.value ?? "").trim();
      const c = parseCoordinates(val("coords"));
      return { name: val("name"), address: val("address"), lat: c?.lat ?? Number.NaN, lng: c?.lng ?? Number.NaN };
    }).filter((p) => p.name || p.address);
    // Keep each place's own Maps link when its name and address are unchanged
    places.forEach((p, i) => {
      const old = original?.places?.[i];
      if (old?.mapsUrl && old.name === p.name && old.address === p.address) p.mapsUrl = old.mapsUrl;
    });
    if (places.length) item.places = places;
    else delete item.places;
  }
  return item;
}

function renderEditor(ed: Editor): void {
  const trip = ed.draft;
  const y = scrollY;
  root.innerHTML = `
    <div class="row" style="justify-content:space-between"><a class="link-btn" href="${here()}">← ${esc(t.myTrips)}</a><a class="btn" href="${viewerUrl(trip.id)}" target="_blank" rel="noopener">${esc(t.open)} ↗</a></div>
    <section class="panel form">
      <label class="field">${esc(t.tripTitle)}<input id="f-title" value="${esc(trip.title)}" maxlength="80"></label>
      <label class="field">${esc(t.tagline)}<input id="f-tagline" value="${esc(trip.tagline ?? "")}"></label>
      <label class="field">${esc(t.meetingPoint)}<select id="f-meeting">${meetingOptions(trip)}</select></label>
      <div class="shift">
        <label for="f-shift">${esc(t.shiftTrip)}</label><input type="number" id="f-shift" value="0" step="1"><span>${esc(t.shiftUnit)}</span>
        <button type="button" class="btn small" id="do-shift">${esc(t.apply)}</button>
      </div>
    </section>
    ${trip.days.map((d, di) => `<section class="panel day" data-day="${di}">
      <div class="day-head">
        <h2>${esc(dayTitle(d.date))}</h2>
        <button type="button" class="btn small danger" data-remove-day="${di}"${trip.days.length < 2 ? " disabled" : ""}>${esc(t.removeDay)}</button>
      </div>
      <div class="row">
        <label class="field narrow">${esc(t.dayDate)}<input type="date" data-day-date="${di}" value="${esc(d.date)}"></label>
        <label class="field">${esc(t.dayLabel)}<input data-day-label="${di}" value="${esc(d.label ?? "")}"></label>
      </div>
      ${d.sections.map((s, si) => `<div>
        <h3 class="section-h">${esc(sectionLabel(s.label))}</h3>
        <ul class="items">${s.items.map((it, ii) => {
          const isOpen = ed.open && ed.open[0] === di && ed.open[1] === si && ed.open[2] === ii;
          return isOpen ? `<li>${itemForm(it)}</li>` : `<li class="item">
            <span class="when">${esc(formatTime(it.start))} – ${esc(formatTime(it.end))}</span>
            <span class="what">${esc(it.title)}${it.tag ? `<span class="item-tag">${esc(it.tag)}</span>` : ""}</span>
            <button type="button" class="btn small" data-edit="${di},${si},${ii}">${esc(t.edit)}</button>
            <button type="button" class="btn small danger" data-remove="${di},${si},${ii}">${esc(t.remove)}</button>
          </li>`;
        }).join("")}
        ${ed.open && ed.open[0] === di && ed.open[1] === si && ed.open[2] === null ? `<li>${itemForm(null)}</li>` : ""}</ul>
        <button type="button" class="link-btn" data-add="${di},${si}">+ ${esc(t.addActivity)}</button>
      </div>`).join("")}
    </section>`).join("")}
    <div><button type="button" class="btn" id="add-day">+ ${esc(t.addDay)}</button></div>
    <div class="save-bar"><div class="wrap">
      <div class="status" id="save-status"></div>
      <button type="button" class="btn" id="discard">${esc(t.discard)}</button>
      <button type="button" class="btn fill" id="save">${esc(t.save)}</button>
    </div></div>`;
  window.scrollTo(0, y);
  wireEditor(ed);
  refreshSaveBar(ed);
}

function refreshSaveBar(ed: Editor, message?: { text: string; bad?: boolean; reload?: boolean }): void {
  const dirty = isDirty(ed);
  const errors = validateTrip(ed.draft);
  const status = $("save-status");
  status.className = `status${dirty ? " dirty" : ""}`;
  status.innerHTML = message
    ? `<span class="${message.bad ? "msg bad" : ""}">${esc(message.text)}</span>${message.reload ? ` <button type="button" class="link-btn" id="reload">${esc(t.reload)}</button>` : ""}`
    : esc(dirty ? t.unsaved : t.saved) + (dirty && errors.length ? `<ul class="errors">${errors.map((e) => `<li>${esc(describe(e, ed.draft))}</li>`).join("")}</ul>` : "");
  document.getElementById("reload")?.addEventListener("click", () => location.reload());
  $<HTMLButtonElement>("save").disabled = !dirty || errors.length > 0 || ed.saving;
  $<HTMLButtonElement>("discard").disabled = !dirty || ed.saving;
}

function wireEditor(ed: Editor): void {
  const update = (next: Trip, rerender = true) => {
    ed.draft = next;
    if (rerender) renderEditor(ed);
    else refreshSaveBar(ed);
  };
  const at = (v: string) => v.split(",").map(Number) as [number, number, number];

  $<HTMLInputElement>("f-title").addEventListener("input", (e) => update({ ...ed.draft, title: (e.target as HTMLInputElement).value }, false));
  $<HTMLInputElement>("f-tagline").addEventListener("input", (e) => {
    const tagline = (e.target as HTMLInputElement).value;
    const next: Trip = { ...ed.draft, tagline };
    if (!tagline.trim()) delete next.tagline;
    update(next, false);
  });
  $<HTMLSelectElement>("f-meeting").addEventListener("change", (e) => {
    const v = (e.target as HTMLSelectElement).value;
    const next = { ...ed.draft };
    if (v) next.meetingPoint = { date: v.split("|")[0], time: v.split("|")[1] };
    else delete next.meetingPoint;
    update(next, false);
  });
  $("do-shift").addEventListener("click", () => {
    const n = Math.trunc(Number($<HTMLInputElement>("f-shift").value));
    if (n) update(shiftTrip(ed.draft, n));
  });
  root.querySelectorAll<HTMLInputElement>("[data-day-date]").forEach((input) =>
    input.addEventListener("change", () => {
      if (input.value) update(setDayDate(ed.draft, Number(input.dataset.dayDate), input.value));
    }));
  root.querySelectorAll<HTMLInputElement>("[data-day-label]").forEach((input) =>
    input.addEventListener("input", () => {
      const next = structuredClone(ed.draft);
      const day = next.days[Number(input.dataset.dayLabel)];
      if (input.value.trim()) day.label = input.value;
      else delete day.label;
      update(next, false);
    }));
  root.querySelectorAll<HTMLButtonElement>("[data-remove-day]").forEach((b) =>
    armable(b, () => update(removeDay(ed.draft, Number(b.dataset.removeDay)))));
  $("add-day").addEventListener("click", () => update(addDay(ed.draft, t.sectionLabels)));
  root.querySelectorAll<HTMLButtonElement>("[data-edit]").forEach((b) =>
    b.addEventListener("click", () => {
      ed.open = at(b.dataset.edit!);
      renderEditor(ed);
    }));
  root.querySelectorAll<HTMLButtonElement>("[data-add]").forEach((b) =>
    b.addEventListener("click", () => {
      const [d, s] = at(b.dataset.add!);
      ed.open = [d, s, null];
      renderEditor(ed);
    }));
  root.querySelectorAll<HTMLButtonElement>("[data-remove]").forEach((b) =>
    armable(b, () => {
      const [d, s, i] = at(b.dataset.remove!);
      ed.open = null;
      update(removeItem(ed.draft, d, s, i));
    }));

  const form = document.getElementById("item-form") as HTMLFormElement | null;
  if (form && ed.open) {
    const [d, s, i] = ed.open;
    const original = i === null ? null : ed.draft.days[d].sections[s].items[i];
    form.querySelector<HTMLInputElement>("input[name=title]")?.focus({ preventScroll: true });
    const wirePlace = (row: Element) => row.querySelector("[data-remove-place]")?.addEventListener("click", () => row.remove());
    form.querySelectorAll(".place-row").forEach(wirePlace);
    document.getElementById("add-place")?.addEventListener("click", () => {
      $("places").insertAdjacentHTML("beforeend", placeRow());
      wirePlace($("places").lastElementChild!);
    });
    $("cancel-item").addEventListener("click", () => {
      ed.open = null;
      renderEditor(ed);
    });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      ed.open = null;
      update(saveItem(ed.draft, d, s, i, readItemForm(form, original)));
    });
  }

  $("discard").addEventListener("click", () => {
    ed.draft = structuredClone(ed.stored.data);
    ed.open = null;
    renderEditor(ed);
  });
  $("save").addEventListener("click", async () => {
    if (validateTrip(ed.draft).length) return;
    ed.saving = true;
    refreshSaveBar(ed);
    const { saveTrip, SaveConflict } = await dbModule();
    try {
      const version = await saveTrip(ed.stored.id, ed.draft, ed.stored.version);
      ed.stored = { ...ed.stored, data: structuredClone(ed.draft), version };
      ed.saving = false;
      refreshSaveBar(ed);
    } catch (err) {
      ed.saving = false;
      refreshSaveBar(ed, err instanceof SaveConflict ? { text: t.conflict, bad: true, reload: true } : { text: t.saveError, bad: true });
    }
  });
}

async function openEditor(id: string): Promise<void> {
  const { loadStoredTrip } = await dbModule();
  const stored = await loadStoredTrip(id);
  if (!stored || (stored.role !== "owner" && stored.role !== "organiser")) {
    root.innerHTML = `<p class="error">${esc(t.loadError)}</p><p><a class="link-btn" href="${here()}">← ${esc(t.myTrips)}</a></p>`;
    return;
  }
  const ed: Editor = { stored, draft: structuredClone(stored.data), open: null, saving: false };
  addEventListener("beforeunload", (e) => {
    if (isDirty(ed)) e.preventDefault();
  });
  renderEditor(ed);
}

// ---------- Start ----------

async function start(): Promise<void> {
  initChrome();
  if (!configured) {
    root.innerHTML = `<p class="msg bad">${esc(t.notConfigured)}</p>`;
    return;
  }
  const { db } = await dbModule();
  const { data } = await db().auth.getSession();
  const email = data.session?.user.email ?? null;
  await showUser(email);
  if (!data.session) {
    renderSignIn();
    db().auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") location.reload();
    });
    return;
  }
  const id = new URLSearchParams(location.search).get("trip");
  try {
    if (id) await openEditor(id);
    else await renderList();
  } catch {
    root.innerHTML = `<p class="msg bad">${esc(t.saveError)}</p>`;
  }
}

void start();
