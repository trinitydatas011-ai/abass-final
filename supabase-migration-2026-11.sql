-- ============================================================
-- ABASS — Event/Admin schema migration
-- Run in Supabase Dashboard -> SQL Editor. Safe to re-run.
-- Adds columns to the existing events table; it does not recreate it.
-- ============================================================

-- ------------------------------------------------------------
-- 1. EVENTS
--    Includes the fields written by assets/admin.js and read by the
--    public Events page. Existing columns and event data are preserved.
-- ------------------------------------------------------------
alter table public.events
  add column if not exists slug text,
  add column if not exists title_en text,
  add column if not exists title_ta text,
  add column if not exists header_subtitle text,
  add column if not exists display_structure text,
  add column if not exists description_en text,
  add column if not exists description_ta text,
  add column if not exists description_te text,
  add column if not exists description_kn text,
  add column if not exists description_visible boolean,
  add column if not exists is_recurring boolean not null default false,
  add column if not exists recurrence_rule text,
  add column if not exists start_date date,
  add column if not exists end_date date,
  add column if not exists date_display_en text,
  add column if not exists date_display_ta text,
  add column if not exists location_en text,
  add column if not exists location_ta text,
  add column if not exists location_te text,
  add column if not exists location_kn text,
  add column if not exists map_url text,
  add column if not exists details_en text,
  add column if not exists details_ta text,
  add column if not exists details_te text,
  add column if not exists details_kn text,
  add column if not exists title_te text,
  add column if not exists title_kn text,
  add column if not exists published boolean not null default true,
  add column if not exists display_order integer not null default 0,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update public.events
set display_structure = 'title-only'
where display_structure is null;

alter table public.events
  alter column display_structure set default 'title-only',
  alter column display_structure set not null;

update public.events
set description_visible = case when slug in ('padi', 'vilakku') then false else true end
where description_visible is null;

alter table public.events
  alter column description_visible set default true,
  alter column description_visible set not null;

-- Hide the two card descriptions without deleting their stored text.
update public.events
set description_visible = false
where slug in ('padi', 'vilakku');

-- Correction 10 — descriptions for the two yearly poojas.
-- Mini-format: "## Heading", "- bullet", blank line between paragraphs.
-- The wording below is exactly as supplied (including "Godess").
update public.events
set details_en = $d$Vilakku Pooja is a sacred Pooja performed for many God and Godess.

This sacred Ayyappan vilakku Pooja is performed as day long Pooja in the following manner:

- Maha Ganapathy Homam
- Ayyappan Laksharchanai
- Keli kottu
- Maha Annadhaanam
- Utchavar Procession
- Maha Deeparaadhanai
- Annadhaanam
- Special Thayambaka
- Udukku pattu, Ayyappan Jananam and Mangalam

## Special aspect
The very special aspect in this Pooja is the procession of the decorated Ayyappan ratham, holding a vilakku Thala thattu by malikappuram alongside the procession on the decorated illuminated streets.$d$
where slug = 'vilakku' and (details_en is null or details_en = '');

update public.events
set details_en = $d$Padi Pooja is a sacred ritual dedicated to Lord Ayyappa that centers around the worship of the Pathinettam Padi (the 18 divine steps) for lord Ayyappa.

## Significance of the 18 steps
- Steps 1–5 (Panchendriyas): Represent the five human senses (sight, hearing, smell, taste, and touch).
- Steps 6–13 (Ashtaragas): Represent the eight lower desires and vices (kama, krodha, lobha, moha, madha, matsarya, asuya, and dhumb).
- Steps 14–16 (Thrigunas): Represent the three fundamental qualities of nature (Sattva, Rajas, and Tamas).
- Steps 17–18 (Vidya and Avidya): Represent transcendent knowledge and the shedding of ignorance, bringing the devotee into the direct presence of Lord Ayyappa.$d$
where slug = 'padi' and (details_en is null or details_en = '');

-- ------------------------------------------------------------
-- 2. MEMBERS / TRUSTEES  (correction 08)
-- ------------------------------------------------------------
alter table public.members add column if not exists mobile_number text;

-- ------------------------------------------------------------
-- 3. PHOTO GALLERY — hard limit of 25 photos  (correction 05)
--    The Admin Panel also checks this, but the database enforces it
--    so the limit holds even if two admins upload at the same time.
--    Deleting a photo frees a slot.
-- ------------------------------------------------------------
create or replace function public.enforce_gallery_limit()
returns trigger
language plpgsql
as $$
begin
  perform pg_advisory_xact_lock(hashtext('abass_gallery_items_limit'));
  if (select count(*) from public.gallery_items) >= 25 then
    raise exception 'Photo Gallery is full: the maximum is 25 photos. Delete a photo before uploading another.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists gallery_items_limit on public.gallery_items;
create trigger gallery_items_limit
  before insert on public.gallery_items
  for each row execute function public.enforce_gallery_limit();

-- ------------------------------------------------------------
-- 4. LATEST UPDATES  (correction 09)
--    Rows are never removed automatically: the public panel lists every
--    published update, newest first, from the very first one onwards.
-- ------------------------------------------------------------
create table if not exists public.updates (
  id            uuid primary key default gen_random_uuid(),
  text_en       text not null,
  text_ta       text,
  text_te       text,
  text_kn       text,
  link_url      text,
  link_label_en text,
  published     boolean not null default true,
  published_at  timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists updates_published_at_idx on public.updates (published_at desc);

alter table public.updates enable row level security;

drop policy if exists "Public can view published updates" on public.updates;
create policy "Public can view published updates"
  on public.updates for select
  to anon, authenticated
  using (published = true or public.is_admin());

drop policy if exists "Admins can manage updates" on public.updates;
create policy "Admins can manage updates"
  on public.updates for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Refresh PostgREST's cached table schema so the new columns are immediately
-- available to the Supabase client.
notify pgrst, 'reload schema';
