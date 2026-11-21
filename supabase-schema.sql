-- ============================================================
-- ABASS (Abhath Bhanthavan Ayyappa Seva Sangham)
-- Complete Supabase Schema, RLS Policies, Storage, and Seed Data
-- ============================================================

-- 1. Enable required extensions
create extension if not exists "pgcrypto";

-- ============================================================
-- 2. CREATE TABLES
-- ============================================================

-- A. ADMIN USERS TABLE (Authorization)
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

-- B. EVENTS TABLE
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title_en text not null,
  title_ta text not null,
  description_en text,
  description_ta text,
  header_subtitle text,
  display_structure text,
  description_visible boolean,
  start_date date,
  end_date date,
  date_display_en text,
  date_display_ta text,
  location_en text,
  location_ta text,
  is_recurring boolean not null default false,
  recurrence_rule text,
  published boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.events add column if not exists header_subtitle text;
alter table public.events add column if not exists display_structure text;
alter table public.events add column if not exists description_visible boolean;

-- C. GALLERY ITEMS TABLE
create table if not exists public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  title_en text not null,
  title_ta text not null,
  description_en text,
  description_ta text,
  category text not null,
  badge_en text,
  badge_ta text,
  image_path text,
  image_url text not null,
  published boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- D. MEMBERS (TRUSTEES & COMMITTEE) TABLE
create table if not exists public.members (
  id text primary key default gen_random_uuid()::text,
  name_en text not null,
  name_ta text,
  role_en text,
  role_ta text,
  group_type text not null check (group_type in ('apex', 'present')),
  category text,
  initials text not null default '',
  featured boolean not null default false,
  active boolean not null default true,
  display_order integer not null default 0,
  family_members text,
  gothram text,
  nakshatram_star text,
  rasi text,
  photo_url text,
  photo_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.members add column if not exists category text;
alter table public.members add column if not exists photo_path text;
alter table public.members alter column id set default gen_random_uuid()::text;
alter table public.members alter column role_en drop not null;
alter table public.members alter column initials set default '';
alter table public.members alter column group_type set default 'present';

-- Remove the preloaded member records; future member records come from the Admin Panel.
delete from public.members where category is null;

alter table public.members alter column category set not null;
alter table public.members drop constraint if exists members_category_check;
alter table public.members
  add constraint members_category_check
  check (category in ('office-bearers', 'life-member', 'member', 'apex-committee', 'core-committee'));

-- ============================================================
-- 3. HELPER FUNCTION & ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Function to check if the authenticated user is an authorized admin
-- (security definer avoids recursive RLS lookups)
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = auth.uid()
  );
$$;

-- Enable RLS on all tables
alter table public.admin_users enable row level security;
alter table public.events enable row level security;
alter table public.gallery_items enable row level security;
alter table public.members enable row level security;

-- Admin Users Policies
drop policy if exists "Admin users can view admins" on public.admin_users;
create policy "Admin users can view admins"
  on public.admin_users for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Only superadmin can manage admin_users" on public.admin_users;
create policy "Only superadmin can manage admin_users"
  on public.admin_users for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Events Policies
drop policy if exists "Public can view published events" on public.events;
create policy "Public can view published events"
  on public.events for select
  to anon, authenticated
  using (published = true or public.is_admin());

drop policy if exists "Admins can manage events" on public.events;
create policy "Admins can manage events"
  on public.events for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Gallery Policies
drop policy if exists "Public can view published gallery" on public.gallery_items;
create policy "Public can view published gallery"
  on public.gallery_items for select
  to anon, authenticated
  using (published = true or public.is_admin());

drop policy if exists "Admins can manage gallery" on public.gallery_items;
create policy "Admins can manage gallery"
  on public.gallery_items for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Members Policies
drop policy if exists "Public can view active members" on public.members;
create policy "Public can view active members"
  on public.members for select
  to anon, authenticated
  using (active = true or public.is_admin());

