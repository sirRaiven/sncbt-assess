-- SNCBT Assess - Phase 2 RLS / privilege audit
-- Read-only diagnostic queries. Safe to run in the Supabase SQL Editor.
-- Review every result before changing any policy or grant.

-- 1) Public tables and whether RLS is enabled/forced, plus policy count.
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced,
  count(p.policyname) as policy_count
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policies p
  on p.schemaname = n.nspname
 and p.tablename = c.relname
where n.nspname = 'public'
  and c.relkind in ('r', 'p')
group by n.nspname, c.relname, c.relrowsecurity, c.relforcerowsecurity
order by c.relrowsecurity asc, c.relname;

-- 2) BLOCKER: exposed public tables with RLS disabled.
select
  n.nspname as schema_name,
  c.relname as table_name
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('r', 'p')
  and not c.relrowsecurity
order by c.relname;

-- 3) Public tables that have RLS enabled but no policies.
-- This is not automatically wrong: it means anon/authenticated access is denied.
select
  n.nspname as schema_name,
  c.relname as table_name
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policies p
  on p.schemaname = n.nspname
 and p.tablename = c.relname
where n.nspname = 'public'
  and c.relkind in ('r', 'p')
  and c.relrowsecurity
group by n.nspname, c.relname
having count(p.policyname) = 0
order by c.relname;

-- 4) Full RLS policy inventory. Inspect USING and WITH CHECK carefully.
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as using_expression,
  with_check as with_check_expression
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- 5) Grants made to browser-facing roles.
select
  table_schema,
  table_name,
  grantee,
  string_agg(privilege_type, ', ' order by privilege_type) as privileges
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon', 'authenticated')
group by table_schema, table_name, grantee
order by table_name, grantee;

-- 6) Public functions using SECURITY DEFINER.
-- These run with owner privileges and therefore require especially careful authorization checks.
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  pg_get_userbyid(p.proowner) as owner,
  p.prosecdef as security_definer,
  p.proleakproof as leakproof
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prosecdef
order by p.proname, arguments;

-- 7) Functions executable by anon/authenticated.
select
  routine_schema,
  routine_name,
  grantee,
  privilege_type
from information_schema.routine_privileges
where routine_schema = 'public'
  and grantee in ('anon', 'authenticated')
order by routine_name, grantee;

-- 8) Views in public. Review whether each view can expose rows that underlying RLS should hide.
select
  schemaname,
  viewname,
  viewowner,
  definition
from pg_views
where schemaname = 'public'
order by viewname;

-- 9) Verify that no user-facing RLS policy references service_role as a policy role.
-- service_role bypasses RLS; such policies do not provide protection.
select
  schemaname,
  tablename,
  policyname,
  roles
from pg_policies
where schemaname = 'public'
  and 'service_role' = any(roles)
order by tablename, policyname;
