-- APP ZOE — soci, famiglie, multi-partecipante, audit, inviti.
-- Fonte autorevole assegnazione in presenza: order_items.participant_id
-- Online: un accesso per account (participant_id sempre NULL su video_access)
-- Nessun Auth per i minori. Invito ≠ approvazione ≠ ruolo team_zoe.
-- Ordini storici: participant_id NULL = "per me" / account familiare.

-- ---------------------------------------------------------------------------
-- 1. profiles
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists first_name text not null default '',
  add column if not exists last_name text not null default '',
  add column if not exists privacy_accepted_at timestamptz,
  add column if not exists marketing_consent boolean not null default false,
  add column if not exists status_changed_at timestamptz,
  add column if not exists status_changed_by uuid references public.profiles (id);

update public.profiles
set
  first_name = case
    when coalesce(first_name, '') = '' and position(' ' in trim(full_name)) > 0
      then split_part(trim(full_name), ' ', 1)
    when coalesce(first_name, '') = '' then trim(full_name)
    else first_name
  end,
  last_name = case
    when coalesce(last_name, '') = '' and position(' ' in trim(full_name)) > 0
      then trim(substring(trim(full_name) from position(' ' in trim(full_name)) + 1))
    else last_name
  end
where true;

alter table public.profiles drop constraint if exists profiles_member_status_check;
alter table public.profiles
  add constraint profiles_member_status_check
  check (member_status in ('pending', 'approved', 'rejected', 'suspended'));

create or replace function public.profiles_guard_and_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if not public.is_team_zoe() then
      if new.role is distinct from old.role then
        raise exception 'profiles_role_immutable';
      end if;
      if new.member_status is distinct from old.member_status then
        raise exception 'profiles_status_immutable';
      end if;
      if new.status_changed_by is distinct from old.status_changed_by then
        raise exception 'profiles_status_meta_immutable';
      end if;
    end if;

    if new.first_name is distinct from old.first_name
      or new.last_name is distinct from old.last_name
      or coalesce(new.full_name, '') = '' then
      new.full_name := trim(both from concat_ws(
        ' ',
        nullif(trim(new.first_name), ''),
        nullif(trim(new.last_name), '')
      ));
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_and_sync on public.profiles;
create trigger profiles_guard_and_sync
before update on public.profiles
for each row execute function public.profiles_guard_and_sync();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_status text;
  v_first text;
  v_last text;
  v_full text;
begin
  v_role := case
    when coalesce(new.raw_app_meta_data ->> 'role', '') = 'team_zoe' then 'team_zoe'
    else 'member'
  end;
  v_status := case when v_role = 'team_zoe' then 'approved' else 'pending' end;
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
    v_role,
    v_status,
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

-- ---------------------------------------------------------------------------
-- 2. Helper: email verificata + socio approved
-- ---------------------------------------------------------------------------
create or replace function public.is_email_verified()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1 from auth.users u
    where u.id = auth.uid() and u.email_confirmed_at is not null
  );
$$;

revoke all on function public.is_email_verified() from public;
grant execute on function public.is_email_verified() to authenticated, service_role;

create or replace function public.is_approved_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'member'
      and p.member_status = 'approved'
  )
  and public.is_email_verified();
$$;

revoke all on function public.is_approved_member() from public;
grant execute on function public.is_approved_member() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. Partecipanti (minori) — senza Auth
-- ---------------------------------------------------------------------------
create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  guardian_user_id uuid not null references public.profiles (id) on delete cascade,
  first_name text not null,
  last_name text not null,
  birth_date date not null,
  relationship text not null
    check (relationship in ('mother', 'father', 'guardian', 'other')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint participants_name_nonempty check (
    length(trim(first_name)) > 0 and length(trim(last_name)) > 0
  )
);

create index if not exists participants_guardian_idx
  on public.participants (guardian_user_id);

drop trigger if exists participants_set_updated_at on public.participants;
create trigger participants_set_updated_at
before update on public.participants
for each row execute function public.set_updated_at();

alter table public.participants enable row level security;

