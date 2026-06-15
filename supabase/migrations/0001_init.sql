-- Tournament Arena — initial schema + Row Level Security
-- Run in the Supabase SQL editor (or via the Supabase CLI).
--
-- Timezone note: "giornata"/match-day lock is computed on the UTC calendar date
-- of each match's kickoff. If a different tournament timezone is required, adjust
-- the date() expressions in is_prediction_locked() and the daily scoring job. [da verificare]

-- Needed for gen_random_uuid()
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- National teams (only qualified ones, synced from the football API)
create table if not exists public.teams (
  id          uuid primary key default gen_random_uuid(),
  external_id text unique not null,
  name        text not null,
  code        text,
  flag_url    text,
  group_label text,
  created_at  timestamptz not null default now()
);

-- Squad players (synced from the football API; for current/future features)
create table if not exists public.players (
  id           uuid primary key default gen_random_uuid(),
  external_id  text unique not null,
  team_id      uuid references public.teams(id) on delete cascade,
  name         text not null,
  position     text,
  shirt_number int,
  created_at   timestamptz not null default now()
);

-- User profiles (1:1 with auth.users)
create table if not exists public.profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  username         text unique not null,
  favorite_team_id uuid references public.teams(id) on delete set null,
  created_at       timestamptz not null default now()
);

-- World Cup matches (calendar, kickoff, scores) — synced from the football API
create table if not exists public.matches (
  id           uuid primary key default gen_random_uuid(),
  external_id  text unique not null,
  home_team_id uuid references public.teams(id),
  away_team_id uuid references public.teams(id),
  kickoff_at   timestamptz not null,
  matchday     text,
  status       text not null default 'SCHEDULED', -- SCHEDULED | IN_PLAY | FINISHED ...
  home_score   int,
  away_score   int,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists matches_kickoff_idx on public.matches (kickoff_at);

-- Leagues
create table if not exists public.leagues (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  join_code  text unique not null,
  admin_id   uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- League membership with approval workflow
create table if not exists public.league_members (
  id         uuid primary key default gen_random_uuid(),
  league_id  uuid not null references public.leagues(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  role       text not null default 'member' check (role in ('admin', 'member')),
  status     text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  unique (league_id, user_id)
);
create index if not exists league_members_user_idx on public.league_members (user_id);

-- Exact-score predictions (one per user per match; league-independent)
create table if not exists public.predictions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  match_id   uuid not null references public.matches(id) on delete cascade,
  pred_home  int not null check (pred_home >= 0),
  pred_away  int not null check (pred_away >= 0),
  points     int, -- null until the match is scored
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, match_id)
);

-- Per-league per-day scores (idempotent via unique key)
create table if not exists public.daily_scores (
  id           uuid primary key default gen_random_uuid(),
  league_id    uuid not null references public.leagues(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  match_date   date not null,
  base_points  int not null default 0,
  bonus_points int not null default 0,
  total_points int not null default 0,
  updated_at   timestamptz not null default now(),
  unique (league_id, user_id, match_date)
);

-- Global leaderboard (all registered players; pure prediction points)
create table if not exists public.global_scores (
  user_id      uuid primary key references public.profiles(id) on delete cascade,
  total_points int not null default 0,
  updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER to avoid RLS recursion on league_members)
-- ---------------------------------------------------------------------------

create or replace function public.is_league_member(p_league_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.league_members m
    where m.league_id = p_league_id
      and m.user_id = auth.uid()
      and m.status = 'approved'
  );
$$;

create or replace function public.is_league_admin(p_league_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.leagues l
    where l.id = p_league_id
      and l.admin_id = auth.uid()
  );
$$;

-- True if the current user shares an approved league with the given user.
create or replace function public.shares_approved_league(p_other_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.league_members me
    join public.league_members them on them.league_id = me.league_id
    where me.user_id = auth.uid() and me.status = 'approved'
      and them.user_id = p_other_user and them.status = 'approved'
  );
$$;

-- A prediction is locked once the FIRST match of its kickoff day has started.
create or replace function public.is_prediction_locked(p_match_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (
      select now() >= min(m2.kickoff_at)
      from public.matches m1
      join public.matches m2 on (m2.kickoff_at at time zone 'UTC')::date
                              = (m1.kickoff_at at time zone 'UTC')::date
      where m1.id = p_match_id
    ),
    false
  );
$$;

-- ---------------------------------------------------------------------------
-- RPCs (atomic create/join controlling role & status safely)
-- ---------------------------------------------------------------------------

create or replace function public.create_league(p_name text)
returns public.leagues
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_code   text;
  v_league public.leagues;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  -- generate a unique short join code
  loop
    v_code := upper(substring(md5(gen_random_uuid()::text) from 1 for 6));
    exit when not exists (select 1 from public.leagues where join_code = v_code);
  end loop;

  insert into public.leagues (name, join_code, admin_id)
  values (p_name, v_code, auth.uid())
  returning * into v_league;

  insert into public.league_members (league_id, user_id, role, status)
  values (v_league.id, auth.uid(), 'admin', 'approved');

  return v_league;
end;
$$;

create or replace function public.request_to_join_league(p_code text)
returns public.league_members
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_league_id uuid;
  v_member    public.league_members;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select id into v_league_id
  from public.leagues
  where join_code = upper(p_code);

  if v_league_id is null then
    raise exception 'League not found for code %', p_code;
  end if;

  insert into public.league_members (league_id, user_id, role, status)
  values (v_league_id, auth.uid(), 'member', 'pending')
  on conflict (league_id, user_id) do update set league_id = excluded.league_id
  returning * into v_member;

  return v_member;
end;
$$;

-- ---------------------------------------------------------------------------
-- New-user trigger: auto-create a profile
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'username', ''),
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Enable Row Level Security
-- ---------------------------------------------------------------------------

alter table public.teams          enable row level security;
alter table public.players        enable row level security;
alter table public.profiles       enable row level security;
alter table public.matches        enable row level security;
alter table public.leagues        enable row level security;
alter table public.league_members enable row level security;
alter table public.predictions    enable row level security;
alter table public.daily_scores   enable row level security;
alter table public.global_scores  enable row level security;

-- Reference data: readable by any authenticated user; writes via service role only.
create policy "teams readable" on public.teams
  for select to authenticated using (true);
create policy "players readable" on public.players
  for select to authenticated using (true);
create policy "matches readable" on public.matches
  for select to authenticated using (true);

-- Profiles: readable by authenticated users (usernames in leaderboards);
-- each user manages only their own row.
create policy "profiles readable" on public.profiles
  for select to authenticated using (true);
create policy "profiles insert own" on public.profiles
  for insert to authenticated with check (id = auth.uid());
create policy "profiles update own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Leagues: visible to admin and approved members.
create policy "leagues visible to members" on public.leagues
  for select to authenticated
  using (admin_id = auth.uid() or public.is_league_member(id));

-- League members: visible to fellow approved members and the league admin;
-- a user can always see their own (e.g. pending) row.
create policy "league_members visible" on public.league_members
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_league_member(league_id)
    or public.is_league_admin(league_id)
  );
