-- The Dumpster verdict.
--
-- Some things are not a zero out of ten. Zero is still a measurement; a
-- Dumpster refuses to give one. It is therefore its own flag rather than a
-- rating value, so it can never be averaged in and quietly turned back into a
-- number — see src/features/verdict/verdictModel.ts.
--
-- Run this in the Supabase SQL editor. Safe to run more than once.

alter table public.media_entries
  add column if not exists dumpstered boolean not null default false;

comment on column public.media_entries.dumpstered is
  'Marked too bad to rate. Excluded from rating averages and reported separately.';

-- A dumpstered entry carries no rating: the point of the flag is the refusal.
update public.media_entries
   set rating = null
 where dumpstered and rating is not null;

-- Finding what a circle thought about one title reads every friend's entry for
-- it, so keep that lookup indexed.
create index if not exists idx_media_entries_title_type
  on public.media_entries (media_type, lower(title));

-- Verify: expect 0 rows.
select count(*) as dumpstered_entries_still_holding_a_rating
from public.media_entries
where dumpstered and rating is not null;
