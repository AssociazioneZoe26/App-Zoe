-- APP ZOE commerce core: profiles, catalog, orders, entitlements, credits.
-- Manual activations remain distinct via payments.provider = 'manual'.

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profiles (Supabase Auth users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role text not null default 'member'
    check (role in ('member', 'team_zoe')),
  member_status text not null default 'pending'
    check (member_status in ('pending', 'approved', 'suspended')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists profiles_email_idx on public.profiles (lower(email));
create index if not exists profiles_role_status_idx on public.profiles (role, member_status);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role, member_status)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    case
      when coalesce(new.raw_app_meta_data ->> 'role', '') = 'team_zoe' then 'team_zoe'
      else 'member'
    end,
    case
      when coalesce(new.raw_app_meta_data ->> 'role', '') = 'team_zoe' then 'approved'
      else 'pending'
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_team_zoe()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'team_zoe',
    false
  )
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'team_zoe'
  );
$$;

-- ---------------------------------------------------------------------------
-- Products (catalog)
-- ---------------------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  eyebrow text not null default '',
  age text not null default '',
  kind text not null check (kind in ('laboratorio', 'corso', 'workshop', 'online')),
  audience text not null default 'Tutti' check (audience in ('Bambini', 'Tutti')),
  accent text not null default 'blue' check (accent in ('blue', 'yellow', 'teal', 'pink')),
  published boolean not null default false,
  preview_image text not null default '',
  preview_text text not null default '',
  full_text text not null default '',
  points text[] not null default '{}',
  mantra text not null default '',
  schedule text,
  time_label text,
  sessions text,
  place text not null default '',
  teacher text,
  course_video_url text,
  course_duration text,
  price_pack5 numeric(10, 2),
  price_pack10 numeric(10, 2),
  price_monthly numeric(10, 2),
  price_course numeric(10, 2),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint products_has_price check (
    price_pack5 is not null
    or price_pack10 is not null
    or price_monthly is not null
    or price_course is not null
    or published = false
  )
);

create index if not exists products_kind_published_idx on public.products (kind, published);

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Orders / payments
-- ---------------------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_user_id uuid not null references public.profiles (id),
  beneficiary_user_id uuid not null references public.profiles (id),
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed', 'cancelled', 'refunded')),
  currency text not null default 'eur',
  total_cents integer not null check (total_cents >= 0),
  fulfilled_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists orders_buyer_idx on public.orders (buyer_user_id, created_at desc);
create index if not exists orders_status_idx on public.orders (status);

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid not null references public.products (id),
  price_option text not null
    check (price_option in ('pack5', 'pack10', 'monthly', 'course', 'workshop', 'online')),
  unit_price_cents integer not null check (unit_price_cents >= 0),
  quantity integer not null default 1 check (quantity > 0),
  product_title_snapshot text not null,
  product_kind_snapshot text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists order_items_order_idx on public.order_items (order_id);
create index if not exists order_items_product_idx on public.order_items (product_id);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  provider text not null check (provider in ('mock', 'stripe', 'manual')),
  status text not null default 'pending'
    check (status in ('pending', 'succeeded', 'failed', 'refunded')),
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'eur',
  provider_session_id text,
  provider_payment_id text,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists payments_order_idx on public.payments (order_id);
create unique index if not exists payments_provider_session_uidx
  on public.payments (provider, provider_session_id)
  where provider_session_id is not null;

drop trigger if exists payments_set_updated_at on public.payments;
create trigger payments_set_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  event_type text not null,
  order_id uuid references public.orders (id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz not null default timezone('utc', now()),
  unique (provider, event_id)
);

