/**
 * Admin page (admin.html): sign in, list the trips you organise, create one, and edit it (title,
 * dates, days, activities, meeting point). An activity is saved as soon as its form is done; other
 * edits stay in a draft until "Save"; the draft is checked by
 * validateTrip and saved over the version that was loaded, so two organisers cannot overwrite each other.
 */
import { CALENDAR, CHEVRON_BACK, CHEVRON_FORWARD } from "../ui/icons";
import "../styles/tokens.css";
import "../styles/components.css";
import "./admin.css";
import type { Day, Item, Label, Place, Trip } from "../types";
import { capitalize, formatDate, formatTime, lang, LANG_CHANGE, sectionLabel, t } from "../i18n";
import { initTheme } from "../theme";
import { daysBetween } from "../time";
import { $, esc } from "../ui/dom";
import { mountSettingsButton } from "../ui/settings";
import { geocodeAddress } from "../geocode";
import { enableLabelMarquee } from "../ui/marquee";
import { enableDragScroll, enableScrollArrows } from "../ui/dragScroll";
import { attachPeriodPicker } from "../ui/calendar";
import { enhancePickers } from "../ui/pickers";
import type { StoredTrip } from "../db";
import { dataConfigured, loadDataSource, usingMock } from "../dataSource";
import {
  addDay, addDays, mapsLinkOf, newTrip, parseCoordinates, placeItem, removeDay, removeItem, setDayDate, shiftTrip, validateTrip, type TripError,
} from "./edit";
import { LABELS, applyLabelRules, hasLabel, migrateTrip, setLabel } from "../labels";

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
  enableLabelMarquee();
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
      <label class="field"><span class="lbl">${esc(t.email)}</span><input type="email" name="email" required autocomplete="email"></label>
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
        <label class="field"><span class="lbl">${esc(t.tripTitle)}</span><input name="title" required maxlength="80"></label>
        <div class="row">
          <label class="field narrow"><span class="lbl">${esc(t.firstDay)}</span><input type="date" name="first" required min="${today}"></label>
          <label class="field narrow"><span class="lbl">${esc(t.lastDay)}</span><input type="date" name="last" required min="${today}"></label>
          <label class="field"><span class="lbl">${esc(t.timezone)}</span><input name="zone" required value="${esc(zone)}"></label>
        </div>
        <div><button class="btn fill add" type="submit">${esc(t.create)}</button></div>
        <div id="create-msg"></div>
      </form>
    </section>`;
  enhancePickers(root, freshPickerListeners());
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
    case "date": return e.date(err.day + 1);
    case "dayOrder": return e.dayOrder(err.day + 1);
    default: return e[err.code](err.day + 1, activityName(trip, err.day, err.section, err.item));
  }
}

/** "Saturday 19 December → Sunday 20 December 2026 · 2 days" for the trip's days starting on `first`. */
function periodText(trip: Trip, first: string): string {
  const last = addDays(first, daysBetween(trip.days[0].date, trip.days[trip.days.length - 1].date));
  const n = daysBetween(first, last) + 1;
  const long = (d: string, year: boolean) => capitalize(formatDate(d, { weekday: "long", day: "numeric", month: "long", ...(year ? { year: "numeric" } : {}) }));
  // The year once at the end, unless the trip spans two years
  return t.period(long(first, n === 1 || first.slice(0, 4) !== last.slice(0, 4)), long(last, true), n);
}

/** Number of days of a trip, from its first to its last day. */
const tripLength = (trip: Trip) => daysBetween(trip.days[0].date, trip.days[trip.days.length - 1].date) + 1;

function dayTitle(date: string): string {
  return capitalize(formatDate(date, { weekday: "long", day: "numeric", month: "long" }));
}

/** A place row. The position found for the place is kept on the row (data-lat / data-lng) until its link or address changes. */
function placeRow(p?: Place): string {
  const known = p && Number.isFinite(p.lat) && Number.isFinite(p.lng);
  // Show the link the organiser pasted, or else the coordinates
  const shown = p?.mapsUrl ?? (known ? `${p!.lat}, ${p!.lng}` : "");
  return `<div class="place-row"${known ? ` data-lat="${p!.lat}" data-lng="${p!.lng}"` : ""}>
    <label class="field"><span class="lbl">${esc(t.placeName)}</span><input data-k="name" value="${esc(p?.name ?? "")}"></label>
    <label class="field"><span class="lbl">${esc(t.placeAddress)}</span><input data-k="address" value="${esc(p?.address ?? "")}"></label>
    <label class="field"><span class="lbl">${esc(t.placeCoordinates)}</span><input data-k="coords" value="${esc(shown)}" placeholder="https://maps.app.goo.gl/…"></label>
    <button type="button" class="btn small danger" data-remove-place>${esc(t.removePlace)}</button>
    <p class="place-error" hidden></p>
  </div>`;
}

const rowValue = (r: Element, k: string) => (r.querySelector<HTMLInputElement>(`[data-k="${k}"]`)?.value ?? "").trim();
const rowIsEmpty = (r: Element) => ["name", "address", "coords"].every((k) => !rowValue(r, k));

/** Position of a place row: from its link or typed coordinates, else the one already found for it. */
function rowPosition(r: HTMLElement): { lat: number; lng: number } | null {
  const typed = parseCoordinates(rowValue(r, "coords"));
  if (typed) return typed;
  const lat = Number(r.dataset.lat);
  const lng = Number(r.dataset.lng);
  return r.dataset.lat && Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

/**
 * Checks the places of the open form before anything is saved. A place needs a name and an address.
 * Its position comes from the link or coordinates when they hold one (a full Google Maps link does,
 * a short share link does not), otherwise it is looked up from the address. A faulty row is outlined,
 * focused and says what to do; returns false if any row is faulty.
 */
async function checkPlaces(form: HTMLFormElement): Promise<boolean> {
  let ok = true;
  for (const r of form.querySelectorAll<HTMLElement>(".place-row")) {
    const error = r.querySelector<HTMLElement>(".place-error")!;
    const say = (message: string, field: string, bad = true) => {
      error.textContent = message;
      error.hidden = !message;
      error.classList.toggle("pending", !bad);
      r.classList.toggle("bad", bad && Boolean(message));
      if (bad && message && ok) r.querySelector<HTMLInputElement>(`[data-k="${field}"]`)?.focus();
      if (bad && message) ok = false;
    };
    if (rowIsEmpty(r)) {
      say("", "");
      continue;
    }
    if (!rowValue(r, "name") || !rowValue(r, "address")) {
      say(t.placeNeedsNameAddress, rowValue(r, "name") ? "address" : "name");
      continue;
    }
    if (rowPosition(r)) {
      say("", "");
      continue;
    }
    const link = rowValue(r, "coords");
    if (link && !mapsLinkOf(link)) {
      say(t.placeNoCoordinates, "coords");
      continue;
    }
    say(t.placeLocating, "", false);
    const found = await geocodeAddress(rowValue(r, "address"), lang);
    if (found) {
      r.dataset.lat = String(found.lat);
      r.dataset.lng = String(found.lng);
      say("", "");
    } else {
      say(t.placeNotFound, "address");
    }
  }
  return ok;
}

function itemForm(it: Item | null): string {
  const v = (s?: string) => esc(s ?? "");
  return `<form class="item-form form" id="item-form">
    <div class="row">
      <label class="field tiny"><span class="lbl">${esc(t.start)}</span><input type="time" name="start" required value="${v(it?.start)}"></label>
      <label class="field tiny"><span class="lbl">${esc(t.end)}</span><input type="time" name="end" required value="${v(it?.end)}"></label>
      <label class="field"><span class="lbl">${esc(t.activityTitle)}</span><input name="title" required value="${v(it?.title)}"></label>
    </div>
    <fieldset class="field picks-field"><legend class="lbl">${esc(t.labels)}</legend>
      <div class="picks">${LABELS.map((l) => {
        const help = l === "meeting" || l === "optional" ? t.labelHelp[l] : "";
        return `<label class="pick"><input type="checkbox" name="labels" value="${l}"${it && hasLabel(it, l) ? " checked" : ""}${help ? ` aria-describedby="help-${l}"` : ""}><span>${esc(t.label[l])}</span>` +
          `${help ? `<span class="tip" role="tooltip" id="help-${l}">${esc(help)}</span>` : ""}</label>`;
      }).join("")}${it?.poll ? `<span class="pick fixed"><span>${esc(t.label.poll)}</span></span>` : ""}</div>
    </fieldset>
    <label class="field"><span class="lbl">${esc(t.description)}</span><textarea name="text">${v(it?.text)}</textarea></label>
    <label class="field"><span class="lbl">${esc(t.addressLine)}</span><input name="addressLine" value="${v(it?.addressLine)}"></label>
    ${it?.poll ? `<p class="note">${esc(t.pollNote)}</p>` : `<div class="places"><span class="field">${esc(t.places)}</span><div class="form" id="places">${(it?.places ?? []).map(placeRow).join("")}</div>
      <div><button type="button" class="btn small add" id="add-place">${esc(t.addPlace)}</button></div></div>`}
    <div class="row form-actions"><button class="btn" type="button" id="cancel-item">${esc(t.back)}</button><button class="btn fill add" type="submit">${esc(t.done)}</button></div>
  </form>`;
}

/** Reads the open activity form into an Item, keeping the fields the form does not show (poll, photos…). */
function readItemForm(form: HTMLFormElement, original: Item | null): Item {
  const get = (n: string) => String(new FormData(form).get(n) ?? "").trim();
  const item: Item = { ...(original ?? { start: "", end: "", title: "" }), start: get("start"), end: get("end"), title: get("title") };
  for (const k of ["text", "addressLine"] as const) {
    const val = get(k);
    if (val) item[k] = val;
    else delete item[k];
  }
  // Read from the boxes themselves: a disabled box is left out of FormData
  const picked = new Set([...form.querySelectorAll<HTMLInputElement>('input[name="labels"]')].filter((c) => c.checked).map((c) => c.value));
  for (const l of LABELS) setLabel(item, l, picked.has(l));
  const rows = form.querySelectorAll<HTMLElement>(".place-row");
  if (!original?.poll) {
    const places: Place[] = [...rows].filter((r) => !rowIsEmpty(r)).map((r) => {
      // checkPlaces() has refused the form unless every place has a position
      const c = rowPosition(r)!;
      const place: Place = { name: rowValue(r, "name"), address: rowValue(r, "address"), lat: c.lat, lng: c.lng };
      const link = mapsLinkOf(rowValue(r, "coords"));
      if (link) place.mapsUrl = link;
      return place;
    });
    // Keep each place's own Maps link when its name and address are unchanged and no new link was pasted
    places.forEach((p, i) => {
      const old = original?.places?.[i];
      if (!p.mapsUrl && old?.mapsUrl && old.name === p.name && old.address === p.address) p.mapsUrl = old.mapsUrl;
    });
    if (places.length) item.places = places;
    else delete item.places;
  }
  return item;
}

/** Listeners of the date and time fields (some sit on the document), removed before each redraw. */
let pickerListeners: AbortController | null = null;
function freshPickerListeners(): AbortSignal {
  pickerListeners?.abort();
  pickerListeners = new AbortController();
  return pickerListeners.signal;
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
    <div class="row" style="justify-content:space-between"><a class="btn back" href="${here()}">${CHEVRON_BACK}${esc(t.myTrips)}</a><a class="btn" href="${viewerUrl(trip.id)}" target="_blank" rel="noopener">${esc(t.open)} ↗</a></div>
    <section class="panel form">
      <label class="field"><span class="lbl">${esc(t.tripTitle)}</span><input id="f-title" value="${esc(trip.title)}" maxlength="80"></label>
      <label class="field"><span class="lbl">${esc(t.tagline)}</span><input id="f-tagline" value="${esc(trip.tagline ?? "")}"></label>
      ${trip.days.length ? `<div class="row move-trip">
        <div class="field picker"><span class="lbl" id="period-lbl">${esc(t.tripPeriod)}</span>
          <button type="button" class="date-btn" id="f-period" aria-labelledby="period-lbl f-period"><span id="period-text">${esc(periodText(trip, trip.days[0].date))}</span>${CALENDAR}</button></div>
        <button type="button" class="btn small edit" id="do-shift" hidden>${esc(t.moveTrip)}</button>
      </div>` : ""}
      <div class="panel-foot"><button type="button" class="btn small add" id="add-day">+ ${esc(t.addDay)}</button></div>
    </section>
    <nav class="day-strip" aria-label="${esc(t.days)}">
      <button type="button" class="arrow-btn" id="strip-back" aria-label="${esc(t.scrollBack)}" hidden>${CHEVRON_BACK}</button>
      <div class="strip" id="strip">${trip.days.map((d, i) => `<button type="button" class="strip-day${i === ed.day ? " on" : ""}" data-day-pick="${i}" aria-current="${i === ed.day ? "date" : "false"}">${esc(capitalize(formatDate(d.date, { weekday: "short", day: "numeric", month: "short" })))}${d.label ? `<small>${esc(d.label)}</small>` : ""}</button>`).join("")}
</div>
      <button type="button" class="arrow-btn" id="strip-forward" aria-label="${esc(t.scrollForward)}" hidden>${CHEVRON_FORWARD}</button>
    </nav>
    <div class="day-view">
      <button type="button" class="arrow-btn lg" id="day-prev" aria-label="${esc(t.previousDay)}" title="${esc(t.previousDay)}"${ed.day === 0 ? " disabled" : ""}>${CHEVRON_BACK}</button>
      ${((d: Day, di: number) => `<section class="panel day" data-day="${di}" aria-labelledby="day-h">
      <h2 id="day-h">${esc(dayTitle(d.date))}</h2>
      <div class="row">
        <label class="field narrow"><span class="lbl">${esc(t.dayDate)}</span><input type="date" data-day-date="${di}" value="${esc(d.date)}"></label>
        <label class="field"><span class="lbl">${esc(t.dayLabel)}</span><input data-day-label="${di}" value="${esc(d.label ?? "")}"></label>
      </div>
      ${d.sections.map((s, si) => `<div>
        <h3 class="section-h">${esc(sectionLabel(s.label))}</h3>
        <ul class="items">${s.items.map((it, ii) => {
          const isOpen = ed.open && ed.open[0] === di && ed.open[1] === si && ed.open[2] === ii;
          return isOpen ? `<li>${itemForm(it)}</li>` : `<li class="item">
            <span class="when">${esc(formatTime(it.start))} – ${esc(formatTime(it.end))}</span>
            <span class="what">${esc(it.title)}${[...LABELS.filter((l) => hasLabel(it, l)), ...(it.poll ? ["poll" as const] : [])].map((l) => `<span class="item-tag${l === "meeting" ? " meeting" : ""}">${esc(t.label[l])}</span>`).join("")}</span>
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
      <button type="button" class="arrow-btn lg" id="day-next" aria-label="${esc(t.nextDay)}" title="${esc(t.nextDay)}"${ed.day === trip.days.length - 1 ? " disabled" : ""}>${CHEVRON_FORWARD}</button>
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
  enableScrollArrows(strip, $<HTMLButtonElement>("strip-back"), $<HTMLButtonElement>("strip-forward"), ".strip-day", stripListeners.signal);
  strip.scrollLeft = stripLeft;
  strip.querySelector<HTMLElement>(".strip-day.on")?.scrollIntoView({ block: "nearest", inline: "nearest" });
  enhancePickers(root, freshPickerListeners());
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
  /** `chosen`: an activity just made its day's meeting point (see applyLabelRules). */
  const update = (next: Trip, rerender = true, chosen?: { day: number; item: Item }) => {
    const before = JSON.stringify(next.days);
    ed.draft = applyLabelRules(next, chosen);
    // Activities that just became optional (or stopped being) must show it
    if (JSON.stringify(ed.draft.days) !== before) rerender = true;
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
  // Picking a new first day in the calendar shows the whole period moved; "Move the trip" applies it
  const periodBtn = document.getElementById("f-period") as HTMLButtonElement | null;
  if (periodBtn) {
    let picked = ed.draft.days[0].date;
    attachPeriodPicker(periodBtn, {
      start: () => picked,
      length: () => tripLength(ed.draft),
      today: new Date().toISOString().slice(0, 10),
      onPick(date) {
        picked = date;
        $("period-text").textContent = periodText(ed.draft, date);
        $("do-shift").hidden = date === ed.draft.days[0].date;
      },
    }, stripListeners?.signal);
    $("do-shift").addEventListener("click", () => {
      const n = daysBetween(ed.draft.days[0].date, picked);
      if (n) update(shiftTrip(ed.draft, n));
    });
  }
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
    const wirePlace = (row: Element) => {
      row.querySelector("[data-remove-place]")?.addEventListener("click", () => row.remove());
      // A new link or address makes the position found earlier stale
      row.querySelectorAll<HTMLInputElement>('[data-k="coords"], [data-k="address"]').forEach((input) =>
        input.addEventListener("input", () => {
          delete (row as HTMLElement).dataset.lat;
          delete (row as HTMLElement).dataset.lng;
        }));
    };
    form.querySelectorAll(".place-row").forEach(wirePlace);
    document.getElementById("add-place")?.addEventListener("click", () => {
      $("places").insertAdjacentHTML("beforeend", placeRow());
      wirePlace($("places").lastElementChild!);
    });
    // A meeting point is never optional; the day's meeting point moves only by ticking another activity
    const box = (l: Label) => form.querySelector<HTMLInputElement>(`input[name="labels"][value="${l}"]`)!;
    const meeting = box("meeting");
    const optional = box("optional");
    const isMeeting = !!original && hasLabel(original, "meeting");
    const syncPicks = () => {
      if (meeting.checked) optional.checked = false;
      optional.disabled = meeting.checked;
      meeting.disabled = isMeeting || optional.checked;
    };
    meeting.addEventListener("change", syncPicks);
    optional.addEventListener("change", syncPicks);
    syncPicks();
    $("cancel-item").addEventListener("click", () => {
      ed.open = null;
      renderEditor(ed);
    });
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const done = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
      done.disabled = true;
      const ok = await checkPlaces(form);
      done.disabled = false;
      if (!ok) return;
      ed.open = null;
      const item = readItemForm(form, original);
      const madeMeeting = hasLabel(item, "meeting") && !(original && hasLabel(original, "meeting"));
      update(placeItem(ed.draft, d, i === null || s < 0 ? null : [s, i], item), true, madeMeeting ? { day: d, item } : undefined);
      // "Done" also saves: the activity reaches the trip page without a second step
      void save(ed);
    });
  }

  $("discard").addEventListener("click", () => {
    ed.draft = structuredClone(ed.stored.data);
    ed.open = null;
    renderEditor(ed);
  });
  $("save").addEventListener("click", () => void save(ed));
}

/**
 * Saves the draft over the version that was loaded. Called by the save button, and on its own after
 * "Done" in an activity form. Does nothing while something blocks saving: the bar then lists it.
 */
async function save(ed: Editor): Promise<void> {
  if (ed.saving || !isDirty(ed) || validateTrip(ed.draft).length) return;
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
}

async function openEditor(id: string): Promise<void> {
  const { loadStoredTrip } = await dbModule();
  const stored = await loadStoredTrip(id);
  if (!stored || (stored.role !== "owner" && stored.role !== "organiser")) {
    redraw = () => (root.innerHTML = `<p class="error">${esc(t.loadError)}</p><p><a class="btn back" href="${here()}">${CHEVRON_BACK}${esc(t.myTrips)}</a></p>`);
    redraw();
    return;
  }
  // A trip saved in an older format (or before the label rules) is shown up to date; it is saved with the next change
  stored.data = migrateTrip(stored.data);
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

if (import.meta.env.DEV) void import("../dev/freeze").then((m) => m.freezeIfAsked());
void start();
