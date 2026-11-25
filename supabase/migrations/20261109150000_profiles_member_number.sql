-- Numero associato gestito da Team Zoe (non mostrato agli associati per ora).

alter table public.profiles
  add column if not exists member_number text;

comment on column public.profiles.member_number is
  'Numero tessera/associato assegnato da Team Zoe.';

create unique index if not exists profiles_member_number_unique
  on public.profiles (member_number)
  where member_number is not null and length(trim(member_number)) > 0;

create or replace function public.profiles_guard_and_sync()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_role text := coalesce(auth.role(), '');
  v_can_manage boolean :=
    v_role = 'service_role'
    or current_user in ('postgres', 'supabase_admin')
    or public.is_team_zoe();
begin
  if tg_op = 'UPDATE' then
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
      if new.member_number is distinct from old.member_number then
        raise exception 'profiles_member_number_immutable';
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
$function$;