-- ---------------------------------------------------------------------------
-- Access rights
-- ---------------------------------------------------------------------------
create table if not exists public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id),
  product_id uuid not null references public.products (id),
  order_item_id uuid references public.order_items (id) on delete set null,
  kind text not null check (kind in ('course', 'workshop', 'online', 'monthly')),
  status text not null default 'active' check (status in ('active', 'expired', 'revoked')),
  starts_at timestamptz not null default timezone('utc', now()),
  ends_at timestamptz,
  source text not null default 'purchase'
    check (source in ('purchase', 'manual', 'renewal')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists entitlements_order_item_uidx
  on public.entitlements (order_item_id)
  where order_item_id is not null;
create index if not exists entitlements_user_idx on public.entitlements (user_id, status);

drop trigger if exists entitlements_set_updated_at on public.entitlements;
create trigger entitlements_set_updated_at
before update on public.entitlements
for each row execute function public.set_updated_at();

create table if not exists public.entry_packs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id),
  product_id uuid not null references public.products (id),
  order_item_id uuid references public.order_items (id) on delete set null,
  entries_total integer not null check (entries_total > 0),
  entries_used integer not null default 0 check (entries_used >= 0),
  status text not null default 'active' check (status in ('active', 'exhausted', 'expired', 'revoked')),
  source text not null default 'purchase'
    check (source in ('purchase', 'manual', 'renewal')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint entry_packs_used_lte_total check (entries_used <= entries_total)
);

create unique index if not exists entry_packs_order_item_uidx
  on public.entry_packs (order_item_id)
  where order_item_id is not null;
create index if not exists entry_packs_user_idx on public.entry_packs (user_id, status);

drop trigger if exists entry_packs_set_updated_at on public.entry_packs;
create trigger entry_packs_set_updated_at
before update on public.entry_packs
for each row execute function public.set_updated_at();

create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  entry_pack_id uuid not null references public.entry_packs (id) on delete cascade,
  user_id uuid not null references public.profiles (id),
  delta integer not null,
  reason text not null,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists credit_ledger_pack_idx on public.credit_ledger (entry_pack_id, created_at desc);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id),
  product_id uuid not null references public.products (id),
  order_item_id uuid references public.order_items (id) on delete set null,
  status text not null default 'active'
    check (status in ('active', 'past_due', 'cancelled', 'expired')),
  current_period_start timestamptz not null default timezone('utc', now()),
  current_period_end timestamptz not null,
  provider text not null default 'mock' check (provider in ('mock', 'stripe', 'manual')),
  provider_subscription_id text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists subscriptions_order_item_uidx
  on public.subscriptions (order_item_id)
  where order_item_id is not null;
create index if not exists subscriptions_user_idx on public.subscriptions (user_id, status);

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

create table if not exists public.video_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id),
  product_id uuid not null references public.products (id),
  entitlement_id uuid not null references public.entitlements (id) on delete cascade,
  unlocked_at timestamptz not null default timezone('utc', now()),
  unique (user_id, product_id)
);

-- ---------------------------------------------------------------------------
-- fulfill_paid_order (idempotent)
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
    select * from public.order_items where order_id = v_order.id
  loop
    if v_item.price_option in ('pack5', 'pack10') then
      v_entries := case when v_item.price_option = 'pack5' then 5 else 10 end;
      if not exists (
        select 1 from public.entry_packs ep where ep.order_item_id = v_item.id
      ) then
        insert into public.entry_packs (
          user_id, product_id, order_item_id, entries_total, entries_used, status, source
        )
        values (
          v_order.beneficiary_user_id,
          v_item.product_id,
          v_item.id,
          v_entries * v_item.quantity,
          0,
          'active',
          'purchase'
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
          current_period_start, current_period_end, provider
        )
        values (
          v_order.beneficiary_user_id,
          v_item.product_id,
          v_item.id,
          'active',
          timezone('utc', now()),
          timezone('utc', now()) + interval '1 month',
          'mock'
        );
      end if;

      if not exists (
        select 1 from public.entitlements e where e.order_item_id = v_item.id
      ) then
        insert into public.entitlements (
          user_id, product_id, order_item_id, kind, status, ends_at, source
        )
        values (
          v_order.beneficiary_user_id,
          v_item.product_id,
          v_item.id,
          'monthly',
          'active',
          timezone('utc', now()) + interval '1 month',
          'purchase'
        );
      end if;

    elsif v_item.price_option in ('course', 'workshop', 'online') then
      if not exists (
        select 1 from public.entitlements e where e.order_item_id = v_item.id
      ) then
        insert into public.entitlements (
          user_id, product_id, order_item_id, kind, status, source
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
          'purchase'
        );
      end if;

      if v_item.price_option = 'online' or v_item.product_kind_snapshot = 'online' then
        insert into public.video_access (user_id, product_id, entitlement_id)
        select
          v_order.beneficiary_user_id,
          v_item.product_id,
          e.id
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
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.payment_events enable row level security;
alter table public.entitlements enable row level security;
alter table public.entry_packs enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.subscriptions enable row level security;
alter table public.video_access enable row level security;

