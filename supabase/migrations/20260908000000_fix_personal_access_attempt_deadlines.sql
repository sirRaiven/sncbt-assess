-- SNCBT-AMS
-- Personal assessment access deadline hardening.
--
-- A personal make-up / second-chance grant is authoritative for the exact
-- attempt it creates. The original class schedule may already be closed, but
-- that must not immediately submit the personal attempt while the grant is
-- still active.
--
-- This migration intentionally does not reopen or rewrite previously
-- auto-submitted attempts. Create a fresh personal access grant after applying
-- the migration when retesting a Student.

create schema if not exists private;

create or replace function private.assessment_attempt_has_active_personal_access(
  p_attempt_id uuid,
  p_at timestamptz default statement_timestamp()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.assessment_attempts as attempt
    join public.assessment_student_access_grants as access_grant
      on access_grant.assignment_id = attempt.assignment_id
     and access_grant.student_id = attempt.student_id
     and access_grant.consumed_attempt_id = attempt.id
    where attempt.id = p_attempt_id
      and access_grant.consumed_at is not null
      and access_grant.revoked_at is null
      and access_grant.starts_at <= p_at
      and access_grant.ends_at > p_at
  );
$function$;

comment on function private.assessment_attempt_has_active_personal_access(uuid, timestamptz) is
  'Returns true only while the exact consumed personal-access grant for an assessment attempt is active.';

-- Keep assessment_attempts.expires_at authoritative.
--
-- For a newly inserted personal attempt, calculate the deadline from the
-- personal grant (and the normal overall time limit when one is configured).
-- For later updates, an active grant caps expires_at at the grant end time without
-- preventing legitimate extra-time updates that still fit inside the grant window.
-- Ordinary attempts remain capped by the class schedule.
create or replace function private.enforce_attempt_schedule_deadline()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_assignment_ends_at timestamptz;
  v_assignment_time_limit_seconds integer;
  v_assessment_time_limit_seconds integer;
  v_effective_time_limit_seconds integer;
  v_grant_ends_at timestamptz;
  v_started_at timestamptz;
  v_personal_deadline timestamptz;
begin
  if new.assignment_id is null then
    return new;
  end if;

  select
    assignment.ends_at,
    assignment.time_limit_seconds,
    assessment.overall_time_limit_seconds
  into
    v_assignment_ends_at,
    v_assignment_time_limit_seconds,
    v_assessment_time_limit_seconds
  from public.assessment_assignments as assignment
  join public.assessments as assessment
    on assessment.id = assignment.assessment_id
  where assignment.id = new.assignment_id;

  if not found then
    return new;
  end if;

  select access_grant.ends_at
  into v_grant_ends_at
  from public.assessment_student_access_grants as access_grant
  where access_grant.assignment_id = new.assignment_id
    and access_grant.student_id = new.student_id
    and access_grant.revoked_at is null
    and access_grant.starts_at <= statement_timestamp()
    and access_grant.ends_at > statement_timestamp()
    and (
      access_grant.consumed_attempt_id = new.id
      or (
        tg_op = 'INSERT'
        and access_grant.consumed_at is null
        and access_grant.consumed_attempt_id is null
      )
    )
  order by
    case
      when access_grant.consumed_attempt_id = new.id then 0
      else 1
    end,
    access_grant.created_at desc
  limit 1;

  if v_grant_ends_at is not null then
    v_effective_time_limit_seconds :=
      coalesce(
        v_assignment_time_limit_seconds,
        v_assessment_time_limit_seconds
      );

    v_started_at :=
      coalesce(
        new.started_at,
        statement_timestamp()
      );

    v_personal_deadline :=
      case
        when v_effective_time_limit_seconds is not null
          and v_effective_time_limit_seconds > 0
          then least(
            v_grant_ends_at,
            v_started_at
              + make_interval(
                  secs => v_effective_time_limit_seconds
                )
          )
        else v_grant_ends_at
      end;

    if tg_op = 'INSERT' then
      -- Do not preserve an old class deadline supplied by legacy begin logic.
      -- A personal attempt starts with its own effective deadline.
      new.expires_at :=
        v_personal_deadline;
    else
      -- Preserve explicit extra-time changes, but never allow them past the
      -- personal access window.
      new.expires_at :=
        case
          when new.expires_at is null
            then v_personal_deadline
          else least(
            new.expires_at,
            v_grant_ends_at
          )
        end;
    end if;

    return new;
  end if;

  if v_assignment_ends_at is not null then
    new.expires_at :=
      case
        when new.expires_at is null
          then v_assignment_ends_at
        else least(
          new.expires_at,
          v_assignment_ends_at
        )
      end;
  end if;

  return new;
end;
$function$;

drop trigger if exists assessment_attempts_enforce_schedule_deadline
  on public.assessment_attempts;

create trigger assessment_attempts_enforce_schedule_deadline
before insert or update of assignment_id, expires_at
on public.assessment_attempts
for each row
execute function private.enforce_attempt_schedule_deadline();

-- The global finalizer must always respect attempt.expires_at, assignment
-- cancellation, grant expiration/revocation, and assessment archival. The
-- class ends_at/closed_at boundary is ignored only while the exact consumed
-- personal grant remains active.
create or replace function public.finalize_due_assessment_attempts()
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_attempt record;
  v_finalized_count integer := 0;