drop policy if exists "Admins can manage members" on public.members;
create policy "Admins can manage members"
  on public.members for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
-- 4. STORAGE BUCKET: gallery
-- ============================================================
insert into storage.buckets (id, name, public)
values ('gallery', 'gallery', true)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('member-photos', 'member-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = true,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Storage policies
drop policy if exists "Public can read gallery bucket" on storage.objects;
create policy "Public can read gallery bucket"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'gallery');

drop policy if exists "Admins can upload to gallery bucket" on storage.objects;
create policy "Admins can upload to gallery bucket"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'gallery' and public.is_admin());

drop policy if exists "Admins can update gallery bucket" on storage.objects;
create policy "Admins can update gallery bucket"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'gallery' and public.is_admin());

drop policy if exists "Admins can delete from gallery bucket" on storage.objects;
create policy "Admins can delete from gallery bucket"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'gallery' and public.is_admin());

drop policy if exists "Public can read member photos" on storage.objects;
create policy "Public can read member photos"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'member-photos');

drop policy if exists "Admins can upload member photos" on storage.objects;
create policy "Admins can upload member photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'member-photos' and public.is_admin());

drop policy if exists "Admins can update member photos" on storage.objects;
create policy "Admins can update member photos"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'member-photos' and public.is_admin())
  with check (bucket_id = 'member-photos' and public.is_admin());

drop policy if exists "Admins can delete member photos" on storage.objects;
create policy "Admins can delete member photos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'member-photos' and public.is_admin());

-- ============================================================
-- 5. SEED DATA MIGRATION
-- ============================================================

-- Seed Events (4 existing events)
insert into public.events (slug, title_en, title_ta, description_en, description_ta, start_date, end_date, date_display_en, date_display_ta, location_en, location_ta, is_recurring, recurrence_rule, published, display_order)
values ('annadhaanam', 'Monthly Annadhaanam', 'மாதாந்திர அன்னதானம்', 'Free meal offering for a minimum of 250 persons, held every Second Saturday of the month.', 'ஒவ்வொரு மாத இரண்டாவது சனிக்கிழமையும் குறைந்தது 250 பேருக்கு இலவச அன்னதானம்.', NULL, NULL, 'Every 2nd Saturday', 'ஒவ்வொரு மாத 2வது சனி', 'Pallavaram, Chennai', 'பல்லாவரம், சென்னை', true, 'Every 2nd Saturday', true, 1)
on conflict (slug) do nothing;

insert into public.events (slug, title_en, title_ta, description_en, description_ta, start_date, end_date, date_display_en, date_display_ta, location_en, location_ta, is_recurring, recurrence_rule, published, display_order)
values ('kumbabhishekam', 'Pallavaram Bharathi Nagar Pillayar Koil Kumbabhishekam Annadhaanam', 'பல்லாவரம் பாரதி நகர் பிள்ளையார் கோவில் கும்பாபிஷேகம் அன்னதானம்', 'Annadhaanam in connection with the Kumbabhishekam at Bharathi Nagar Pillayar Koil, Pallavaram, from 27th to 30th October 2026.', '27 முதல் 30 அக்டோபர் 2026 வரை பல்லாவரம் பாரதி நகர் பிள்ளையார் கோவில் கும்பாபிஷேகத்தின் போது அன்னதானம்.', '2026-10-27', '2026-10-30', '27–30 Oct 2026', '27–30 அக் 2026', 'Pallavaram, Chennai', 'பல்லாவரம், சென்னை', false, NULL, true, 2)
on conflict (slug) do nothing;

