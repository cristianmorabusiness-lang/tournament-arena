-- Tournament Arena — favorite national team for user identity
--
-- The favorite team is an identity/cosmetic choice (a flag shown next to the
-- user in standings and member lists) and is intentionally decoupled from the
-- `teams` table, which only holds the qualified teams used for match
-- predictions. We store the country code (ISO 3166-1 alpha-2, or a custom key
-- such as 'GB-ENG' for UK home nations) defined in lib/nationalTeams.ts.
--
-- Run in the Supabase SQL editor (or via the Supabase CLI).

alter table public.profiles
  add column if not exists favorite_country text;

-- favorite_team_id is left in place for backwards compatibility but is no longer
-- written by the app; the onboarding gate now uses favorite_country.
