-- ============================================================================
-- Share a Bike waitlist · optional parent email (for riders under 18)
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.
-- Run this BEFORE deploying the updated waitlist function.
-- ============================================================================
alter table public.waitlist
  add column if not exists parent_email text
  check (parent_email is null or char_length(parent_email) between 6 and 120);

-- the export list now includes it (added as the last column)
create or replace view public.waitlist_export
with (security_invoker = true) as
  select name, email, class_year, role, bike_type, created_at, confirmed_at, parent_email
  from public.waitlist
  where confirmed_at is not null
  order by confirmed_at;
revoke all on public.waitlist_export from anon, authenticated;
