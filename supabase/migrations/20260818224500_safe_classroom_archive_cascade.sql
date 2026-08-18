-- ============================================================
-- SNCBT Assess
-- Safe Classroom Archive Cascade
-- 2026-08-18
-- ============================================================

begin;

create or replace function private.validate_assessment_assignment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  assessment_instructor_id uuid;
  assessment_status_value public.assessment_status;
  classroom_instructor_id uuid;
  classroom_status_value public.classroom_status;
begin
  -- Lifecycle-only UPDATE:
  -- allow an existing row to move from open -> closed/cancelled even if
  -- the linked assessment or classroom is already archived.
  --
  -- Comparing JSONB with lifecycle timestamps removed makes this resilient
  -- to the current assessment_assignments column set.
  if tg_op = 'UPDATE'
    and (
      to_jsonb(new)
        - array[
            'closed_at',
            'cancelled_at',
            'updated_at'
          ]::text[]
    ) = (
      to_jsonb(old)
        - array[
            'closed_at',
            'cancelled_at',
            'updated_at'
          ]::text[]
    )
    and (
      (
        old.closed_at is null
        and new.closed_at is not null
      )
      or (
        old.cancelled_at is null
        and new.cancelled_at is not null
      )
    )
  then
    return new;
  end if;

  -- Normal INSERT/reschedule validation remains strict.
  select
    instructor_id,
    status
  into
    assessment_instructor_id,
    assessment_status_value
  from public.assessments
  where id = new.assessment_id;

  if not found then
    raise exception
      'The assessment does not exist.';
  end if;

  select
    instructor_id,
    status
  into
    classroom_instructor_id,
    classroom_status_value
  from public.classrooms
  where id = new.classroom_id;

  if not found then
    raise exception
      'The class does not exist.';
  end if;

  if assessment_instructor_id <> new.instructor_id
    or classroom_instructor_id <> new.instructor_id
  then
    raise exception
      'The instructor must own both the assessment and the class.';
  end if;

  if assessment_status_value =
    'archived'::public.assessment_status
  then
    raise exception
      'An archived assessment cannot be scheduled.';
  end if;

  if classroom_status_value <>
    'active'::public.classroom_status
  then
    raise exception
      'Only active classes can receive a scheduled assessment.';
  end if;

  if new.ends_at <= new.starts_at then
    raise exception
      'The assessment end date must be later than its start date.';
  end if;

  return new;
end;
$$;

revoke all
on function private.validate_assessment_assignment()
from public;


