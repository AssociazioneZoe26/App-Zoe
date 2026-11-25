-- Tessera inserita a mano da Team Zoe; stesso numero fino a 2 account (es. madre e padre).

drop index if exists public.profiles_member_number_unique;

create index if not exists profiles_member_number_idx
  on public.profiles (member_number)
  where member_number is not null and length(trim(member_number)) > 0;

comment on column public.profiles.member_number is
  'Numero tessera assegnato a mano da Team Zoe in approvazione. Stesso numero al massimo su due account (es. madre e padre).';

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
  v_number text;
  v_others integer;
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

  v_number := nullif(trim(coalesce(new.member_number, '')), '');
  new.member_number := v_number;
  if v_number is not null then
    select count(*) into v_others
    from public.profiles p
    where p.id is distinct from new.id
      and p.member_number = v_number;
    if v_others >= 2 then
      raise exception 'profiles_member_number_max_accounts';
    end if;
  end if;

  return new;
end;
$function$;
