import {
  withSupabase,
} from "npm:@supabase/server@^1";

import {
  z,
} from "npm:zod@^4";

import {
  fetchSplitProfile,
  fetchSplitProfiles,
} from "../_shared/profile.ts";

type AppRole =
  | "instructor"
  | "student";

type MembershipStatus =
  | "pending"
  | "active"
  | "rejected"
  | "removed"
  | "left";

interface AppProfile {
  id: string;
  email: string | null;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  student_number: string | null;
  employee_number: string | null;
  role: string;
  account_status: string;
}

interface ClassroomRecord {
  id: string;
  instructor_id: string;
  name: string;
  subject_code: string;
  section: string;
  description: string | null;
  school_year: string;
  semester: string;
  join_code: string;
  join_enabled: boolean;
  status: "active" | "archived";
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

interface MembershipRecord {
  id: string;
  classroom_id: string;
  student_id: string;
  membership_status: MembershipStatus;
  requested_at: string;
  approved_at: string | null;
  approved_by: string | null;
  rejected_at: string | null;
  removed_at: string | null;
  left_at: string | null;
  created_at: string;
  updated_at: string;
}

interface MembershipCounts {
  pending: number;
  active: number;
  rejected: number;
  removed: number;
  left: number;
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
    this.name = "AppError";
    this.status = status;
    this.code = code;
  }
}

const classroomInput = z.object({
  name: z
    .string()
    .trim()
    .min(2)
    .max(150),

  subjectCode: z
    .string()
    .trim()
    .min(2)
    .max(30),

  section: z
    .string()
    .trim()
    .min(1)
    .max(80),

  description: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .nullable(),

  schoolYear: z
    .string()
    .regex(
      /^[0-9]{4}-[0-9]{4}$/,
    ),

  semester: z.enum([
    "First Semester",
    "Second Semester",
    "Summer",
  ]),
});

const actionSchema = z.discriminatedUnion(
  "action",
  [
    z.object({
      action: z.literal(
        "list-instructor-classes",
      ),
    }),

    z.object({
      action: z.literal(
        "get-instructor-class",
      ),

      payload: z.object({
        classroomId: z.string().uuid(),
      }),
    }),

    z.object({
      action: z.literal(
        "create-class",
      ),

      payload:
        classroomInput.extend({
          joinEnabled: z
            .boolean()
            .default(true),
        }),
    }),

    z.object({
      action: z.literal(
        "update-class",
      ),

      payload:
        classroomInput.extend({
          classroomId:
            z.string().uuid(),
        }),
    }),

    z.object({
      action: z.literal(
        "archive-class",
      ),

      payload: z.object({
        classroomId: z.string().uuid(),
      }),
    }),

    z.object({
      action: z.literal(
        "reactivate-class",
      ),

      payload: z.object({
        classroomId: z.string().uuid(),
      }),
    }),

    z.object({
      action: z.literal(
        "regenerate-code",
      ),

      payload: z.object({
        classroomId: z.string().uuid(),
      }),
    }),

    z.object({
      action: z.literal(
        "set-code-enabled",
      ),

      payload: z.object({
        classroomId: z.string().uuid(),
        enabled: z.boolean(),
      }),
    }),

    z.object({
      action: z.literal(
        "list-members",
      ),

      payload: z.object({
        classroomId: z.string().uuid(),

        status: z
          .enum([
            "pending",
            "active",
            "rejected",
            "removed",
            "left",
          ])
          .optional(),
      }),
    }),

    z.object({
      action: z.literal(
        "approve-member",
      ),

      payload: z.object({
        classroomId: z.string().uuid(),
        membershipId: z.string().uuid(),
      }),
    }),

    z.object({
      action: z.literal(
        "reject-member",
      ),

      payload: z.object({
        classroomId: z.string().uuid(),
        membershipId: z.string().uuid(),
      }),
    }),

    z.object({
      action: z.literal(
        "remove-member",
      ),

      payload: z.object({
        classroomId: z.string().uuid(),
        membershipId: z.string().uuid(),
      }),
    }),

    z.object({
      action: z.literal(
        "list-student-classes",
      ),
    }),

    z.object({
      action: z.literal(
        "get-student-class",
      ),

      payload: z.object({
        classroomId: z.string().uuid(),
      }),
    }),

    z.object({
      action: z.literal(
        "join-class",
      ),

      payload: z.object({
        joinCode: z
          .string()
          .trim()
          .transform(
            (value) =>
              value
                .toUpperCase()
                .replace(
                  /\s+/g,
                  "",
                ),
          )
          .refine(
            (value) =>
              /^SNC-[A-Z0-9]{6}$/
                .test(value),
            "Enter a valid class code.",
          ),
      }),
    }),

    z.object({
      action: z.literal(
        "leave-class",
      ),

      payload: z.object({
        classroomId: z.string().uuid(),
      }),
    }),
  ],
);

