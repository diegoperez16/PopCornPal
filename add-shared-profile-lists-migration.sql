-- Named top tens, and the shared profile link that shows them off.
--
-- Two things arrive together here:
--
--   1. Lists you name yourself — "Favourite Spider-Man movies" — alongside the
--      fixed ones (overall, per media type, per year). A named list is stored
--      as `list-<slug>` in profile_favorites; its display name lives in the new
--      profile_favorite_lists table, because a slug is not a title and people
--      rename things.
--
--   2. A profile link anyone can open. Nothing needs to change for that on the
--      tables that already exist — profiles, profile_favorites, media_entries
--      and user_badges all select with USING (true) already — but the new table
--      has to be readable the same way, or a shared link would show the shelves
--      with no names on them.
--
-- Run this in the Supabase SQL editor. Safe to run more than once.

create table if not exists public.profile_favorite_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  -- Matches the value stored in profile_favorites.list.
  slug text not null,
  title text not null,
  -- Where the tab sits in the row, so a list can be moved without renaming it.
  position integer not null default 0,
  created_at timestamptz not null default now(),
  constraint profile_favorite_lists_slug_format
    check (slug ~ '^list-[a-z0-9][a-z0-9-]{0,38}$'),
  constraint profile_favorite_lists_title_length
    check (char_length(btrim(title)) between 1 and 40)
);

-- One slug per person; two people may both have a "spider-man" list.
create unique index if not exists idx_profile_favorite_lists_user_slug
  on public.profile_favorite_lists (user_id, slug);
create index if not exists idx_profile_favorite_lists_user_position
  on public.profile_favorite_lists (user_id, position);

alter table public.profile_favorite_lists enable row level security;

-- Readable by everyone, exactly like profiles and favourites: a link someone
-- pastes into a group chat has to open for a reader with no account.
drop policy if exists "Favorite lists are viewable by everyone"
  on public.profile_favorite_lists;
create policy "Favorite lists are viewable by everyone"
  on public.profile_favorite_lists for select
  using (true);

drop policy if exists "Users can insert their own favorite lists"
  on public.profile_favorite_lists;
create policy "Users can insert their own favorite lists"
  on public.profile_favorite_lists for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own favorite lists"
  on public.profile_favorite_lists;
create policy "Users can update their own favorite lists"
  on public.profile_favorite_lists for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete their own favorite lists"
  on public.profile_favorite_lists;
create policy "Users can delete their own favorite lists"
  on public.profile_favorite_lists for delete
  using (auth.uid() = user_id);

-- Let profile_favorites hold a named list alongside the fixed ones. The old
-- constraint allowed only the built-ins, so an insert into 'list-spider-man'
-- would be rejected outright.
alter table public.profile_favorites
  drop constraint if exists profile_favorites_list_check;
alter table public.profile_favorites
  add constraint profile_favorites_list_check
  check (
    list in ('all','movie','show','game','book')
    or list ~ '^year-[0-9]{4}$'
    -- A list someone named: 'list-favourite-spider-man-movies'.
    or list ~ '^list-[a-z0-9][a-z0-9-]{0,38}$'
  );

comment on column public.profile_favorites.list is
  'all | movie | show | game | book | year-YYYY | list-<slug>. "all" is the overall top ten.';

-- Verify: the named lists, and how full each one is.
select l.slug, l.title, count(f.id) as entries
from public.profile_favorite_lists l
left join public.profile_favorites f
  on f.user_id = l.user_id and f.list = l.slug
group by l.slug, l.title
order by l.slug;
