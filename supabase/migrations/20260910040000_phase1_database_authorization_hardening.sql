-- SNCBT-AMS
-- Phase 1: Database & Authorization Hardening
--
-- Security objective:
--   * Browser roles must not be able to bypass authenticated Edge Functions
--     by invoking privileged public RPCs directly through the Data API.
--   * The service_role retains server-side RPC execution.
--   * Only the two caller-scoped helpers required by RLS policies remain
--     executable by authenticated users.
--   * SECURITY DEFINER routines use an empty search_path.
--
-- This migration intentionally does NOT replace any assessment function body.
-- It only changes function ACLs/default ACLs and function configuration.

-- Fail before changing privileges if the two RLS helpers expected by the
-- currently deployed policies are missing. A partial schema should not receive
-- this hardening migration silently.
do $phase1_preflight$
begin
  if to_regprocedure('public.current_user_role()') is null then
    raise exception
      'PHASE1_PREFLIGHT_FAILED: public.current_user_role() is missing.';
  end if;

  if to_regprocedure('public.current_account_status()') is null then
    raise exception
      'PHASE1_PREFLIGHT_FAILED: public.current_account_status() is missing.';
  end if;
end
$phase1_preflight$;

-- Existing public functions: remove the implicit/default browser RPC surface.
revoke execute on all functions in schema public from public, anon, authenticated;

-- Edge Functions use the server-side service role for privileged database RPCs.
-- Preserve that server execution path explicitly.
grant execute on all functions in schema public to service_role;

-- RLS policies on audit_logs currently call these two helpers while evaluating
-- authenticated requests. Each helper is caller-scoped through auth.uid(),
-- returns only the caller's role/account status, is STABLE, and already uses an
-- empty search_path.
grant execute on function public.current_user_role() to authenticated;
grant execute on function public.current_account_status() to authenticated;

-- New functions created by future migrations must be private from browser roles
-- by default. Explicit browser grants must be reviewed and added deliberately.
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;

alter default privileges for role postgres in schema public
  grant execute on functions to service_role;

-- Harden every existing SECURITY DEFINER function in public without replacing
-- its body. pg_get_function_identity_arguments() preserves overloaded function
-- signatures. PostgreSQL built-ins remain available through pg_catalog even
-- when the configured search_path is empty; application relations/functions in
-- the audited routines are schema-qualified.
do $phase1_search_path$
declare
  v_function record;
begin
  for v_function in
    select
      format(
        '%I.%I(%s)',
        n.nspname,
        p.proname,
        pg_get_function_identity_arguments(p.oid)
      ) as function_identity
    from pg_proc as p
    join pg_namespace as n
      on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef = true
  loop
    execute format(
      'alter function %s set search_path to %L',
      v_function.function_identity,
      ''
    );
  end loop;
end
$phase1_search_path$;

-- Refresh PostgREST's schema cache after privilege changes.
notify pgrst, 'reload schema';
