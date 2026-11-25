-- Periodo del corso sul catalogo. L'iscrizione copia le date su entitlements
-- e le associa a un bambino tramite participant_id (colonna già presente).

alter table public.products
  add column if not exists starts_on date,
  add column if not exists ends_on date;

alter table public.products
  drop constraint if exists products_course_dates_order;

alter table public.products
  add constraint products_course_dates_order
  check (starts_on is null or ends_on is null or ends_on >= starts_on);