type ActionInput =
  z.infer<typeof actionSchema>;

function response(
  body: unknown,
  status = 200,
): Response {
  return Response.json(
    body,
    {
      status,
    },
  );
}

function emptyCounts(): MembershipCounts {
  return {
    pending: 0,
    active: 0,
    rejected: 0,
    removed: 0,
    left: 0,
  };
}

function displayName(
  profile: AppProfile | null,
): string {
  if (!profile) {
    return "Unknown user";
  }

  const name = [
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
    || "Unknown user"
  );
}

function generateCode(): string {
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  const random =
    new Uint32Array(6);

  crypto.getRandomValues(random);

  const suffix =
    Array.from(random)
      .map(
        (value) =>
          alphabet[
            value % alphabet.length
          ],
      )
      .join("");

  return `SNC-${suffix}`;
}

async function uniqueCode(
  admin: any,
): Promise<string> {
  for (
    let attempt = 0;
    attempt < 12;
    attempt += 1
  ) {
    const code =
      generateCode();

    const {
      data,
      error,
    } = await admin
      .from("classrooms")
      .select("id")
      .eq("join_code", code)
      .maybeSingle();

    if (error) {
      throw new AppError(
        500,
        "JOIN_CODE_CHECK_FAILED",
        "Unable to generate a class code.",
      );
    }

    if (!data) {
      return code;
    }
  }

  throw new AppError(
    500,
    "JOIN_CODE_GENERATION_FAILED",
    "Unable to generate a unique class code.",
  );
}

async function getProfile(
  admin: any,
  userId: string,
): Promise<AppProfile> {
  const {
    data,
    error,
  } = await fetchSplitProfile(
    admin,
    userId,
  );

  if (
    error
    || !data
  ) {
    throw new AppError(
      403,
      "ACCOUNT_NOT_FOUND",
      "The authenticated account could not be loaded.",
    );
  }

  return data as AppProfile;
}

function requireRole(
  profile: AppProfile,
  role: AppRole,
): void {
  if (
    profile.account_status !== "active"
    || profile.role !== role
  ) {
    throw new AppError(
      403,
      "ROLE_NOT_ALLOWED",
      role === "instructor"
        ? "Only active instructors can perform this action."
        : "Only active students can perform this action.",
    );
  }
}

async function ownedClassroom(
  admin: any,
  classroomId: string,
  instructorId: string,
): Promise<ClassroomRecord> {
  const {
    data,
    error,
  } = await admin
    .from("classrooms")
    .select("*")
    .eq("id", classroomId)
    .eq(
      "instructor_id",
      instructorId,
    )
    .maybeSingle();

  if (
    error
    || !data
  ) {
    throw new AppError(
      404,
      "CLASSROOM_NOT_FOUND",
      "The class was not found or is not owned by this instructor.",
    );
  }

  return data as ClassroomRecord;
}

function countByClassroom(
  memberships: Array<{
    classroom_id: string;
    membership_status: MembershipStatus;
  }>,
): Map<string, MembershipCounts> {
  const map =
    new Map<string, MembershipCounts>();

  for (
    const membership
    of memberships
  ) {
    const counts =
      map.get(
        membership.classroom_id,
      )
      ?? emptyCounts();

    counts[
      membership.membership_status
    ] += 1;

    map.set(
      membership.classroom_id,
      counts,
    );
  }

  return map;
}

