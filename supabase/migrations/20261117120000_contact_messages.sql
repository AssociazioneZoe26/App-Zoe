-- Messaggi dal form Contatti del sito.

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  message text not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint contact_messages_email_format check (position('@' in email) > 1),
  constraint contact_messages_name_len check (char_length(trim(full_name)) >= 2),
  constraint contact_messages_body_len check (char_length(trim(message)) >= 10)
);

create index if not exists contact_messages_created_at_idx
  on public.contact_messages (created_at desc);

alter table public.contact_messages enable row level security;

create policy contact_insert_public
  on public.contact_messages
  for insert
  to anon, authenticated
  with check (
    char_length(trim(full_name)) >= 2
    and position('@' in email) > 1
    and char_length(trim(message)) >= 10
  );

create policy contact_select_team
  on public.contact_messages
  for select
  to authenticated
  using (public.is_team_zoe());

revoke all on table public.contact_messages from public;
grant insert on table public.contact_messages to anon, authenticated;
grant select on table public.contact_messages to authenticated, service_role;
