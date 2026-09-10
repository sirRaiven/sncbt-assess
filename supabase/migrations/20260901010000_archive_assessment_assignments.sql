-- SNCBT-AMS
-- Adds a reversible archive marker for modern assessment-assignment sessions.
-- Archiving does not delete attempts, responses, results, schedules, or classes.

alter table public.assessment_assignments
  add column if not exists archived_at timestamptz;

comment on column public.assessment_assignments.archived_at is
  'When set, hides this closed/cancelled assessment delivery from the instructor Live Sessions list while preserving all academic records.';

create index if not exists assessment_assignments_instructor_archived_at_idx
  on public.assessment_assignments (instructor_id, archived_at desc)
  where archived_at is not null;

-- Permanent archive deletion is intentionally removed from the application
-- and from the public RPC surface. Archive is now reversible records
-- management rather than destructive cleanup.
drop function if exists public.delete_instructor_archived_assessment(uuid, uuid);
drop function if exists public.delete_instructor_closed_session(uuid, uuid);

notify pgrst, 'reload schema';
