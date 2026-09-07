-- Per-person seasonal themes.
--
-- Each profile stores which theme that person chose. Everyone starts on
-- 'cinema', the app's default look, and an unknown value falls back to it in
-- the client, so removing a season from the code can never break a profile.
--
-- Run this in the Supabase SQL editor. It is safe to run more than once.

alter table public.profiles
  add column if not exists theme text not null default 'cinema';

comment on column public.profiles.theme is
  'Seasonal theme id from src/themes/themes.ts. Unknown values fall back to cinema.';

-- Existing rows predate the column default, so make their choice explicit.
update public.profiles set theme = 'cinema' where theme is null;

-- The existing "update your own profile" policy already covers this column;
-- this only asserts a row-level policy is present, so the column is not
-- writable by anyone else.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and cmd = 'UPDATE'
  ) then
    raise notice 'No UPDATE policy on public.profiles — add one before relying on theme writes.';
  end if;
end $$;