insert into public.events (slug, title_en, title_ta, description_en, description_ta, start_date, end_date, date_display_en, date_display_ta, location_en, location_ta, is_recurring, recurrence_rule, published, display_order)
values ('padi', 'YEARLY PADI POOJA', 'ஆண்டு படி பூஜை', 'Annual 18 Padi Pooja observed on 12th December 2026.', '12 டிசம்பர் 2026 அன்று ஆண்டு 18 படி பூஜை நடைபெறும்.', '2026-12-12', '2026-12-12', '12 Dec 2026', '12 டிச 2026', 'Zamin Pallavaram, Chennai', 'ஜமீன் பல்லாவரம், சென்னை', false, NULL, true, 3)
on conflict (slug) do nothing;

insert into public.events (slug, title_en, title_ta, description_en, description_ta, start_date, end_date, date_display_en, date_display_ta, location_en, location_ta, is_recurring, recurrence_rule, published, display_order)
values ('vilakku', 'YEARLY VILAKKU POOJA', 'ஆண்டு விளக்கு பூஜை', 'Annual Thiru Vilakku Pooja observed on 19th December 2026.', '19 டிசம்பர் 2026 அன்று ஆண்டு திருவிளக்கு பூஜை நடைபெறும்.', '2026-12-19', '2026-12-19', '19 Dec 2026', '19 டிச 2026', 'Zamin Pallavaram, Chennai', 'ஜமீன் பல்லாவரம், சென்னை', false, NULL, true, 4)
on conflict (slug) do nothing;

update public.events
set title_en = 'EVERY MONTH ANNADHAANAM',
    header_subtitle = '2ND SAT',
    display_structure = 'subtitle-above-title',
    description_visible = true
where slug = 'annadhaanam' and title_en = 'Monthly Annadhaanam';

update public.events
set title_en = 'YEARLY PADI POOJA'
where slug = 'padi' and title_en = 'Yearly Padi Pooja';

update public.events
set title_en = 'YEARLY VILAKKU POOJA'
where slug = 'vilakku' and title_en = 'Yearly Vilakku Pooja';

update public.events
set display_structure = 'title-only'
where display_structure is null;

update public.events
set description_visible = case when slug in ('padi', 'vilakku') then false else true end
where description_visible is null;

alter table public.events alter column display_structure set default 'title-only';
alter table public.events alter column display_structure set not null;
alter table public.events alter column description_visible set default true;
alter table public.events alter column description_visible set not null;

