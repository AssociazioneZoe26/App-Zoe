-- I soci che in registrazione accettano la newsletter finiscono
-- nello stesso contenitore public.newsletter_subscribers.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_first text;
  v_last text;
  v_full text;
  v_marketing boolean;
begin
  v_first := coalesce(new.raw_user_meta_data ->> 'first_name', '');
  v_last := coalesce(new.raw_user_meta_data ->> 'last_name', '');
  v_full := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    trim(both from concat_ws(' ', nullif(trim(v_first), ''), nullif(trim(v_last), '')))
  );
  v_marketing := lower(coalesce(new.raw_user_meta_data ->> 'marketing_consent', 'false'))
    in ('true', 't', '1', 'yes');

  insert into public.profiles (
    id, email, full_name, first_name, last_name, role, member_status,
    privacy_accepted_at, marketing_consent
  )
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(v_full, ''),
    v_first,
    v_last,
    'member',
    'pending',
    case
      when coalesce(new.raw_user_meta_data ->> 'privacy_accepted', '') = 'true'
        then timezone('utc', now())
      else null
    end,
    v_marketing
  )
  on conflict (id) do update
    set
      email = excluded.email,
      full_name = excluded.full_name,
      first_name = excluded.first_name,
      last_name = excluded.last_name,
      marketing_consent = public.profiles.marketing_consent or excluded.marketing_consent,
      privacy_accepted_at = coalesce(public.profiles.privacy_accepted_at, excluded.privacy_accepted_at);

  return new;
end;
$$;
