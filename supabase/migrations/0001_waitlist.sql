-- ============================================================================
-- Share a Bike waitlist · database setup
-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run
-- ============================================================================

-- 1. The waitlist table ------------------------------------------------------
-- Only the data we really need. No IP addresses, no tracking.
create table if not exists public.waitlist (
  id                    uuid primary key default gen_random_uuid(),
  created_at            timestamptz not null default now(),
  name                  text not null check (char_length(name) between 1 and 80),
  email                 text not null unique check (char_length(email) between 6 and 120),
  class_year            text not null check (char_length(class_year) between 1 and 20),
  role                  text not null check (role in ('ride', 'lend', 'both')),
  bike_type             text check (bike_type in ('city', 'trekking', 'mountain', 'road', 'other')),
  age_confirmed         boolean not null check (age_confirmed),
  privacy_accepted_at   timestamptz not null,
  -- double opt-in: we store only a SHA-256 hash of the emailed token
  confirm_token_hash    text,
  confirmation_sent_at  timestamptz,
  confirmed_at          timestamptz,
  -- owners must tell us their bike type
  constraint bike_type_for_owners check (role = 'ride' or bike_type is not null)
);

-- 2. Lock it down --------------------------------------------------------------
-- Row Level Security ON and NO policies = nobody can read or write the table
-- with the public anon key. Only the Edge Function (service role) can.
alter table public.waitlist enable row level security;
revoke all on public.waitlist from anon, authenticated;

-- 3. Public counter (confirmed sign ups only) ------------------------------------
create or replace function public.waitlist_stats()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'total',  count(*),
    'riders', count(*) filter (where role in ('ride', 'both')),
    'owners', count(*) filter (where role in ('lend', 'both'))
  )
  from public.waitlist
  where confirmed_at is not null;
$$;
revoke all on function public.waitlist_stats() from public, anon, authenticated;
grant execute on function public.waitlist_stats() to service_role;

-- 4. Export view: what you download as CSV -------------------------------------
create or replace view public.waitlist_export
with (security_invoker = true) as
  select name, email, class_year, role, bike_type, created_at, confirmed_at
  from public.waitlist
  where confirmed_at is not null
  order by confirmed_at;
revoke all on public.waitlist_export from anon, authenticated;

-- 5. OPTIONAL: delete unconfirmed sign ups after 7 days ---------------------------
-- Enable the "pg_cron" extension first (Dashboard -> Database -> Extensions),
-- then run these two lines:
--
-- select cron.schedule('waitlist-cleanup', '0 3 * * *',
--   $$ delete from public.waitlist where confirmed_at is null and created_at < now() - interval '7 days' $$);
