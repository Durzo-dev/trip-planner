/**
 * Admin page (admin.html): sign in, list the trips you organise, create one, and edit it (title,
 * dates, days, activities, meeting point). Edits stay in a draft until "Save"; the draft is checked by
 * validateTrip and saved over the version that was loaded, so two organisers cannot overwrite each other.
 */
import "../styles/tokens.css";
import "../styles/components.css";
import "./admin.css";
import type { Day, Item, Place, Trip } from "../types";
import { capitalize, formatDate, formatTime, lang, LANG_CHANGE, sectionLabel, t } from "../i18n";
import { initTheme } from "../theme";
import { $, esc } from "../ui/dom";
import { mountSettingsButton } from "../ui/settings";
import { enableDragScroll, enableScrollArrows } from "../ui/dragScroll";
import type { StoredTrip } from "../db";
import { dataConfigured, loadDataSource, usingMock } from "../dataSource";
import {
  addDay, newTrip, parseCoordinates, placeItem, removeDay, removeItem, setDayDate, shiftTrip, validateTrip, type TripError,
} from "./edit";

const googleEnabled = import.meta.env.VITE_AUTH_GOOGLE === "true";
const dbModule = loadDataSource;

const root = $("admin");
/** Keeps ?mock (development preview) on the links between pages. */
const keep = () => (usingMock() ? `&mock=${encodeURIComponent(new URLSearchParams(location.search).get("mock") ?? "")}` : "");
const here = () => location.href.split("#")[0].split("?")[0] + (usingMock() ? `?${keep().slice(1)}` : "");
const viewerUrl = (id: string) => `./?trip=${encodeURIComponent(id)}${keep()}`;

// ---------- Page chrome: language, theme, signed-in user ----------

/** Redraws the current view in the current language (set by each view, run when the language changes). */
let redraw: () => void = () => {};
let signedInEmail: string | null = null;

function chromeTexts(): void {
  document.documentElement.lang = lang;
  document.title = t.adminTitle;
  $("brand").textContent = t.adminTitle;
}

function initChrome(): void {
  chromeTexts();
  initTheme(undefined);
  mountSettingsButton(document.querySelector<HTMLElement>(".admin-tools")!, "settings-btn");
  document.addEventListener(LANG_CHANGE, () => {
    chromeTexts();
    void showUser(signedInEmail);
    redraw();
  });
}

