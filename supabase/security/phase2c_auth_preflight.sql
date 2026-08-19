-- SNCBT Assess — Phase 2C Authentication preflight (READ ONLY)
-- Run in Supabase SQL Editor before enabling stricter hosted Auth settings.

-- 1. Existing email-confirmation state.
select
  count(*) as total_auth_users,
  count(*) filter (where email_confirmed_at is not null) as confirmed_users,
  count(*) filter (where email_confirmed_at is null) as unconfirmed_users
from auth.users;

-- 2. Show unconfirmed users without exposing password/token material.
select
  u.id,
  u.email,
  a.role,
  a.account_status,
  u.created_at,
  u.last_sign_in_at
from auth.users as u
left join public.accounts as a
  on a.id = u.id
where u.email_confirmed_at is null
order by u.created_at desc;

-- 3. Verify account/auth email linkage and look for missing emails.
select
  count(*) filter (where a.email is null or btrim(a.email) = '')
    as accounts_missing_email,
  count(*) filter (where u.email is null or btrim(u.email) = '')
    as auth_users_missing_email,
  count(*) filter (
    where lower(coalesce(a.email, '')) <> lower(coalesce(u.email, ''))
  ) as account_auth_email_mismatches
from public.accounts as a
join auth.users as u
  on u.id = a.id;

-- 4. Check duplicate institutional identifiers used by the sign-in resolver.
select
  student_number,
  count(*) as duplicate_count
from public.student_profiles
where student_number is not null
  and btrim(student_number) <> ''
group by student_number
having count(*) > 1
order by duplicate_count desc, student_number;

select
  upper(employee_number) as employee_number,
  count(*) as duplicate_count
from public.instructor_profiles
where employee_number is not null
  and btrim(employee_number) <> ''
group by upper(employee_number)
having count(*) > 1
order by duplicate_count desc, employee_number;
