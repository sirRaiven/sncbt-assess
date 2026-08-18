import {
  withSupabase,
} from "npm:@supabase/server@^1";

import {
  z,
} from "npm:zod@^4";

interface ProfileRecord {
  id: string;
  role: string;
  account_status: string;
  email?: string | null;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  student_number?: string | null;
}

interface AssignmentRecord {
  id: string;
  assessment_id: string;
  classroom_id: string;
  instructor_id: string;
  starts_at: string;
  ends_at: string;
  closed_at: string | null;
  cancelled_at: string | null;
  time_limit_seconds: number | null;
  show_leaderboard: boolean;
  max_attempts: number;
}

interface AssessmentRecord {
  id: string;
  instructor_id: string;
  title: string;
  subject_name: string;
  subject_code: string;
  instructions: string | null;
  assessment_type: string;
  scoring_mode: string;
  status: string;
  question_count: number;
  total_points: number | string;
  allow_backtracking: boolean;
  result_visibility: string;
  randomize_questions: boolean;
  randomize_options: boolean;
  overall_time_limit_seconds: number | null;
}

interface ClassroomRecord {
  id: string;
  instructor_id: string;
  name: string;
  subject_code: string;
  section: string;
  school_year: string;
  semester: string;
  status: string;
}

interface AttemptRecord {
  id: string;
  assignment_id: string;
  assessment_id: string;
  classroom_id: string;
  student_id: string;
  status: string;
  attempt_number: number;
  question_order: string[] | null;
  option_order: Record<string, string[]> | null;
  started_at: string | null;
  expires_at: string | null;
  submitted_at: string | null;
  locked_at: string | null;
  last_activity_at: string | null;
  current_question_index: number;
  answered_count: number;
  total_score: number | string;
  speed_bonus_total: number | string;
  maximum_score: number | string;
  correct_count: number;
  wrong_count: number;
  unanswered_count: number;
  submitted_reason: string | null;
  total_response_time_ms: number | string;
}

interface MembershipRecord {
  classroom_id: string;
  student_id: string;
}

class AppError extends Error {
  status: number;
  code: string;

  constructor(
    status: number,
    code: string,
    message: string,
  ) {
    super(message);

    this.name =
      "AppError";

    this.status =
      status;

    this.code =
      code;
  }
}

const actionSchema =
  z.discriminatedUnion(
    "action",
    [
      z.object({
        action:
          z.literal(
            "list-student-deliveries",
          ),

        payload:
          z.object({
            classroomId:
              z
                .string()
                .uuid(),
          })
          .optional(),
      }),

      z.object({
        action:
          z.literal(
            "get-student-delivery",
          ),

        payload:
          z.object({
            assignmentId:
              z
                .string()
                .uuid(),
          }),
      }),

      z.object({
        action:
          z.literal(
            "begin-attempt",
          ),

        payload:
          z.object({
            assignmentId:
              z
                .string()
                .uuid(),
          }),
      }),

      z.object({
        action:
          z.literal(
            "get-question",
          ),

        payload:
          z.object({
            attemptId:
              z
                .string()
                .uuid(),

            questionIndex:
              z
                .number()
                .int()
                .min(0)
                .max(10000),
          }),
      }),

      z.object({
        action:
          z.literal(
            "save-answer",
          ),

        payload:
          z.object({
            attemptId:
              z
                .string()
                .uuid(),

            questionId:
              z
                .string()
                .uuid(),

            selectedOptionIds:
              z
                .array(
                  z
                    .string()
                    .uuid(),
                )
                .max(5),

            textResponse:
              z
                .string()
                .trim()
                .max(1000)
                .nullable()
                .optional(),

            booleanResponse:
              z
                .boolean()
                .nullable()
                .optional(),

            finalize:
              z.boolean(),

            commitForFeedback:
              z.boolean()
                .optional()
                .default(false),
          }),
      }),

      z.object({
        action:
          z.literal(
            "submit-attempt",
          ),

        payload:
          z.object({
            attemptId:
              z
                .string()
                .uuid(),

            auto:
              z.boolean(),

            reason:
              z
                .string()
                .trim()
                .max(100),
          }),
      }),

      z.object({
        action:
          z.literal(
            "get-result",
          ),

        payload:
          z.object({
            assignmentId:
              z
                .string()
                .uuid(),
          }),
      }),

      z.object({
        action:
          z.literal(
            "get-student-leaderboard",
          ),

        payload:
          z.object({
            assignmentId:
              z
                .string()
                .uuid(),
          }),
      }),

      z.object({
        action:
          z.literal(
            "list-instructor-deliveries",
          ),
      }),

      z.object({
        action:
          z.literal(
            "get-instructor-monitor",
          ),

        payload:
          z.object({
            assignmentId:
              z
                .string()
                .uuid(),
          }),
      }),

      z.object({
        action:
          z.literal(
            "force-submit-attempt",
          ),

        payload:
          z.object({
            attemptId:
              z
                .string()
                .uuid(),
          }),
      }),

      z.object({
        action:
          z.literal(
            "grant-extra-time",
          ),

        payload:
          z.object({
            attemptId:
              z
                .string()
                .uuid(),

            extraMinutes:
              z
                .number()
                .int()
                .min(1)
                .max(120),
          }),
      }),
    ],
  );

function jsonResponse(
  data: unknown,
  status = 200,
): Response {
  return Response.json(
    data,
    {
      status,
    },
  );
}

function numberValue(
  value:
    | number
    | string
    | null
    | undefined,
): number {
  const parsed =
    Number(value);

  return Number.isFinite(
    parsed,
  )
    ? parsed
    : 0;
}

