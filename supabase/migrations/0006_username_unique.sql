-- Tournament Arena — case-insensitive unique usernames + editable usernames
--
-- The base schema already had a case-sensitive UNIQUE on username, so "admin"
-- and "Admin" could both exist. We add a case-insensitive unique index so a
-- name is unique regardless of casing (only one "admin"). The signup trigger is
-- made collision-proof: if the requested name is taken, it appends a number, so
-- registration never fails on a duplicate — the user can rename later.
--
-- Run in the Supabase SQL editor (or via the Supabase CLI).
-- NOTE: if existing rows already differ only by case (e.g. "admin" & "Admin"),
-- resolve those duplicates before creating the index, or it will fail.

create unique index if not exists profiles_username_ci_key
  on public.profiles (lower(username));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  base      text;
  candidate text;
  n         int := 0;
begin
  base := coalesce(
    nullif(new.raw_user_meta_data ->> 'username', ''),
    split_part(new.email, '@', 1)
  );
  candidate := base;
  -- Ensure case-insensitive uniqueness by suffixing a counter on collision.
  while exists (
    select 1 from public.profiles where lower(username) = lower(candidate)
  ) loop
    n := n + 1;
    candidate := base || n::text;
  end loop;

  insert into public.profiles (id, username)
  values (new.id, candidate)
  on conflict (id) do nothing;
  return new;
end;
$$;
