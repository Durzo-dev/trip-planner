/**
 * Banner: title, dates, countdown, participants (tooltip) and the meeting-time chip that points to its activity.
 */
import type { Trip } from "../types";
import { capitalize, formatDate, formatTime, t } from "../i18n";
import { daysBetween } from "../time";
import { $, esc } from "./dom";

export interface HeaderHandlers {
  /** Hovering the meeting chip previews the matching activity; clicking jumps to it. */
  onMeetingHover(active: boolean): void;
  onMeetingClick(): void;
}

export function renderHeader(trip: Trip, today: string, h: HeaderHandlers): void {
  const first = trip.days[0].date;
  const last = trip.days[trip.days.length - 1].date;
  document.title = trip.title;
  $("t-title").textContent = trip.title;
  $("t-tag").textContent = trip.tagline ?? "";

  const d1 = formatDate(first, { day: "numeric" });
  const d2 = formatDate(last, { day: "numeric" });
  $("t-day").textContent = first === last ? d1 : `${d1}–${d2}`;
  $("t-month").textContent = formatDate(first, { month: "long", year: "numeric" }).toUpperCase();

  const left = daysBetween(today, first);
  const countdown =
    today > last ? t.over : left > 1 ? t.daysLeft(left) : left === 1 ? t.tomorrow : t.today;

  const chips = [`<span class="chip live">${esc(countdown)}</span>`];
  chips.push(
    `<button type="button" class="chip" id="chip-people" aria-describedby="tip-people">${esc(t.participants(trip.participants.length))}` +
      `<span class="tip" role="tooltip" id="tip-people"><b>${esc(t.participantsTitle)}</b>${trip.participants.map(esc).join("<br>")}</span></button>`,
  );
  if (trip.meetingPoint) {
    const multi = trip.days.length > 1;
    const when = (multi ? capitalize(formatDate(trip.meetingPoint.date, { weekday: "short" })) + " " : "") + formatTime(trip.meetingPoint.time);
    chips.push(`<button type="button" class="chip" id="chip-meet">${esc(t.meetingAt(when))}</button>`);
  }
  if (trip.example) chips.push(`<span class="chip">${esc(t.example)}</span>`);
  $("t-chips").innerHTML = chips.join("");

  const meet = document.getElementById("chip-meet");
  if (meet) {
    meet.addEventListener("mouseenter", () => h.onMeetingHover(true));
    meet.addEventListener("focus", () => h.onMeetingHover(true));
    meet.addEventListener("mouseleave", () => h.onMeetingHover(false));
    meet.addEventListener("blur", () => h.onMeetingHover(false));
    meet.addEventListener("click", () => h.onMeetingClick());
  }
}
