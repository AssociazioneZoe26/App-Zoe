-- Iscrizioni newsletter pubblica (bi-settimanale). Separata da subscriptions commerce.

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  privacy_accepted_at timestamptz not null default timezone('utc', now()),
  source text not null default 'home_banner',
  created_at timestamptz not null default timezone('utc', now()),
  constraint newsletter_subscribers_email_unique unique (email),
  constraint newsletter_subscribers_email_format check (position('@' in email) > 1),
  constraint newsletter_subscribers_name_len check (char_length(trim(full_name)) >= 2)
);

create index if not exists newsletter_subscribers_created_at_idx
  on public.newsletter_subscribers (created_at desc);

alter table public.newsletter_subscribers enable row level security;

create policy newsletter_insert_public
  on public.newsletter_subscribers
  for insert
  to anon, authenticated
  with check (
    privacy_accepted_at is not null
    and char_length(trim(full_name)) >= 2
    and position('@' in email) > 1
  );

create policy newsletter_select_team
  on public.newsletter_subscribers
  for select
  to authenticated
  using (public.is_team_zoe());

revoke all on table public.newsletter_subscribers from public;
grant insert on table public.newsletter_subscribers to anon, authenticated;
grant select on table public.newsletter_subscribers to authenticated, service_role;
