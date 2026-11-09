/**
 * Runs the real migrations in an embedded Postgres (PGlite) with a stand-in for Supabase's auth schema,
 * then checks the row-level security rules as two different signed-in users would hit them.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";

const ALICE = "00000000-0000-0000-0000-00000000000a";
const BOB = "00000000-0000-0000-0000-00000000000b";

/** The parts of Supabase the migrations rely on: auth.users, auth.uid() and the authenticated role. */
const SUPABASE_STUB = `
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create role authenticated;
  create role anon;
  grant usage on schema public, auth to authenticated, anon;
  -- Supabase grants every table right to these roles by default; only the policies hold them back.
  alter default privileges in schema public grant all on tables to authenticated, anon;
  -- Strictest setting ("Automatically expose new tables" off): nobody may call new functions unless granted.
  alter default privileges revoke execute on functions from public;
  insert into auth.users values ('${ALICE}'), ('${BOB}');
`;

let db: PGlite;

async function as<T>(user: string | null, run: () => Promise<T>): Promise<T> {
  await db.exec(`set role ${user ? "authenticated" : "anon"}; select set_config('request.jwt.claim.sub', '${user ?? ""}', false);`);
  try {
    return await run();
  } finally {
    await db.exec("reset role;");
  }
}

const trip = (id: string) => JSON.stringify({ id, title: "Test", timezone: "Europe/Paris", participants: [], days: [] });

beforeAll(async () => {
  db = new PGlite();
  await db.exec(SUPABASE_STUB);
  const dir = join(__dirname, "migrations");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(join(dir, file), "utf8"));
  }
  await as(ALICE, () => db.query("insert into public.trips (id, data) values ($1, $2)", ["alice-trip", trip("alice-trip")]));
});

describe("trips", () => {
  it("makes the creator the active owner", async () => {
    const r = await db.query<{ role: string; status: string }>("select role, status from public.trip_members where trip_id = 'alice-trip'");
    expect(r.rows).toEqual([{ role: "owner", status: "active" }]);
  });

  it("lets the owner read and edit, and bumps the version", async () => {
    await as(ALICE, async () => {
      const read = await db.query("select id from public.trips");
      expect(read.rows).toHaveLength(1);
      const upd = await db.query<{ version: number }>(
        "update public.trips set data = jsonb_set(data, '{title}', '\"New\"') where id = 'alice-trip' and version = 1 returning version",
      );
      expect(upd.rows).toEqual([{ version: 2 }]);
    });
  });

  it("refuses a save made on a stale version (no row updated)", async () => {
    await as(ALICE, async () => {
      const upd = await db.query("update public.trips set data = data where id = 'alice-trip' and version = 1");
      expect(upd.affectedRows).toBe(0);
    });
  });

  it("hides a trip from a user who is not a member, and stops him editing it", async () => {
    await as(BOB, async () => {
      expect((await db.query("select id from public.trips")).rows).toHaveLength(0);
      const upd = await db.query("update public.trips set data = data where id = 'alice-trip'");
      expect(upd.affectedRows).toBe(0);
      expect((await db.query("select * from public.trip_members")).rows).toHaveLength(0);
    });
  });

  it("refuses a trip created in someone else's name", async () => {
    await expect(
      as(BOB, () => db.query("insert into public.trips (id, data, created_by) values ($1, $2, $3)", ["fake", trip("fake"), ALICE])),
    ).rejects.toThrow(/row-level security/);
  });

  it("refuses a document whose id differs from the row id", async () => {
    await expect(
      as(BOB, () => db.query("insert into public.trips (id, data) values ($1, $2)", ["bob-trip", trip("other")])),
    ).rejects.toThrow(/check constraint/);
  });

  it("refuses to change the id or the creator", async () => {
    await expect(
      as(ALICE, () => db.query(`update public.trips set created_by = '${BOB}' where id = 'alice-trip'`)),
    ).rejects.toThrow(/cannot change/);
  });

  it("never deletes a trip, even for its owner", async () => {
    await expect(as(ALICE, () => db.query("delete from public.trips where id = 'alice-trip'"))).rejects.toThrow(/permission denied/);
  });

  it("refuses everything to a visitor who is not signed in", async () => {
    await expect(as(null, () => db.query("select id from public.trips"))).rejects.toThrow(/permission denied/);
    await expect(as(null, () => db.query("select * from public.trip_members"))).rejects.toThrow(/permission denied/);
    await expect(as(null, () => db.query("insert into public.trips (id, data) values ($1, $2)", ["anon-trip", trip("anon-trip")]))).rejects.toThrow();
  });

  it("lets nobody write memberships directly yet", async () => {
    await expect(
      as(BOB, () => db.query("insert into public.trip_members (trip_id, user_id, role, status) values ('alice-trip', $1, 'owner', 'active')", [BOB])),
    ).rejects.toThrow(/row-level security|permission denied/);
  });

  it("lets a co-organiser edit, but not a guest", async () => {
    await db.query("insert into public.trip_members (trip_id, user_id, role, status) values ('alice-trip', $1, 'guest', 'active')", [BOB]);
    await as(BOB, async () => {
      expect((await db.query("select id from public.trips")).rows).toHaveLength(1);
      expect((await db.query("update public.trips set data = data where id = 'alice-trip'")).affectedRows).toBe(0);
    });
    await db.query("update public.trip_members set role = 'organiser' where user_id = $1", [BOB]);
    await as(BOB, async () => {
      expect((await db.query("update public.trips set data = data where id = 'alice-trip'")).affectedRows).toBe(1);
    });
  });

  it("does not let a pending member read the trip", async () => {
    await db.query("update public.trip_members set status = 'pending', role = 'guest' where user_id = $1", [BOB]);
    await as(BOB, async () => {
      expect((await db.query("select id from public.trips")).rows).toHaveLength(0);
      expect((await db.query("select status from public.trip_members")).rows).toEqual([{ status: "pending" }]);
    });
  });
});
