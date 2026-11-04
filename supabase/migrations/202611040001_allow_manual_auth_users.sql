alter table public.profiles drop constraint if exists profiles_check;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_username text;
  v_full_name text;
  v_program_id uuid;
  v_program_code text;
begin
  v_username := nullif(trim(new.raw_user_meta_data ->> 'username'), '');
  v_full_name := nullif(trim(new.raw_user_meta_data ->> 'full_name'), '');
  v_program_code := nullif(trim(new.raw_user_meta_data ->> 'program_code'), '');

  -- Auth Dashboard-created users commonly have no user_metadata. Give them a
  -- usable placeholder profile, then let an admin assign their proper details.
  v_username := coalesce(
    v_username,
    nullif(regexp_replace(coalesce(new.phone, ''), '[^0-9]', '', 'g'), ''),
    'user_' || left(replace(new.id::text, '-', ''), 12)
  );
  v_full_name := coalesce(
    v_full_name,
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    'New user'
  );

  if v_program_code is not null then
    select p.id
      into v_program_id
      from public.programs as p
     where p.code = v_program_code
       and p.is_active;

    if v_program_id is null then
      raise exception 'The selected program is not available';
    end if;
  end if;

  insert into public.profiles (user_id, username, full_name, phone_number, phone_verified_at, program_id)
  values (new.id, v_username, v_full_name, new.phone, new.phone_confirmed_at, v_program_id);

  return new;
end;
$$;