begin
  for v_attempt in
    select
      attempt.id,
      attempt.student_id
    from public.assessment_attempts as attempt
    join public.assessment_assignments as assignment
      on assignment.id = attempt.assignment_id
    join public.assessments as assessment
      on assessment.id = attempt.assessment_id
    left join public.assessment_student_access_grants as access_grant
      on access_grant.consumed_attempt_id = attempt.id
     and access_grant.assignment_id = attempt.assignment_id
     and access_grant.student_id = attempt.student_id
    where attempt.status = 'in_progress'::public.assessment_attempt_status
      and (
        (
          attempt.expires_at is not null
          and attempt.expires_at <= statement_timestamp()
        )
        or assignment.cancelled_at is not null
        or assessment.status = 'archived'::public.assessment_status
        or (
          access_grant.id is not null
          and (
            access_grant.revoked_at is not null
            or access_grant.ends_at <= statement_timestamp()
          )
        )
        or (
          (
            assignment.ends_at <= statement_timestamp()
            or assignment.closed_at is not null
          )
          and not private.assessment_attempt_has_active_personal_access(
            attempt.id,
            statement_timestamp()
          )
        )
      )
    order by attempt.started_at nulls first,
             attempt.created_at
  loop
    perform public.submit_scheduled_assessment_attempt(
      v_attempt.student_id,
      v_attempt.id,
      true,
      'automatic_deadline_submission'
    );

    v_finalized_count :=
      v_finalized_count + 1;
  end loop;

  return v_finalized_count;
end;
$function$;

-- Preserve the existing question-preparation and answer-saving logic, but
-- surgically make their class schedule hard-stops personal-grant aware.
-- pg_get_functiondef() lets this migration retain every other behavior in the
-- currently deployed functions (question timers, backtracking, draft/final
-- responses, grading integration, etc.) instead of replacing those large
-- routines with a reduced implementation.
do $migration$
declare
  function_record record;
  original_definition text;
  patched_definition text;
  function_count integer;
  function_name text;
  alias_name text;
  already_grant_aware boolean;
  has_assignment_deadline_guard boolean;
  helper_marker constant text :=
    'private.assessment_attempt_has_active_personal_access';
begin
  foreach function_name in array array[
    'prepare_scheduled_attempt_question',
    'save_scheduled_attempt_response'
  ]
  loop
    function_count := 0;

    for function_record in
      select
        routine.oid,
        routine.proname,
        pg_get_function_identity_arguments(routine.oid) as identity_arguments
      from pg_catalog.pg_proc as routine
      join pg_catalog.pg_namespace as namespace
        on namespace.oid = routine.pronamespace
      where namespace.nspname = 'public'
        and routine.proname = function_name
      order by routine.oid
    loop
      function_count :=
        function_count + 1;

      original_definition :=
        pg_catalog.pg_get_functiondef(
          function_record.oid
        );

      already_grant_aware :=
        position(
          helper_marker
          in original_definition
        ) > 0
        or (
          position(
            'assessment_student_access_grants'
            in original_definition
          ) > 0
          and position(
            'consumed_attempt_id'
            in original_definition
          ) > 0
        );

      if already_grant_aware then
        continue;
      end if;

      -- Compatibility overloads that simply delegate to a canonical routine
      -- do not need their own personal-access guard. Only functions that
      -- directly inspect class ends_at / closed_at are patched.
      has_assignment_deadline_guard :=
        original_definition ~* (
          '(assignment|assignment_record|v_assignment)'
          || '[[:space:]]*\.[[:space:]]*'
          || '(ends_at|closed_at)'
        );

      if not has_assignment_deadline_guard then
        continue;
      end if;

      patched_definition :=
        original_definition;

      foreach alias_name in array array[
        'assignment',
        'assignment_record',
        'v_assignment'
      ]
      loop
        patched_definition :=
          pg_catalog.regexp_replace(
            patched_definition,
            alias_name
              || '[[:space:]]*\.[[:space:]]*ends_at[[:space:]]*<=[[:space:]]*(now\(\)|statement_timestamp\(\)|transaction_timestamp\(\)|clock_timestamp\(\)|current_timestamp)',
            '('
              || alias_name
              || '.ends_at <= \1 and not '
              || helper_marker
              || '(p_attempt_id, statement_timestamp()))',
            'gi'
          );

        patched_definition :=
          pg_catalog.regexp_replace(
            patched_definition,
            alias_name
              || '[[:space:]]*\.[[:space:]]*closed_at[[:space:]]+is[[:space:]]+not[[:space:]]+null',
            '('
              || alias_name
              || '.closed_at is not null and not '
              || helper_marker
              || '(p_attempt_id, statement_timestamp()))',
            'gi'
          );
      end loop;

      if patched_definition = original_definition then
        raise exception using
          errcode = 'P0001',
          message = format(
            'PERSONAL_ACCESS_DEADLINE_PATCH_UNSUPPORTED: %s(%s) contains a class deadline guard but its live definition does not match the supported pattern. Inspect pg_get_functiondef before changing this migration.',
            function_record.proname,
            function_record.identity_arguments
          );
      end if;

      execute patched_definition;

      original_definition :=
        pg_catalog.pg_get_functiondef(
          function_record.oid
        );

      already_grant_aware :=
        position(
          helper_marker
          in original_definition
        ) > 0
        or (
          position(
            'assessment_student_access_grants'
            in original_definition
          ) > 0
          and position(
            'consumed_attempt_id'
            in original_definition
          ) > 0
        );

      if not already_grant_aware then
        raise exception using
          errcode = 'P0001',
          message = format(
            'PERSONAL_ACCESS_DEADLINE_PATCH_VERIFY_FAILED: %s(%s) was not made personal-grant aware.',
            function_record.proname,
            function_record.identity_arguments
          );
      end if;
    end loop;

    if function_count = 0 then
      raise exception using
        errcode = '42883',
        message = format(
          'Required function public.%s was not found.',
          function_name
        );
    end if;
  end loop;
end;
$migration$;

-- Keep PostgREST aware of replaced routines when the migration is applied
-- through the SQL editor or CLI.
notify pgrst, 'reload schema';
