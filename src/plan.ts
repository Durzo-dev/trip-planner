/**
 * Turns a trip file into what the page shows: applies poll results (the winning option takes the slot),
 * numbers the map stops in visiting order and builds Google Maps links. Pure functions, unit-tested.
 */
import type { AltGroup, Day, Item, Place, Poll, Trip } from "./types";

/** Index of the option voted by the current viewer, per poll key. */
export type MyVotes = Record<string, number | undefined>;

export interface PollResult {
  winner: number;
  votes: number;
  total: number;
  tie: boolean;
}

/** Voters of each option, the current viewer included under `me`. */
export function pollVoters(poll: Poll, myVote: number | undefined, me: string): string[][] {
  return poll.options.map((o, i) => (myVote === i ? [me] : []).concat(o.voters));
}

/** The option with the most votes wins; a tie keeps the organiser's default. */
export function pollResult(poll: Poll, myVote: number | undefined): PollResult {
  const counts = poll.options.map((o, i) => o.voters.length + (myVote === i ? 1 : 0));
  const max = Math.max(...counts);
  const total = counts.reduce((a, b) => a + b, 0);
  const top = counts.flatMap((c, i) => (c === max ? [i] : []));
  const def = poll.default ?? 0;
  const winner = top.includes(def) ? def : top[0];
  return { winner, votes: counts[winner], total, tie: total > 0 && top.length > 1 };
}

export interface ResolvedItem {
  item: Item;
  /** Position of the item in the day, used as DOM key. */
  index: number;
  title: string;
  text?: string;
  addressLine?: string;
  illustration?: string;
  places: Place[];
  /** Venue shown in bold when the activity takes place at a named venue. */
  venue?: Place;
  alternatives: AltGroup[];
  /** Map stop number of each place, in order. */
  stops: number[];
  result?: PollResult;
}

export interface ResolvedDay {
  day: Day;
  items: ResolvedItem[];
  /** Map stops of the day, numbered from 1 in visiting order. */
  stops: { n: number; place: Place; itemIndex: number }[];
}

const allItems = (trip: Trip): Item[] => trip.days.flatMap((d) => d.sections.flatMap((s) => s.items));

/** Applies poll results and numbers the map stops of one day. */
export function resolveDay(trip: Trip, day: Day, votes: MyVotes, otherOptionsLabel: string): ResolvedDay {
  const items: ResolvedItem[] = [];
  const stops: ResolvedDay["stops"] = [];
  let index = 0;
  for (const section of day.sections) {
    for (const item of section.items) {
      const r = resolveItem(trip, item, index, votes, otherOptionsLabel);
      r.stops = r.places.map((place) => {
        const n = stops.length + 1;
        stops.push({ n, place, itemIndex: index });
        return n;
      });
      items.push(r);
      index++;
    }
  }
  return { day, items, stops };
}

function resolveItem(trip: Trip, item: Item, index: number, votes: MyVotes, otherOptionsLabel: string): ResolvedItem {
  const base: ResolvedItem = {
    item, index, title: item.title, text: item.text, addressLine: item.addressLine, illustration: item.illustration,
    places: item.places ?? [], alternatives: item.alternatives ?? [], stops: [],
  };
  if (item.places?.length === 1 && item.places[0].name !== item.title) base.venue = item.places[0];

  const poll = item.poll ? trip.polls?.[item.poll] : undefined;
  if (!poll || !item.choices?.length) return base;

  const result = pollResult(poll, votes[item.poll!]);
  let choice = item.choices[result.winner];
  let others = item.choices.filter((c, i) => i !== result.winner && c.place);

  if (choice.repeatLoserOf) {
    // e.g. "a 2nd escape game": the venue that lost the other poll
    const source = allItems(trip).find((it) => it.poll === choice.repeatLoserOf);
    const sourcePoll = trip.polls?.[choice.repeatLoserOf];
    if (source?.choices && sourcePoll) {
      const won = pollResult(sourcePoll, votes[choice.repeatLoserOf]).winner;
      const lost = source.choices.find((_, i) => i !== won);
      if (lost) choice = { ...lost, title: choice.title, illustration: choice.illustration ?? lost.illustration, text: choice.text ?? lost.text };
    }
    others = [];
  }

  const alternatives: AltGroup[] = [];
  if (others.length) alternatives.push({ label: otherOptionsLabel, links: others.map((c) => linkTo(c.place!)) });
  alternatives.push(...(choice.alternatives ?? []));

  return {
    ...base,
    title: choice.title ?? item.title,
    text: choice.text ?? item.text,
    addressLine: choice.addressLine ?? item.addressLine,
    illustration: choice.illustration ?? item.illustration,
    places: choice.place ? [choice.place] : base.places,
    venue: choice.place,
    alternatives,
    result: result.total ? result : undefined,
  };
}

export function mapsUrl(place: Place): string {
  return place.mapsUrl ?? "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(place.address);
}

export function linkTo(place: Place): { name: string; url: string } {
  return { name: place.name, url: mapsUrl(place) };
}

/** Google Maps walking directions through the given places. */
export function directionsUrl(places: Place[]): string {
  const addr = places.map((p) => p.address);
  const params = new URLSearchParams({ api: "1", origin: addr[0], destination: addr[addr.length - 1], travelmode: "walking" });
  if (addr.length > 2) params.set("waypoints", addr.slice(1, -1).join("|"));
  return "https://www.google.com/maps/dir/?" + params.toString();
}
