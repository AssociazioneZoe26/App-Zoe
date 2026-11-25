-- APP ZOE — hardening grants su funzioni SECURITY DEFINER.
-- Non modifica la logica; limita EXECUTE su RPC.
--
-- Classificazione:
--   service_role only: fulfill_paid_order (+ trigger-only non invocabili da client)
--   authenticated (+ service_role): consume_entry_pack (check interno is_team_zoe)
--   anon + authenticated: is_team_zoe (necessario alle policy RLS del catalogo pubblico)
--   authenticated: is_email_verified, is_approved_member (policy partecipanti)
--   no client RPC: handle_new_user, profiles_guard_and_sync, order_items_validate_participant
--   no anon RPC: participant_belongs_to_guardian (usata da trigger SECURITY DEFINER)

-- ---------------------------------------------------------------------------
-- 1. Pagamenti / fulfillment — solo service_role (Edge Functions)
-- ---------------------------------------------------------------------------
revoke all on function public.fulfill_paid_order(uuid) from public;
revoke all on function public.fulfill_paid_order(uuid) from anon;
revoke all on function public.fulfill_paid_order(uuid) from authenticated;
grant execute on function public.fulfill_paid_order(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 2. Presenze — Team Zoe autenticato (check in funzione) + service_role
-- ---------------------------------------------------------------------------
revoke all on function public.consume_entry_pack(uuid, integer, text, text) from public;
revoke all on function public.consume_entry_pack(uuid, integer, text, text) from anon;
grant execute on function public.consume_entry_pack(uuid, integer, text, text)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. Helper RLS — non revocare indiscriminatamente
-- ---------------------------------------------------------------------------
-- is_team_zoe: usata anche da policy pubbliche (es. products published OR team)
revoke all on function public.is_team_zoe() from public;
grant execute on function public.is_team_zoe() to anon, authenticated, service_role;

revoke all on function public.is_email_verified() from public;
revoke all on function public.is_email_verified() from anon;
grant execute on function public.is_email_verified() to authenticated, service_role;

revoke all on function public.is_approved_member() from public;
revoke all on function public.is_approved_member() from anon;
grant execute on function public.is_approved_member() to authenticated, service_role;

-- Usata dal trigger order_items_validate_participant (SECURITY DEFINER):
-- il client non deve invocarla via RPC.
revoke all on function public.participant_belongs_to_guardian(uuid, uuid) from public;
revoke all on function public.participant_belongs_to_guardian(uuid, uuid) from anon;
revoke all on function public.participant_belongs_to_guardian(uuid, uuid) from authenticated;
grant execute on function public.participant_belongs_to_guardian(uuid, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 4. Solo trigger — non esporre via PostgREST RPC
-- ---------------------------------------------------------------------------
revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon;
revoke all on function public.handle_new_user() from authenticated;

revoke all on function public.profiles_guard_and_sync() from public;
revoke all on function public.profiles_guard_and_sync() from anon;
revoke all on function public.profiles_guard_and_sync() from authenticated;

revoke all on function public.order_items_validate_participant() from public;
revoke all on function public.order_items_validate_participant() from anon;
revoke all on function public.order_items_validate_participant() from authenticated;

-- ---------------------------------------------------------------------------
-- 5. Advisor: search_path su set_updated_at (non SECURITY DEFINER, ma usato dai trigger)
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;
