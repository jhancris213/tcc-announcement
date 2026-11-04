begin;

create table if not exists public.departments (
  code text primary key,
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  department_code text not null references public.departments(code) on update cascade on delete restrict,
  name text not null,
  major text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (department_code, name, major)
);

insert into public.departments (code, name) values
  ('EDU', 'College of Education'),
  ('HM', 'Hospitality Management'),
  ('IT', 'Information Technology'),
  ('BUS', 'Business Administration')
on conflict (code) do update set
  name = excluded.name,
  updated_at = now();

insert into public.programs (code, department_code, name, major) values
  ('BEEd', 'EDU', 'Bachelor of Elementary Education (BEEd)', null),
  ('BSEd-English', 'EDU', 'Bachelor of Secondary Education (BSEd)', 'English'),
  ('BSEd-Filipino', 'EDU', 'Bachelor of Secondary Education (BSEd)', 'Filipino'),
  ('BSEd-Mathematics', 'EDU', 'Bachelor of Secondary Education (BSEd)', 'Mathematics'),
  ('BSEd-Social-Studies', 'EDU', 'Bachelor of Secondary Education (BSEd)', 'Social Studies'),
  ('BSEd-Science', 'EDU', 'Bachelor of Secondary Education (BSEd)', 'Science'),
  ('BSHM', 'HM', 'Bachelor of Science in Hospitality Management (BSHM)', null),
  ('InTech-Computer', 'IT', 'Bachelor of Science in Industrial Technology (BS InTech)', 'Computer Technology'),
  ('InTech-Electronics', 'IT', 'Bachelor of Science in Industrial Technology (BS InTech)', 'Electronics Technology'),
  ('BSBA', 'BUS', 'Bachelor of Science in Business Administration (BSBA)', null),
  ('BSIS', 'IT', 'Bachelor of Science in Information Systems (BSIS)', null),
  ('BPEd', 'EDU', 'Bachelor of Physical Education (BPEd)', null)
on conflict (code) do update set
  department_code = excluded.department_code,
  name = excluded.name,
  major = excluded.major,
  updated_at = now();

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  full_name text not null,
  phone_number text,
  phone_verified_at timestamptz,
  program_id uuid references public.programs(id) on update cascade on delete set null,
  role text not null default 'student' check (role in ('student', 'admin')),
  sms_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (phone_number is null or phone_number ~ '^\+[1-9][0-9]{7,14}$')
);

-- Manually-created Auth users can be assigned a program after their profile exists.
alter table public.profiles drop constraint if exists profiles_check;

create unique index if not exists profiles_username_lower_uidx
  on public.profiles (lower(username));

create unique index if not exists profiles_phone_number_uidx
  on public.profiles (phone_number)
  where phone_number is not null;

