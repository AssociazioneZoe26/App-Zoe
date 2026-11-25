-- Anteprima pubblica + lezioni (1–10) per corsi online
alter table public.products
  add column if not exists course_preview_video_url text,
  add column if not exists course_preview_seconds integer not null default 15,
  add column if not exists course_lessons jsonb not null default '[]'::jsonb;

alter table public.products
  drop constraint if exists products_preview_seconds_range;

alter table public.products
  add constraint products_preview_seconds_range
  check (course_preview_seconds between 5 and 120);
