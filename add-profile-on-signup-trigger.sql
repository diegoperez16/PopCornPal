-- Create a profile row whenever an account is created.
--
-- WHY THIS FILE EXISTS
-- The app never inserts into public.profiles itself. Sign-up passes the chosen
-- username as auth metadata (see signUp in src/store/authStore.ts) and relies
-- on a database trigger to turn that into a profile row. That trigger has only
-- ever existed in the live project, so rebuilding this database from the SQL in
-- this repo produced accounts that could sign in but had no profile — the app
-- then renders a blank profile with no obvious cause.
--
-- READ BEFORE RUNNING
-- This is a reconstruction from how the app uses the data, not an export of the
-- live trigger. Compare it against production first:
--
--   select t.tgname, p.proname
--   from pg_trigger t
--   join pg_proc p on p.oid = t.tgfoid
--   where t.tgrelid = 'auth.users'::regclass and not t.tgisinternal;
--
--   select prosrc from pg_proc where proname = 'handle_new_user';
--
-- If the live trigger has a different name, drop it after running this, or you
-- will have two triggers doing the same job. Duplicate inserts are harmless
-- (the insert is ON CONFLICT DO NOTHING) but two triggers is confusing.
--
-- Safe to run more than once.

-- =============================================================
-- 1. A username that always satisfies the profiles constraints
-- =============================================================
-- profiles.username is NOT NULL UNIQUE, 3-30 characters, and must match
-- ^[a-z0-9_]+$. A trigger that raises here would fail the whole sign-up, so
-- this normalises whatever it is given and always returns something valid:
-- unusable input becomes user_<short id>, and collisions get a numeric suffix.
create or replace function public.pp_available_username(
  desired text,
  user_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  base text;
  candidate text;
  suffix int := 0;
begin
  base := lower(trim(coalesce(desired, '')));
  base := regexp_replace(base, '[^a-z0-9_]', '', 'g');

  if char_length(base) < 3 then
    base := 'user_' || substr(replace(user_id::text, '-', ''), 1, 12);
  end if;

  base := substr(base, 1, 30);
  candidate := base;

  -- Bounded: the id-derived fallback below is effectively unique anyway.
  while suffix < 50
    and exists (select 1 from public.profiles where username = candidate)
  loop
    suffix := suffix + 1;
    candidate :=
      substr(base, 1, 29 - char_length(suffix::text)) || '_' || suffix::text;
  end loop;

  if exists (select 1 from public.profiles where username = candidate) then
    candidate := 'user_' || substr(replace(user_id::text, '-', ''), 1, 20);
  end if;

  return candidate;
end;
$$;

-- =============================================================
-- 2. The trigger function
-- =============================================================
-- SECURITY DEFINER so it can write past the row level security policies on
-- profiles; the row belongs to a user who does not have a session yet.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    public.pp_available_username(
      new.raw_user_meta_data ->> 'username',
      new.id
    )
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- =============================================================
-- 3. The trigger
-- =============================================================
-- Fires on insert, not on confirmation: Supabase creates the auth.users row
-- as soon as someone signs up, while the confirmation email is still pending.
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Warn if some other trigger is still doing the same job.
do $$
declare
  other text;
begin
  select string_agg(t.tgname, ', ')
    into other
  from pg_trigger t
  where t.tgrelid = 'auth.users'::regclass
    and not t.tgisinternal
    and t.tgname <> 'on_auth_user_created';

  if other is not null then
    raise notice 'Other triggers on auth.users: %. Check whether any of them also creates profiles, and drop it if so.', other;
  end if;
end $$;

-- =============================================================
-- 4. Backfill any account that never got a profile
-- =============================================================
-- Covers accounts created while the trigger was missing, and any created from
-- the Supabase dashboard, which does not pass a username.
do $$
declare
  account record;
begin
  for account in
    select u.id, u.raw_user_meta_data ->> 'username' as username
    from auth.users u
    left join public.profiles p on p.id = u.id
    where p.id is null
  loop
    insert into public.profiles (id, username)
    values (
      account.id,
      public.pp_available_username(account.username, account.id)
    )
    on conflict (id) do nothing;
  end loop;
end $$;

-- =============================================================
-- 5. Verify
-- =============================================================
-- Expect 0. Anything else means an account still has no profile.
select count(*) as accounts_without_a_profile
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;