create or replace function public.archive_classroom_safely(
  p_instructor_id uuid,
  p_classroom_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  classroom_record public.classrooms%rowtype;
  attempt_record record;
  finalized_attempt_count integer := 0;
  closed_assignment_count integer := 0;
  cancelled_legacy_session_count integer := 0;
  removed_legacy_participant_count integer := 0;
  operation_timestamp timestamptz := now();
begin
  select *
  into classroom_record
  from public.classrooms
  where id = p_classroom_id
    and instructor_id = p_instructor_id
  for update;

  if not found then
    raise exception
      'The class was not found or is not owned by this instructor.';
  end if;

  for attempt_record in
    select
      attempt.id,
      attempt.student_id
    from public.assessment_attempts as attempt
    join public.assessment_assignments as assignment
      on assignment.id = attempt.assignment_id
    where assignment.classroom_id = p_classroom_id
      and assignment.instructor_id = p_instructor_id
      and attempt.status =
        'in_progress'::public.assessment_attempt_status
  loop
    perform public.submit_scheduled_assessment_attempt(
      attempt_record.student_id,
      attempt_record.id,
      true,
      'class_archived'
    );

    finalized_attempt_count :=
      finalized_attempt_count + 1;
  end loop;

  -- A class archive is not an unassignment. Keep cancelled_at unchanged so
  -- Student result/history access remains intact.
  update public.assessment_assignments
  set closed_at = coalesce(closed_at, operation_timestamp)
  where classroom_id = p_classroom_id
    and instructor_id = p_instructor_id;

  get diagnostics closed_assignment_count = row_count;

  if to_regclass('public.assessment_sessions') is not null then
    if to_regclass('public.session_participants') is not null then
      execute $legacy_participants$
        update public.session_participants
        set
          status = 'removed'::public.session_participant_status,
          removed_at = coalesce(removed_at, $1)
        where session_id in (
          select session.id
          from public.assessment_sessions as session
          where session.classroom_id = $2
            and session.instructor_id = $3
            and session.status in (
              'lobby'::public.assessment_session_status,
              'active'::public.assessment_session_status
            )
        )
          and status in (
            'waiting'::public.session_participant_status,
            'active'::public.session_participant_status
          )
      $legacy_participants$
      using operation_timestamp, p_classroom_id, p_instructor_id;

      get diagnostics removed_legacy_participant_count = row_count;
    end if;

    execute $legacy_sessions$
      update public.assessment_sessions
      set
        status = 'cancelled'::public.assessment_session_status,
        cancelled_at = coalesce(cancelled_at, $1)
      where classroom_id = $2
        and instructor_id = $3
        and status in (
          'lobby'::public.assessment_session_status,
          'active'::public.assessment_session_status
        )
    $legacy_sessions$
    using operation_timestamp, p_classroom_id, p_instructor_id;

    get diagnostics cancelled_legacy_session_count = row_count;
  end if;

  update public.classrooms
  set
    status = 'archived'::public.classroom_status,
    join_enabled = false,
    archived_at = coalesce(archived_at, operation_timestamp)
  where id = p_classroom_id
    and instructor_id = p_instructor_id;

  -- assessments.classroom_id is only a legacy/default pointer. Do not leave
  -- it pointing at an archived class. Re-point to another active assignment
  -- when one exists; otherwise clear it. The reusable assessment itself is
  -- intentionally not archived because it may be shared with other classes.
  update public.assessments as assessment
  set classroom_id = (
    select assignment.classroom_id
    from public.assessment_assignments as assignment
    join public.classrooms as classroom
      on classroom.id = assignment.classroom_id
    where assignment.assessment_id = assessment.id
      and assignment.classroom_id <> p_classroom_id
      and assignment.cancelled_at is null
      and classroom.status = 'active'::public.classroom_status
    order by assignment.starts_at desc, assignment.created_at desc
    limit 1
  )
  where assessment.instructor_id = p_instructor_id
    and assessment.classroom_id = p_classroom_id;

  insert into public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    p_instructor_id,
    'classroom.archived_safely',
    'classroom',
    p_classroom_id,
    jsonb_build_object(
      'class_name', classroom_record.name,
      'closed_assignments', closed_assignment_count,
      'finalized_attempts', finalized_attempt_count,
      'cancelled_legacy_sessions', cancelled_legacy_session_count,
      'removed_legacy_participants', removed_legacy_participant_count,
      'archived_at', operation_timestamp
    )
  );

  return jsonb_build_object(
    'classroom_id', p_classroom_id,
    'already_archived',
      classroom_record.status = 'archived'::public.classroom_status,
    'closed_assignments', closed_assignment_count,
    'finalized_attempts', finalized_attempt_count,
    'cancelled_legacy_sessions', cancelled_legacy_session_count,
    'removed_legacy_participants', removed_legacy_participant_count
  );
end;
$$;

revoke all
on function public.archive_classroom_safely(uuid, uuid)
from public, anon, authenticated;

grant execute
on function public.archive_classroom_safely(uuid, uuid)
to service_role;

commit;

-- Repair classrooms that were already archived before this update.
do $$
declare
  archived_class record;
begin
  for archived_class in
    select id, instructor_id
    from public.classrooms
    where status = 'archived'::public.classroom_status
  loop
    perform public.archive_classroom_safely(
      archived_class.instructor_id,
      archived_class.id
    );
  end loop;
end;
$$;

notify pgrst, 'reload schema';