create index if not exists profiles_program_id_idx
  on public.profiles (program_id);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references public.profiles(user_id) on delete set null,
  title text not null check (length(trim(title)) between 1 and 90),
  message text not null check (length(trim(message)) between 1 and 500),
  kind text not null check (kind in ('info', 'event', 'critical')),
  status text not null default 'draft' check (status in ('draft', 'sent', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists announcements_status_created_idx
  on public.announcements (status, created_at desc);

create table if not exists public.announcement_audiences (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  scope text not null check (scope in ('all', 'department', 'program')),
  department_code text references public.departments(code) on update cascade on delete restrict,
  program_id uuid references public.programs(id) on update cascade on delete restrict,
  created_at timestamptz not null default now(),
  check (
    (scope = 'all' and department_code is null and program_id is null)
    or (scope = 'department' and department_code is not null and program_id is null)
    or (scope = 'program' and department_code is null and program_id is not null)
  )
);

create unique index if not exists announcement_audiences_all_uidx
  on public.announcement_audiences (announcement_id)
  where scope = 'all';

create unique index if not exists announcement_audiences_department_uidx
  on public.announcement_audiences (announcement_id, department_code)
  where scope = 'department';

create unique index if not exists announcement_audiences_program_uidx
  on public.announcement_audiences (announcement_id, program_id)
  where scope = 'program';

create index if not exists announcement_audiences_department_idx
  on public.announcement_audiences (department_code)
  where scope = 'department';

create index if not exists announcement_audiences_program_idx
  on public.announcement_audiences (program_id)
  where scope = 'program';

create table if not exists public.announcement_deliveries (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  recipient_id uuid not null references public.profiles(user_id) on delete cascade,
  phone_number text not null,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed')),
  provider_message_id text,
  error_message text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (announcement_id, recipient_id),
  check (phone_number ~ '^\+[1-9][0-9]{7,14}$')
);

create index if not exists announcement_deliveries_recipient_idx
  on public.announcement_deliveries (recipient_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger departments_set_updated_at
before update on public.departments
for each row execute function public.set_updated_at();

create trigger programs_set_updated_at
before update on public.programs
for each row execute function public.set_updated_at();

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger announcements_set_updated_at
before update on public.announcements
for each row execute function public.set_updated_at();

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

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

create or replace function public.sync_auth_phone_to_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
     set phone_number = new.phone,
         phone_verified_at = new.phone_confirmed_at
   where user_id = new.id;

  return new;
end;
$$;

create trigger on_auth_user_phone_updated
after update of phone, phone_confirmed_at on auth.users
for each row
when (old.phone is distinct from new.phone or old.phone_confirmed_at is distinct from new.phone_confirmed_at)
execute function public.sync_auth_phone_to_profile();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.profiles as p
     where p.user_id = (select auth.uid())
       and p.role = 'admin'
  );
$$;

create or replace function public.can_read_audience(
  p_announcement_id uuid,
  p_scope text,
  p_department_code text,
  p_program_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_admin()
      or (
        exists (
          select 1
            from public.announcements as a
           where a.id = p_announcement_id
             and a.status = 'sent'
        )
        and (
          p_scope = 'all'
          or exists (
            select 1
              from public.profiles as viewer
              join public.programs as viewer_program
                on viewer_program.id = viewer.program_id
             where viewer.user_id = (select auth.uid())
               and (
                 (p_scope = 'department' and viewer_program.department_code = p_department_code)
                 or (p_scope = 'program' and viewer.program_id = p_program_id)
               )
          )
        )
      );
$$;

create or replace function public.can_read_announcement(p_announcement_id uuid, p_status text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_admin()
      or (
        p_status = 'sent'
        and exists (
          select 1
            from public.announcement_audiences as aa
           where aa.announcement_id = p_announcement_id
             and public.can_read_audience(aa.announcement_id, aa.scope, aa.department_code, aa.program_id)
        )
      );
$$;

alter table public.departments enable row level security;
alter table public.programs enable row level security;
alter table public.profiles enable row level security;
alter table public.announcements enable row level security;
alter table public.announcement_audiences enable row level security;
alter table public.announcement_deliveries enable row level security;

create policy departments_read_active
on public.departments for select to authenticated
using (is_active or public.is_admin());

create policy departments_admin_manage
on public.departments for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy programs_read_active
on public.programs for select to authenticated
using (is_active or public.is_admin());

create policy programs_admin_manage
on public.programs for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy profiles_read_self_or_admin
on public.profiles for select to authenticated
using (user_id = (select auth.uid()) or public.is_admin());

create policy profiles_update_self
on public.profiles for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()) and role = 'student');

create policy announcements_read_audience
on public.announcements for select to authenticated
using (public.can_read_announcement(id, status));

create policy announcements_admin_manage
on public.announcements for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy announcement_audiences_read_matching
on public.announcement_audiences for select to authenticated
using (public.can_read_audience(announcement_id, scope, department_code, program_id));

create policy announcement_audiences_admin_manage
on public.announcement_audiences for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy announcement_deliveries_read_own_or_admin
on public.announcement_deliveries for select to authenticated
using (recipient_id = (select auth.uid()) or public.is_admin());

revoke all on public.departments, public.programs, public.profiles,
  public.announcements, public.announcement_audiences,
  public.announcement_deliveries from anon, authenticated;

grant select on public.departments, public.programs, public.profiles,
  public.announcements, public.announcement_audiences,
  public.announcement_deliveries to authenticated;

grant insert, update, delete on public.departments, public.programs,
  public.announcements, public.announcement_audiences to authenticated;

grant update (full_name, sms_opt_in) on public.profiles to authenticated;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.can_read_audience(uuid, text, text, uuid) to authenticated;
grant execute on function public.can_read_announcement(uuid, text) to authenticated;

revoke all on function public.handle_new_auth_user() from public, anon, authenticated;
revoke all on function public.sync_auth_phone_to_profile() from public, anon, authenticated;

commit;

-- Promote a trusted, already-registered account to admin manually:
-- update public.profiles set role = 'admin' where username = 'your-admin-username';
-- Never expose the service_role key or permit users to edit their own role.
