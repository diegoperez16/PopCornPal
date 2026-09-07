-- Your Hogwarts house.
--
-- Null means unsorted: the app reads the shelf and proposes one, but a chosen
-- house always wins (see src/features/house/houseModel.ts). Storing the chosen
-- value rather than recomputing it means a house never changes underneath
-- someone just because they logged a few more films.
--
-- Run this in the Supabase SQL editor. Safe to run more than once.

alter table public.profiles
  add column if not exists house text;

comment on column public.profiles.house is
  'gryffindor | ravenclaw | hufflepuff | slytherin. Null means not sorted yet.';

-- Anything unrecognised is treated as unsorted by the client, but keep the
-- column honest so a typo cannot quietly persist.
alter table public.profiles
  drop constraint if exists profiles_house_check;
alter table public.profiles
  add constraint profiles_house_check
  check (house is null or house in ('gryffindor','ravenclaw','hufflepuff','slytherin'));

select count(*) as profiles_with_a_house from public.profiles where house is not null;
