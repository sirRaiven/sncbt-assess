-- SNCBT-AMS Phase 1 verification (READ ONLY)
-- Run in the Supabase SQL Editor after applying
-- 20260910040000_phase1_database_authorization_hardening.sql.
--
-- Expected final summary:
--   anon_executable_functions                    = 0
--   unexpected_authenticated_executable_functions = 0
--   service_role_missing_execute                 = 0
--   unsafe_security_definer_search_paths         = 0
--
-- The only public functions intentionally executable by authenticated are:
--   public.current_user_role()
--   public.current_account_status()

-- 1) Detailed privilege/search-path inventory.
with public_functions as (
  select
    p.oid,
    p.proname,
    pg_get_function_identity_arguments(p.oid) as identity_arguments,
    p.prosecdef,
    has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
    has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute,
    has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role_can_execute,
    coalesce(
      (
        select split_part(setting, '=', 2)
        from unnest(coalesce(p.proconfig, '{}'::text[])) as setting
        where setting like 'search_path=%'
        limit 1
      ),
      '<missing>'
    ) as configured_search_path
  from pg_proc as p
  join pg_namespace as n
    on n.oid = p.pronamespace
  where n.nspname = 'public'
)
select
  proname,
  identity_arguments,
  prosecdef as security_definer,
  anon_can_execute,
  authenticated_can_execute,
  service_role_can_execute,
  configured_search_path
from public_functions
order by proname, identity_arguments;

-- 2) Violations only. This result set should return ZERO rows.
with public_functions as (
  select
    p.oid,
    p.proname,
    pg_get_function_identity_arguments(p.oid) as identity_arguments,
    p.prosecdef,
    has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
    has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute,
    has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role_can_execute,
    coalesce(
      (
        select split_part(setting, '=', 2)
        from unnest(coalesce(p.proconfig, '{}'::text[])) as setting
        where setting like 'search_path=%'
        limit 1
      ),
      '<missing>'
    ) as configured_search_path
  from pg_proc as p
  join pg_namespace as n
    on n.oid = p.pronamespace
  where n.nspname = 'public'
), violations as (
  select
    proname,
    identity_arguments,
    case
      when anon_can_execute then 'anon can execute public function'
      when authenticated_can_execute
        and not (
          identity_arguments = ''
          and proname in ('current_user_role', 'current_account_status')
        )
        then 'authenticated can execute non-approved public function'
      when not service_role_can_execute then 'service_role is missing execute privilege'
      when prosecdef
        and configured_search_path not in ('', '""')
        then 'SECURITY DEFINER search_path is not empty'
      else null
    end as violation
  from public_functions
)
select proname, identity_arguments, violation
from violations
where violation is not null
order by violation, proname, identity_arguments;

-- 3) Compact summary. Every violation count must be zero.
with public_functions as (
  select
    p.oid,
    p.proname,
    pg_get_function_identity_arguments(p.oid) as identity_arguments,
    p.prosecdef,
    has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
    has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute,
    has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role_can_execute,
    coalesce(
      (
        select split_part(setting, '=', 2)
        from unnest(coalesce(p.proconfig, '{}'::text[])) as setting
        where setting like 'search_path=%'
        limit 1
      ),
      '<missing>'
    ) as configured_search_path
  from pg_proc as p
  join pg_namespace as n
    on n.oid = p.pronamespace
  where n.nspname = 'public'
)
select 'anon_executable_functions' as check_name,
       count(*)::bigint as violation_count
from public_functions
where anon_can_execute
union all
select 'unexpected_authenticated_executable_functions',
       count(*)::bigint
from public_functions
where authenticated_can_execute
  and not (
    identity_arguments = ''
    and proname in ('current_user_role', 'current_account_status')
  )
union all
select 'service_role_missing_execute',
       count(*)::bigint
from public_functions
where not service_role_can_execute
union all
select 'unsafe_security_definer_search_paths',
       count(*)::bigint
from public_functions
where prosecdef
  and configured_search_path not in ('', '""')
order by check_name;

-- 4) Confirm the two authenticated RLS helper exceptions specifically.
select
  p.oid::regprocedure::text as function_name,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
  has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role_can_execute
from pg_proc as p
join pg_namespace as n
  on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('current_user_role', 'current_account_status')
  and pg_get_function_identity_arguments(p.oid) = ''
order by p.proname;