async function showUser(email: string | null): Promise<void> {
  signedInEmail = email;
  const el = $("user");
  if (!email) {
    el.textContent = "";
    return;
  }
  el.innerHTML = `${esc(t.signedInAs(email))}<button type="button" id="sign-out">${esc(t.signOut)}</button>`;
  $("sign-out").addEventListener("click", async () => {
    const { signOut } = await dbModule();
    await signOut();
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
  redraw = renderSignIn;
  root.innerHTML = `<section class="panel form">
    <h1>${esc(t.signInTitle)}</h1>
    <p class="hint">${esc(t.signInHint)}</p>
    <form class="row" id="otp">
      <label class="field">${esc(t.email)}<input type="email" name="email" required autocomplete="email"></label>
      <button class="btn fill add" type="submit">${esc(t.sendLink)}</button>
    </form>
    <div id="otp-msg"></div>
    ${googleEnabled ? `<div><button class="btn" type="button" id="google">${esc(t.signInWithGoogle)}</button></div>` : ""}
  </section>`;
  $("otp").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = String(new FormData(e.target as HTMLFormElement).get("email")).trim();
    const { sendSignInLink } = await dbModule();
    const error = await sendSignInLink(email, location.href.split("#")[0]);
    $("otp-msg").innerHTML = `<p class="msg${error ? " bad" : ""}">${esc(error ?? t.linkSent(email))}</p>`;
  });
  document.getElementById("google")?.addEventListener("click", async () => {
    const { signInWithGoogle } = await dbModule();
    await signInWithGoogle(location.href.split("#")[0]);
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
  redraw = () => void renderList();
  const { listMyTrips } = await dbModule();
  const trips = await listMyTrips();
  const admin = trips.filter((s) => s.role === "owner" || s.role === "organiser");
  const today = new Date().toISOString().slice(0, 10);
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  root.innerHTML = `<section class="panel">
      <h2>${esc(t.myTrips)}</h2>
      ${admin.length ? `<div class="trip-list">${admin.map((s) => `<div class="trip-row">
          <div><b>${esc(s.data.title)}</b><small>${esc(dateRange(s.data))}</small></div>
          <div class="row"><a class="btn" href="${viewerUrl(s.id)}">${esc(t.open)}</a><a class="btn fill edit" href="?trip=${encodeURIComponent(s.id)}${keep()}">${esc(t.edit)}</a></div>
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
        <div><button class="btn fill add" type="submit">${esc(t.create)}</button></div>
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
      location.search = `?trip=${encodeURIComponent(trip.id)}${keep()}`;
    } catch (err) {
      $("create-msg").innerHTML = `<p class="msg bad">${esc(err instanceof TripExists ? t.tripExists : t.saveError)}</p>`;
    }
  });
}

// ---------- Trip editor ----------

interface Editor {
  stored: StoredTrip;
  draft: Trip;
  /** Activity whose form is open: [day, section, item], or [day, -1, null] for a new one. */
  open: [number, number, number | null] | null;
  saving: boolean;
  /** The one day shown. */
  day: number;
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
      <div><button type="button" class="btn small add" id="add-place">${esc(t.addPlace)}</button></div></div>`}
    <div class="row"><button class="btn fill add" type="submit">${esc(t.done)}</button><button class="btn" type="button" id="cancel-item">${esc(t.back)}</button></div>
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

/** Listeners of the day strip, removed before each redraw. */
let stripListeners: AbortController | null = null;

function renderEditor(ed: Editor): void {
  redraw = () => renderEditor(ed);
  const trip = ed.draft;
  ed.day = Math.max(0, Math.min(ed.day, trip.days.length - 1));
  const y = scrollY;
  const stripLeft = document.getElementById("strip")?.scrollLeft ?? 0;
  stripListeners?.abort();
  root.innerHTML = `
    <div class="row" style="justify-content:space-between"><a class="link-btn" href="${here()}">← ${esc(t.myTrips)}</a><a class="btn" href="${viewerUrl(trip.id)}" target="_blank" rel="noopener">${esc(t.open)} ↗</a></div>
    <section class="panel form">
      <label class="field">${esc(t.tripTitle)}<input id="f-title" value="${esc(trip.title)}" maxlength="80"></label>
      <label class="field">${esc(t.tagline)}<input id="f-tagline" value="${esc(trip.tagline ?? "")}"></label>
      <label class="field">${esc(t.meetingPoint)}<select id="f-meeting">${meetingOptions(trip)}</select></label>
      <div class="shift">
        <label for="f-shift">${esc(t.shiftTrip)}</label><input type="number" id="f-shift" value="0" step="1"><span>${esc(t.shiftUnit)}</span>
        <button type="button" class="btn small edit" id="do-shift">${esc(t.apply)}</button>
      </div>
    </section>
    <nav class="day-strip" aria-label="${esc(t.days)}">
      <button type="button" class="arrow-btn" id="strip-back" aria-label="${esc(t.scrollBack)}" hidden>‹</button>
      <div class="strip" id="strip">${trip.days.map((d, i) => `<button type="button" class="strip-day${i === ed.day ? " on" : ""}" data-day-pick="${i}" aria-current="${i === ed.day ? "date" : "false"}">${esc(capitalize(formatDate(d.date, { weekday: "short", day: "numeric", month: "short" })))}${d.label ? `<small>${esc(d.label)}</small>` : ""}</button>`).join("")}
        <button type="button" class="btn small add" id="add-day">+ ${esc(t.addDay)}</button></div>
      <button type="button" class="arrow-btn" id="strip-forward" aria-label="${esc(t.scrollForward)}" hidden>›</button>
    </nav>
    <div class="day-view">
      <button type="button" class="arrow-btn lg" id="day-prev" aria-label="${esc(t.previousDay)}" title="${esc(t.previousDay)}"${ed.day === 0 ? " disabled" : ""}>‹</button>
      ${((d: Day, di: number) => `<section class="panel day" data-day="${di}" aria-labelledby="day-h">
      <h2 id="day-h">${esc(dayTitle(d.date))}</h2>
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
            <button type="button" class="btn small edit" data-edit="${di},${si},${ii}">${esc(t.edit)}</button>
            <button type="button" class="btn small danger" data-remove="${di},${si},${ii}">${esc(t.remove)}</button>
          </li>`;
        }).join("")}
        </ul>
        ${s.items.length ? "" : `<p class="note">${esc(t.nothingPlanned)}</p>`}
      </div>`).join("")}
      ${ed.open && ed.open[0] === di && ed.open[1] === -1 ? itemForm(null) : ""}
      <div class="day-foot">
        <button type="button" class="btn small add" data-add="${di}">+ ${esc(t.addActivity)}</button>
        <button type="button" class="btn small danger" data-remove-day="${di}"${trip.days.length < 2 ? " disabled" : ""}>${esc(t.removeDay)}</button>
      </div>
    </section>`)(trip.days[ed.day], ed.day)}
      <button type="button" class="arrow-btn lg" id="day-next" aria-label="${esc(t.nextDay)}" title="${esc(t.nextDay)}"${ed.day === trip.days.length - 1 ? " disabled" : ""}>›</button>
    </div>
    <div class="save-bar"><div class="wrap">
      <div class="status" id="save-status"></div>
      <button type="button" class="btn danger" id="discard">${esc(t.discard)}</button>
      <button type="button" class="btn fill add" id="save">${esc(t.save)}</button>
    </div></div>`;
  window.scrollTo(0, y);
  const strip = $("strip");
  stripListeners = new AbortController();
  enableDragScroll(strip, stripListeners.signal);
  enableScrollArrows(strip, $<HTMLButtonElement>("strip-back"), $<HTMLButtonElement>("strip-forward"), ".strip-day, #add-day", stripListeners.signal);
  strip.scrollLeft = stripLeft;
  strip.querySelector<HTMLElement>(".strip-day.on")?.scrollIntoView({ block: "nearest", inline: "nearest" });
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
      if (!input.value) return;
      const next = setDayDate(ed.draft, Number(input.dataset.dayDate), input.value);
      // The day may move in the list (days stay in date order): keep showing it
      ed.day = next.days.findIndex((d) => d.date === input.value);
      update(next);
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
    armable(b, () => {
      ed.open = null;
      update(removeDay(ed.draft, Number(b.dataset.removeDay)));
    }));
  $("add-day").addEventListener("click", () => {
    const next = addDay(ed.draft, t.sectionLabels);
    ed.day = next.days.length - 1;
    ed.open = null;
    update(next);
  });
  const show = (day: number) => {
    if (day < 0 || day >= ed.draft.days.length || day === ed.day) return;
    ed.day = day;
    ed.open = null;
    renderEditor(ed);
  };
  root.querySelectorAll<HTMLButtonElement>("[data-day-pick]").forEach((b) => b.addEventListener("click", () => show(Number(b.dataset.dayPick))));
  $("day-prev").addEventListener("click", () => show(ed.day - 1));
  $("day-next").addEventListener("click", () => show(ed.day + 1));
  root.querySelectorAll<HTMLButtonElement>("[data-edit]").forEach((b) =>
    b.addEventListener("click", () => {
      ed.open = at(b.dataset.edit!);
      renderEditor(ed);
    }));
  root.querySelectorAll<HTMLButtonElement>("[data-add]").forEach((b) =>
    b.addEventListener("click", () => {
      // A new activity: its start time decides the part of the day it goes in
      ed.open = [Number(b.dataset.add), -1, null];
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
    const original = i === null || s < 0 ? null : ed.draft.days[d].sections[s].items[i];
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
      update(placeItem(ed.draft, d, i === null || s < 0 ? null : [s, i], readItemForm(form, original)));
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
    redraw = () => (root.innerHTML = `<p class="error">${esc(t.loadError)}</p><p><a class="link-btn" href="${here()}">← ${esc(t.myTrips)}</a></p>`);
    redraw();
    return;
  }
  const ed: Editor = { stored, draft: structuredClone(stored.data), open: null, saving: false, day: 0 };
  // Preview page: ?edit=day,section,item opens that activity's form
  const preview = import.meta.env.DEV ? new URLSearchParams(location.search).get("edit") : null;
  if (preview) {
    const [d, s, i] = preview.split(",").map(Number);
    if (stored.data.days[d]?.sections[s]?.items[i]) {
      ed.open = [d, s, i];
      ed.day = d;
    }
  }
  addEventListener("beforeunload", (e) => {
    if (isDirty(ed)) e.preventDefault();
  });
  renderEditor(ed);
}

// ---------- Start ----------

async function start(): Promise<void> {
  initChrome();
  if (!dataConfigured() || (usingMock() && new URLSearchParams(location.search).get("mock") === "unconfigured")) {
    redraw = () => (root.innerHTML = `<p class="msg bad">${esc(t.notConfigured)}</p>`);
    redraw();
    return;
  }
  root.innerHTML = `<p class="hint">${esc(t.loading)}</p>`;
  const { currentEmail, onSignedIn } = await dbModule();
  const email = await currentEmail();
  await showUser(email);
  if (!email) {
    renderSignIn();
    onSignedIn(() => location.reload());
    return;
  }
  const id = new URLSearchParams(location.search).get("trip");
  try {
    if (id) await openEditor(id);
    else await renderList();
  } catch {
    redraw = () => (root.innerHTML = `<p class="msg bad">${esc(t.saveError)}</p>`);
    redraw();
  }
}

void start();
