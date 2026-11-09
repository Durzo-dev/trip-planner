/**
 * Access to the trips stored in Supabase. Only the public (anon) key is in the page: what a signed-in
 * user may read or change is decided by the database's row-level security rules
 * (supabase/migrations), never here. Loaded lazily, so a page showing a trip file never downloads it.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Trip } from "./types";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let client: SupabaseClient | null = null;

export function db(): SupabaseClient {
  if (!url || !key) throw new Error("Supabase is not configured");
  client ??= createClient(url, key);
  return client;
}

export type Role = "owner" | "organiser" | "guest";

export interface StoredTrip {
  id: string;
  data: Trip;
  status: "active" | "cancelled";
  version: number;
  role: Role | null;
}

export class SaveConflict extends Error {}
export class TripExists extends Error {}

/**
 * Signed-in user's id, read from the session kept in the browser (no network request). It only narrows
 * the query to the user's own membership: what may be read is still decided by the database's rules.
 */
async function myId(): Promise<string | null> {
  const { data } = await db().auth.getSession();
  return data.session?.user.id ?? null;
}

/** Each trip comes with the user's own membership row, so trips and roles arrive in one request. */
const TRIP_WITH_ROLE = "id, data, status, version, trip_members!inner(role)";

interface Row extends Omit<StoredTrip, "role"> {
  trip_members: { role: Role }[];
}
const toStored = ({ trip_members, ...r }: Row): StoredTrip => ({ ...r, role: trip_members[0]?.role ?? null });

/** Trips the signed-in user is an active member of, newest first. */
export async function listMyTrips(): Promise<StoredTrip[]> {
  const me = await myId();
  if (!me) return [];
  const { data, error } = await db().from("trips").select(TRIP_WITH_ROLE)
    .eq("trip_members.user_id", me).eq("trip_members.status", "active").order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as Row[]).map(toStored);
}

/** A stored trip, or null when it does not exist or the user may not see it (the two look the same). */
export async function loadStoredTrip(id: string): Promise<StoredTrip | null> {
  const me = await myId();
  if (!me) return null;
  const { data, error } = await db().from("trips").select(TRIP_WITH_ROLE)
    .eq("id", id).eq("trip_members.user_id", me).eq("trip_members.status", "active").maybeSingle();
  if (error) throw error;
  return data ? toStored(data as unknown as Row) : null;
}

export async function createTrip(trip: Trip): Promise<void> {
  // No .select() here: the creator only becomes a member (and may read the row) once the insert is done.
  const { error } = await db().from("trips").insert({ id: trip.id, data: trip });
  if (error?.code === "23505") throw new TripExists();
  if (error) throw error;
}

/** Saves over the version the user loaded; returns the new version, or throws SaveConflict if someone saved first. */
export async function saveTrip(id: string, data: Trip, version: number): Promise<number> {
  const { data: rows, error } = await db().from("trips").update({ data }).eq("id", id).eq("version", version).select("version");
  if (error) throw error;
  if (!rows.length) throw new SaveConflict();
  return rows[0].version as number;
}

// ---------- Sign-in ----------

/** E-mail of the signed-in user, or null. Also completes a sign-in when the page opens from the e-mail link. */
export async function currentEmail(): Promise<string | null> {
  const { data } = await db().auth.getSession();
  return data.session?.user.email ?? null;
}

export async function sendSignInLink(email: string, redirectTo: string): Promise<string | null> {
  const { error } = await db().auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
  return error?.message ?? null;
}

export async function signInWithGoogle(redirectTo: string): Promise<void> {
  await db().auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
}

export async function signOut(): Promise<void> {
  await db().auth.signOut();
}

/** Runs once the user signs in (for instance from the e-mail link opened in another tab). */
export function onSignedIn(run: () => void): void {
  db().auth.onAuthStateChange((event) => {
    if (event === "SIGNED_IN") run();
  });
}
