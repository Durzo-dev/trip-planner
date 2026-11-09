/**
 * In-memory stand-in for src/db.ts, used in development with ?mock (see src/dataSource.ts). The value
 * of ?mock picks the situation: "signed-out", "no-trips", "unconfigured", or empty for a signed-in
 * user who organises three trips (one with unpublished changes, one never published) and is a guest on a
 * fourth. Saves stay in memory until the page reloads.
 */
import type { Trip } from "../types";
import { newTrip } from "../admin/edit";
import { SaveConflict, TripExists, type StoredTrip } from "../db";

export { SaveConflict, TripExists };
export type { Role, StoredTrip } from "../db";

const scenario = new URLSearchParams(location.search).get("mock") ?? "";

const emptyTrip = newTrip({ title: "Empty days", timezone: "Europe/Paris", firstDay: "2026-12-19", lastDay: "2026-12-20", sectionLabels: ["Matin", "Après-midi", "Soirée"] });
emptyTrip.days[0].sections[0].items.push({ start: "10:00", end: "12:00", title: "Brunch" });
/** The same trip seen by an invited guest: no way to the admin page. */
const guestTrip: Trip = { ...structuredClone(emptyTrip), id: "guest-view-2026-12-19", title: "Guest view" };

const stored = (data: Trip, role: StoredTrip["role"], published = true): StoredTrip => ({ id: data.id, data: structuredClone(data), status: "active", version: 1, role, published, draft: null });

const file = async (id: string): Promise<Trip> => (await fetch(`${import.meta.env.BASE_URL}trips/${id}.json`)).json();

/** The two example files plus a trip with empty parts of the day, loaded once. */
const tripsReady: Promise<StoredTrip[]> = scenario === "no-trips" ? Promise.resolve([]) : Promise.all([
  file("bordeaux-2026-11-28").then((t) => stored(t, "owner")),
  // An organiser has unpublished changes on this one
  file("bordeaux-weekend-2026-11").then((t) => ({ ...stored(t, "organiser"), draft: { data: { ...structuredClone(t), title: `${t.title} (draft)` }, version: 3 } })),
  // Never published: only organisers see it
  { ...stored(emptyTrip, "owner", false), draft: { data: structuredClone(emptyTrip), version: 1 } },
  stored(guestTrip, "guest"),
]);

const signedIn = scenario !== "signed-out";
const wait = () => new Promise((r) => setTimeout(r, 120));

export function db(): never {
  throw new Error("The mock data source has no Supabase client");
}

export async function listMyTrips(): Promise<StoredTrip[]> {
  await wait();
  const trips = await tripsReady;
  return signedIn ? structuredClone(trips) : [];
}

export async function loadStoredTrip(id: string): Promise<StoredTrip | null> {
  await wait();
  const trips = await tripsReady;
  const t = signedIn ? trips.find((x) => x.id === id) : undefined;
  return t ? structuredClone(t) : null;
}

export async function createTrip(trip: Trip): Promise<void> {
  await wait();
  const trips = await tripsReady;
  if (trips.some((x) => x.id === trip.id)) throw new TripExists();
  trips.unshift(stored(trip, "owner", false));
}

const find = async (id: string) => {
  const t = (await tripsReady).find((x) => x.id === id);
  if (!t) throw new SaveConflict();
  return t;
};

export async function saveDraft(id: string, data: Trip, version: number | null): Promise<number> {
  await wait();
  const t = await find(id);
  if ((t.draft?.version ?? null) !== version) throw new SaveConflict();
  t.draft = { data: structuredClone(data), version: (version ?? 0) + 1 };
  return t.draft.version;
}

export async function publishDraft(id: string, draftVersion: number): Promise<number> {
  await wait();
  const t = await find(id);
  if (t.draft?.version !== draftVersion) throw new SaveConflict();
  t.data = t.draft.data;
  t.draft = null;
  t.published = true;
  return ++t.version;
}

export async function discardDraft(id: string, version: number): Promise<void> {
  await wait();
  const t = await find(id);
  if (t.draft?.version !== version) throw new SaveConflict();
  t.draft = null;
}

export async function currentEmail(): Promise<string | null> {
  return signedIn ? "organiser@example.com" : null;
}

export async function sendSignInLink(): Promise<string | null> {
  await wait();
  return null;
}

export async function signInWithGoogle(): Promise<void> {}
export async function signOut(): Promise<void> {}
export function onSignedIn(): void {}
