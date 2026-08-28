import type {
  Classroom,
  ClassroomEnrollmentApprovalUpdate,
  ClassroomEnrollmentSettings,
  ClassroomFormInput,
  ClassroomMember,
  InstructorClassroom,
  MembershipStatus,
  StudentClassListItem,
  StudentClassMembership,
  StudentClassmate,
} from "~/types/classroom";

import {
  parseUserFacingFunctionError,
} from "~/utils/user-facing-error";

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
    return await parseUserFacingFunctionError(
      error,
      "We couldn't complete the class action right now. Please try again.",
    );
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

  async function duplicateClass(
    classroomId: string,
  ) {
    return await invoke<
      MessageResponse & {
        classroom: InstructorClassroom;
      }
    >(
      "duplicate-class",
      {
        classroomId,
      },
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

  async function getEnrollmentSettings(
    classroomId: string,
  ): Promise<FunctionResult<ClassroomEnrollmentSettings>> {
    return await invoke<ClassroomEnrollmentSettings>(
      "get-enrollment-settings",
      { classroomId },
    );
  }

  async function setEnrollmentApprovalRequired(
    classroomId: string,
    required: boolean,
  ): Promise<FunctionResult<ClassroomEnrollmentApprovalUpdate>> {
    return await invoke<ClassroomEnrollmentApprovalUpdate>(
      "set-enrollment-approval",
      {
        classroomId,
        required,
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

  async function listClassmates(
    classroomId: string,
  ) {
    return await invoke<{
      classmates: StudentClassmate[];
    }>(
      "list-classmates",
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
    duplicateClass,
    updateClass,
    archiveClass,
    reactivateClass,
    regenerateCode,
    setCodeEnabled,
    getEnrollmentSettings,
    setEnrollmentApprovalRequired,
    listMembers,
    approveMember,
    rejectMember,
    removeMember,
    listStudentClasses,
    getStudentClass,
    listClassmates,
    joinClass,
    leaveClass,
  };
}