async function instructorClassList(
  admin: any,
  instructorId: string,
): Promise<Response> {
  const {
    data: classroomData,
    error: classroomError,
  } = await admin
    .from("classrooms")
    .select("*")
    .eq(
      "instructor_id",
      instructorId,
    )
    .order(
      "created_at",
      {
        ascending: false,
      },
    );

  if (classroomError) {
    throw new AppError(
      500,
      "CLASSROOM_LIST_FAILED",
      "Unable to load your classes.",
    );
  }

  const classrooms =
    classroomData as ClassroomRecord[];

  const classroomIds =
    classrooms.map(
      (classroom) =>
        classroom.id,
    );

  let membershipRows: Array<{
    classroom_id: string;
    membership_status: MembershipStatus;
  }> = [];

  if (classroomIds.length > 0) {
    const {
      data,
      error,
    } = await admin
      .from("classroom_members")
      .select(
        "classroom_id,membership_status",
      )
      .in(
        "classroom_id",
        classroomIds,
      );

    if (error) {
      throw new AppError(
        500,
        "MEMBERSHIP_COUNT_FAILED",
        "Unable to load class membership counts.",
      );
    }

    membershipRows =
      data as typeof membershipRows;
  }

  const countMap =
    countByClassroom(
      membershipRows,
    );

  return response({
    classrooms:
      classrooms.map(
        (classroom) => ({
          ...classroom,
          memberCounts:
            countMap.get(
              classroom.id,
            )
            ?? emptyCounts(),
        }),
      ),
  });
}

async function instructorClassDetails(
  admin: any,
  instructorId: string,
  classroomId: string,
): Promise<Response> {
  const classroom =
    await ownedClassroom(
      admin,
      classroomId,
      instructorId,
    );

  const {
    data,
    error,
  } = await admin
    .from("classroom_members")
    .select(
      "classroom_id,membership_status",
    )
    .eq(
      "classroom_id",
      classroom.id,
    );

  if (error) {
    throw new AppError(
      500,
      "MEMBERSHIP_COUNT_FAILED",
      "Unable to load class membership counts.",
    );
  }

  const counts =
    countByClassroom(
      data as Array<{
        classroom_id: string;
        membership_status: MembershipStatus;
      }>,
    ).get(
      classroom.id,
    )
    ?? emptyCounts();

  return response({
    classroom: {
      ...classroom,
      memberCounts: counts,
    },
  });
}

async function createClassroom(
  admin: any,
  instructorId: string,
  payload: Extract<
    ActionInput,
    {
      action: "create-class";
    }
  >["payload"],
): Promise<Response> {
  const joinCode =
    await uniqueCode(admin);

  const {
    data,
    error,
  } = await admin
    .from("classrooms")
    .insert({
      instructor_id:
        instructorId,

      name:
        payload.name.trim(),

      subject_code:
        payload.subjectCode
          .trim()
          .toUpperCase(),

      section:
        payload.section.trim(),

      description:
        payload.description?.trim()
        || null,

      school_year:
        payload.schoolYear,

      semester:
        payload.semester,

      join_code:
        joinCode,

      join_enabled:
        payload.joinEnabled,

      status:
        "active",
    })
    .select("*")
    .single();

  if (error) {
    throw new AppError(
      400,
      "CLASSROOM_CREATE_FAILED",
      error.message,
    );
  }

  return response(
    {
      classroom: data,
      message:
        "The class was created successfully.",
    },
    201,
  );
}

async function updateClassroom(
  admin: any,
  instructorId: string,
  payload: Extract<
    ActionInput,
    {
      action: "update-class";
    }
  >["payload"],
): Promise<Response> {
  await ownedClassroom(
    admin,
    payload.classroomId,
    instructorId,
  );

  const {
    data,
    error,
  } = await admin
    .from("classrooms")
    .update({
      name:
        payload.name.trim(),

      subject_code:
        payload.subjectCode
          .trim()
          .toUpperCase(),

      section:
        payload.section.trim(),

      description:
        payload.description?.trim()
        || null,

      school_year:
        payload.schoolYear,

      semester:
        payload.semester,
    })
    .eq(
      "id",
      payload.classroomId,
    )
    .eq(
      "instructor_id",
      instructorId,
    )
    .select("*")
    .single();

  if (error) {
    throw new AppError(
      400,
      "CLASSROOM_UPDATE_FAILED",
      error.message,
    );
  }

  return response({
    classroom: data,
    message:
      "The class information was updated.",
  });
}