-- Self-service join requests only (admin/approved rows are set via RPC/admin).
create policy "league_members self request" on public.league_members
  for insert to authenticated
  with check (user_id = auth.uid() and role = 'member' and status = 'pending');
-- Admin approves/rejects; user may update (e.g. leave) their own row.
create policy "league_members admin update" on public.league_members
  for update to authenticated
  using (public.is_league_admin(league_id) or user_id = auth.uid())
  with check (public.is_league_admin(league_id) or user_id = auth.uid());
create policy "league_members delete" on public.league_members
  for delete to authenticated
  using (public.is_league_admin(league_id) or user_id = auth.uid());

-- Predictions: own rows are private until lock; after lock, fellow approved
-- league members can read them. Writes allowed only before lock.
create policy "predictions select own or shared-after-lock" on public.predictions
  for select to authenticated
  using (
    user_id = auth.uid()
    or (public.is_prediction_locked(match_id) and public.shares_approved_league(user_id))
  );
create policy "predictions insert own before lock" on public.predictions
  for insert to authenticated
  with check (user_id = auth.uid() and not public.is_prediction_locked(match_id));
create policy "predictions update own before lock" on public.predictions
  for update to authenticated
  using (user_id = auth.uid() and not public.is_prediction_locked(match_id))
  with check (user_id = auth.uid() and not public.is_prediction_locked(match_id));
create policy "predictions delete own before lock" on public.predictions
  for delete to authenticated
  using (user_id = auth.uid() and not public.is_prediction_locked(match_id));

-- Daily scores: readable by approved members of the league. Writes via service role.
create policy "daily_scores visible to members" on public.daily_scores
  for select to authenticated
  using (public.is_league_member(league_id));

-- Global leaderboard: readable by any authenticated user. Writes via service role.
create policy "global_scores readable" on public.global_scores
  for select to authenticated using (true);
