/**
 * Data model of a trip. A trip is a single JSON file (see /public/trips and /schema/trip.schema.json):
 * the page only renders it, so planning a new outing means writing a new file.
 */

export interface Trip {
  id: string;
  title: string;
  tagline?: string;
  /** IANA time zone the schedule is written in, e.g. "Europe/Paris". */
  timezone: string;
  theme?: Theme;
  participants: string[];
  days: Day[];
  polls?: Record<string, Poll>;
  /** Purely decorative shapes for the schematic map (rivers, coastlines). */
  mapDecor?: MapDecor;
  /** True when the trip holds sample data (shown as a badge). */
  example?: boolean;
}

export interface Theme {
  gradientStart: string;
  gradientEnd: string;
  accent: string;
}

export interface Day {
  /** ISO date, YYYY-MM-DD. */
  date: string;
  /** Short subtitle shown in the day tab of a multi-day trip. */
  label?: string;
  sections: Section[];
}

export interface Section {
  label: string;
  note?: string;
  items: Item[];
}

export interface Place {
  name: string;
  lat: number;
  lng: number;
  /** Address used for directions. */
  address: string;
  /** Link opened by the "Maps" button; defaults to a search on the address. */
  mapsUrl?: string;
}

export interface LinkRef {
  name: string;
  url: string;
}

export interface AltGroup {
  label: string;
  links: LinkRef[];
  note?: string;
}

/** One option of a poll-driven activity. */
export interface Choice {
  /** Venue shown when this option wins. */
  place?: Place;
  /** Overrides the activity title (e.g. "Bubble tea break"). */
  title?: string;
  illustration?: string;
  text?: string;
  /** Human-readable address line. */
  addressLine?: string;
  alternatives?: AltGroup[];
  /** "Repeat" option: reuse the option that lost in another poll (e.g. a 2nd escape game). */
  repeatLoserOf?: string;
}

/**
 * meeting: the day's meeting point, where everyone joins; optional: come if you like; paid: costs
 * something; booking: has to be booked beforehand. A poll-driven activity also shows a poll label.
 */
export type Label = "meeting" | "optional" | "paid" | "booking";

export interface Item {
  /** HH:MM, local time. Times after midnight (e.g. "01:30") belong to the same night. */
  start: string;
  end: string;
  title: string;
  /** Labels shown on the card, from a fixed set (see labels.ts for the rules between them). */
  labels?: Label[];
  illustration?: string;
  /** URL of a photo shown as a banner on the card. */
  photo?: string;
  text?: string;
  addressLine?: string;
  /** Places visited during the activity, in order (a walk can have several). */
  places?: Place[];
  alternatives?: AltGroup[];
  /** Key of a poll in Trip.polls: the winning option of that poll becomes the activity. */
  poll?: string;
  /** Required with poll: one choice per poll option, same order. */
  choices?: Choice[];
}

export interface Poll {
  question: string;
  /** Option index kept on a tie (the organiser's pick). */
  default?: number;
  options: PollOption[];
}

export interface PollOption {
  label: string;
  voters: string[];
}

export interface MapDecor {
  river?: { points: [number, number][]; label?: string };
}
