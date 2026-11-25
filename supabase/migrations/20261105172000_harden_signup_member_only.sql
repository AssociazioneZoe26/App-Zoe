-- APP ZOE — signup pubblico: sempre member/pending.
-- Il ruolo team_zoe non può essere auto-assegnato via metadata Auth del client.
-- Promozione a team_zoe solo tramite operazioni amministrative (service_role).

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
begin
  -- Ignora qualsiasi raw_app_meta_data.role proveniente dal client.
  v_first := coalesce(new.raw_user_meta_data ->> 'first_name', '');
  v_last := coalesce(new.raw_user_meta_data ->> 'last_name', '');
  v_full := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    trim(both from concat_ws(' ', nullif(trim(v_first), ''), nullif(trim(v_last), '')))
  );

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
    coalesce((new.raw_user_meta_data ->> 'marketing_consent')::boolean, false)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Policy: soci non approvati non possono creare ordini direttamente (defense in depth;
-- create-order usa comunque service_role e verifica approved + email).
drop policy if exists orders_insert_own on public.orders;
create policy orders_insert_own
  on public.orders for insert
  with check (
    buyer_user_id = auth.uid()
    and beneficiary_user_id = auth.uid()
    and public.is_approved_member()
  );
