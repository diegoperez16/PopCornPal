-- Top tens per media type, alongside the overall one.
--
-- Favourites gain a `list`: 'all' is the existing overall top ten, each media
-- type gets its own, and every year gets one too ('year-2026'). Every current
-- row becomes 'all', so the list people already built is untouched and keeps
-- behaving exactly as it does now.
--
-- The existing UNIQUE (user_id, media_entry_id) has to widen. It allowed a
-- title in one list only, so a film in your overall top ten could never also
-- appear in your movies top ten — which is the entire point of having both.
-- The replacement is per list, so a title can sit in 'all' and in 'movie', but
-- still cannot be added to the same list twice.
--
-- Run this in the Supabase SQL editor. Safe to run more than once.

alter table public.profile_favorites
  add column if not exists list text not null default 'all';

comment on column public.profile_favorites.list is
  'all | movie | show | game | book | year-YYYY. "all" is the overall top ten.';

alter table public.profile_favorites
  drop constraint if exists profile_favorites_list_check;
alter table public.profile_favorites
  add constraint profile_favorites_list_check
  check (
    list in ('all','movie','show','game','book')
    -- A top ten per year: year-2026, year-2027, and so on.
    or list ~ '^year-[0-9]{4}$'
  );

-- Widen the uniqueness to include the list.
alter table public.profile_favorites
  drop constraint if exists profile_favorites_user_id_media_entry_id_key;
alter table public.profile_favorites
  drop constraint if exists profile_favorites_user_id_list_media_entry_id_key;
alter table public.profile_favorites
  add constraint profile_favorites_user_id_list_media_entry_id_key
  unique (user_id, list, media_entry_id);

create index if not exists idx_profile_favorites_user_list
  on public.profile_favorites (user_id, list);

-- Verify: every row should be on a valid list, and 'all' should still hold
-- exactly what it held before.
select list, count(*) as entries
from public.profile_favorites
group by list
order by list;
