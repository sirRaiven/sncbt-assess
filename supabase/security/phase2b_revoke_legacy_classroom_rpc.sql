-- SNCBT Assess — Phase 2B legacy classroom RPC surface reduction
--
-- Prerequisite:
--   1. Deploy the updated `classrooms` Edge Function.
--   2. Deploy the updated Nuxt frontend/composable.
--   3. Verify classroom enrollment settings still load/update normally.
--
-- This migration removes browser EXECUTE access to two SECURITY DEFINER RPCs
-- that are no longer called directly by the Nuxt client.

begin;

do $$
begin
  if to_regprocedure('public.get_classroom_enrollment_settings(uuid)') is not null then
    execute 'REVOKE EXECUTE ON FUNCTION public.get_classroom_enrollment_settings(uuid) FROM PUBLIC, anon, authenticated';
  end if;

  if to_regprocedure('public.set_classroom_enrollment_approval(uuid,boolean)') is not null then
    execute 'REVOKE EXECUTE ON FUNCTION public.set_classroom_enrollment_approval(uuid, boolean) FROM PUBLIC, anon, authenticated';
  end if;
end
$$;

commit;

-- Verification: both browser-facing columns should be false when the function
-- exists. No rows simply means the legacy function is not present.
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
  and proc.proname in (
    'get_classroom_enrollment_settings',
    'set_classroom_enrollment_approval'
  )
order by proc.proname, arguments;
