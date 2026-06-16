-- Tournament Arena — per-match prediction lock
--
-- Previously a prediction locked for the whole UTC day as soon as the FIRST
-- match of that day kicked off. We now lock each match independently: a
-- prediction can be set or edited until 5 minutes before that match's own
-- kickoff. The RLS policies on `predictions` already call this function, so
-- only its body changes here.
--
-- Run in the Supabase SQL editor (or via the Supabase CLI).

create or replace function public.is_prediction_locked(p_match_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (
      select now() >= m.kickoff_at - interval '5 minutes'
      from public.matches m
      where m.id = p_match_id
    ),
    false
  );
$$;
