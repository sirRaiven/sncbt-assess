-- SNCBT-AMS
-- Student-specific assessment archive.
--
-- This is intentionally separate from assessment_assignments.archived_at.
-- The instructor's session archive is shared for the whole class, while this
-- table stores only a Student's personal organization preference.

create table if not exists public.assessment_student_archives (
  student_id uuid not null
    references public.accounts(id)
    on delete cascade,

  assignment_id uuid not null
    references public.assessment_assignments(id)
    on delete cascade,

  archived_at timestamptz null
    default now(),

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now(),

  primary key (
    student_id,
    assignment_id
  )
);

comment on table public.assessment_student_archives is
  'Student-specific archive state for closed assessment assignments. Archiving never deletes attempts, answers, grades, grants, or shared assignment records.';

comment on column public.assessment_student_archives.archived_at is
  'When set, hides the assessment from the Student Assessments page and shows it in the Student Archive page. Null means restored.';

create index if not exists assessment_student_archives_student_archived_at_idx
  on public.assessment_student_archives (
    student_id,
    archived_at desc
  )
  where archived_at is not null;

alter table public.assessment_student_archives
  enable row level security;

-- This table is written/read by authenticated Edge Functions through the
-- service-role client. No direct client policies are intentionally granted.

notify pgrst, 'reload schema';
