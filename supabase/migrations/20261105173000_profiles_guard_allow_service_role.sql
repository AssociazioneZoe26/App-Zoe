-- Consenti aggiornamenti di role/status da service_role (Edge Functions admin),
-- mantenendo l'immutabilità per i client authenticated non team_zoe.

create or replace function public.profiles_guard_and_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := coalesce(auth.role(), '');
  v_can_manage boolean :=
    v_role = 'service_role'
    or current_user in ('postgres', 'supabase_admin')
    or public.is_team_zoe();
begin
  if tg_op = 'UPDATE' then
    -- Edge Functions (service_role), SQL admin, o Team Zoe possono cambiare role/status.
    if not v_can_manage then
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
