-- QR univoco per pacchetti ingressi (APP ZOE).
-- Token opaco, lookup/consume/restore solo Team Zoe.

alter table public.entry_packs
  add column if not exists scan_token uuid;

update public.entry_packs
set scan_token = gen_random_uuid()
where scan_token is null;

alter table public.entry_packs
  alter column scan_token set default gen_random_uuid(),
  alter column scan_token set not null;

create unique index if not exists entry_packs_scan_token_uidx
  on public.entry_packs (scan_token);

comment on column public.entry_packs.scan_token is
  'Token opaco per QR. Nessun dato personale: il payload è zoe:p:<token>.';

create or replace function public.entry_packs_ensure_scan_token()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.scan_token is null then
    new.scan_token := gen_random_uuid();
  end if;
  return new;
end;
$$;

drop trigger if exists entry_packs_ensure_scan_token on public.entry_packs;
create trigger entry_packs_ensure_scan_token
before insert on public.entry_packs
for each row execute function public.entry_packs_ensure_scan_token();

alter table public.entry_consumptions
  add column if not exists reversed_at timestamptz,
  add column if not exists reversed_by uuid references public.profiles (id),
  add column if not exists reverse_reason text;

create index if not exists entry_consumptions_recent_idx
  on public.entry_consumptions (entry_pack_id, created_at desc)
  where reversed_at is null;

create or replace function public.parse_entry_pack_qr_token(p_token text)
returns uuid
language plpgsql
immutable
set search_path = public
as $$
declare
  v_raw text;
  v_id uuid;
begin
  v_raw := lower(trim(coalesce(p_token, '')));
  if v_raw like 'zoe:p:%' then
    v_raw := substring(v_raw from 7);
  end if;
  begin
    v_id := v_raw::uuid;
  exception when others then
    raise exception 'invalid_qr';
  end;
  return v_id;
end;
$$;

