-- Richieste di rinnovo pacchetti/abbonamenti dall’area socio (prima di Stripe).

create table if not exists public.renewal_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  member_email text not null,
  member_name text,
  product_id text,
  activity_slug text,
  activity_title text not null,
  plan text,
  pass_id text,
  note text,
  status text not null default 'pending'
    check (status in ('pending', 'done', 'cancelled')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists renewal_requests_status_idx
  on public.renewal_requests (status, created_at desc);

create index if not exists renewal_requests_user_idx
  on public.renewal_requests (user_id, created_at desc);

alter table public.renewal_requests enable row level security;

create policy renewal_insert_own
  on public.renewal_requests
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy renewal_select_own_or_team
  on public.renewal_requests
  for select
  to authenticated
  using (auth.uid() = user_id or public.is_team_zoe());

create policy renewal_update_team
  on public.renewal_requests
  for update
  to authenticated
  using (public.is_team_zoe())
  with check (public.is_team_zoe());

revoke all on table public.renewal_requests from public;
grant select, insert on table public.renewal_requests to authenticated;
grant update on table public.renewal_requests to authenticated;
grant all on table public.renewal_requests to service_role;