async function setClassroomStatus(
  admin: any,
  instructorId: string,
  classroomId: string,
  status:
    | "active"
    | "archived",
): Promise<Response> {
  await ownedClassroom(
    admin,
    classroomId,
    instructorId,
  );

  const isActive =
    status === "active";

  if (!isActive) {
    const {
      data: archiveSummary,
      error: archiveError,
    } = await admin.rpc(
      "archive_classroom_safely",
      {
        p_instructor_id:
          instructorId,
        p_classroom_id:
          classroomId,
      },
    );

    if (archiveError) {
      throw new AppError(
        422,
        "CLASSROOM_ARCHIVE_FAILED",
        "The class could not be archived safely.",
      );
    }

    const classroom =
      await ownedClassroom(
        admin,
        classroomId,
        instructorId,
      );

    return response({
      classroom,
      archiveSummary,
      message:
        "The class was archived and its assigned assessment access was closed.",
    });
  }

  const {
    data,
    error,
  } = await admin
    .from("classrooms")
    .update({
      status:
        "active",
      join_enabled:
        true,
      archived_at:
        null,
    })
    .eq(
      "id",
      classroomId,
    )
    .eq(
      "instructor_id",
      instructorId,
    )
    .select("*")
    .single();

  if (error) {
    throw new AppError(
      400,
      "CLASSROOM_STATUS_FAILED",
      "The class could not be reactivated.",
    );
  }

  return response({
    classroom: data,
    message:
      "The class was reactivated. Previous assessment schedules remain closed until you schedule them again.",
  });
}

async function regenerateJoinCode(
  admin: any,
  instructorId: string,
  classroomId: string,
): Promise<Response> {
  const classroom =
    await ownedClassroom(
      admin,
      classroomId,
      instructorId,
    );

  if (
    classroom.status !== "active"
  ) {
    throw new AppError(
      409,
      "CLASSROOM_ARCHIVED",
      "Reactivate the class before regenerating its code.",
    );
  }

  const joinCode =
    await uniqueCode(admin);

  const {
    data,
    error,
  } = await admin
    .from("classrooms")
    .update({
      join_code:
        joinCode,

      join_enabled:
        true,
    })
    .eq(
      "id",
      classroomId,
    )
    .eq(
      "instructor_id",
      instructorId,
    )
    .select("*")
    .single();

  if (error) {
    throw new AppError(
      400,
      "JOIN_CODE_UPDATE_FAILED",
      error.message,
    );
  }

  return response({
    classroom: data,
    message:
      "A new class code was generated.",
  });
}

async function changeCodeState(
  admin: any,
  instructorId: string,
  classroomId: string,
  enabled: boolean,
): Promise<Response> {
  const classroom =
    await ownedClassroom(
      admin,
      classroomId,
      instructorId,
    );

  if (
    enabled
    && classroom.status !== "active"
  ) {
    throw new AppError(
      409,
      "CLASSROOM_ARCHIVED",
      "Reactivate the class before enabling its code.",
    );
  }

  const {
    data,
    error,
  } = await admin
    .from("classrooms")
    .update({
      join_enabled:
        enabled,
    })
    .eq(
      "id",
      classroomId,
    )
    .eq(
      "instructor_id",
      instructorId,
    )
    .select("*")
    .single();

  if (error) {
    throw new AppError(
      400,
      "JOIN_CODE_STATE_FAILED",
      error.message,
    );
  }

  return response({
    classroom: data,
    message:
      enabled
        ? "The class code was enabled."
        : "The class code was disabled.",
  });
}

