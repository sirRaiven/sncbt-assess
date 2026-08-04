import type {
  FunctionsHttpError,
} from "@supabase/supabase-js";

import type {
  Classroom,
  ClassroomFormInput,
  ClassroomMember,
  InstructorClassroom,
  MembershipStatus,
  StudentClassListItem,
  StudentClassMembership,
} from "~/types/classroom";

interface FunctionErrorBody {
  code?: string;
  message?: string;
  issues?: unknown;
}

interface FunctionResult<T> {
  data: T | null;
  error: string | null;
  code: string | null;
}

interface MessageResponse {
  message: string;
}

export function useClassrooms() {
  const supabase =
    useSupabaseClient();

  async function parseError(
    error: unknown,
  ): Promise<{
    message: string;
    code: string | null;
  }> {
    const fallback =
      error instanceof Error
        ? error.message
        : "The classroom request could not be completed.";

    const functionError =
      error as FunctionsHttpError;

    if (
      !functionError?.context
      || typeof functionError.context.json
        !== "function"
    ) {
      return {
        message: fallback,
        code: null,
      };
    }

    try {
      const body =
        await functionError.context
          .json() as FunctionErrorBody;

      return {
        message:
          body.message
          || fallback,

        code:
          body.code
          || null,
      };
    } catch {
      return {
        message: fallback,
        code: null,
      };
    }
  }

  async function invoke<T>(
    action: string,
    payload?: Record<string, unknown>,
  ): Promise<FunctionResult<T>> {
    try {
      const {
        data,
        error,
      } = await supabase.functions
        .invoke<T>(
          "classrooms",
          {
            body: payload
              ? {
                  action,
                  payload,
                }
              : {
                  action,
                },
          },
        );

      if (error) {
        const parsed =
          await parseError(error);

        return {
          data: null,
          error: parsed.message,
          code: parsed.code,
        };
      }

      return {
        data,
        error: null,
        code: null,
      };
    } catch (error) {
      const parsed =
        await parseError(error);

      return {
        data: null,
        error: parsed.message,
        code: parsed.code,
      };
    }
  }

  async function listInstructorClasses() {
    return await invoke<{
      classrooms: InstructorClassroom[];
    }>(
      "list-instructor-classes",
    );
  }

  async function getInstructorClass(
    classroomId: string,
  ) {
    return await invoke<{
      classroom: InstructorClassroom;
    }>(
      "get-instructor-class",
      {
        classroomId,
      },
    );
  }

  async function createClass(
    input: ClassroomFormInput,
  ) {
    return await invoke<
      MessageResponse & {
        classroom: Classroom;
      }
    >(
      "create-class",
      input,
    );
  }

  async function updateClass(
    classroomId: string,
    input: Omit<
      ClassroomFormInput,
      "joinEnabled"
    >,
  ) {
    return await invoke<
      MessageResponse & {
        classroom: Classroom;
      }
    >(
      "update-class",
      {
        classroomId,
        ...input,
      },
    );
  }

  async function archiveClass(
    classroomId: string,
  ) {
    return await invoke<
      MessageResponse & {
        classroom: Classroom;
      }
    >(
      "archive-class",
      {
        classroomId,
      },
    );
  }

  async function reactivateClass(
    classroomId: string,
  ) {
    return await invoke<
      MessageResponse & {
        classroom: Classroom;
      }
    >(
      "reactivate-class",
      {
        classroomId,
      },
    );
  }

  async function regenerateCode(
    classroomId: string,
  ) {
    return await invoke<
      MessageResponse & {
        classroom: Classroom;
      }
    >(
      "regenerate-code",
      {
        classroomId,
      },
    );
  }

  async function setCodeEnabled(
    classroomId: string,
    enabled: boolean,
  ) {
    return await invoke<
      MessageResponse & {
        classroom: Classroom;
      }
    >(
      "set-code-enabled",
      {
        classroomId,
        enabled,
      },
    );
  }

  async function listMembers(
    classroomId: string,
    status?: MembershipStatus,
  ) {
    return await invoke<{
      members: ClassroomMember[];
    }>(
      "list-members",
      {
        classroomId,
        ...(status
          ? {
              status,
            }
          : {}),
      },
    );
  }

  async function approveMember(
    classroomId: string,
    membershipId: string,
  ) {
    return await invoke<
      MessageResponse & {
        membership: ClassroomMember;
      }
    >(
      "approve-member",
      {
        classroomId,
        membershipId,
      },
    );
  }

  async function rejectMember(
    classroomId: string,
    membershipId: string,
  ) {
    return await invoke<
      MessageResponse & {
        membership: ClassroomMember;
      }
    >(
      "reject-member",
      {
        classroomId,
        membershipId,
      },
    );
  }

  async function removeMember(
    classroomId: string,
    membershipId: string,
  ) {
    return await invoke<
      MessageResponse & {
        membership: ClassroomMember;
      }
    >(
      "remove-member",
      {
        classroomId,
        membershipId,
      },
    );
  }

  async function listStudentClasses() {
    return await invoke<{
      classes: StudentClassListItem[];
    }>(
      "list-student-classes",
    );
  }

  async function getStudentClass(
    classroomId: string,
  ) {
    return await invoke<{
      membership: StudentClassMembership;
      classroom: Classroom;
      instructor: {
        id: string;
        name: string;
      };
    }>(
      "get-student-class",
      {
        classroomId,
      },
    );
  }

  async function joinClass(
    joinCode: string,
  ) {
    return await invoke<
      MessageResponse & {
        membership: StudentClassMembership;
        classroom: Classroom;
        instructor: {
          id: string;
          name: string;
        };
      }
    >(
      "join-class",
      {
        joinCode,
      },
    );
  }

  async function leaveClass(
    classroomId: string,
  ) {
    return await invoke<
      MessageResponse & {
        membership: StudentClassMembership;
      }
    >(
      "leave-class",
      {
        classroomId,
      },
    );
  }

  return {
    listInstructorClasses,
    getInstructorClass,
    createClass,
    updateClass,
    archiveClass,
    reactivateClass,
    regenerateCode,
    setCodeEnabled,
    listMembers,
    approveMember,
    rejectMember,
    removeMember,
    listStudentClasses,
    getStudentClass,
    joinClass,
    leaveClass,
  };
}
