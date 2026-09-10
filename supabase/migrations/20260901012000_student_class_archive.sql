-- SNCBT-AMS
-- Personal Student class archive.
--
-- This table only controls the Student's own My Classes / Archive views.
-- It does not change classroom status, membership, instructor access,
-- assessments, attempts, answers, or results.

create table if not exists public.classroom_student_archives (
  student_id uuid not null
    references public.accounts(id)
    on delete cascade,

  classroom_id uuid not null
    references public.classrooms(id)
    on delete cascade,

  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  primary key (
    student_id,
    classroom_id
  )
);

comment on table public.classroom_student_archives is
  'Per-Student archive state for classes. Archiving is non-destructive and does not change classroom membership or the shared classroom status.';

comment on column public.classroom_student_archives.archived_at is
  'When set, hides this class from this Student''s My Classes page and shows it in Student Archive.';

create index if not exists classroom_student_archives_student_archived_idx
  on public.classroom_student_archives (
    student_id,
    archived_at desc
  )
  where archived_at is not null;

alter table public.classroom_student_archives
  enable row level security;

-- No direct client policies are created intentionally.
-- Student archive changes are validated through the classrooms Edge Function,
-- which verifies the authenticated Student and their active membership.

notify pgrst, 'reload schema';