async function memberList(
  admin: any,
  instructorId: string,
  classroomId: string,
  status?: MembershipStatus,
): Promise<Response> {
  await ownedClassroom(
    admin,
    classroomId,
    instructorId,
  );

  let query =
    admin
      .from("classroom_members")
      .select("*")
      .eq(
        "classroom_id",
        classroomId,
      )
      .order(
        "requested_at",
        {
          ascending: false,
        },
      );

  if (status) {
    query =
      query.eq(
        "membership_status",
        status,
      );
  }

  const {
    data,
    error,
  } = await query;

  if (error) {
    throw new AppError(
      500,
      "MEMBER_LIST_FAILED",
      "Unable to load class memberships.",
    );
  }

  const memberships =
    data as MembershipRecord[];

  const studentIds =
    memberships.map(
      (membership) =>
        membership.student_id,
    );

  let profiles: AppProfile[] = [];

  if (studentIds.length > 0) {
    const {
      data: profileData,
      error: profileError,
    } = await fetchSplitProfiles(
      admin,
      studentIds,
    );

    if (profileError) {
      throw new AppError(
        500,
        "MEMBER_PROFILE_LIST_FAILED",
        "Unable to load student profiles.",
      );
    }

    profiles =
      profileData as AppProfile[];
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

  return response({
    members:
      memberships.map(
        (membership) => {
          const profile =
            profileMap.get(
              membership.student_id,
            )
            ?? null;

          return {
            ...membership,

            student: {
              id:
                membership.student_id,

              name:
                displayName(profile),

              email:
                profile?.email
                ?? null,

              studentNumber:
                profile?.student_number
                ?? null,

              accountStatus:
                profile?.account_status
                ?? null,
            },
          };
        },
      ),
  });
}

async function changeMembership(
  admin: any,
  instructorId: string,
  classroomId: string,
  membershipId: string,
  target:
    | "active"
    | "rejected"
    | "removed",
): Promise<Response> {
  await ownedClassroom(
    admin,
    classroomId,
    instructorId,
  );

  const {
    data: membership,
    error: membershipError,
  } = await admin
    .from("classroom_members")
    .select("*")
    .eq(
      "id",
      membershipId,
    )
    .eq(
      "classroom_id",
      classroomId,
    )
    .maybeSingle();

  if (
    membershipError
    || !membership
  ) {
    throw new AppError(
      404,
      "MEMBERSHIP_NOT_FOUND",
      "The class membership was not found.",
    );
  }

  if (
    (
      target === "active"
      || target === "rejected"
    )
    && membership.membership_status
      !== "pending"
  ) {
    throw new AppError(
      409,
      "MEMBERSHIP_NOT_PENDING",
      "Only pending requests can be approved or rejected.",
    );
  }

  if (
    target === "removed"
    && membership.membership_status
      !== "active"
  ) {
    throw new AppError(
      409,
      "MEMBERSHIP_NOT_ACTIVE",
      "Only enrolled students can be removed.",
    );
  }

  const now =
    new Date().toISOString();

  const update: Record<
    string,
    unknown
  > = {
    membership_status:
      target,
  };

  if (target === "active") {
    Object.assign(
      update,
      {
        approved_at:
          now,

        approved_by:
          instructorId,

        rejected_at:
          null,

        removed_at:
          null,

        left_at:
          null,
      },
    );
  }

  if (target === "rejected") {
    Object.assign(
      update,
      {
        rejected_at:
          now,

        approved_at:
          null,

        approved_by:
          null,
      },
    );
  }

  if (target === "removed") {
    update.removed_at =
      now;
  }

  const {
    data,
    error,
  } = await admin
    .from("classroom_members")
    .update(update)
    .eq(
      "id",
      membershipId,
    )
    .eq(
      "classroom_id",
      classroomId,
    )
    .select("*")
    .single();

  if (error) {
    throw new AppError(
      400,
      "MEMBERSHIP_UPDATE_FAILED",
      error.message,
    );
  }

  const messages = {
    active:
      "The student was approved.",

    rejected:
      "The membership request was rejected.",

    removed:
      "The student was removed from the class.",
  };

  return response({
    membership: data,
    message:
      messages[target],
  });
}

async function studentClassList(
  admin: any,
  studentId: string,
): Promise<Response> {
  const {
    data: membershipData,
    error: membershipError,
  } = await admin
    .from("classroom_members")
    .select("*")
    .eq(
      "student_id",
      studentId,
    )
    .in(
      "membership_status",
      [
        "pending",
        "active",
      ],
    )
    .order(
      "requested_at",
      {
        ascending: false,
      },
    );

  if (membershipError) {
    throw new AppError(
      500,
      "STUDENT_CLASS_LIST_FAILED",
      "Unable to load your classes.",
    );
  }

  const memberships =
    membershipData as MembershipRecord[];

  const classroomIds =
    memberships.map(
      (membership) =>
        membership.classroom_id,
    );

  let classrooms: ClassroomRecord[] = [];

  if (classroomIds.length > 0) {
    const {
      data,
      error,
    } = await admin
      .from("classrooms")
      .select("*")
      .in(
        "id",
        classroomIds,
      );

    if (error) {
      throw new AppError(
        500,
        "STUDENT_CLASSROOM_DATA_FAILED",
        "Unable to load class information.",
      );
    }

    classrooms =
      data as ClassroomRecord[];
  }

  const instructorIds =
    Array.from(
      new Set(
        classrooms.map(
          (classroom) =>
            classroom.instructor_id,
        ),
      ),
    );

  let instructors: AppProfile[] = [];

  if (instructorIds.length > 0) {
    const {
      data,
      error,
    } = await fetchSplitProfiles(
      admin,
      instructorIds,
    );

    if (error) {
      throw new AppError(
        500,
        "INSTRUCTOR_DATA_FAILED",
        "Unable to load instructor information.",
      );
    }

    instructors =
      data as AppProfile[];
  }

  const classroomMap =
    new Map(
      classrooms.map(
        (classroom) => [
          classroom.id,
          classroom,
        ],
      ),
    );

  const instructorMap =
    new Map(
      instructors.map(
        (instructor) => [
          instructor.id,
          instructor,
        ],
      ),
    );

  const items =
    memberships.flatMap(
      (membership) => {
        const classroom =
          classroomMap.get(
            membership.classroom_id,
          );

        if (!classroom) {
          return [];
        }

        return [
          {
            membership,
            classroom,

            instructor: {
              id:
                classroom.instructor_id,

              name:
                displayName(
                  instructorMap.get(
                    classroom.instructor_id,
                  )
                  ?? null,
                ),
            },
          },
        ];
      },
    );

  return response({
    classes: items,
  });
}

async function studentClassDetails(
  admin: any,
  studentId: string,
  classroomId: string,
): Promise<Response> {
  const {
    data: membership,
    error: membershipError,
  } = await admin
    .from("classroom_members")
    .select("*")
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
    membershipError
    || !membership
  ) {
    throw new AppError(
      404,
      "ACTIVE_MEMBERSHIP_NOT_FOUND",
      "You are not an active member of this class.",
    );
  }

  const {
    data: classroom,
    error: classroomError,
  } = await admin
    .from("classrooms")
    .select("*")
    .eq(
      "id",
      classroomId,
    )
    .maybeSingle();

  if (
    classroomError
    || !classroom
  ) {
    throw new AppError(
      404,
      "CLASSROOM_NOT_FOUND",
      "The class was not found.",
    );
  }

  const {
    data: instructor,
  } = await fetchSplitProfile(
    admin,
    classroom.instructor_id,
  );

  return response({
    membership,
    classroom,

    instructor: {
      id:
        classroom.instructor_id,

      name:
        displayName(
          instructor as AppProfile | null,
        ),
    },
  });
}

