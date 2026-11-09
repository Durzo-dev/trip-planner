/**
 * The schedule: one card per time slot with its venue, alternatives and poll, plus the live progress
 * (time columns filling up, current slot, finished slots and map stops greyed out).
 */
import type { Trip } from "../types";
import type { MyVotes, ResolvedDay, ResolvedItem } from "../plan";
import { mapsUrl, pollVoters } from "../plan";
import { formatTime, sectionLabel, t } from "../i18n";
import { ILLUSTRATIONS } from "../illustrations";
import { progress, toMinutes } from "../time";
import { $, esc, extLink, highlightStops } from "./dom";

export interface ProgrammeHandlers {
  onVote(pollKey: string, option: number): void;
}

export function renderProgramme(trip: Trip, day: ResolvedDay, votes: MyVotes, h: ProgrammeHandlers): void {
  let i = 0;
  const html = day.day.sections.map((sec, s) => {
    const cards = sec.items.map(() => card(trip, day.items[i++], votes)).join("");
    return `<section id="sec-${s}"><div class="sec-h"><h2>${esc(sectionLabel(sec.label))}</h2>${sec.note ? `<span>${esc(sec.note)}</span>` : ""}</div>` +
      `<div class="cards">${cards || `<p class="empty">${esc(t.nothingPlanned)}</p>`}</div></section>`;
  }).join("");
  $("prog").innerHTML = html;

  document.querySelectorAll<HTMLElement>(".card").forEach((c) => {
    const stops = (c.dataset.stops || "").split(" ").filter(Boolean).map(Number);
    c.addEventListener("mouseenter", () => highlightStops(stops, false));
    c.addEventListener("mouseleave", () => highlightStops([]));
  });
  document.querySelectorAll<HTMLButtonElement>(".opt").forEach((b) =>
    b.addEventListener("click", () => h.onVote(b.dataset.poll!, Number(b.dataset.i))),
  );
}

function card(trip: Trip, r: ResolvedItem, votes: MyVotes): string {
  const { item } = r;
  let tags = `<span class="tag now" hidden>${esc(t.now)}</span>`;
  if (item.tag) tags += `<span class="tag ${item.tagStyle === "all" ? "all" : ""}">${esc(item.tag)}</span>`;
  if (r.result) tags += r.result.tie ? `<span class="tag tie">${esc(t.tie)}</span>` : `<span class="tag vote">${esc(t.groupChoice(r.result.votes))}</span>`;

  let body = "";
  if (item.photo) body += `<figure class="photo"><img src="${esc(item.photo)}" alt="" loading="lazy"></figure>`;
  else if (r.illustration && ILLUSTRATIONS[r.illustration]) body += `<svg class="art" viewBox="0 0 120 120" aria-hidden="true">${ILLUSTRATIONS[r.illustration]}</svg>`;
  body += `<h3>${esc(r.title)}${tags}</h3>`;

  if (r.venue) {
    body += `<p><b>${extLink(r.venue.name, mapsUrl(r.venue))}</b>${r.text ? " · " + esc(r.text) : ""}</p>`;
  } else if (r.places.length > 1) {
    body += `<p>${r.places.map((p) => extLink(p.name, mapsUrl(p))).join(" → ")}</p>`;
    if (r.text) body += `<p>${esc(r.text)}</p>`;
  } else {
    body += `<p>${esc(r.text ?? "")}${r.places[0] ? " " + extLink(t.mapsLink, mapsUrl(r.places[0])) : ""}</p>`;
  }
  for (const a of r.alternatives) {
    body += `<p class="alt"><i>${esc(a.label)}${t.colon}</i> ${a.links.map((l) => `<b>${extLink(l.name, l.url)}</b>`).join(" · ")}${a.note ? ` (${esc(a.note)})` : ""}</p>`;
  }
  const badges = r.stops.map((n) => `<span class="stopn" title="${esc(t.stopTitle(n))}">${n}</span>`).join(" ");
  body += `<div class="addr"><span>${badges}</span><span>${esc(r.addressLine ?? r.places[0]?.address ?? "")}</span></div>`;
  if (item.poll && trip.polls?.[item.poll]) body += poll(trip, item.poll, votes[item.poll]);

  return `<article class="card" data-i="${r.index}" data-stops="${r.stops.join(" ")}">` +
    `<div class="time">${formatTime(item.start)}<small>${formatTime(item.end)}</small></div><div class="body">${body}</div></article>`;
}

