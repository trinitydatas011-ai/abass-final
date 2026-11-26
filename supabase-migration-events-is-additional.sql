-- Safe to run in Supabase SQL Editor for the project used by the Admin Portal.
-- Adds the missing event flag without recreating the table or changing event rows.
begin;

alter table public.events
  add column if not exists is_additional boolean not null default false;

-- Normalize only NULLs (if the column existed before this migration), then
-- enforce the default for future inserts and disallow ambiguous NULL values.
update public.events
set is_additional = false
where is_additional is null;

alter table public.events
  alter column is_additional set default false,
  alter column is_additional set not null;

-- Make the new column visible to Supabase's PostgREST API immediately.
notify pgrst, 'reload schema';

commit;