drop policy if exists participants_select_own_or_team on public.participants;
create policy participants_select_own_or_team
  on public.participants for select
  using (guardian_user_id = auth.uid() or public.is_team_zoe());

drop policy if exists participants_insert_own_approved on public.participants;
create policy participants_insert_own_approved
  on public.participants for insert
  with check (guardian_user_id = auth.uid() and public.is_approved_member());

drop policy if exists participants_update_own_approved on public.participants;
create policy participants_update_own_approved
  on public.participants for update
  using (guardian_user_id = auth.uid() and public.is_approved_member())
  with check (guardian_user_id = auth.uid() and public.is_approved_member());

drop policy if exists participants_delete_own_approved on public.participants;
create policy participants_delete_own_approved
  on public.participants for delete
  using (guardian_user_id = auth.uid() and public.is_approved_member());

drop policy if exists participants_team_write on public.participants;
create policy participants_team_write
  on public.participants for all
  using (public.is_team_zoe())
  with check (public.is_team_zoe());

create or replace function public.participant_belongs_to_guardian(
  p_participant_id uuid,
  p_guardian_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.participants p
    where p.id = p_participant_id and p.guardian_user_id = p_guardian_id
  );
$$;

revoke all on function public.participant_belongs_to_guardian(uuid, uuid) from public;
grant execute on function public.participant_belongs_to_guardian(uuid, uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4. Ordini multi-partecipante
--    Fonte autorevole: order_items.participant_id
--    buyer_user_id = chi paga (Auth)
--    beneficiary_user_id = titolare diritti Auth (di solito = buyer / genitore)
--    participant_id su riga = figlio o NULL ("per me")
--    Online: participant_id obbligatoriamente NULL
-- ---------------------------------------------------------------------------

-- Non usare orders.participant_id come fonte (eventuale colonna legacy → drop)
alter table public.orders drop column if exists participant_id;

alter table public.order_items
  add column if not exists participant_id uuid references public.participants (id) on delete restrict;

create index if not exists order_items_participant_idx
  on public.order_items (participant_id)
  where participant_id is not null;

-- Regola: online ⇒ niente partecipante; in presenza ⇒ partecipante del buyer o NULL (per me)
create or replace function public.order_items_validate_participant()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_buyer uuid;
begin
  if new.price_option = 'online' or new.product_kind_snapshot = 'online' then
    new.participant_id := null;
    return new;
  end if;

  if new.participant_id is null then
    return new;
  end if;

  select o.buyer_user_id into v_buyer from public.orders o where o.id = new.order_id;
  if v_buyer is null then
    raise exception 'order_item_order_missing';
  end if;
  if not public.participant_belongs_to_guardian(new.participant_id, v_buyer) then
    raise exception 'order_item_participant_forbidden';
  end if;
  return new;
end;
$$;

drop trigger if exists order_items_validate_participant on public.order_items;
create trigger order_items_validate_participant
before insert or update on public.order_items
for each row execute function public.order_items_validate_participant();

-- Diritti / crediti / abbonamenti: etichetta partecipante (NULL = titolare account)
alter table public.entitlements
  add column if not exists participant_id uuid references public.participants (id) on delete set null;

alter table public.entry_packs
  add column if not exists participant_id uuid references public.participants (id) on delete set null;

alter table public.subscriptions
  add column if not exists participant_id uuid references public.participants (id) on delete set null;

-- video_access resta per account; non assegniamo participant_id (accesso familiare)
-- se una colonna era stata aggiunta in bozza precedente, la lasciamo nullable e non la usiamo

alter table public.video_access
  add column if not exists participant_id uuid references public.participants (id) on delete set null;

-- Ordini: insert solo buyer=beneficiary=self (righe con partecipanti valide via trigger)
drop policy if exists orders_insert_own on public.orders;
create policy orders_insert_own
  on public.orders for insert
  with check (
    buyer_user_id = auth.uid()
    and beneficiary_user_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- 5. fulfill_paid_order — una riga ⇒ un diritto; online senza participant
-- ---------------------------------------------------------------------------
create or replace function public.fulfill_paid_order(p_order_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
  v_item public.order_items;
  v_entries integer;
  v_participant uuid;
  v_is_online boolean;
begin
  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'order_not_found';
  end if;

  if v_order.status <> 'paid' then
    raise exception 'order_not_paid';
  end if;

  if v_order.fulfilled_at is not null then
    return v_order;
  end if;

  for v_item in
    select * from public.order_items where order_id = v_order.id order by created_at, id
  loop
    v_is_online := (
      v_item.price_option = 'online' or v_item.product_kind_snapshot = 'online'
    );
    v_participant := case when v_is_online then null else v_item.participant_id end;

    if v_item.price_option in ('pack5', 'pack10') then
      -- quantity=1 per riga multi-figlio; se quantity>1 resta moltiplicatore sul medesimo partecipante
      v_entries := case when v_item.price_option = 'pack5' then 5 else 10 end;
      if not exists (
        select 1 from public.entry_packs ep where ep.order_item_id = v_item.id
      ) then
        insert into public.entry_packs (
          user_id, product_id, order_item_id, entries_total, entries_used,
          status, source, participant_id
        )
        values (
          v_order.beneficiary_user_id,
          v_item.product_id,
          v_item.id,
          v_entries * v_item.quantity,
          0,
          'active',
          'purchase',
          v_participant
        );
      end if;

      insert into public.credit_ledger (entry_pack_id, user_id, delta, reason)
      select ep.id, v_order.beneficiary_user_id, ep.entries_total, 'purchase_credit'
      from public.entry_packs ep
      where ep.order_item_id = v_item.id
      and not exists (
        select 1 from public.credit_ledger cl
        where cl.entry_pack_id = ep.id and cl.reason = 'purchase_credit'
      );

    elsif v_item.price_option = 'monthly' then
      if not exists (
        select 1 from public.subscriptions s where s.order_item_id = v_item.id
      ) then
        insert into public.subscriptions (
          user_id, product_id, order_item_id, status,
          current_period_start, current_period_end, provider, participant_id
        )
        values (
          v_order.beneficiary_user_id,
          v_item.product_id,
          v_item.id,
          'active',
          timezone('utc', now()),
          timezone('utc', now()) + interval '1 month',
          'mock',
          v_participant
        );
      end if;

      if not exists (
        select 1 from public.entitlements e where e.order_item_id = v_item.id
      ) then
        insert into public.entitlements (
          user_id, product_id, order_item_id, kind, status, ends_at, source, participant_id
        )
        values (
          v_order.beneficiary_user_id,
          v_item.product_id,
          v_item.id,
          'monthly',
          'active',
          timezone('utc', now()) + interval '1 month',
          'purchase',
          v_participant
        );
      end if;

    elsif v_item.price_option in ('course', 'workshop', 'online') then
      if not exists (
        select 1 from public.entitlements e where e.order_item_id = v_item.id
      ) then
        insert into public.entitlements (
          user_id, product_id, order_item_id, kind, status, source, participant_id
        )
        values (
          v_order.beneficiary_user_id,
          v_item.product_id,
          v_item.id,
          case
            when v_item.price_option = 'online' then 'online'
            when v_item.price_option = 'workshop' then 'workshop'
            else 'course'
          end,
          'active',
          'purchase',
          v_participant
        );
      end if;

      if v_is_online then
        insert into public.video_access (user_id, product_id, entitlement_id, participant_id)
        select
          v_order.beneficiary_user_id,
          v_item.product_id,
          e.id,
          null
        from public.entitlements e
        where e.order_item_id = v_item.id
        on conflict (user_id, product_id) do nothing;
      end if;
    end if;
  end loop;

  update public.orders
  set fulfilled_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
  where id = v_order.id
  returning * into v_order;

  return v_order;
end;
$$;

revoke all on function public.fulfill_paid_order(uuid) from public;
grant execute on function public.fulfill_paid_order(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 6. Consumo ingressi (presenze) — per pacchetto/partecipante, idempotente
-- ---------------------------------------------------------------------------
create table if not exists public.entry_consumptions (
  id uuid primary key default gen_random_uuid(),
  entry_pack_id uuid not null references public.entry_packs (id) on delete cascade,
  participant_id uuid references public.participants (id) on delete set null,
  recorded_by uuid not null references public.profiles (id),
  delta integer not null default 1 check (delta > 0),
  reason text not null default 'attendance',
  client_request_id text,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists entry_consumptions_idempotency_uidx
  on public.entry_consumptions (entry_pack_id, client_request_id)
  where client_request_id is not null;

create index if not exists entry_consumptions_pack_idx
  on public.entry_consumptions (entry_pack_id, created_at desc);

alter table public.entry_consumptions enable row level security;

drop policy if exists entry_consumptions_select_own_or_team on public.entry_consumptions;
create policy entry_consumptions_select_own_or_team
  on public.entry_consumptions for select
  using (
    public.is_team_zoe()
    or exists (
      select 1 from public.entry_packs ep
      where ep.id = entry_pack_id and ep.user_id = auth.uid()
    )
  );

-- insert solo Team Zoe (presenze in sede); scrittura anche via service_role
drop policy if exists entry_consumptions_team_insert on public.entry_consumptions;
create policy entry_consumptions_team_insert
  on public.entry_consumptions for insert
  with check (public.is_team_zoe());

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
      and client_request_id = p_client_request_id;
    if v_existing is not null then
      select * into v_pack from public.entry_packs where id = p_entry_pack_id;
      return v_pack;
    end if;
  end if;

  select * into v_pack from public.entry_packs where id = p_entry_pack_id for update;
  if not found then
    raise exception 'pack_not_found';
  end if;

  if v_pack.status <> 'active' then
    raise exception 'pack_not_active';
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

revoke all on function public.consume_entry_pack(uuid, integer, text, text) from public;
grant execute on function public.consume_entry_pack(uuid, integer, text, text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 7. Audit stati socio
-- ---------------------------------------------------------------------------
create table if not exists public.member_status_audit (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references public.profiles (id),
  target_user_id uuid not null references public.profiles (id),
  action text not null
    check (action in ('approve', 'reject', 'suspend', 'reactivate')),
  from_status text,
  to_status text not null
    check (to_status in ('pending', 'approved', 'rejected', 'suspended')),
  note text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  constraint member_status_audit_no_self check (admin_user_id <> target_user_id)
);

create index if not exists member_status_audit_target_idx
  on public.member_status_audit (target_user_id, created_at desc);

alter table public.member_status_audit enable row level security;

drop policy if exists member_status_audit_team_select on public.member_status_audit;
create policy member_status_audit_team_select
  on public.member_status_audit for select
  using (public.is_team_zoe());

-- ---------------------------------------------------------------------------
-- 8. Inviti (separati da approvazione; mai team_zoe)
-- ---------------------------------------------------------------------------
create table if not exists public.member_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  invited_by uuid not null references public.profiles (id),
  token_hash text not null,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'expired', 'revoked')),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_user_id uuid references public.profiles (id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists member_invites_email_idx on public.member_invites (lower(email));

drop trigger if exists member_invites_set_updated_at on public.member_invites;
create trigger member_invites_set_updated_at
before update on public.member_invites
for each row execute function public.set_updated_at();

alter table public.member_invites enable row level security;

drop policy if exists member_invites_team_select on public.member_invites;
create policy member_invites_team_select
  on public.member_invites for select
  using (public.is_team_zoe());

comment on table public.participants is
  'Partecipanti (es. minori) sotto un account guardian Auth; senza auth.users.';
comment on column public.order_items.participant_id is
  'Fonte autorevole beneficiario in presenza. NULL = titolare account. Online deve restare NULL.';
comment on column public.entry_packs.participant_id is
  'Pacchetto individuale per partecipante (o NULL = titolare).';
comment on column public.subscriptions.participant_id is
  'Abbonamento individuale per partecipante (o NULL = titolare).';