create or replace function public.lookup_entry_pack_qr(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token uuid;
  v_pack public.entry_packs;
  v_title text;
  v_first text;
  v_last text;
  v_left integer;
begin
  if not public.is_team_zoe() then
    raise exception 'forbidden';
  end if;

  v_token := public.parse_entry_pack_qr_token(p_token);

  select * into v_pack
  from public.entry_packs
  where scan_token = v_token;

  if not found then
    raise exception 'invalid_qr';
  end if;

  if v_pack.status = 'expired' then
    raise exception 'pack_expired';
  end if;
  if v_pack.status = 'revoked' then
    raise exception 'pack_revoked';
  end if;
  if v_pack.status = 'exhausted' or v_pack.entries_used >= v_pack.entries_total then
    raise exception 'pack_exhausted';
  end if;
  if v_pack.status <> 'active' then
    raise exception 'pack_not_active';
  end if;

  select title into v_title from public.products where id = v_pack.product_id;
  if v_pack.participant_id is not null then
    select first_name, last_name into v_first, v_last
    from public.participants
    where id = v_pack.participant_id;
  end if;

  v_left := greatest(0, v_pack.entries_total - v_pack.entries_used);

  return jsonb_build_object(
    'pack_id', v_pack.id,
    'scan_token', v_pack.scan_token,
    'status', v_pack.status,
    'entries_total', v_pack.entries_total,
    'entries_used', v_pack.entries_used,
    'entries_left', v_left,
    'product_id', v_pack.product_id,
    'product_title', coalesce(v_title, 'Laboratorio'),
    'participant_id', v_pack.participant_id,
    'participant_name', case
      when v_first is not null then trim(both from concat_ws(' ', v_first, v_last))
      else 'Titolare'
    end
  );
end;
$$;

create or replace function public.consume_entry_pack(
  p_entry_pack_id uuid,
  p_delta integer default 1,
  p_client_request_id text default null,
  p_reason text default 'attendance'
)
returns public.entry_packs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pack public.entry_packs;
  v_existing uuid;
  v_dup uuid;
begin
  if not public.is_team_zoe() then
    raise exception 'forbidden';
  end if;

  if p_delta is null or p_delta < 1 then
    raise exception 'invalid_delta';
  end if;

  if p_client_request_id is not null then
    select id into v_existing
    from public.entry_consumptions
    where entry_pack_id = p_entry_pack_id
      and client_request_id = p_client_request_id
      and reversed_at is null;
    if v_existing is not null then
      select * into v_pack from public.entry_packs where id = p_entry_pack_id;
      return v_pack;
    end if;
  end if;

  select * into v_pack from public.entry_packs where id = p_entry_pack_id for update;
  if not found then
    raise exception 'pack_not_found';
  end if;

  if v_pack.status = 'expired' then
    raise exception 'pack_expired';
  end if;
  if v_pack.status = 'revoked' then
    raise exception 'pack_revoked';
  end if;
  if v_pack.status = 'exhausted' then
    raise exception 'pack_exhausted';
  end if;
  if v_pack.status <> 'active' then
    raise exception 'pack_not_active';
  end if;

  select c.id into v_dup
  from public.entry_consumptions c
  where c.entry_pack_id = p_entry_pack_id
    and c.reversed_at is null
    and c.reason = 'attendance'
    and c.created_at > timezone('utc', now()) - interval '15 seconds'
  limit 1;
  if v_dup is not null then
    raise exception 'duplicate_scan';
  end if;

  if v_pack.entries_used + p_delta > v_pack.entries_total then
    raise exception 'insufficient_entries';
  end if;

  update public.entry_packs
  set
    entries_used = entries_used + p_delta,
    status = case
      when entries_used + p_delta >= entries_total then 'exhausted'
      else status
    end,
    updated_at = timezone('utc', now())
  where id = p_entry_pack_id
  returning * into v_pack;

  insert into public.entry_consumptions (
    entry_pack_id, participant_id, recorded_by, delta, reason, client_request_id
  )
  values (
    v_pack.id,
    v_pack.participant_id,
    auth.uid(),
    p_delta,
    coalesce(nullif(trim(p_reason), ''), 'attendance'),
    p_client_request_id
  );

  insert into public.credit_ledger (entry_pack_id, user_id, delta, reason, created_by)
  values (
    v_pack.id,
    v_pack.user_id,
    -p_delta,
    coalesce(nullif(trim(p_reason), ''), 'attendance'),
    auth.uid()
  );

  return v_pack;
end;
$$;

create or replace function public.restore_entry_consumption(
  p_consumption_id uuid,
  p_reason text default 'correction'
)
returns public.entry_packs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.entry_consumptions;
  v_pack public.entry_packs;
begin
  if not public.is_team_zoe() then
    raise exception 'forbidden';
  end if;

  select * into v_row
  from public.entry_consumptions
  where id = p_consumption_id
  for update;
  if not found then
    raise exception 'consumption_not_found';
  end if;
  if v_row.reversed_at is not null then
    raise exception 'already_reversed';
  end if;

  select * into v_pack from public.entry_packs where id = v_row.entry_pack_id for update;
  if not found then
    raise exception 'pack_not_found';
  end if;
  if v_pack.status = 'revoked' then
    raise exception 'pack_revoked';
  end if;

  update public.entry_consumptions
  set
    reversed_at = timezone('utc', now()),
    reversed_by = auth.uid(),
    reverse_reason = coalesce(nullif(trim(p_reason), ''), 'correction')
  where id = p_consumption_id;

  update public.entry_packs
  set
    entries_used = greatest(0, entries_used - v_row.delta),
    status = case
      when status = 'exhausted' then 'active'
      else status
    end,
    updated_at = timezone('utc', now())
  where id = v_pack.id
  returning * into v_pack;

  insert into public.credit_ledger (entry_pack_id, user_id, delta, reason, created_by)
  values (
    v_pack.id,
    v_pack.user_id,
    v_row.delta,
    coalesce(nullif(trim(p_reason), ''), 'correction'),
    auth.uid()
  );

  return v_pack;
end;
$$;

revoke all on function public.parse_entry_pack_qr_token(text) from public, anon;
grant execute on function public.parse_entry_pack_qr_token(text) to authenticated, service_role;

revoke all on function public.lookup_entry_pack_qr(text) from public, anon;
grant execute on function public.lookup_entry_pack_qr(text) to authenticated, service_role;

revoke all on function public.consume_entry_pack(uuid, integer, text, text) from public, anon;
grant execute on function public.consume_entry_pack(uuid, integer, text, text) to authenticated, service_role;

revoke all on function public.restore_entry_consumption(uuid, text) from public, anon;
grant execute on function public.restore_entry_consumption(uuid, text) to authenticated, service_role;
