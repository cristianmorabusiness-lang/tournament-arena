-- Tournament Arena — Web Push subscriptions
--
-- Stores one row per browser/device a user has opted in from. The daily
-- reminder cron (/api/notify) reads these with the service role and sends a
-- push when the user still has predictions to set for today. Users manage only
-- their own rows from the client.
--
-- Run in the Supabase SQL editor (or via the Supabase CLI).

create table if not exists public.push_subscriptions (
  endpoint   text primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push read own" on public.push_subscriptions;
create policy "push read own" on public.push_subscriptions
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "push insert own" on public.push_subscriptions;
create policy "push insert own" on public.push_subscriptions
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "push delete own" on public.push_subscriptions;
create policy "push delete own" on public.push_subscriptions
  for delete to authenticated
  using (user_id = auth.uid());