const FACE_COLORS = ["#B8872E", "#3E7C8C", "#7D5BA6", "#4F8A4B", "#C0634A", "#5C6C8A"];
const faceColor = (name: string) => FACE_COLORS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % FACE_COLORS.length];

function poll(trip: Trip, key: string, myVote: number | undefined): string {
  const p = trip.polls![key];
  const voters = pollVoters(p, myVote, t.you);
  const total = voters.reduce((a, v) => a + v.length, 0);
  const everyone = [t.you, ...trip.participants];
  const voted = new Set(voters.flat());
  const waiting = everyone.filter((n) => !voted.has(n));
  const options = p.options.map((o, i) => {
    const v = voters[i];
    const faces = v.slice(0, 4).map((n) => `<span class="face${n === t.you ? " me" : ""}" style="background:${faceColor(n)}">${esc(n[0])}</span>`).join("") +
      (v.length > 4 ? `<span class="face" style="background:#8A7F83">+${v.length - 4}</span>` : "");
    const who = v.length ? `<b>${esc(t.votes(v.length))}</b>${v.map(esc).join(", ")}` : `<b>${esc(t.noVotes)}</b>`;
    return `<button type="button" class="opt" id="opt-${key}-${i}" data-poll="${key}" data-i="${i}" aria-pressed="${myVote === i}" aria-describedby="who-${key}-${i}">` +
      `<span class="fillbar" style="width:${total ? Math.round((v.length / total) * 100) : 0}%"></span>` +
      `<span class="lbl">${esc(o.label)}</span>` +
      `<span class="right"><span class="faces" aria-hidden="true">${faces}</span><span class="n">${v.length}</span></span>` +
      `<span class="who" role="tooltip" id="who-${key}-${i}">${who}</span></button>`;
  }).join("");
  return `<div class="poll"><p class="poll-q">${esc(p.question)}<span>${esc(t.voted(total, everyone.length))}</span></p>${options}` +
    `<p class="poll-note">${waiting.length ? `<span class="pending">${esc(t.notVotedYet(waiting.join(", ")))}</span> ` : ""}${esc(t.votesHint)}</p></div>`;
}

/** Fills the time columns, marks the current slot and greys finished slots and map stops. */
export function applyProgress(day: ResolvedDay, now: number, liveTabIndex: (now: number) => number | null): void {
  const stopProgress: Record<number, number> = {};
  document.querySelectorAll<HTMLElement>(".card").forEach((c) => {
    const r = day.items[Number(c.dataset.i)];
    const p = progress(now, r.item.start, r.item.end);
    (c.querySelector(".time") as HTMLElement).style.setProperty("--p", p.toFixed(3));
    (c.querySelector(".tag.now") as HTMLElement).hidden = !(p > 0 && p < 1);
    c.classList.toggle("past", p >= 1);
    // a slot with several stops visits them one after the other
    r.stops.forEach((n, k) => (stopProgress[n] = Math.max(0, Math.min(1, p * r.stops.length - k))));
  });
  document.querySelectorAll<SVGGElement>("#map .mk").forEach((g) => {
    const p = stopProgress[Number(g.dataset.n)] ?? 0;
    g.classList.toggle("done", p >= 1);
    g.classList.toggle("live", p > 0 && p < 1);
    g.querySelector(".ring")!.setAttribute("stroke-dasharray", `${p > 0 && p < 1 ? (p * 100).toFixed(1) : 0} 100`);
  });
  document.querySelectorAll<SVGLineElement>("#map .route").forEach((l) => l.classList.toggle("done", (stopProgress[Number(l.dataset.to)] ?? 0) > 0));
  const live = liveTabIndex(now);
  document.querySelectorAll<HTMLElement>("#tabs .dot").forEach((d, i) => (d.hidden = i !== live));
}

/** Index of the section running at `now` (one-day trips). */
export function liveSection(day: ResolvedDay, now: number): number | null {
  const i = day.day.sections.findIndex((s) => s.items.length > 0 && now >= toMinutes(s.items[0].start) && now < toMinutes(s.items[s.items.length - 1].end));
  return i < 0 ? null : i;
}