-- profiles
create policy profiles_select_own_or_team
  on public.profiles for select
  using (id = auth.uid() or public.is_team_zoe());

create policy profiles_update_own
  on public.profiles for update
  using (id = auth.uid() or public.is_team_zoe())
  with check (id = auth.uid() or public.is_team_zoe());

create policy profiles_team_insert
  on public.profiles for insert
  with check (public.is_team_zoe() or id = auth.uid());

-- products: public read published; team manages all
create policy products_select_published_or_team
  on public.products for select
  using (published = true or public.is_team_zoe());

create policy products_team_write
  on public.products for all
  using (public.is_team_zoe())
  with check (public.is_team_zoe());

-- orders
create policy orders_select_own_or_team
  on public.orders for select
  using (buyer_user_id = auth.uid() or beneficiary_user_id = auth.uid() or public.is_team_zoe());

create policy orders_insert_own
  on public.orders for insert
  with check (buyer_user_id = auth.uid() and beneficiary_user_id = auth.uid());

create policy orders_team_update
  on public.orders for update
  using (public.is_team_zoe())
  with check (public.is_team_zoe());

-- order_items
create policy order_items_select_own_or_team
  on public.order_items for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (o.buyer_user_id = auth.uid() or o.beneficiary_user_id = auth.uid() or public.is_team_zoe())
    )
  );

create policy order_items_insert_own
  on public.order_items for insert
  with check (
    exists (
      select 1 from public.orders o
      where o.id = order_id and o.buyer_user_id = auth.uid() and o.status = 'pending'
    )
  );

-- payments
create policy payments_select_own_or_team
  on public.payments for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (o.buyer_user_id = auth.uid() or public.is_team_zoe())
    )
  );

create policy payments_team_all
  on public.payments for all
  using (public.is_team_zoe())
  with check (public.is_team_zoe());

-- payment_events: team only
create policy payment_events_team_all
  on public.payment_events for all
  using (public.is_team_zoe())
  with check (public.is_team_zoe());

-- entitlements / packs / ledger / subscriptions / video
create policy entitlements_select_own_or_team
  on public.entitlements for select
  using (user_id = auth.uid() or public.is_team_zoe());

create policy entitlements_team_write
  on public.entitlements for all
  using (public.is_team_zoe())
  with check (public.is_team_zoe());

create policy entry_packs_select_own_or_team
  on public.entry_packs for select
  using (user_id = auth.uid() or public.is_team_zoe());

create policy entry_packs_team_write
  on public.entry_packs for all
  using (public.is_team_zoe())
  with check (public.is_team_zoe());

create policy credit_ledger_select_own_or_team
  on public.credit_ledger for select
  using (user_id = auth.uid() or public.is_team_zoe());

create policy credit_ledger_team_write
  on public.credit_ledger for all
  using (public.is_team_zoe())
  with check (public.is_team_zoe());

create policy subscriptions_select_own_or_team
  on public.subscriptions for select
  using (user_id = auth.uid() or public.is_team_zoe());

create policy subscriptions_team_write
  on public.subscriptions for all
  using (public.is_team_zoe())
  with check (public.is_team_zoe());

create policy video_access_select_own_or_team
  on public.video_access for select
  using (user_id = auth.uid() or public.is_team_zoe());

create policy video_access_team_write
  on public.video_access for all
  using (public.is_team_zoe())
  with check (public.is_team_zoe());
