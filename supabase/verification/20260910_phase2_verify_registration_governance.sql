-- Phase 2 live verification: Authentication, identity and account governance.
-- Read-only. Run in Supabase SQL Editor after applying the Phase 2 migration.

with function_check as (
  select to_regprocedure(
    'public.registration_identity_conflict(text,text,text)'
  ) as function_oid
),
public_execute_check as (
  select exists (
    select 1
    from pg_proc as procedure
    cross join lateral aclexplode(
      coalesce(
        procedure.proacl,
        acldefault('f', procedure.proowner)
      )
    ) as acl
    where procedure.oid = (
      select function_oid
      from function_check
    )
      and acl.grantee = 0
      and acl.privilege_type = 'EXECUTE'
  ) as public_can_execute
)
select
  'registration_identity_conflict_exists' as check_name,
  (function_oid is not null) as passed,
  coalesce(function_oid::text, 'missing') as details
from function_check

union all

select
  'registration_check_not_public',
  not public_can_execute,
  'PUBLIC must not execute registration identity checks'
from public_execute_check

union all

select
  'registration_check_not_anon',
  not has_function_privilege(
    'anon',
    'public.registration_identity_conflict(text,text,text)',
    'EXECUTE'
  ),
  'anon must not execute registration identity checks directly'

union all

select
  'registration_check_not_authenticated',
  not has_function_privilege(
    'authenticated',
    'public.registration_identity_conflict(text,text,text)',
    'EXECUTE'
  ),
  'authenticated browser users must not execute registration identity checks directly'

union all

select
  'registration_check_service_role',
  has_function_privilege(
    'service_role',
    'public.registration_identity_conflict(text,text,text)',
    'EXECUTE'
  ),
  'service_role must execute the duplicate check for the Edge Function'

union all

select
  'auth_signup_trigger_exists',
  exists (
    select 1
    from pg_trigger as trigger_row
    join pg_class as relation
      on relation.oid = trigger_row.tgrelid
    join pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where trigger_row.tgname = 'on_auth_user_created_split_profiles'
      and namespace.nspname = 'auth'
      and relation.relname = 'users'
      and not trigger_row.tgisinternal
  ),
  'auth.users must retain the split-profile creation trigger'

union all

select
  'instructor_signup_is_active',
  position(
    'approved_role_value := ''instructor'''
    in pg_get_functiondef(
      'public.handle_new_auth_user_split_profiles()'::regprocedure
    )
  ) > 0
  and position(
    'status_value := ''active'''
    in pg_get_functiondef(
      'public.handle_new_auth_user_split_profiles()'::regprocedure
    )
  ) > 0,
  'new Instructor registration must write instructor/active'

union all

select
  'classroom_approval_default_true',
  coalesce(
    (
      select column_default = 'true'
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'classrooms'
        and column_name = 'join_requires_approval'
    ),
    false
  ),
  coalesce(
    (
      select column_default
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'classrooms'
        and column_name = 'join_requires_approval'
    ),
    'missing'
  )

union all

select
  'student_number_unique_index',
  exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'student_profiles'
      and indexname = 'student_profiles_student_number_key'
      and indexdef ilike 'CREATE UNIQUE INDEX%'
  ),
  'student_profiles.student_number must remain unique'

union all

select
  'employee_number_unique_index',
  exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'instructor_profiles'
      and indexname = 'instructor_profiles_employee_number_key'
      and indexdef ilike 'CREATE UNIQUE INDEX%'
  ),
  'instructor_profiles.employee_number must remain unique'

order by check_name;

-- Informational checks. These result sets do not change data.
select
  count(*)::integer as valid_pending_instructor_accounts_remaining
from public.accounts as account
where account.account_status = 'pending'::public.account_status
  and account.requested_role = 'instructor'::public.user_role
  and exists (
    select 1
    from public.instructor_profiles as instructor_profile
    where instructor_profile.user_id = account.id
      and instructor_profile.employee_number is not null
      and btrim(instructor_profile.employee_number) <> ''
  );

select
  lower(btrim(email)) as normalized_email,
  count(*)::integer as account_count
from public.accounts
where email is not null
  and btrim(email) <> ''
group by lower(btrim(email))
having count(*) > 1
order by account_count desc, normalized_email;