function fullName(
  profile:
    | ProfileRecord
    | undefined,
): string {
  if (!profile) {
    return "Student";
  }

  const name =
    [
      profile.first_name,
      profile.middle_name,
      profile.last_name,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

  return (
    name
    || profile.email
    || "Student"
  );
}

function availabilityStatus(
  assignment: AssignmentRecord,
  serverNowMs: number,
):
  | "upcoming"
  | "open"
  | "closed"
  | "cancelled" {
  if (
    assignment.cancelled_at
  ) {
    return "cancelled";
  }

  if (
    assignment.closed_at
    || Date.parse(
      assignment.ends_at,
    ) <= serverNowMs
  ) {
    return "closed";
  }

  if (
    Date.parse(
      assignment.starts_at,
    ) > serverNowMs
  ) {
    return "upcoming";
  }

  return "open";
}

function classSummary(
  classroom: ClassroomRecord,
) {
  return {
    id:
      classroom.id,
    name:
      classroom.name,
    subjectCode:
      classroom.subject_code,
    section:
      classroom.section,
    schoolYear:
      classroom.school_year,
    semester:
      classroom.semester,
  };
}

function attemptSummary(
  attempt: AttemptRecord,
  questionCount: number,
  revealScore: boolean,
) {
  return {
    id:
      attempt.id,
    status:
      attempt.status,
    startedAt:
      attempt.started_at,
    expiresAt:
      attempt.expires_at,
    submittedAt:
      attempt.submitted_at,
    lastActivityAt:
      attempt.last_activity_at,
    currentQuestionIndex:
      attempt.current_question_index,
    answeredCount:
      attempt.answered_count,
    questionCount,
    totalScore:
      revealScore
        ? numberValue(
            attempt.total_score,
          )
        : 0,
    speedBonus:
      revealScore
        ? numberValue(
            attempt.speed_bonus_total,
          )
        : 0,
    maximumScore:
      numberValue(
        attempt.maximum_score,
      ),
    correctCount:
      revealScore
        ? attempt.correct_count
        : null,
    wrongCount:
      revealScore
        ? attempt.wrong_count
        : null,
    unansweredCount:
      attempt.unanswered_count,
    submittedReason:
      attempt.submitted_reason,
  };
}

async function loadProfile(
  supabaseAdmin: any,
  userId: string,
): Promise<ProfileRecord> {
  const {
    data: account,
    error: accountError,
  } =
    await supabaseAdmin
      .from("accounts")
      .select(
        [
          "id",
          "role",
          "account_status",
          "email",
        ].join(","),
      )
      .eq(
        "id",
        userId,
      )
      .maybeSingle();

  if (
    accountError
    || !account
  ) {
    throw new AppError(
      403,
      "ACCOUNT_NOT_FOUND",
      "The authenticated account could not be loaded.",
    );
  }

  if (
    account.role
      !== "student"
  ) {
    return account as ProfileRecord;
  }

  const {
    data: studentProfile,
    error: studentProfileError,
  } =
    await supabaseAdmin
      .from("student_profiles")
      .select(
        [
          "user_id",
          "first_name",
          "middle_name",
          "last_name",
          "student_number",
        ].join(","),
      )
      .eq(
        "user_id",
        userId,
      )
      .maybeSingle();

  if (studentProfileError) {
    throw new AppError(
      500,
      "STUDENT_PROFILE_LOAD_FAILED",
      "The student profile could not be loaded.",
    );
  }

  return {
    ...account,
    first_name:
      studentProfile?.first_name
      ?? null,
    middle_name:
      studentProfile?.middle_name
      ?? null,
    last_name:
      studentProfile?.last_name
      ?? null,
    student_number:
      studentProfile?.student_number
      ?? null,
  } as ProfileRecord;
}

function requireRole(
  profile: ProfileRecord,
  role:
    | "student"
    | "instructor",
): void {
  if (
    profile.role
      !== role
    || profile.account_status
      !== "active"
  ) {
    throw new AppError(
      403,
      "ACTIVE_ROLE_REQUIRED",
      `Only active ${role} accounts can use this feature.`,
    );
  }
}

async function finalizeDueAttempts(
  supabaseAdmin: any,
): Promise<void> {
  const {
    error,
  } =
    await supabaseAdmin.rpc(
      "finalize_due_assessment_attempts",
    );

  if (error) {
    console.error(
      "DUE_ATTEMPT_FINALIZATION_FAILED",
      error,
    );
  }
}

async function loadAssignment(
  supabaseAdmin: any,
  assignmentId: string,
): Promise<AssignmentRecord> {
  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from(
        "assessment_assignments",
      )
      .select(
        [
          "id",
          "assessment_id",
          "classroom_id",
          "instructor_id",
          "starts_at",
          "ends_at",
          "closed_at",
          "cancelled_at",
          "time_limit_seconds",
          "show_leaderboard",
          "max_attempts",
        ].join(","),
      )
      .eq(
        "id",
        assignmentId,
      )
      .maybeSingle();

  if (
    error
    || !data
  ) {
    throw new AppError(
      404,
      "DELIVERY_NOT_FOUND",
      "The assigned assessment could not be found.",
    );
  }

  return data as AssignmentRecord;
}

async function loadAssessment(
  supabaseAdmin: any,
  assessmentId: string,
): Promise<AssessmentRecord> {
  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from("assessments")
      .select(
        [
          "id",
          "instructor_id",
          "title",
          "subject_name",
          "subject_code",
          "instructions",
          "assessment_type",
          "scoring_mode",
          "status",
          "question_count",
          "total_points",
          "allow_backtracking",
          "result_visibility",
          "randomize_questions",
          "randomize_options",
          "overall_time_limit_seconds",
        ].join(","),
      )
      .eq(
        "id",
        assessmentId,
      )
      .maybeSingle();

  if (
    error
    || !data
  ) {
    throw new AppError(
      404,
      "ASSESSMENT_NOT_FOUND",
      "The assessment could not be loaded.",
    );
  }

  return data as AssessmentRecord;
}

async function loadClassroom(
  supabaseAdmin: any,
  classroomId: string,
): Promise<ClassroomRecord> {
  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from("classrooms")
      .select(
        [
          "id",
          "instructor_id",
          "name",
          "subject_code",
          "section",
          "school_year",
          "semester",
          "status",
        ].join(","),
      )
      .eq(
        "id",
        classroomId,
      )
      .maybeSingle();

  if (
    error
    || !data
  ) {
    throw new AppError(
      404,
      "CLASS_NOT_FOUND",
      "The assigned class could not be loaded.",
    );
  }

  return data as ClassroomRecord;
}

async function loadStudentAttempt(
  supabaseAdmin: any,
  assignmentId: string,
  studentId: string,
): Promise<AttemptRecord | null> {
  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from(
        "assessment_attempts",
      )
      .select("*")
      .eq(
        "assignment_id",
        assignmentId,
      )
      .eq(
        "student_id",
        studentId,
      )
      .order(
        "attempt_number",
        {
          ascending:
            false,
        },
      )
      .limit(1)
      .maybeSingle();

  if (error) {
    throw new AppError(
      500,
      "ATTEMPT_LOAD_FAILED",
      "The assessment attempt could not be loaded.",
    );
  }

  return (
    data as AttemptRecord | null
  );
}

async function requireStudentMembership(
  supabaseAdmin: any,
  studentId: string,
  classroomId: string,
): Promise<void> {
  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from(
        "classroom_members",
      )
      .select("id")
      .eq(
        "classroom_id",
        classroomId,
      )
      .eq(
        "student_id",
        studentId,
      )
      .eq(
        "membership_status",
        "active",
      )
      .maybeSingle();

  if (
    error
    || !data
  ) {
    throw new AppError(
      403,
      "CLASS_MEMBERSHIP_REQUIRED",
      "An approved membership in this class is required.",
    );
  }
}

async function buildStudentDelivery(
  supabaseAdmin: any,
  assignment: AssignmentRecord,
  studentId: string,
) {
  const [
    assessment,
    classroom,
    attempt,
  ] =
    await Promise.all([
      loadAssessment(
        supabaseAdmin,
        assignment.assessment_id,
      ),
      loadClassroom(
        supabaseAdmin,
        assignment.classroom_id,
      ),
      loadStudentAttempt(
        supabaseAdmin,
        assignment.id,
        studentId,
      ),
    ]);

  const serverNow =
    new Date();

  const status =
    availabilityStatus(
      assignment,
      serverNow.getTime(),
    );

  const completed =
    attempt
      ? [
          "submitted",
          "auto_submitted",
        ].includes(
          attempt.status,
        )
      : false;

  return {
    assignmentId:
      assignment.id,
    assessmentId:
      assessment.id,
    title:
      assessment.title,
    subjectName:
      assessment.subject_name,
    subjectCode:
      assessment.subject_code,
    assessmentType:
      assessment.assessment_type,
    scoringMode:
      assessment.scoring_mode,
    instructions:
      assessment.instructions,
    questionCount:
      assessment.question_count,
    totalPoints:
      numberValue(
        assessment.total_points,
      ),
    allowBacktracking:
      assessment.allow_backtracking,
    resultVisibility:
      assessment.result_visibility,
    startsAt:
      assignment.starts_at,
    endsAt:
      assignment.ends_at,
    timeLimitSeconds:
      assignment.time_limit_seconds
      ?? assessment
        .overall_time_limit_seconds,
    showLeaderboard:
      assignment.show_leaderboard,
    status,
    classroom:
      classSummary(
        classroom,
      ),
    attempt:
      attempt
        ? attemptSummary(
            attempt,
            assessment.question_count,
            completed
            && assessment
              .result_visibility
              !== "hidden",
          )
        : null,
    canStart:
      status === "open"
      && !attempt,
    canResume:
      status === "open"
      && attempt?.status
        === "in_progress",
    canViewResult:
      completed
      && assessment
        .result_visibility
        !== "hidden",
  };
}

async function listStudentDeliveries(
  supabaseAdmin: any,
  studentId: string,
  classroomId?: string,
) {
  let membershipQuery =
    supabaseAdmin
      .from(
        "classroom_members",
      )
      .select(
        "classroom_id,student_id",
      )
      .eq(
        "student_id",
        studentId,
      )
      .eq(
        "membership_status",
        "active",
      );

  if (classroomId) {
    membershipQuery =
      membershipQuery.eq(
        "classroom_id",
        classroomId,
      );
  }

  const {
    data: membershipData,
    error: membershipError,
  } =
    await membershipQuery;

  if (membershipError) {
    throw new AppError(
      500,
      "MEMBERSHIPS_LOAD_FAILED",
      "The enrolled classes could not be loaded.",
    );
  }

  const memberships =
    membershipData as MembershipRecord[];

  const classroomIds =
    memberships.map(
      (membership) =>
        membership.classroom_id,
    );

  if (
    classroomIds.length === 0
  ) {
    return [];
  }

  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from(
        "assessment_assignments",
      )
      .select(
        [
          "id",
          "assessment_id",
          "classroom_id",
          "instructor_id",
          "starts_at",
          "ends_at",
          "closed_at",
          "cancelled_at",
          "time_limit_seconds",
          "show_leaderboard",
          "max_attempts",
        ].join(","),
      )
      .in(
        "classroom_id",
        classroomIds,
      )
      .is(
        "cancelled_at",
        null,
      )
      .order(
        "starts_at",
        {
          ascending:
            false,
        },
      );

  if (error) {
    throw new AppError(
      500,
      "DELIVERIES_LOAD_FAILED",
      "The assigned assessments could not be loaded.",
    );
  }

  const assignments =
    data as AssignmentRecord[];

  const deliveries =
    await Promise.all(
      assignments.map(
        (assignment) =>
          buildStudentDelivery(
            supabaseAdmin,
            assignment,
            studentId,
          ),
      ),
    );

  return deliveries.filter(
    (delivery) =>
      delivery.status
        !== "cancelled",
  );
}

async function loadOwnedAttempt(
  supabaseAdmin: any,
  attemptId: string,
  studentId: string,
): Promise<AttemptRecord> {
  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from(
        "assessment_attempts",
      )
      .select("*")
      .eq(
        "id",
        attemptId,
      )
      .eq(
        "student_id",
        studentId,
      )
      .maybeSingle();

  if (
    error
    || !data
  ) {
    throw new AppError(
      404,
      "ATTEMPT_NOT_FOUND",
      "The assessment attempt was not found.",
    );
  }

  return data as AttemptRecord;
}

async function getQuestionPayload(
  supabaseAdmin: any,
  studentId: string,
  attemptId: string,
  questionIndex: number,
) {
  const attempt =
    await loadOwnedAttempt(
      supabaseAdmin,
      attemptId,
      studentId,
    );

  if (
    attempt.status
      !== "in_progress"
  ) {
    throw new AppError(
      409,
      "ATTEMPT_CLOSED",
      "The assessment attempt is no longer in progress.",
    );
  }

  const {
    data: preparation,
    error: preparationError,
  } =
    await supabaseAdmin.rpc(
      "prepare_scheduled_attempt_question",
      {
        p_student_id:
          studentId,
        p_attempt_id:
          attemptId,
        p_requested_index:
          questionIndex,
      },
    );

  if (
    preparationError
    || !preparation
  ) {
    throw new AppError(
      422,
      "QUESTION_PREPARE_FAILED",
      preparationError?.message
      || "The question could not be prepared.",
    );
  }

  if (
    preparation.attemptClosed
  ) {
    throw new AppError(
      409,
      "ATTEMPT_CLOSED",
      "The assessment attempt reached its deadline and was submitted automatically.",
    );
  }

  const questionId =
    String(
      preparation.questionId,
    );

  const [
    questionResult,
    assessmentResult,
    answerResult,
  ] =
    await Promise.all([
      supabaseAdmin
        .from("questions")
        .select(
          [
            "id",
            "question_type",
            "question_text",
            "image_url",
            "points",
            "time_limit_seconds",
            "order_number",
          ].join(","),
        )
        .eq(
          "id",
          questionId,
        )
        .eq(
          "assessment_id",
          attempt.assessment_id,
        )
        .maybeSingle(),

      supabaseAdmin
        .from("assessments")
        .select(
          "question_count,allow_backtracking",
        )
        .eq(
          "id",
          attempt.assessment_id,
        )
        .maybeSingle(),

      supabaseAdmin
        .from(
          "attempt_answers",
        )
        .select(
          "id,is_final,text_response,boolean_response",
        )
        .eq(
          "attempt_id",
          attemptId,
        )
        .eq(
          "question_id",
          questionId,
        )
        .maybeSingle(),
    ]);

  if (
    questionResult.error
    || !questionResult.data
    || assessmentResult.error
    || !assessmentResult.data
  ) {
    throw new AppError(
      500,
      "QUESTION_DATA_FAILED",
      "The question information could not be loaded.",
    );
  }

  const {
    data: optionData,
    error: optionError,
  } =
    await supabaseAdmin
      .from(
        "question_options",
      )
      .select(
        [
          "id",
          "option_text",
          "order_number",
        ].join(","),
      )
      .eq(
        "question_id",
        questionId,
      );

  if (optionError) {
    throw new AppError(
      500,
      "OPTION_DATA_FAILED",
      "The answer choices could not be loaded.",
    );
  }

  const optionOrder =
    attempt.option_order?.[
      questionId
    ]
    ?? [];

  const optionMap =
    new Map(
      (
        optionData
        ?? []
      ).map(
        (option: any) => [
          option.id,
          option,
        ],
      ),
    );

  const orderedOptions =
    optionOrder.length > 0
      ? optionOrder
          .map(
            (id) =>
              optionMap.get(id),
          )
          .filter(Boolean)
      : [
          ...(
            optionData
            ?? []
          ),
        ].sort(
          (
            left: any,
            right: any,
          ) =>
            left.order_number
            - right.order_number,
        );

  let selectedOptionIds:
    string[] = [];

  if (
    answerResult.data?.id
  ) {
    const {
      data: selectedData,
    } =
      await supabaseAdmin
        .from(
          "attempt_answer_options",
        )
        .select(
          "option_id",
        )
        .eq(
          "answer_id",
          answerResult.data.id,
        );

    selectedOptionIds =
      (
        selectedData
        ?? []
      ).map(
        (
          item: {
            option_id: string;
          },
        ) =>
          item.option_id,
      );
  }

  const questionCount =
    Number(
      assessmentResult.data
        .question_count,
    );

  return {
    serverNow:
      new Date().toISOString(),
    attemptId,
    questionIndex,
    questionCount,
    deadlineAt:
      preparation.deadlineAt
      ?? null,
    firstDeliveredAt:
      preparation.firstDeliveredAt,
    selectedOptionIds,
    textResponse:
      answerResult.data
        ?.text_response
      ?? null,
    booleanResponse:
      answerResult.data
        ?.boolean_response
      ?? null,
    finalized:
      Boolean(
        preparation.finalizedAt
        || answerResult.data
          ?.is_final,
      ),
    canGoPrevious:
      assessmentResult.data
        .allow_backtracking
      && questionIndex > 0,
    canGoNext:
      questionIndex
      < questionCount - 1,
    allowBacktracking:
      assessmentResult.data
        .allow_backtracking,
    question: {
      id:
        questionResult.data.id,
      questionType:
        questionResult.data
          .question_type,
      questionText:
        questionResult.data
          .question_text,
      imageUrl:
        questionResult.data
          .image_url,
      points:
        numberValue(
          questionResult.data
            .points,
        ),
      timeLimitSeconds:
        questionResult.data
          .time_limit_seconds,
      orderNumber:
        questionResult.data
          .order_number,
      options:
        orderedOptions.map(
          (
            option: any,
            index: number,
          ) => ({
            id:
              option.id,
            text:
              option.option_text,
            orderNumber:
              index + 1,
          }),
        ),
    },
  };
}


async function buildStudentLiveLeaderboard(
  supabaseAdmin: any,
  studentId: string,
  assignmentId: string,
) {
  const assignment =
    await loadAssignment(
      supabaseAdmin,
      assignmentId,
    );

  await requireStudentMembership(
    supabaseAdmin,
    studentId,
    assignment.classroom_id,
  );

  const [
    assessment,
    currentAttempt,
  ] =
    await Promise.all([
      loadAssessment(
        supabaseAdmin,
        assignment.assessment_id,
      ),
      loadStudentAttempt(
        supabaseAdmin,
        assignment.id,
        studentId,
      ),
    ]);

  const currentCompleted =
    currentAttempt
    && [
      "submitted",
      "auto_submitted",
    ].includes(
      currentAttempt.status,
    );

  if (!currentCompleted) {
    throw new AppError(
      403,
      "LEADERBOARD_AFTER_SUBMISSION",
      "Complete the assessment before viewing the live ranking.",
    );
  }

  // Rank itself is comparative result information, so Hide result
  // must not be bypassed through the leaderboard.
  if (
    assessment.result_visibility
    === "hidden"
  ) {
    throw new AppError(
      403,
      "LEADERBOARD_RESULT_HIDDEN",
      "The live ranking is not available while assessment results are hidden.",
    );
  }

  const {
    data: attemptData,
    error: attemptError,
  } =
    await supabaseAdmin
      .from(
        "assessment_attempts",
      )
      .select(
        [
          "id",
          "student_id",
          "status",
          "attempt_number",
          "total_score",
          "maximum_score",
          "total_response_time_ms",
          "submitted_at",
        ].join(","),
      )
      .eq(
        "assignment_id",
        assignment.id,
      )
      .in(
        "status",
        [
          "submitted",
          "auto_submitted",
        ],
      )
      .order(
        "attempt_number",
        {
          ascending:
            false,
        },
      );

  if (attemptError) {
    throw new AppError(
      500,
      "LEADERBOARD_LOAD_FAILED",
      "The live ranking could not be loaded.",
    );
  }

  const completedAttempts =
    (
      attemptData
      ?? []
    ) as Array<{
      id: string;
      student_id: string;
      status: string;
      attempt_number: number;
      total_score: number | string;
      maximum_score: number | string;
      total_response_time_ms: number | string;
      submitted_at: string | null;
    }>;

  const latestCompletedByStudent =
    new Map<
      string,
      typeof completedAttempts[number]
    >();

  for (
    const attempt
    of completedAttempts
  ) {
    if (
      !latestCompletedByStudent
        .has(
          attempt.student_id,
        )
    ) {
      latestCompletedByStudent
        .set(
          attempt.student_id,
          attempt,
        );
    }
  }

  const rankable =
    Array.from(
      latestCompletedByStudent
        .values(),
    )
      .sort(
        (
          first,
          second,
        ) => {
          const scoreDifference =
            numberValue(
              second.total_score,
            )
            - numberValue(
              first.total_score,
            );

          if (
            scoreDifference
            !== 0
          ) {
            return scoreDifference;
          }

          const timeDifference =
            numberValue(
              first.total_response_time_ms,
            )
            - numberValue(
              second.total_response_time_ms,
            );

          if (
            timeDifference
            !== 0
          ) {
            return timeDifference;
          }

          return (
            Date.parse(
              first.submitted_at
              || "9999-12-31T23:59:59.999Z",
            )
            - Date.parse(
              second.submitted_at
              || "9999-12-31T23:59:59.999Z",
            )
          );
        },
      );

  const studentIds =
    rankable.map(
      (attempt) =>
        attempt.student_id,
    );

  const profileMap =
    new Map<
      string,
      {
        first_name:
          string | null;
        middle_name:
          string | null;
        last_name:
          string | null;
      }
    >();

  if (
    studentIds.length > 0
  ) {
    const {
      data: profileData,
      error: profileError,
    } =
      await supabaseAdmin
        .from(
          "student_profiles",
        )
        .select(
          [
            "user_id",
            "first_name",
            "middle_name",
            "last_name",
          ].join(","),
        )
        .in(
          "user_id",
          studentIds,
        );

    if (profileError) {
      throw new AppError(
        500,
        "LEADERBOARD_STUDENTS_FAILED",
        "The live ranking could not be loaded.",
      );
    }

    for (
      const profile
      of profileData
      ?? []
    ) {
      profileMap.set(
        profile.user_id,
        {
          first_name:
            profile.first_name
            ?? null,
          middle_name:
            profile.middle_name
            ?? null,
          last_name:
            profile.last_name
            ?? null,
        },
      );
    }
  }

  let previousScore:
    number | null =
      null;

  let currentRank =
    0;

  const entries =
    rankable.map(
      (
        attempt,
        index,
      ) => {
        const score =
          numberValue(
            attempt.total_score,
          );

        if (
          previousScore
          === null
          || score
            !== previousScore
        ) {
          currentRank =
            index + 1;

          previousScore =
            score;
        }

        const profile =
          profileMap.get(
            attempt.student_id,
          );

        const name =
          [
            profile?.first_name,
            profile?.middle_name,
            profile?.last_name,
          ]
            .filter(Boolean)
            .join(" ")
            .trim()
          || "Student";

        return {
          rank:
            currentRank,
          studentName:
            name,
          score,
          maximumScore:
            numberValue(
              attempt.maximum_score,
            ),
          isCurrentStudent:
            attempt.student_id
            === studentId,
        };
      },
    );

  const serverNow =
    new Date()
      .toISOString();

  return {
    serverNow,
    leaderboard: {
      assignmentId:
        assignment.id,
      assessmentId:
        assessment.id,
      title:
        assessment.title,
      scoringMode:
        assessment.scoring_mode,
      updatedAt:
        serverNow,
      entries,
    },
  };
}

async function listInstructorDeliveries(
  supabaseAdmin: any,
  instructorId: string,
) {
  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from(
        "assessment_assignments",
      )
      .select(
        [
          "id",
          "assessment_id",
          "classroom_id",
          "instructor_id",
          "starts_at",
          "ends_at",
          "closed_at",
          "cancelled_at",
          "time_limit_seconds",
          "show_leaderboard",
          "max_attempts",
        ].join(","),
      )
      .eq(
        "instructor_id",
        instructorId,
      )
      .order(
        "starts_at",
        {
          ascending:
            false,
        },
      );

  if (error) {
    throw new AppError(
      500,
      "INSTRUCTOR_DELIVERIES_FAILED",
      "The assessment delivery list could not be loaded.",
    );
  }

  const assignments =
    data as AssignmentRecord[];

  if (
    assignments.length === 0
  ) {
    return [];
  }

  const assessmentIds =
    [
      ...new Set(
        assignments.map(
          (assignment) =>
            assignment.assessment_id,
        ),
      ),
    ];

  const classroomIds =
    [
      ...new Set(
        assignments.map(
          (assignment) =>
            assignment.classroom_id,
        ),
      ),
    ];

  const assignmentIds =
    assignments.map(
      (assignment) =>
        assignment.id,
    );

  const [
    assessmentResult,
    classroomResult,
    attemptResult,
    membershipResult,
  ] =
    await Promise.all([
      supabaseAdmin
        .from("assessments")
        .select(
          [
            "id",
            "instructor_id",
            "title",
            "subject_name",
            "subject_code",
            "instructions",
            "assessment_type",
            "status",
            "question_count",
            "total_points",
            "allow_backtracking",
            "result_visibility",
            "randomize_questions",
            "randomize_options",
            "overall_time_limit_seconds",
          ].join(","),
        )
        .in(
          "id",
          assessmentIds,
        ),

      supabaseAdmin
        .from("classrooms")
        .select(
          [
            "id",
            "instructor_id",
            "name",
            "subject_code",
            "section",
            "school_year",
            "semester",
            "status",
          ].join(","),
        )
        .in(
          "id",
          classroomIds,
        ),

      supabaseAdmin
        .from(
          "assessment_attempts",
        )
        .select("*")
        .in(
          "assignment_id",
          assignmentIds,
        ),

      supabaseAdmin
        .from(
          "classroom_members",
        )
        .select(
          "classroom_id,student_id",
        )
        .in(
          "classroom_id",
          classroomIds,
        )
        .eq(
          "membership_status",
          "active",
        ),
    ]);

  if (
    assessmentResult.error
    || classroomResult.error
    || attemptResult.error
    || membershipResult.error
  ) {
    throw new AppError(
      500,
      "INSTRUCTOR_DELIVERY_RELATIONS_FAILED",
      "Related assessment delivery information could not be loaded.",
    );
  }

  const assessments =
    assessmentResult.data as AssessmentRecord[];

  const classrooms =
    classroomResult.data as ClassroomRecord[];

  const attempts =
    attemptResult.data as AttemptRecord[];

  const memberships =
    membershipResult.data as MembershipRecord[];

  const assessmentMap =
    new Map(
      assessments.map(
        (assessment) => [
          assessment.id,
          assessment,
        ],
      ),
    );

  const classroomMap =
    new Map(
      classrooms.map(
        (classroom) => [
          classroom.id,
          classroom,
        ],
      ),
    );

  const serverNowMs =
    Date.now();

  return assignments
    .filter(
      (assignment) =>
        assessmentMap.get(
          assignment.assessment_id,
        )?.status
        !== "archived"
        && classroomMap.get(
          assignment.classroom_id,
        )?.status
        === "active",
    )
    .map(
      (assignment) => {
        const assessment =
          assessmentMap.get(
            assignment.assessment_id,
          );

        const classroom =
          classroomMap.get(
            assignment.classroom_id,
          );

        const assignmentAttempts =
          attempts.filter(
            (attempt) =>
              attempt.assignment_id
              === assignment.id,
          );

        const memberCount =
          memberships.filter(
            (membership) =>
              membership.classroom_id
              === assignment.classroom_id,
          ).length;

        const startedCount =
          new Set(
            assignmentAttempts.map(
              (attempt) =>
                attempt.student_id,
            ),
          ).size;

        return {
          assignmentId:
            assignment.id,
          assessmentId:
            assignment.assessment_id,
          title:
            assessment?.title
            || "Assessment",
          subjectCode:
            assessment?.subject_code
            || classroom?.subject_code
            || "N/A",
          classroom:
            classSummary(
              classroom
              || {
                id:
                  assignment.classroom_id,
                instructor_id:
                  instructorId,
                name:
                  "Class",
                subject_code:
                  assessment?.subject_code
                  || "N/A",
                section:
                  "N/A",
                school_year:
                  "N/A",
                semester:
                  "N/A",
                status:
                  "active",
              },
            ),
          startsAt:
            assignment.starts_at,
          endsAt:
            assignment.ends_at,
          status:
            availabilityStatus(
              assignment,
              serverNowMs,
            ),
          showLeaderboard:
            assignment
              .show_leaderboard,
          classMemberCount:
            memberCount,
          startedCount,
          inProgressCount:
            assignmentAttempts
              .filter(
                (attempt) =>
                  attempt.status
                  === "in_progress",
              ).length,
          submittedCount:
            assignmentAttempts
              .filter(
                (attempt) =>
                  attempt.status
                  === "submitted",
              ).length,
          autoSubmittedCount:
            assignmentAttempts
              .filter(
                (attempt) =>
                  attempt.status
                  === "auto_submitted",
              ).length,
          notStartedCount:
            Math.max(
              memberCount
              - startedCount,
              0,
            ),
        };
      },
    );
}

async function buildInstructorMonitor(
  supabaseAdmin: any,
  instructorId: string,
  assignmentId: string,
) {
  const assignment =
    await loadAssignment(
      supabaseAdmin,
      assignmentId,
    );

  if (
    assignment.instructor_id
    !== instructorId
  ) {
    throw new AppError(
      403,
      "DELIVERY_OWNERSHIP_REQUIRED",
      "This assessment delivery is not owned by the instructor.",
    );
  }

  const [
    assessment,
    classroom,
  ] =
    await Promise.all([
      loadAssessment(
        supabaseAdmin,
        assignment.assessment_id,
      ),
      loadClassroom(
        supabaseAdmin,
        assignment.classroom_id,
      ),
    ]);

  const [
    membershipResult,
    attemptResult,
  ] =
    await Promise.all([
      supabaseAdmin
        .from(
          "classroom_members",
        )
        .select(
          "classroom_id,student_id",
        )
        .eq(
          "classroom_id",
          classroom.id,
        )
        .eq(
          "membership_status",
          "active",
        ),

      supabaseAdmin
        .from(
          "assessment_attempts",
        )
        .select("*")
        .eq(
          "assignment_id",
          assignment.id,
        ),
    ]);

  if (
    membershipResult.error
    || attemptResult.error
  ) {
    throw new AppError(
      500,
      "MONITOR_DATA_FAILED",
      "The student progress data could not be loaded.",
    );
  }

  const memberships =
    membershipResult.data as MembershipRecord[];

  const attempts =
    attemptResult.data as AttemptRecord[];

  const studentIds =
    memberships.map(
      (membership) =>
        membership.student_id,
    );

  let profiles:
    ProfileRecord[] = [];

  if (
    studentIds.length > 0
  ) {
    const [
      accountResult,
      studentProfileResult,
    ] =
      await Promise.all([
        supabaseAdmin
          .from("accounts")
          .select(
            [
              "id",
              "role",
              "account_status",
              "email",
            ].join(","),
          )
          .in(
            "id",
            studentIds,
          ),

        supabaseAdmin
          .from("student_profiles")
          .select(
            [
              "user_id",
              "first_name",
              "middle_name",
              "last_name",
              "student_number",
            ].join(","),
          )
          .in(
            "user_id",
            studentIds,
          ),
      ]);

    if (
      accountResult.error
      || studentProfileResult.error
    ) {
      throw new AppError(
        500,
        "MONITOR_STUDENTS_FAILED",
        "The student profiles could not be loaded.",
      );
    }

    const studentProfileMap:
      Map<string, any> =
        new Map(
          (
            studentProfileResult.data
            ?? []
          ).map(
            (studentProfile: any) => [
              studentProfile.user_id,
              studentProfile,
            ],
          ),
        );

    profiles =
      (
        accountResult.data
        ?? []
      ).map(
        (account: any) => {
          const studentProfile =
            studentProfileMap.get(
              account.id,
            );

          return {
            id:
              account.id,
            role:
              account.role,
            account_status:
              account.account_status,
            email:
              account.email,
            first_name:
              studentProfile?.first_name
              ?? null,
            middle_name:
              studentProfile?.middle_name
              ?? null,
            last_name:
              studentProfile?.last_name
              ?? null,
            student_number:
              studentProfile?.student_number
              ?? null,
          } as ProfileRecord;
        },
      );
  }

  const profileMap =
    new Map(
      profiles.map(
        (profile) => [
          profile.id,
          profile,
        ],
      ),
    );

  const attemptMap =
    new Map(
      attempts.map(
        (attempt) => [
          attempt.student_id,
          attempt,
        ],
      ),
    );

  const rankable =
    attempts
      .filter(
        (attempt) =>
          [
            "in_progress",
            "submitted",
            "auto_submitted",
          ].includes(
            attempt.status,
          ),
      )
      .sort(
        (
          first,
          second,
        ) => {
          const scoreDifference =
            numberValue(
              second.total_score,
            )
            - numberValue(
              first.total_score,
            );

          if (
            scoreDifference !== 0
          ) {
            return scoreDifference;
          }

          if (
            second.answered_count
            !== first.answered_count
          ) {
            return (
              second.answered_count
              - first.answered_count
            );
          }

          return (
            numberValue(
              first.total_response_time_ms,
            )
            - numberValue(
              second.total_response_time_ms,
            )
          );
        },
      );

  const rankMap =
    new Map<string, number>();

  let previousScore:
    number | null = null;

  let currentRank =
    0;

  rankable.forEach(
    (
      attempt,
      index,
    ) => {
      const score =
        numberValue(
          attempt.total_score,
        );

      if (
        previousScore === null
        || score !== previousScore
      ) {
        currentRank =
          index + 1;

        previousScore =
          score;
      }

      rankMap.set(
        attempt.id,
        currentRank,
      );
    },
  );

  const students =
    memberships.map(
      (membership) => {
        const profile =
          profileMap.get(
            membership.student_id,
          );

        const attempt =
          attemptMap.get(
            membership.student_id,
          );

        const answered =
          attempt?.answered_count
          ?? 0;

        const questionCount =
          assessment.question_count;

        return {
          studentId:
            membership.student_id,
          studentName:
            fullName(
              profile,
            ),
          studentNumber:
            profile?.student_number
            || null,
          email:
            profile?.email
            || null,
          attemptId:
            attempt?.id
            || null,
          status:
            attempt?.status
            || "not_started",
          answeredCount:
            answered,
          questionCount,
          progressPercent:
            questionCount > 0
              ? Math.round(
                  (
                    answered
                    / questionCount
                  ) * 100,
                )
              : 0,
          score:
            numberValue(
              attempt?.total_score,
            ),
          maximumScore:
            attempt
              ? numberValue(
                  attempt.maximum_score,
                )
              : numberValue(
                  assessment.total_points,
                ),
          rank:
            attempt
              ? rankMap.get(
                  attempt.id,
                )
                ?? null
              : null,
          startedAt:
            attempt?.started_at
            || null,
          expiresAt:
            attempt?.expires_at
            || null,
          submittedAt:
            attempt?.submitted_at
            || null,
          lastActivityAt:
            attempt?.last_activity_at
            || null,
        };
      },
    )
    .sort(
      (
        first,
        second,
      ) => {
        if (
          first.rank !== null
          && second.rank !== null
        ) {
          return (
            first.rank
            - second.rank
          );
        }

        if (
          first.rank !== null
        ) {
          return -1;
        }

        if (
          second.rank !== null
        ) {
          return 1;
        }

        return first.studentName
          .localeCompare(
            second.studentName,
          );
      },
    );

  const finalAttempts =
    attempts.filter(
      (attempt) =>
        [
          "submitted",
          "auto_submitted",
        ].includes(
          attempt.status,
        ),
    );

  const finalScores =
    finalAttempts.map(
      (attempt) =>
        numberValue(
          attempt.total_score,
        ),
    );

  const serverNow =
    new Date();

  return {
    serverNow:
      serverNow.toISOString(),
    delivery: {
      assignmentId:
        assignment.id,
      assessmentId:
        assessment.id,
      title:
        assessment.title,
      subjectCode:
        assessment.subject_code,
      classroom:
        classSummary(
          classroom,
        ),
      startsAt:
        assignment.starts_at,
      endsAt:
        assignment.ends_at,
      status:
        availabilityStatus(
          assignment,
          serverNow.getTime(),
        ),
      showLeaderboard:
        assignment.show_leaderboard,
      classMemberCount:
        memberships.length,
      startedCount:
        attempts.length,
      inProgressCount:
        attempts.filter(
          (attempt) =>
            attempt.status
            === "in_progress",
        ).length,
      submittedCount:
        attempts.filter(
          (attempt) =>
            attempt.status
            === "submitted",
        ).length,
      autoSubmittedCount:
        attempts.filter(
          (attempt) =>
            attempt.status
            === "auto_submitted",
        ).length,
      notStartedCount:
        Math.max(
          memberships.length
          - attempts.length,
          0,
        ),
      instructions:
        assessment.instructions,
      questionCount:
        assessment.question_count,
      totalPoints:
        numberValue(
          assessment.total_points,
        ),
      timeLimitSeconds:
        assignment.time_limit_seconds
        ?? assessment
          .overall_time_limit_seconds,
    },
    summary: {
      classMembers:
        memberships.length,
      started:
        attempts.length,
      inProgress:
        attempts.filter(
          (attempt) =>
            attempt.status
            === "in_progress",
        ).length,
      submitted:
        attempts.filter(
          (attempt) =>
            attempt.status
            === "submitted",
        ).length,
      autoSubmitted:
        attempts.filter(
          (attempt) =>
            attempt.status
            === "auto_submitted",
        ).length,
      notStarted:
        Math.max(
          memberships.length
          - attempts.length,
          0,
        ),
      classAverage:
        finalScores.length > 0
          ? Number(
              (
                finalScores.reduce(
                  (
                    total,
                    score,
                  ) =>
                    total + score,
                  0,
                )
                / finalScores.length
              ).toFixed(2),
            )
          : null,
      highestScore:
        finalScores.length > 0
          ? Math.max(
              ...finalScores,
            )
          : null,
      lowestScore:
        finalScores.length > 0
          ? Math.min(
              ...finalScores,
            )
          : null,
    },
    students,
  };
}

export default {
  fetch: withSupabase(
    {
      auth:
        "user",
    },

    async (
      request,
      context,
    ) => {
      if (
        request.method
        !== "POST"
      ) {
        return jsonResponse(
          {
            ok:
              false,
            code:
              "METHOD_NOT_ALLOWED",
            message:
              "Only POST requests are supported.",
          },
          405,
        );
      }

      try {
        const claims =
          context.userClaims as {
            id?: string;
            sub?: string;
          } | undefined;

        const userId =
          claims?.id
          || claims?.sub;

        if (!userId) {
          throw new AppError(
            401,
            "AUTHENTICATION_REQUIRED",
            "A valid authenticated account is required.",
          );
        }

        const input =
          actionSchema.parse(
            await request.json(),
          );

        const profile =
          await loadProfile(
            context.supabaseAdmin,
            userId,
          );

        await finalizeDueAttempts(
          context.supabaseAdmin,
        );

        switch (
          input.action
        ) {
          case "list-student-deliveries": {
            requireRole(
              profile,
              "student",
            );

            return jsonResponse({
              serverNow:
                new Date()
                  .toISOString(),
              deliveries:
                await listStudentDeliveries(
                  context.supabaseAdmin,
                  userId,
                  input.payload
                    ?.classroomId,
                ),
            });
          }

          case "get-student-delivery":
          case "get-result": {
            requireRole(
              profile,
              "student",
            );

            const assignment =
              await loadAssignment(
                context.supabaseAdmin,
                input.payload
                  .assignmentId,
              );

            await requireStudentMembership(
              context.supabaseAdmin,
              userId,
              assignment.classroom_id,
            );

            const delivery =
              await buildStudentDelivery(
                context.supabaseAdmin,
                assignment,
                userId,
              );

            return jsonResponse({
              serverNow:
                new Date()
                  .toISOString(),
              delivery,
            });
          }

          case "get-student-leaderboard": {
            requireRole(
              profile,
              "student",
            );

            return jsonResponse(
              await buildStudentLiveLeaderboard(
                context.supabaseAdmin,
                userId,
                input.payload
                  .assignmentId,
              ),
            );
          }

          case "begin-attempt": {
            requireRole(
              profile,
              "student",
            );

            const assignment =
              await loadAssignment(
                context.supabaseAdmin,
                input.payload
                  .assignmentId,
              );

            await requireStudentMembership(
              context.supabaseAdmin,
              userId,
              assignment.classroom_id,
            );

            const {
              data: attemptId,
              error,
            } =
              await context
                .supabaseAdmin
                .rpc(
                  "begin_scheduled_assessment_attempt",
                  {
                    p_student_id:
                      userId,
                    p_assignment_id:
                      assignment.id,
                  },
                );

            if (
              error
              || !attemptId
            ) {
              throw new AppError(
                422,
                "ATTEMPT_BEGIN_FAILED",
                error?.message
                || "The assessment attempt could not be started.",
              );
            }

            return jsonResponse({
              message:
                "The assessment attempt is ready.",
              attemptId:
                String(
                  attemptId,
                ),
              delivery:
                await buildStudentDelivery(
                  context.supabaseAdmin,
                  assignment,
                  userId,
                ),
            });
          }

          case "get-question": {
            requireRole(
              profile,
              "student",
            );

            return jsonResponse({
              payload:
                await getQuestionPayload(
                  context.supabaseAdmin,
                  userId,
                  input.payload
                    .attemptId,
                  input.payload
                    .questionIndex,
                ),
            });
          }

          case "save-answer": {
            requireRole(
              profile,
              "student",
            );

            let effectiveFinalize =
              input.payload
                .finalize;

            let instantFeedbackEnabled =
              false;

            if (
              input.payload
                .commitForFeedback
            ) {
              const feedbackAttempt =
                await loadOwnedAttempt(
                  context.supabaseAdmin,
                  input.payload
                    .attemptId,
                  userId,
                );

              const feedbackAssessment =
                await loadAssessment(
                  context.supabaseAdmin,
                  feedbackAttempt
                    .assessment_id,
                );

              instantFeedbackEnabled =
                feedbackAssessment
                  .result_visibility
                === "score_and_answers";

              if (
                instantFeedbackEnabled
              ) {
                // Immediate correctness feedback must lock the
                // committed answer. Otherwise a Student could keep
                // editing after seeing whether the answer was right.
                effectiveFinalize =
                  true;
              }
            }

            const {
              data,
              error,
            } =
              await context
                .supabaseAdmin
                .rpc(
                  "save_scheduled_attempt_response",
                  {
                    p_student_id:
                      userId,
                    p_attempt_id:
                      input.payload
                        .attemptId,
                    p_question_id:
                      input.payload
                        .questionId,
                    p_selected_option_ids:
                      input.payload
                        .selectedOptionIds,
                    p_text_response:
                      input.payload
                        .textResponse
                      ?? null,
                    p_boolean_response:
                      input.payload
                        .booleanResponse
                      ?? null,
                    p_finalize:
                      effectiveFinalize,
                  },
                );

            if (
              error
              || !data
            ) {
              throw new AppError(
                422,
                "ANSWER_SAVE_FAILED",
                error?.message
                || "The answer could not be saved.",
              );
            }

            let feedback:
              | {
                  available: true;
                  isCorrect: boolean;
                  speedBonus: number;
                }
              | null = null;

            if (
              instantFeedbackEnabled
              && Boolean(
                data.finalized,
              )
              && !Boolean(
                data.timedOut,
              )
            ) {
              const {
                data: answerData,
                error: answerError,
              } =
                await context
                  .supabaseAdmin
                  .from(
                    "attempt_answers",
                  )
                  .select(
                    "is_correct,speed_bonus",
                  )
                  .eq(
                    "attempt_id",
                    input.payload
                      .attemptId,
                  )
                  .eq(
                    "question_id",
                    input.payload
                      .questionId,
                  )
                  .maybeSingle();

              if (
                !answerError
                && typeof answerData
                  ?.is_correct
                  === "boolean"
              ) {
                feedback = {
                  available:
                    true,
                  isCorrect:
                    answerData
                      .is_correct,
                  speedBonus:
                    numberValue(
                      answerData
                        .speed_bonus,
                    ),
                };
              }
            }

            return jsonResponse({
              message:
                data.attemptClosed
                  ? "The assessment reached its deadline and was submitted automatically."
                  : data.timedOut
                    ? "The question time ended and the response was saved."
                    : "The answer was saved.",
              saved:
                Boolean(
                  data.saved,
                ),
              timedOut:
                Boolean(
                  data.timedOut,
                ),
              finalized:
                Boolean(
                  data.finalized,
                ),
              nextQuestionIndex:
                Number(
                  data.nextQuestionIndex
                  ?? 0,
                ),
              answeredCount:
                Number(
                  data.answeredCount
                  ?? 0,
                ),
              attemptClosed:
                Boolean(
                  data.attemptClosed,
                ),
              feedback,
            });
          }

          case "submit-attempt": {
            requireRole(
              profile,
              "student",
            );

            const {
              data,
              error,
            } =
              await context
                .supabaseAdmin
                .rpc(
                  "submit_scheduled_assessment_attempt",
                  {
                    p_student_id:
                      userId,
                    p_attempt_id:
                      input.payload
                        .attemptId,
                    p_auto:
                      input.payload
                        .auto,
                    p_reason:
                      input.payload
                        .reason,
                  },
                );

            if (
              error
              || !data
            ) {
              throw new AppError(
                422,
                "ATTEMPT_SUBMIT_FAILED",
                error?.message
                || "The assessment could not be submitted.",
              );
            }

            const submittedAttempt =
              await loadOwnedAttempt(
                context.supabaseAdmin,
                input.payload.attemptId,
                userId,
              );

            const submittedAssessment =
              await loadAssessment(
                context.supabaseAdmin,
                submittedAttempt.assessment_id,
              );

            const revealScore =
              submittedAssessment
                .result_visibility
              !== "hidden";

            return jsonResponse({
              attemptId:
                input.payload
                  .attemptId,
              status:
                String(
                  data.status,
                ),
              answeredCount:
                Number(
                  data.answeredCount
                  ?? submittedAttempt
                    .answered_count,
                ),
              correctCount:
                revealScore
                  ? Number(
                      data.correctCount
                      ?? submittedAttempt
                        .correct_count,
                    )
                  : null,
              wrongCount:
                revealScore
                  ? Number(
                      data.wrongCount
                      ?? submittedAttempt
                        .wrong_count,
                    )
                  : null,
              unansweredCount:
                Number(
                  data.unansweredCount
                  ?? submittedAttempt
                    .unanswered_count,
                ),
              score:
                revealScore
                  ? numberValue(
                      data.score
                      ?? submittedAttempt
                        .total_score,
                    )
                  : null,
              alreadyCompleted:
                Boolean(
                  data.alreadyCompleted,
                ),
              message:
                input.payload.auto
                  ? "The assessment was submitted automatically."
                  : "The assessment was submitted successfully.",
            });
          }

          case "list-instructor-deliveries": {
            requireRole(
              profile,
              "instructor",
            );

            return jsonResponse({
              serverNow:
                new Date()
                  .toISOString(),
              deliveries:
                await listInstructorDeliveries(
                  context.supabaseAdmin,
                  userId,
                ),
            });
          }

          case "get-instructor-monitor": {
            requireRole(
              profile,
              "instructor",
            );

            return jsonResponse(
              await buildInstructorMonitor(
                context.supabaseAdmin,
                userId,
                input.payload
                  .assignmentId,
              ),
            );
          }

          case "force-submit-attempt": {
            requireRole(
              profile,
              "instructor",
            );

            const {
              error,
            } =
              await context
                .supabaseAdmin
                .rpc(
                  "force_submit_scheduled_attempt",
                  {
                    p_instructor_id:
                      userId,
                    p_attempt_id:
                      input.payload
                        .attemptId,
                  },
                );

            if (error) {
              throw new AppError(
                422,
                "FORCE_SUBMIT_FAILED",
                error.message,
              );
            }

            return jsonResponse({
              message:
                "The student attempt was submitted and graded.",
            });
          }

          case "grant-extra-time": {
            requireRole(
              profile,
              "instructor",
            );

            const {
              data,
              error,
            } =
              await context
                .supabaseAdmin
                .rpc(
                  "grant_scheduled_attempt_extra_time",
                  {
                    p_instructor_id:
                      userId,
                    p_attempt_id:
                      input.payload
                        .attemptId,
                    p_extra_seconds:
                      input.payload
                        .extraMinutes
                      * 60,
                  },
                );

            if (
              error
              || !data
            ) {
              throw new AppError(
                422,
                "EXTRA_TIME_FAILED",
                error?.message
                || "Extra time could not be granted.",
              );
            }

            return jsonResponse({
              message:
                "The approved extra time was added to the attempt.",
              expiresAt:
                String(data),
            });
          }
        }
      } catch (error) {
        if (
          error instanceof z.ZodError
        ) {
          return jsonResponse(
            {
              ok:
                false,
              code:
                "VALIDATION_ERROR",
              message:
                error.issues[0]
                  ?.message
                || "The assessment delivery request is invalid.",
              issues:
                error.issues,
            },
            422,
          );
        }

        if (
          error instanceof AppError
        ) {
          return jsonResponse(
            {
              ok:
                false,
              code:
                error.code,
              message:
                error.message,
            },
            error.status,
          );
        }

        console.error(
          "Unhandled assessment-delivery error.",
          error,
        );

        return jsonResponse(
          {
            ok:
              false,
            code:
              "INTERNAL_ERROR",
            message:
              "The assessment delivery request could not be completed.",
          },
          500,
        );
      }
    },
  ),
};
