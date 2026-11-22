-- ABASS member profile photo setup
-- Safe to re-run. Preserves existing members and stored files.

begin;

-- Keep the columns written by the Admin Portal, including the path needed
-- for safe replacement and cleanup of uploaded photos.
alter table public.members
  add column if not exists photo_url text,
  add column if not exists photo_path text,
  add column if not exists mobile_number text;

-- admin.js and public member pages use getPublicUrl(), so this bucket must be
-- public for image downloads. Only the image files are public; member rows
-- and all database RLS policies remain unchanged.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'member-photos',
  'member-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Public buckets serve direct photo URLs without allowing anonymous users to
-- list objects. Admin listing and all write operations require is_admin().
drop policy if exists "Public can read member photos" on storage.objects;
drop policy if exists "Admins can list member photos" on storage.objects;
create policy "Admins can list member photos"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'member-photos' and public.is_admin());

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

notify pgrst, 'reload schema';

commit;
