-- Drafts and publishing. Organisers edit a draft, saved as they go; members keep seeing the trip as it
-- was last published, and only a publication makes changes visible (and, later, notifies them).
--
-- One draft per trip, shared by its organisers. It lives in its own table rather than next to the
-- published document: row-level security works on whole rows, and guests may read the trip's row.

-- A trip nobody has published yet is seen by its organisers only. Trips that already existed were
-- visible, so they count as published.
alter table public.trips add column published_at timestamptz;
update public.trips set published_at = created_at;

create table public.trip_drafts (
  trip_id text primary key references public.trips (id) on delete cascade,
  data jsonb not null check (data ->> 'id' = trip_id),
  -- Bumped on every save, like trips.version: a save is made "where version = the one I have".
  version integer not null default 1,
  updated_by uuid not null default auth.uid() references auth.users (id),
  updated_at timestamptz not null default now()
);

create function public.guard_draft_update() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.trip_id <> old.trip_id then
    raise exception 'trip_id cannot change';
  end if;
  new.version := old.version + 1;
  new.updated_by := auth.uid();
  new.updated_at := now();
  return new;
end;
$$;

create trigger trip_drafts_guard_update before update on public.trip_drafts
for each row execute function public.guard_draft_update();

alter table public.trip_drafts enable row level security;

create policy "organisers read the draft" on public.trip_drafts
  for select to authenticated using (public.is_trip_admin(trip_id));
create policy "organisers start a draft" on public.trip_drafts
  for insert to authenticated with check (public.is_trip_admin(trip_id) and updated_by = auth.uid());
create policy "organisers save the draft" on public.trip_drafts
  for update to authenticated using (public.is_trip_admin(trip_id)) with check (public.is_trip_admin(trip_id));
create policy "organisers drop the draft" on public.trip_drafts
  for delete to authenticated using (public.is_trip_admin(trip_id));

-- Guests read a trip once it is published; organisers always.
drop policy "members read their trips" on public.trips;
create policy "members read published trips, organisers read theirs" on public.trips
  for select to authenticated using (public.is_trip_admin(id) or (published_at is not null and public.is_trip_member(id)));

-- Publishes the draft in one step: it becomes the trip's document, then is dropped. Fails with
-- "draft changed" when the draft is no longer the version the organiser saw (another organiser saved
-- since). Runs with the caller's rights, so the policies above still decide. Notifications will start here.
create function public.publish_trip(trip text, draft_version integer) returns integer
language plpgsql security invoker set search_path = public as $$
declare
  doc jsonb;
  published integer;
begin
  select data into doc from trip_drafts where trip_id = trip and version = draft_version for update;
  if not found then
    raise exception 'draft changed';
  end if;
  update trips set data = doc, published_at = coalesce(published_at, now()) where id = trip returning version into published;
  if not found then
    raise exception 'not allowed';
  end if;
  delete from trip_drafts where trip_id = trip;
  return published;
end;
$$;

revoke all on public.trip_drafts from anon, authenticated;
grant select, insert, update, delete on public.trip_drafts to authenticated;
grant execute on function public.publish_trip(text, integer) to authenticated;
