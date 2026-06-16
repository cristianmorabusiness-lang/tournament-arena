-- Tournament Arena — rank tracking for position-change indicators
--
-- The scoring job now records each player's rank and their rank from the
-- previous scoring run, both globally and per league. The UI shows a green
-- "+N" when a player climbed and a red "-N" when they dropped since the last
-- score sync. Delta = previous_rank - rank (a smaller rank number is better).
--
-- Run in the Supabase SQL editor (or via the Supabase CLI).

-- Global leaderboard: current rank + rank at the previous scoring run.
alter table public.global_scores
  add column if not exists rank int,
  add column if not exists previous_rank int;

-- Per-league aggregated standings with rank history.
create table if not exists public.league_standings (
  league_id     uuid not null references public.leagues(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  total_points  int not null default 0,
  rank          int,
  previous_rank int,
  updated_at    timestamptz not null default now(),
  primary key (league_id, user_id)
);

alter table public.league_standings enable row level security;

-- Approved members of a league can read its standings (same visibility rule as
-- the rest of the league data). Writes happen only via the service-role scoring
-- job, which bypasses RLS, so no insert/update policy is needed.
drop policy if exists "league standings readable by members" on public.league_standings;
create policy "league standings readable by members" on public.league_standings
  for select to authenticated
  using (public.is_league_member(league_id));