-- Seed Gallery Items (16 existing photos)
insert into public.gallery_items (title_en, title_ta, description_en, description_ta, category, badge_en, badge_ta, image_path, image_url, published, display_order)
values ('Grand 18 Padi Altar & Deepam Row', 'புனித 18 படிகள் பீடம் & தீப வரிசை', 'Sacred 18 Padi Pooja altar adorned with glowing brass deepams, flowers and revered Guruswamys in prayer.', 'ஒளிரும் பித்தளை தீபங்கள், மலர்கள் மற்றும் பிரார்த்தனையில் இருக்கும் குருசுவாமிகளால் அலங்கரிக்கப்பட்ட புனித 18 படி பூஜை பீடம்.', 'padi-pooja', '18 Padi Pooja', '18 படி பூஜை', NULL, 'assets/images/gallery-1.jpg', true, 1);
insert into public.gallery_items (title_en, title_ta, description_en, description_ta, category, badge_en, badge_ta, image_path, image_url, published, display_order)
values ('Sri Dharma Sastha Sanctum Sanctorum', 'ஸ்ரீ தர்ம சாஸ்தா கருவறை & 18 படிகள்', 'Majestic view of Sri Ayyappa Swami sanctum with 18 golden sacred steps and ornate floral decoration.', '18 பொற்படிகள் மற்றும் அலங்கரிக்கப்பட்ட மலர் அலங்காரத்துடன் கூடிய ஸ்ரீ ஐயப்ப சுவாமி கருவறையின் கம்பீரமான காட்சி.', 'padi-pooja', '18 Padi Pooja', '18 படி பூஜை', NULL, 'assets/images/gallery-2.jpg', true, 2);
insert into public.gallery_items (title_en, title_ta, description_en, description_ta, category, badge_en, badge_ta, image_path, image_url, published, display_order)
values ('Traditional Thiru Vilakku Pooja', 'மங்களகரமான திருவிளக்கு பூஜை', 'Women devotees participating in sacred Vilakku Pooja with lighted lamps, chanting Lalitha Sahasranamam.', 'லலிதா சஹஸ்ரநாமம் பாராயணம் செய்து நெய் தீபங்கள் ஏற்றி விளக்கு பூஜையில் பங்கேற்கும் பெண் பக்தர்கள்.', 'vilakku-pooja', 'Thiru Vilakku Pooja', 'திருவிளக்கு பூஜை', NULL, 'assets/images/gallery-3.jpg', true, 3);
insert into public.gallery_items (title_en, title_ta, description_en, description_ta, category, badge_en, badge_ta, image_path, image_url, published, display_order)
values ('Devotees in Sannidhanam Prayer', 'சன்னிதானத்தில் பக்தி பரவசம்', 'Ayyappa devotees gathered inside the mandapam with deep devotion during special Pooja chants.', 'சிறப்பு பூஜை மந்திரங்களின் போது ஆழ்ந்த பக்தியுடன் மண்டபத்தில் கூடியுள்ள ஐயப்ப பக்தர்கள்.', 'utsavam', 'Mandala Pooja & Utsavam', 'மண்டல பூஜை & உற்சவம்', NULL, 'assets/images/gallery-4.jpg', true, 4);
insert into public.gallery_items (title_en, title_ta, description_en, description_ta, category, badge_en, badge_ta, image_path, image_url, published, display_order)
values ('Grand Utsavam Moorthi Alankaram', 'உற்சவ மூர்த்தி மகா அலங்காரம்', 'Divine darshan of Lord Ayyappa decorated with fragrant jasmine, marigold and sacred jewels.', 'மல்லிகை, செவ்வந்தி மற்றும் ஆபரணங்களால் அலங்கரிக்கப்பட்ட ஐயப்ப சுவாமியின் அற்புத தரிசனம்.', 'utsavam', 'Mandala Pooja & Utsavam', 'மண்டல பூஜை & உற்சவம்', NULL, 'assets/images/gallery-5.jpg', true, 5);
insert into public.gallery_items (title_en, title_ta, description_en, description_ta, category, badge_en, badge_ta, image_path, image_url, published, display_order)
values ('Sacred 18 Steps Floral Radiance', '18 படிகள் மலர் அலங்கார ஒளி', 'Detailed view of the 18 steps adorned with rose petals, marigolds and lighted coconut lamps.', 'ரோஜா இதழ்கள், சாமந்தி மற்றும் ஏற்றிய தேங்காய் நெய் தீபங்களால் அலங்கரிக்கப்பட்ட 18 படிகள்.', 'padi-pooja', '18 Padi Pooja', '18 படி பூஜை', NULL, 'assets/images/gallery-6.jpg', true, 6);
insert into public.gallery_items (title_en, title_ta, description_en, description_ta, category, badge_en, badge_ta, image_path, image_url, published, display_order)
values ('Bhajan & Namasankeerthanam', 'பஜனை & நாமசங்கீர்த்தனம்', 'Soulful devotional singing by Guruswamys and devotees with traditional cymbals and percussion.', 'பாரம்பரிய தாள வாத்தியங்களுடன் குருசுவாமிகள் மற்றும் பக்தர்களின் பக்தி பரவச நாமசங்கீர்த்தனம்.', 'utsavam', 'Mandala Pooja & Utsavam', 'மண்டல பூஜை & உற்சவம்', NULL, 'assets/images/gallery-7.jpg', true, 7);
insert into public.gallery_items (title_en, title_ta, description_en, description_ta, category, badge_en, badge_ta, image_path, image_url, published, display_order)
values ('Utsavam Procession & Darshan', 'உற்சவ ஊர்வலம் & தரிசனம்', 'Majestic procession darshan of Lord Ayyappa with silver kavacham and royal umbrella.', 'வெள்ளி கவசம் மற்றும் ராஜ குடையுடன் ஐயப்ப சுவாமியின் ஊர்வல தரிசனம்.', 'utsavam', 'Mandala Pooja & Utsavam', 'மண்டல பூஜை & உற்சவம்', NULL, 'assets/images/gallery-8.jpg', true, 8);
insert into public.gallery_items (title_en, title_ta, description_en, description_ta, category, badge_en, badge_ta, image_path, image_url, published, display_order)
values ('Pushpanjali & Deeparadhana', 'புஷ்பாஞ்சலி & தீபாராதனை', 'Sacred floral offerings and camphor Aarti offered to Lord Ayyappa during Mahapooja.', 'மகாபூஜையின் போது ஐயப்ப சுவாமிக்கு அர்ப்பணிக்கப்படும் மலர் புஷ்பாஞ்சலி மற்றும் கற்பூர ஆரத்தி.', 'padi-pooja', '18 Padi Pooja', '18 படி பூஜை', NULL, 'assets/images/gallery-9.jpg', true, 9);
insert into public.gallery_items (title_en, title_ta, description_en, description_ta, category, badge_en, badge_ta, image_path, image_url, published, display_order)
values ('Annadhaanam & Seva Gathering', 'அன்னதானம் & சேவை ஒன்றுகூடல்', 'Trust members and volunteers coordinating food distribution and seva arrangements.', 'உணவு வழங்கல் மற்றும் சேவை ஏற்பாடுகளை ஒருங்கிணைக்கும் அறக்கட்டளை உறுப்பினர்கள் மற்றும் தொண்டர்கள்.', 'annadhaanam', 'Annadhaanam', 'அன்னதானம்', NULL, 'assets/images/gallery-10.jpg', true, 10);
insert into public.gallery_items (title_en, title_ta, description_en, description_ta, category, badge_en, badge_ta, image_path, image_url, published, display_order)
values ('Maha Abhishekam Darshan', 'மகா அபிஷேக தரிசனம்', 'Holy abhishekam with milk, sandal paste, honey, vibhuti and sacred theertham.', 'பால், சந்தனம், தேன், விபூதி மற்றும் புனித தீர்த்தத்துடன் கூடிய புனித அபிஷேகம்.', 'abhishekam', 'Maha Abhishekam', 'மகா அபிஷேகம்', NULL, 'assets/images/gallery-11.jpg', true, 11);
insert into public.gallery_items (title_en, title_ta, description_en, description_ta, category, badge_en, badge_ta, image_path, image_url, published, display_order)
values ('Thulasi & Vana Mala Alankaram', 'துளசி & வனமாலை அலங்காரம்', 'Intricate close-up darshan of Lord Ayyappa draped in sacred Thulasi, Lotus and Bilva garlands.', 'புனித துளசி, தாமரை மற்றும் வில்வ மாலைகளால் அலங்கரிக்கப்பட்ட சுவாமியின் திவ்ய தரிசனம்.', 'utsavam', 'Mandala Pooja & Utsavam', 'மண்டல பூஜை & உற்சவம்', NULL, 'assets/images/gallery-12.jpg', true, 12);
insert into public.gallery_items (title_en, title_ta, description_en, description_ta, category, badge_en, badge_ta, image_path, image_url, published, display_order)
values ('Community Devotional Singing', 'கூட்டு பக்தி பாடல் வழிபாடு', 'Congregation of Swamis and families participating in Harivarasanam and Mangala Aarti.', 'ஹரிவராசனம் மற்றும் மங்கள ஆரத்தியில் பங்கேற்கும் சுவாமிகள் மற்றும் குடும்பத்தினர்.', 'utsavam', 'Mandala Pooja & Utsavam', 'மண்டல பூஜை & உற்சவம்', NULL, 'assets/images/gallery-13.jpg', true, 13);
insert into public.gallery_items (title_en, title_ta, description_en, description_ta, category, badge_en, badge_ta, image_path, image_url, published, display_order)
values ('Seva Planning & Community Meet', 'சேவை திட்டமிடல் & பொதுக்குழு', 'Trustees and community volunteers coordinating pilgrimage assistance and welfare drives.', 'யாத்திரை உதவி மற்றும் நலத்திட்டங்களை ஒருங்கிணைக்கும் அறங்காவலர்கள் மற்றும் தொண்டர்கள்.', 'padi-pooja', '18 Padi Pooja', '18 படி பூஜை', NULL, 'assets/images/gallery-14.jpg', true, 14);
insert into public.gallery_items (title_en, title_ta, description_en, description_ta, category, badge_en, badge_ta, image_path, image_url, published, display_order)
values ('Annual Padi & Vilakku Pooja Notice', 'ஆண்டு படி பூஜை & விளக்கு பூஜை அறிவிப்பு', 'Official ABASS Trust invitation poster detailing the programme schedule, Guruswamy honors and Annadhaanam.', 'நிகழ்ச்சி நிரல், குருசுவாமி கௌரவிப்பு மற்றும் அன்னதானம் குறித்த அதிகாரப்பூர்வ ABASS அழைப்பிதழ்.', 'padi-pooja vilakku-pooja', 'Padi & Vilakku Pooja', 'படி & விளக்கு பூஜை', NULL, 'assets/images/gallery-15.jpg', true, 15);
insert into public.gallery_items (title_en, title_ta, description_en, description_ta, category, badge_en, badge_ta, image_path, image_url, published, display_order)
values ('Grand Congregation & Prasadam', 'மகா சங்கமம் & பிரசாதம் வழங்குதல்', 'Hundreds of devotees receiving sacred prasadam and Annadhaanam after completion of Mahapooja.', 'மகாபூஜை நிறைவடைந்த பின் புனித பிரசாதம் மற்றும் அன்னதானம் பெறும் நூற்றுக்கணக்கான பக்தர்கள்.', 'annadhaanam', 'Annadhaanam', 'அன்னதானம்', NULL, 'assets/images/gallery-16.jpg', true, 16);

