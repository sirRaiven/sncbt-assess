-- SNCBT Assess — Phase 2B Authorization / RLS Access-Surface Audit
-- READ-ONLY. Safe to run in the Supabase SQL Editor.
--
-- Review goals:
--   1. Every exposed public table should have RLS enabled.
--   2. Browser grants/policies should be least privilege.
--   3. SECURITY DEFINER functions must be reviewed carefully.
--   4. anon/authenticated should not retain EXECUTE on privileged functions
--      that are now server-mediated by Edge Functions.

-- -----------------------------------------------------------------------------
-- A. RLS state for SNCBT Assess public tables
-- -----------------------------------------------------------------------------
with expected(table_name) as (
  values
    ('accounts'),
    ('admin_profiles'),
    ('assessment_assignments'),
    ('assessment_attempts'),
    ('assessment_import_rows'),
    ('assessment_imports'),
    ('assessment_integrity_events'),
    ('assessment_sessions'),
    ('assessments'),
    ('attempt_answer_options'),
    ('attempt_answers'),
    ('attempt_question_states'),
    ('audit_logs'),
    ('classroom_members'),
    ('classrooms'),
    ('instructor_profiles'),
    ('question_options'),
    ('questions'),
    ('session_participants'),
    ('student_profiles')
)
select
  expected.table_name,
  case when cls.oid is null then false else true end as table_exists,
  coalesce(cls.relrowsecurity, false) as rls_enabled,
  coalesce(cls.relforcerowsecurity, false) as force_rls
from expected
left join pg_catalog.pg_class as cls
  on cls.relname = expected.table_name
left join pg_catalog.pg_namespace as nsp
  on nsp.oid = cls.relnamespace
 and nsp.nspname = 'public'
order by expected.table_name;

-- -----------------------------------------------------------------------------
-- B. All RLS policies on SNCBT Assess tables
-- -----------------------------------------------------------------------------
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_catalog.pg_policies
where schemaname = 'public'
  and tablename in (
    'accounts',
    'admin_profiles',
    'assessment_assignments',
    'assessment_attempts',
    'assessment_import_rows',
    'assessment_imports',
    'assessment_integrity_events',
    'assessment_sessions',
    'assessments',
    'attempt_answer_options',
    'attempt_answers',
    'attempt_question_states',
    'audit_logs',
    'classroom_members',
    'classrooms',
    'instructor_profiles',
    'question_options',
    'questions',
    'session_participants',
    'student_profiles'
  )
order by tablename, cmd, policyname;

-- -----------------------------------------------------------------------------
-- C. Direct table privileges granted to browser-facing roles
-- -----------------------------------------------------------------------------
select
  table_schema,
  table_name,
  grantee,
  privilege_type,
  is_grantable
from information_schema.table_privileges
where table_schema = 'public'
  and grantee in ('anon', 'authenticated', 'PUBLIC')
order by table_name, grantee, privilege_type;

-- -----------------------------------------------------------------------------
-- D. SECURITY DEFINER functions and browser EXECUTE privileges
-- -----------------------------------------------------------------------------
select
  nsp.nspname as schema_name,
  proc.proname as function_name,
  pg_get_function_identity_arguments(proc.oid) as arguments,
  pg_get_userbyid(proc.proowner) as owner_name,
  proc.prosecdef as security_definer,
  proc.proconfig as function_settings,
  has_function_privilege('anon', proc.oid, 'EXECUTE') as anon_can_execute,
  has_function_privilege('authenticated', proc.oid, 'EXECUTE') as authenticated_can_execute
from pg_catalog.pg_proc as proc
join pg_catalog.pg_namespace as nsp
  on nsp.oid = proc.pronamespace
where nsp.nspname in ('public', 'private')
  and proc.prosecdef
order by nsp.nspname, proc.proname, arguments;

-- -----------------------------------------------------------------------------
-- E. All public functions that anon/authenticated can execute
-- -----------------------------------------------------------------------------
select
  proc.proname as function_name,
  pg_get_function_identity_arguments(proc.oid) as arguments,
  proc.prosecdef as security_definer,
  has_function_privilege('anon', proc.oid, 'EXECUTE') as anon_can_execute,
  has_function_privilege('authenticated', proc.oid, 'EXECUTE') as authenticated_can_execute
from pg_catalog.pg_proc as proc
join pg_catalog.pg_namespace as nsp
  on nsp.oid = proc.pronamespace
where nsp.nspname = 'public'
  and (
    has_function_privilege('anon', proc.oid, 'EXECUTE')
    or has_function_privilege('authenticated', proc.oid, 'EXECUTE')
  )
order by proc.proname, arguments;

-- -----------------------------------------------------------------------------
-- F. Views in public schema. Review whether security_invoker is enabled where
--    a view is intentionally exposed to browser roles.
-- -----------------------------------------------------------------------------
select
  nsp.nspname as schema_name,
  cls.relname as view_name,
  case cls.relkind
    when 'v' then 'view'
    when 'm' then 'materialized_view'
    else cls.relkind::text
  end as object_type,
  cls.reloptions
from pg_catalog.pg_class as cls
join pg_catalog.pg_namespace as nsp
  on nsp.oid = cls.relnamespace
where nsp.nspname = 'public'
  and cls.relkind in ('v', 'm')
order by cls.relname;

-- -----------------------------------------------------------------------------
-- G. Focused identity/profile policy check.
-- The current Nuxt client directly reads only these identity tables.
-- Expected: authenticated users should only be able to read their own row.
-- -----------------------------------------------------------------------------
select
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_catalog.pg_policies
where schemaname = 'public'
  and tablename in (
    'accounts',
    'student_profiles',
    'instructor_profiles',
    'admin_profiles'
  )
order by tablename, cmd, policyname;
