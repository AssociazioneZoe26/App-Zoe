alter table public.newsletter_subscribers
  add column if not exists confirmed_at timestamptz,
  add column if not exists confirm_token_hash text,
  add column if not exists confirm_token_expires_at timestamptz;

update public.newsletter_subscribers
set confirmed_at = coalesce(confirmed_at, created_at)
where confirmed_at is null;

drop policy if exists newsletter_insert_public on public.newsletter_subscribers;

revoke insert on table public.newsletter_subscribers from anon, authenticated;
grant insert, update, select on table public.newsletter_subscribers to service_role;

comment on column public.newsletter_subscribers.confirmed_at is
  'Valorizzato dopo il click sul link inviato da info@associazionezoe.org.';
