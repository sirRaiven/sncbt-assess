-- Phase 2: self-registration identity hardening.
--
-- Goals:
--   * Student and Instructor self-registration no longer depends on Admin review.
--   * Duplicate identity preflight can inspect Auth + split-profile records only
--     through the service role.
--   * The Auth trigger remains authoritative for the role actually written to
--     public.accounts and never trusts raw user metadata for Admin promotion.
--   * Existing valid pending Instructor accounts are activated because there is
--     no longer an Admin approval workflow.
--   * New classrooms require enrollment approval by default.

begin;

create or replace function public.registration_identity_conflict(
  p_email text,
  p_student_number text default null,
  p_employee_number text default null
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  with normalized as (
    select
      lower(btrim(coalesce(p_email, ''))) as email,
      nullif(btrim(coalesce(p_student_number, '')), '') as student_number,
      nullif(upper(btrim(coalesce(p_employee_number, ''))), '') as employee_number
  )
  select
    exists (
      select 1
      from auth.users as auth_user
      cross join normalized
      where auth_user.email is not null
        and lower(btrim(auth_user.email)) = normalized.email
    )
    or exists (
      select 1
      from public.accounts as account
      cross join normalized
      where account.email is not null
        and lower(btrim(account.email)) = normalized.email
    )
    or exists (
      select 1
      from public.student_profiles as student_profile
      cross join normalized
      where normalized.student_number is not null
        and btrim(student_profile.student_number) = normalized.student_number
    )
    or exists (
      select 1
      from public.instructor_profiles as instructor_profile
      cross join normalized
      where normalized.employee_number is not null
        and upper(btrim(instructor_profile.employee_number)) = normalized.employee_number
    );
$function$;

revoke all on function public.registration_identity_conflict(text, text, text)
  from public;
revoke all on function public.registration_identity_conflict(text, text, text)
  from anon;
revoke all on function public.registration_identity_conflict(text, text, text)
  from authenticated;
grant execute on function public.registration_identity_conflict(text, text, text)
  to service_role;

create or replace function public.handle_new_auth_user_split_profiles()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  requested_role_value public.user_role;
  approved_role_value public.user_role;
  status_value public.account_status;
  first_name_value text;
  middle_name_value text;
  last_name_value text;
  student_number_value text;
  employee_number_value text;
  trusted_admin_role text;
begin
  trusted_admin_role := lower(coalesce(new.raw_app_meta_data ->> 'role', ''));

  if trusted_admin_role = 'admin' then
    requested_role_value := 'admin';
    approved_role_value := 'admin';
    status_value := 'active';
  elsif lower(coalesce(new.raw_user_meta_data ->> 'requested_role', 'student')) = 'instructor' then
    requested_role_value := 'instructor';
    approved_role_value := 'instructor';
    status_value := 'active';
  else
    requested_role_value := 'student';
    approved_role_value := 'student';
    status_value := 'active';
  end if;

  first_name_value := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'first_name', '')), '');
  middle_name_value := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'middle_name', '')), '');
  last_name_value := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'last_name', '')), '');

  insert into public.accounts (
    id,
    email,
    role,
    requested_role,
    account_status,
    created_at,
    updated_at
  ) values (
    new.id,
    lower(new.email),
    approved_role_value,
    requested_role_value,
    status_value,
    coalesce(new.created_at, now()),
    now()
  )
  on conflict (id) do update set
    email = excluded.email,
    updated_at = now();

  if requested_role_value = 'student' then
    student_number_value := btrim(coalesce(new.raw_user_meta_data ->> 'student_number', ''));

    if student_number_value !~ '^[0-9]+(-[0-9]+)?$' then
      raise exception 'Invalid Student Number. Accepted examples include 2501021 and 26-12345.'
        using errcode = '22023';
    end if;

    insert into public.student_profiles (
      user_id,
      student_number,
      first_name,
      middle_name,
      last_name,
      avatar_url,
      created_at,
      updated_at
    ) values (
      new.id,
      student_number_value,
      first_name_value,
      middle_name_value,
      last_name_value,
      null,
      coalesce(new.created_at, now()),
      now()
    )
    on conflict (user_id) do update set
      student_number = excluded.student_number,
      first_name = excluded.first_name,
      middle_name = excluded.middle_name,
      last_name = excluded.last_name,
      updated_at = now();

  elsif requested_role_value = 'instructor' then
    employee_number_value := upper(btrim(coalesce(new.raw_user_meta_data ->> 'employee_number', '')));

    if employee_number_value !~ '^[A-Z][A-Z0-9]*(-[A-Z0-9]+)?$' then
      raise exception 'Invalid Employee Number. Use letters/numbers with an optional single hyphen, such as F26-123.'
        using errcode = '22023';
    end if;

    insert into public.instructor_profiles (
      user_id,
      employee_number,
      first_name,
      middle_name,
      last_name,
      avatar_url,
      created_at,
      updated_at
    ) values (
      new.id,
      employee_number_value,
      first_name_value,
      middle_name_value,
      last_name_value,
      null,
      coalesce(new.created_at, now()),
      now()
    )
    on conflict (user_id) do update set
      employee_number = excluded.employee_number,
      first_name = excluded.first_name,
      middle_name = excluded.middle_name,
      last_name = excluded.last_name,
      updated_at = now();

  else
    insert into public.admin_profiles (
      user_id,
      first_name,
      middle_name,
      last_name,
      avatar_url,
      created_at,
      updated_at
    ) values (
      new.id,
      first_name_value,
      middle_name_value,
      last_name_value,
      null,
      coalesce(new.created_at, now()),
      now()
    )
    on conflict (user_id) do update set
      first_name = excluded.first_name,
      middle_name = excluded.middle_name,
      last_name = excluded.last_name,
      updated_at = now();
  end if;

  return new;
end;
$function$;

-- Existing Instructor accounts that were waiting for a now-removed Admin
-- approval workflow become usable if their Instructor profile is complete.
update public.accounts as account
set
  role = 'instructor'::public.user_role,
  requested_role = 'instructor'::public.user_role,
  account_status = 'active'::public.account_status,
  updated_at = now()
where account.account_status = 'pending'::public.account_status
  and account.requested_role = 'instructor'::public.user_role
  and exists (
    select 1
    from public.instructor_profiles as instructor_profile
    where instructor_profile.user_id = account.id
      and instructor_profile.employee_number is not null
      and btrim(instructor_profile.employee_number) <> ''
  );

alter table public.classrooms
  alter column join_requires_approval set default true;

commit;