-- Member seed records removed; create members through the Admin Panel.

-- ============================================================
-- 6. HOW TO REGISTER FIRST ADMIN USER:
-- After creating a user in Supabase Authentication (Dashboard -> Authentication -> Add User),
-- run the following query with their user UID:
--
-- INSERT INTO public.admin_users (user_id, email)
-- VALUES ('<YOUR_USER_UUID>', 'admin@abasspvm.com')
-- ON CONFLICT (user_id) DO NOTHING;
-- ============================================================

-- ============================================================
-- ABASS — Website Corrections (19 Nov 2026) — database migration
-- Run ONCE in Supabase Dashboard -> SQL Editor, BEFORE using the
-- updated Admin Panel. Safe to re-run (every statement is idempotent).
-- ============================================================

-- ------------------------------------------------------------
-- 1. EVENTS  (corrections 02, 03, 04, 10)
--    map_url      optional Google Maps link; if empty the site builds
--                 a Maps link automatically from the location text.
--    details_*    long "expanded view" text (headings / bullet lists)
--    *_te / *_kn  optional Telugu / Kannada versions of the card text
-- ------------------------------------------------------------
alter table public.events add column if not exists map_url        text;
alter table public.events add column if not exists details_en     text;
alter table public.events add column if not exists details_ta     text;
alter table public.events add column if not exists details_te     text;
alter table public.events add column if not exists details_kn     text;
alter table public.events add column if not exists title_te       text;
alter table public.events add column if not exists title_kn       text;
alter table public.events add column if not exists location_te    text;
alter table public.events add column if not exists location_kn    text;
alter table public.events add column if not exists description_te text;
alter table public.events add column if not exists description_kn text;

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
