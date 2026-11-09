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

async function myRoles(): Promise<Map<string, Role>> {
  const { data: user } = await db().auth.getUser();
  if (!user.user) return new Map();
  const { data, error } = await db().from("trip_members").select("trip_id, role").eq("user_id", user.user.id).eq("status", "active");
  if (error) throw error;
  return new Map(data.map((m) => [m.trip_id as string, m.role as Role]));
}

/** Trips the signed-in user is an active member of, newest first. */
export async function listMyTrips(): Promise<StoredTrip[]> {
  const [roles, res] = await Promise.all([myRoles(), db().from("trips").select("id, data, status, version").order("created_at", { ascending: false })]);
  if (res.error) throw res.error;
  return res.data.map((r) => ({ ...(r as Omit<StoredTrip, "role">), role: roles.get(r.id as string) ?? null }));
}

/** A stored trip, or null when it does not exist or the user may not see it (the two look the same). */
export async function loadStoredTrip(id: string): Promise<StoredTrip | null> {
  const [roles, res] = await Promise.all([myRoles(), db().from("trips").select("id, data, status, version").eq("id", id).maybeSingle()]);
  if (res.error) throw res.error;
  return res.data ? { ...(res.data as Omit<StoredTrip, "role">), role: roles.get(id) ?? null } : null;
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
