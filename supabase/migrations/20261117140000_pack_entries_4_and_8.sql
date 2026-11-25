-- Pacchetti ingressi: 4 (pack5) o 8 (pack10). I nomi colonna/opzione restano per compatibilità.
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
      v_entries := case when v_item.price_option = 'pack5' then 4 else 8 end;
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
