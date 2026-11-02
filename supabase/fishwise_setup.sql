-- FishWise SG — Supabase setup (no-login model)
-- Run once in Supabase → SQL Editor → New query → Run. Safe to re-run.
--
-- Each browser has a random device id ("sync code") sent as the x-device-id
-- header. Private data is only visible to the device that wrote it. Shared
-- tables store md5(device id) as `owner`, so nobody can read another
-- visitor's sync code from them.

-- Helpers -------------------------------------------------------------
create or replace function public.fw_device() returns text
language sql stable as $$
  select coalesce(current_setting('request.headers', true)::json ->> 'x-device-id', '')
$$;

create or replace function public.fw_owner() returns text
language sql stable as $$
  select md5('fishwise:' || public.fw_device())
$$;

create or replace function public.fw_has_device() returns boolean
language sql stable as $$
  select char_length(public.fw_device()) between 30 and 64
$$;

-- Private per-device state (one JSON document per app storage key) ---------
create table if not exists public.fw_user_state (
  device_id  text not null check (char_length(device_id) between 30 and 64),
  key        text not null check (key like 'fishwise.%' and char_length(key) <= 40),
  value      jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (device_id, key)
);

-- Community -------------------------------------------------------------
create table if not exists public.fw_posts (
  id          uuid primary key,
  owner       text not null default public.fw_owner(),
  author_name text not null check (char_length(author_name) between 1 and 40),
  title       text not null check (char_length(title) between 8 and 140),
  body        text not null check (char_length(body) between 1 and 1000),
  tags        text[] not null default '{}',
  created_at  timestamptz not null default now()
);

create table if not exists public.fw_answers (
  id          uuid primary key,
  post_id     text not null check (char_length(post_id) <= 80),
  owner       text not null default public.fw_owner(),
  author_name text not null check (char_length(author_name) between 1 and 40),
  body        text not null check (char_length(body) between 10 and 1000),
  created_at  timestamptz not null default now()
);
create index if not exists fw_answers_post on public.fw_answers (post_id);

create table if not exists public.fw_helpful (
  answer_key  text not null check (char_length(answer_key) <= 120),
  owner       text not null default public.fw_owner(),
  created_at  timestamptz not null default now(),
  primary key (answer_key, owner)
);

-- FishWise Local bookings (shared so seat counts are live) -----------------
create table if not exists public.fw_bookings (
  session_id  text not null check (char_length(session_id) <= 60),
  owner       text not null default public.fw_owner(),
  created_at  timestamptz not null default now(),
  primary key (session_id, owner)
);

-- Lessons published from the Lesson Studio ------------------------------------
create table if not exists public.fw_lessons (
  id          uuid primary key,
  owner       text not null default public.fw_owner(),
  author_name text not null check (char_length(author_name) between 1 and 40),
  track       text not null check (track in ('beginner', 'amateur', 'advanced')),
  title       text not null check (char_length(title) between 4 and 90),
  summary     text not null default '' check (char_length(summary) <= 200),
  minutes     integer not null default 5 check (minutes between 1 and 60),
  body        jsonb not null default '[]'::jsonb,
  quiz        jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Row Level Security --------------------------------------------------
alter table public.fw_user_state enable row level security;
alter table public.fw_posts      enable row level security;
alter table public.fw_answers    enable row level security;
alter table public.fw_helpful    enable row level security;
alter table public.fw_bookings   enable row level security;
alter table public.fw_lessons    enable row level security;

do $$
declare t text;
begin
  -- drop old copies of our policies so the script can be re-run
  for t in select unnest(array['fw_user_state','fw_posts','fw_answers','fw_helpful','fw_bookings','fw_lessons']) loop
    execute format('drop policy if exists %I on public.%I', t || '_read', t);
    execute format('drop policy if exists %I on public.%I', t || '_insert', t);
    execute format('drop policy if exists %I on public.%I', t || '_update', t);
    execute format('drop policy if exists %I on public.%I', t || '_delete', t);
  end loop;
end $$;

-- private state: own rows only
create policy fw_user_state_read   on public.fw_user_state for select to anon, authenticated using (device_id = public.fw_device());
create policy fw_user_state_insert on public.fw_user_state for insert to anon, authenticated with check (public.fw_has_device() and device_id = public.fw_device());
create policy fw_user_state_update on public.fw_user_state for update to anon, authenticated using (device_id = public.fw_device()) with check (device_id = public.fw_device());
create policy fw_user_state_delete on public.fw_user_state for delete to anon, authenticated using (device_id = public.fw_device());

-- shared tables: everyone reads, devices write and delete only their own rows
create policy fw_posts_read     on public.fw_posts    for select to anon, authenticated using (true);
create policy fw_posts_insert   on public.fw_posts    for insert to anon, authenticated with check (public.fw_has_device() and owner = public.fw_owner());
create policy fw_posts_delete   on public.fw_posts    for delete to anon, authenticated using (owner = public.fw_owner());

create policy fw_answers_read   on public.fw_answers  for select to anon, authenticated using (true);
create policy fw_answers_insert on public.fw_answers  for insert to anon, authenticated with check (public.fw_has_device() and owner = public.fw_owner());
create policy fw_answers_delete on public.fw_answers  for delete to anon, authenticated using (owner = public.fw_owner());

create policy fw_helpful_read   on public.fw_helpful  for select to anon, authenticated using (true);
create policy fw_helpful_insert on public.fw_helpful  for insert to anon, authenticated with check (public.fw_has_device() and owner = public.fw_owner());
create policy fw_helpful_delete on public.fw_helpful  for delete to anon, authenticated using (owner = public.fw_owner());

create policy fw_bookings_read   on public.fw_bookings for select to anon, authenticated using (true);
create policy fw_bookings_insert on public.fw_bookings for insert to anon, authenticated with check (public.fw_has_device() and owner = public.fw_owner());
create policy fw_bookings_delete on public.fw_bookings for delete to anon, authenticated using (owner = public.fw_owner());

create policy fw_lessons_read   on public.fw_lessons  for select to anon, authenticated using (true);
create policy fw_lessons_insert on public.fw_lessons  for insert to anon, authenticated with check (public.fw_has_device() and owner = public.fw_owner());
create policy fw_lessons_update on public.fw_lessons  for update to anon, authenticated using (owner = public.fw_owner()) with check (owner = public.fw_owner());
create policy fw_lessons_delete on public.fw_lessons  for delete to anon, authenticated using (owner = public.fw_owner());

grant select, insert, update, delete on public.fw_user_state, public.fw_posts, public.fw_answers,
  public.fw_helpful, public.fw_bookings, public.fw_lessons to anon, authenticated;
grant execute on function public.fw_device(), public.fw_owner(), public.fw_has_device() to anon, authenticated;