async function requestMembership(
  admin: any,
  studentId: string,
  joinCode: string,
): Promise<Response> {
  const {
    data: classroom,
    error: classroomError,
  } = await admin
    .from("classrooms")
    .select("*")
    .eq(
      "join_code",
      joinCode,
    )
    .eq(
      "status",
      "active",
    )
    .eq(
      "join_enabled",
      true,
    )
    .maybeSingle();

  if (
    classroomError
    || !classroom
  ) {
    throw new AppError(
      404,
      "JOIN_CODE_NOT_FOUND",
      "The class code is invalid, disabled, or belongs to an archived class.",
    );
  }

  const {
    data: existing,
    error: existingError,
  } = await admin
    .from("classroom_members")
    .select("*")
    .eq(
      "classroom_id",
      classroom.id,
    )
    .eq(
      "student_id",
      studentId,
    )
    .maybeSingle();

  if (existingError) {
    throw new AppError(
      500,
      "MEMBERSHIP_CHECK_FAILED",
      "Unable to check the class membership.",
    );
  }

  if (
    existing?.membership_status
      === "active"
  ) {
    throw new AppError(
      409,
      "ALREADY_ENROLLED",
      "You are already enrolled in this class.",
    );
  }

  if (
    existing?.membership_status
      === "pending"
  ) {
    throw new AppError(
      409,
      "REQUEST_ALREADY_PENDING",
      "Your membership request is already pending.",
    );
  }

  const now =
    new Date().toISOString();

  let membership: MembershipRecord;

  if (existing) {
    const {
      data,
      error,
    } = await admin
      .from("classroom_members")
      .update({
        membership_status:
          "pending",

        requested_at:
          now,

        approved_at:
          null,

        approved_by:
          null,

        rejected_at:
          null,

        removed_at:
          null,

        left_at:
          null,
      })
      .eq(
        "id",
        existing.id,
      )
      .select("*")
      .single();

    if (error) {
      throw new AppError(
        400,
        "MEMBERSHIP_REQUEST_FAILED",
        error.message,
      );
    }

    membership =
      data as MembershipRecord;
  } else {
    const {
      data,
      error,
    } = await admin
      .from("classroom_members")
      .insert({
        classroom_id:
          classroom.id,

        student_id:
          studentId,

        membership_status:
          "pending",

        requested_at:
          now,
      })
      .select("*")
      .single();

    if (error) {
      throw new AppError(
        400,
        "MEMBERSHIP_REQUEST_FAILED",
        error.message,
      );
    }

    membership =
      data as MembershipRecord;
  }

  const {
    data: instructor,
  } = await fetchSplitProfile(
    admin,
    classroom.instructor_id,
  );

  return response(
    {
      classroom,
      membership,

      instructor: {
        id:
          classroom.instructor_id,

        name:
          displayName(
            instructor as AppProfile | null,
          ),
      },

      message:
        "Your request was sent to the instructor.",
    },
    201,
  );
}

