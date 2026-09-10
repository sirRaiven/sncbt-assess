-- SNCBT-AMS
-- Read-only precheck before repairing Supabase migration history.
-- Every row in the final result must report true before marking the four
-- legacy migrations as applied. This script does not change database state.

with checks(check_name, passed) as (
  values
    (
      'assessment_assignments.archived_at exists',
      exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'assessment_assignments'
          and column_name = 'archived_at'
      )
    ),
    (
      'assessment assignment archive index exists',
      to_regclass('public.assessment_assignments_instructor_archived_at_idx') is not null
    ),
    (
      'legacy permanent-delete RPCs are absent',
      to_regprocedure('public.delete_instructor_archived_assessment(uuid,uuid)') is null
      and to_regprocedure('public.delete_instructor_closed_session(uuid,uuid)') is null
    ),
    (
      'assessment_student_archives table exists',
      to_regclass('public.assessment_student_archives') is not null
    ),
    (
      'assessment_student_archives RLS enabled',
      coalesce((
        select c.relrowsecurity
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
          and c.relname = 'assessment_student_archives'
      ), false)
    ),
    (
      'assessment student archive index exists',
      to_regclass('public.assessment_student_archives_student_archived_at_idx') is not null
    ),
    (
      'classroom_student_archives table exists',
      to_regclass('public.classroom_student_archives') is not null
    ),
    (
      'classroom_student_archives RLS enabled',
      coalesce((
        select c.relrowsecurity
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
          and c.relname = 'classroom_student_archives'
      ), false)
    ),
    (
      'classroom student archive index exists',
      to_regclass('public.classroom_student_archives_student_archived_idx') is not null
    ),
    (
      'personal-access helper exists',
      to_regprocedure('private.assessment_attempt_has_active_personal_access(uuid,timestamp with time zone)') is not null
    ),
    (
      'attempt-deadline trigger function exists',
      to_regprocedure('private.enforce_attempt_schedule_deadline()') is not null
    ),
    (
      'attempt-deadline trigger exists',
      exists (
        select 1
        from pg_trigger t
        join pg_class c on c.oid = t.tgrelid
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
          and c.relname = 'assessment_attempts'
          and t.tgname = 'assessment_attempts_enforce_schedule_deadline'
          and not t.tgisinternal
      )
    ),
    (
      'finalize_due_assessment_attempts is personal-access aware',
      exists (
        select 1
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.proname = 'finalize_due_assessment_attempts'
          and position(
            'private.assessment_attempt_has_active_personal_access'
            in pg_get_functiondef(p.oid)
          ) > 0
      )
    ),
    (
      'prepare_scheduled_attempt_question is personal-access aware when it has a schedule guard',
      not exists (
        select 1
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.proname = 'prepare_scheduled_attempt_question'
          and pg_get_functiondef(p.oid) ~* '(assignment|assignment_record|v_assignment)[[:space:]]*\.[[:space:]]*(ends_at|closed_at)'
          and position('private.assessment_attempt_has_active_personal_access' in pg_get_functiondef(p.oid)) = 0
          and not (
            position('assessment_student_access_grants' in pg_get_functiondef(p.oid)) > 0
            and position('consumed_attempt_id' in pg_get_functiondef(p.oid)) > 0
          )
      )
    ),
    (
      'save_scheduled_attempt_response is personal-access aware when it has a schedule guard',
      not exists (
        select 1
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.proname = 'save_scheduled_attempt_response'
          and pg_get_functiondef(p.oid) ~* '(assignment|assignment_record|v_assignment)[[:space:]]*\.[[:space:]]*(ends_at|closed_at)'
          and position('private.assessment_attempt_has_active_personal_access' in pg_get_functiondef(p.oid)) = 0
          and not (
            position('assessment_student_access_grants' in pg_get_functiondef(p.oid)) > 0
            and position('consumed_attempt_id' in pg_get_functiondef(p.oid)) > 0
          )
      )
    )
)
select check_name, passed
from checks
order by check_name;
