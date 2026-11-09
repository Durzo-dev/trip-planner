-- Trips and their members, with row-level security: the browser holds only the public (anon) key,
-- so every rule about who may read or change what is enforced here, never in the page.
--
-- A trip is stored as one JSON document with the same shape as public/trips/*.json, so a trip file and
-- a stored trip are interchangeable. The columns next to it are what the server needs to enforce access.

create table public.trips (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9-]{2,63}$'),
  data jsonb not null check (data ->> 'id' = id),
  status text not null default 'active' check (status in ('active', 'cancelled')),
  cancelled_at timestamptz,
  -- Bumped by the server on every update; a client saves "where version = the one I loaded", so two
  -- organisers editing at once cannot silently overwrite each other.
  version integer not null default 1,
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.trip_members (
  trip_id text not null references public.trips (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  -- owner: created the trip; organiser: co-organiser with the same editing rights; guest: invited.
  role text not null default 'guest' check (role in ('owner', 'organiser', 'guest')),
  -- pending: asked to join through a share link and waits for an organiser's approval.
  status text not null default 'pending' check (status in ('pending', 'active')),
  display_name text not null default '',
  can_vote boolean not null default true,
  can_chat boolean not null default true,
  can_invite boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (trip_id, user_id)
);

create index trip_members_user_idx on public.trip_members (user_id);

-- Membership checks used by the policies. SECURITY DEFINER so that a policy on trip_members can ask
-- about trip_members without recursing into its own policy.
create function public.is_trip_member(trip text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from trip_members
    where trip_id = trip and user_id = auth.uid() and status = 'active'
  );
$$;

create function public.is_trip_admin(trip text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from trip_members
    where trip_id = trip and user_id = auth.uid() and status = 'active' and role in ('owner', 'organiser')
  );
$$;

-- The creator becomes the active owner of the trip.
create function public.add_trip_owner() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into trip_members (trip_id, user_id, role, status, can_invite)
  values (new.id, new.created_by, 'owner', 'active', true);
  return new;
end;
$$;

create trigger trips_add_owner after insert on public.trips
for each row execute function public.add_trip_owner();

-- The server owns id, creator, creation date and version: a client cannot rewrite them.
create function public.guard_trip_update() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.id <> old.id or new.created_by <> old.created_by or new.created_at <> old.created_at then
    raise exception 'id, created_by and created_at cannot change';
  end if;
  new.version := old.version + 1;
  new.updated_at := now();
  return new;
end;
$$;

create trigger trips_guard_update before update on public.trips
for each row execute function public.guard_trip_update();

alter table public.trips enable row level security;
alter table public.trip_members enable row level security;

create policy "members read their trips" on public.trips
  for select to authenticated using (public.is_trip_member(id));

create policy "signed-in users create trips they own" on public.trips
  for insert to authenticated with check (created_by = auth.uid());

create policy "organisers edit their trips" on public.trips
  for update to authenticated using (public.is_trip_admin(id)) with check (public.is_trip_admin(id));

-- No delete policy: a trip is cancelled (status), never deleted from the page.

create policy "members see themselves, organisers see everyone" on public.trip_members
  for select to authenticated using (user_id = auth.uid() or public.is_trip_admin(trip_id));

-- Supabase grants every right on new tables to anon and authenticated; keep only what the policies use.
revoke all on public.trips, public.trip_members from anon, authenticated;
grant select, insert, update on public.trips to authenticated;
grant select on public.trip_members to authenticated;
-- The policies call these; granted explicitly in case new objects are not exposed automatically.
grant usage on schema public to authenticated;
grant execute on function public.is_trip_member(text), public.is_trip_admin(text) to authenticated;