async function leaveMembership(
  admin: any,
  studentId: string,
  classroomId: string,
): Promise<Response> {
  const {
    data: membership,
    error: membershipError,
  } = await admin
    .from("classroom_members")
    .select("*")
    .eq(
      "classroom_id",
      classroomId,
    )
    .eq(
      "student_id",
      studentId,
    )
    .in(
      "membership_status",
      [
        "pending",
        "active",
      ],
    )
    .maybeSingle();

  if (
    membershipError
    || !membership
  ) {
    throw new AppError(
      404,
      "MEMBERSHIP_NOT_FOUND",
      "No active or pending membership was found.",
    );
  }

  const {
    data,
    error,
  } = await admin
    .from("classroom_members")
    .update({
      membership_status:
        "left",

      left_at:
        new Date().toISOString(),
    })
    .eq(
      "id",
      membership.id,
    )
    .select("*")
    .single();

  if (error) {
    throw new AppError(
      400,
      "LEAVE_CLASS_FAILED",
      error.message,
    );
  }

  return response({
    membership: data,
    message:
      "You left the class.",
  });
}

export default {
  fetch: withSupabase(
    {
      auth: "user",
    },

    async (
      request,
      context,
    ) => {
      if (
        request.method !== "POST"
      ) {
        return response(
          {
            ok: false,
            code:
              "METHOD_NOT_ALLOWED",
            message:
              "Only POST requests are supported.",
          },
          405,
        );
      }

      try {
        const userId =
          context.userClaims?.id;

        if (!userId) {
          throw new AppError(
            401,
            "AUTHENTICATION_REQUIRED",
            "A valid authenticated user is required.",
          );
        }

        const input =
          actionSchema.parse(
            await request.json(),
          );

        const profile =
          await getProfile(
            context.supabaseAdmin,
            userId,
          );

        switch (input.action) {
          case "list-instructor-classes":
            requireRole(
              profile,
              "instructor",
            );

            return await instructorClassList(
              context.supabaseAdmin,
              userId,
            );

          case "get-instructor-class":
            requireRole(
              profile,
              "instructor",
            );

            return await instructorClassDetails(
              context.supabaseAdmin,
              userId,
              input.payload.classroomId,
            );

          case "create-class":
            requireRole(
              profile,
              "instructor",
            );

            return await createClassroom(
              context.supabaseAdmin,
              userId,
              input.payload,
            );

          case "update-class":
            requireRole(
              profile,
              "instructor",
            );

            return await updateClassroom(
              context.supabaseAdmin,
              userId,
              input.payload,
            );

          case "archive-class":
            requireRole(
              profile,
              "instructor",
            );

            return await setClassroomStatus(
              context.supabaseAdmin,
              userId,
              input.payload.classroomId,
              "archived",
            );

          case "reactivate-class":
            requireRole(
              profile,
              "instructor",
            );

            return await setClassroomStatus(
              context.supabaseAdmin,
              userId,
              input.payload.classroomId,
              "active",
            );

          case "regenerate-code":
            requireRole(
              profile,
              "instructor",
            );

            return await regenerateJoinCode(
              context.supabaseAdmin,
              userId,
              input.payload.classroomId,
            );

          case "set-code-enabled":
            requireRole(
              profile,
              "instructor",
            );

            return await changeCodeState(
              context.supabaseAdmin,
              userId,
              input.payload.classroomId,
              input.payload.enabled,
            );

          case "list-members":
            requireRole(
              profile,
              "instructor",
            );

            return await memberList(
              context.supabaseAdmin,
              userId,
              input.payload.classroomId,
              input.payload.status,
            );

          case "approve-member":
            requireRole(
              profile,
              "instructor",
            );

            return await changeMembership(
              context.supabaseAdmin,
              userId,
              input.payload.classroomId,
              input.payload.membershipId,
              "active",
            );

          case "reject-member":
            requireRole(
              profile,
              "instructor",
            );

            return await changeMembership(
              context.supabaseAdmin,
              userId,
              input.payload.classroomId,
              input.payload.membershipId,
              "rejected",
            );

          case "remove-member":
            requireRole(
              profile,
              "instructor",
            );

            return await changeMembership(
              context.supabaseAdmin,
              userId,
              input.payload.classroomId,
              input.payload.membershipId,
              "removed",
            );

          case "list-student-classes":
            requireRole(
              profile,
              "student",
            );

            return await studentClassList(
              context.supabaseAdmin,
              userId,
            );

          case "get-student-class":
            requireRole(
              profile,
              "student",
            );

            return await studentClassDetails(
              context.supabaseAdmin,
              userId,
              input.payload.classroomId,
            );

          case "join-class":
            requireRole(
              profile,
              "student",
            );

            return await requestMembership(
              context.supabaseAdmin,
              userId,
              input.payload.joinCode,
            );

          case "leave-class":
            requireRole(
              profile,
              "student",
            );

            return await leaveMembership(
              context.supabaseAdmin,
              userId,
              input.payload.classroomId,
            );
        }
      } catch (error) {
        if (
          error instanceof z.ZodError
        ) {
          return response(
            {
              ok: false,
              code:
                "VALIDATION_ERROR",
              message:
                "The submitted classroom information is invalid.",
              issues:
                error.issues,
            },
            422,
          );
        }

        if (
          error instanceof AppError
        ) {
          return response(
            {
              ok: false,
              code:
                error.code,
              message:
                error.message,
            },
            error.status,
          );
        }

        console.error(
          "Unhandled classroom function error.",
          error,
        );

        return response(
          {
            ok: false,
            code:
              "INTERNAL_ERROR",
            message:
              "The classroom request could not be completed.",
          },
          500,
        );
      }
    },
  ),
};
