-- CMS pagine informative del sito (condiviso tra dispositivi)
create table if not exists public.site_pages (
  slug text primary key,
  content jsonb not null,
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references public.profiles (id) on delete set null
);

drop trigger if exists site_pages_set_updated_at on public.site_pages;
create trigger site_pages_set_updated_at
before update on public.site_pages
for each row
execute function public.set_updated_at();

alter table public.site_pages enable row level security;

drop policy if exists site_pages_select_public on public.site_pages;
create policy site_pages_select_public
  on public.site_pages for select
  using (true);

drop policy if exists site_pages_team_write on public.site_pages;
create policy site_pages_team_write
  on public.site_pages for all
  using (public.is_team_zoe())
  with check (public.is_team_zoe());

-- Storage immagini sito
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-media',
  'site-media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists site_media_public_read on storage.objects;
create policy site_media_public_read
  on storage.objects for select
  using (bucket_id = 'site-media');

drop policy if exists site_media_team_insert on storage.objects;
create policy site_media_team_insert
  on storage.objects for insert
  with check (bucket_id = 'site-media' and public.is_team_zoe());

drop policy if exists site_media_team_update on storage.objects;
create policy site_media_team_update
  on storage.objects for update
  using (bucket_id = 'site-media' and public.is_team_zoe())
  with check (bucket_id = 'site-media' and public.is_team_zoe());

drop policy if exists site_media_team_delete on storage.objects;
create policy site_media_team_delete
  on storage.objects for delete
  using (bucket_id = 'site-media' and public.is_team_zoe());
