-- Unica lista newsletter APP ZOE + bozze digest corsi ogni 14 giorni.
-- L'invio SMTP resta spento finché Aruba/posta non è collegata.

update public.newsletter_subscribers
set email = lower(trim(email))
where email is distinct from lower(trim(email));

alter table public.newsletter_subscribers
  add column if not exists unsubscribed_at timestamptz,
  add column if not exists last_digest_at timestamptz,
  add column if not exists user_id uuid references public.profiles (id) on delete set null;

create unique index if not exists newsletter_subscribers_email_lower_idx
  on public.newsletter_subscribers (lower(email));

create index if not exists newsletter_subscribers_mailing_idx
  on public.newsletter_subscribers (confirmed_at)
  where confirmed_at is not null and unsubscribed_at is null;

comment on table public.newsletter_subscribers is
  'Contenitore unico delle email newsletter (banner, pagina, soci con consenso).';

create or replace function public.sync_newsletter_from_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_name text;
begin
  v_email := lower(trim(coalesce(new.email, '')));
  v_name := nullif(trim(coalesce(new.full_name, '')), '');
  if v_name is null then
    v_name := nullif(trim(concat_ws(' ', new.first_name, new.last_name)), '');
  end if;
  if v_name is null or char_length(v_name) < 2 then
    v_name := 'Socio Zoe';
  end if;

  if new.marketing_consent is true and v_email like '%@%.%' then
    insert into public.newsletter_subscribers (
      full_name,
      email,
      source,
      confirmed_at,
      user_id,
      privacy_accepted_at
    )
    values (
      v_name,
      v_email,
      'member_signup',
      timezone('utc', now()),
      new.id,
      coalesce(new.privacy_accepted_at, timezone('utc', now()))
    )
    on conflict (email) do update
      set
        user_id = excluded.user_id,
        full_name = excluded.full_name,
        confirmed_at = coalesce(public.newsletter_subscribers.confirmed_at, excluded.confirmed_at);
  end if;

  return new;
end;
$$;

revoke all on function public.sync_newsletter_from_profile() from public, anon, authenticated;
grant execute on function public.sync_newsletter_from_profile() to postgres, service_role, supabase_admin;

drop trigger if exists trg_sync_newsletter_from_profile on public.profiles;
create trigger trg_sync_newsletter_from_profile
  after insert or update of marketing_consent, email, full_name, first_name, last_name
  on public.profiles
  for each row
  execute function public.sync_newsletter_from_profile();

create table if not exists public.newsletter_issues (
  id uuid primary key default gen_random_uuid(),
  period_start date not null,
  period_end date not null,
  subject text not null,
  html text not null,
  text_body text not null,
  product_ids uuid[] not null default '{}',
  recipient_count integer not null default 0,
  status text not null default 'draft'
    check (status = any (array['draft'::text, 'sent'::text, 'skipped'::text])),
  send_enabled boolean not null default false,
  sent_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

comment on table public.newsletter_issues is
  'Bozze/invii del riepilogo corsi ogni 2 settimane. send_enabled resta false finché la posta non è pronta.';

alter table public.newsletter_issues enable row level security;

revoke all on table public.newsletter_issues from public;
grant select, insert, update on table public.newsletter_issues to authenticated, service_role;

drop policy if exists newsletter_issues_team_all on public.newsletter_issues;
create policy newsletter_issues_team_select
  on public.newsletter_issues
  for select
  to authenticated
  using (public.is_team_zoe());

create policy newsletter_issues_team_write
  on public.newsletter_issues
  for insert
  to authenticated
  with check (public.is_team_zoe());

create policy newsletter_issues_service
  on public.newsletter_issues
  for all
  to service_role
  using (true)
  with check (true);

create or replace view public.newsletter_mailing_list
  with (security_invoker = true)
as
select
  id,
  full_name,
  email,
  source,
  created_at,
  confirmed_at,
  unsubscribed_at,
  last_digest_at,
  user_id
from public.newsletter_subscribers
where confirmed_at is not null
  and unsubscribed_at is null;

grant select on public.newsletter_mailing_list to authenticated, service_role;

insert into public.newsletter_subscribers (
  full_name, email, source, confirmed_at, user_id, privacy_accepted_at
)
select
  coalesce(nullif(trim(p.full_name), ''), 'Socio Zoe'),
  lower(trim(p.email)),
  'member_signup',
  timezone('utc', now()),
  p.id,
  coalesce(p.privacy_accepted_at, timezone('utc', now()))
from public.profiles p
where p.marketing_consent is true
  and p.email like '%@%.%'
on conflict (email) do update
  set user_id = excluded.user_id;
