import type {
  Assessment,
  AssessmentClassOption,
  AssessmentCreateInput,
  AssessmentDetailsInput,
  AssessmentWithClassroom,
  StudentPublishedAssessment,
} from "~/types/assessment";

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

export function useAssessments() {
  const supabase = useSupabaseClient();

  async function parseFunctionError(
    error: unknown,
  ): Promise<{
    message: string;
    code: string | null;
  }> {
    return await parseUserFacingFunctionError(
      error,
      "We couldn't complete the assessment action right now. Please try again.",
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
      } = await supabase.functions.invoke<T>(
        "assessments",
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
          await parseFunctionError(
            error,
          );

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
        await parseFunctionError(
          error,
        );

      return {
        data: null,
        error: parsed.message,
        code: parsed.code,
      };
    }
  }

  async function listClassOptions() {
    return await invoke<{
      classes: AssessmentClassOption[];
    }>(
      "list-class-options",
    );
  }

  async function listInstructorAssessments() {
    return await invoke<{
      assessments: AssessmentWithClassroom[];
    }>(
      "list-instructor-assessments",
    );
  }

  async function getInstructorAssessment(
    assessmentId: string,
  ) {
    return await invoke<{
      assessment: AssessmentWithClassroom;
    }>(
      "get-instructor-assessment",
      {
        assessmentId,
      },
    );
  }

  async function createAssessment(
    input: AssessmentCreateInput,
  ) {
    return await invoke<
      MessageResponse & {
        assessment: AssessmentWithClassroom;
      }
    >(
      "create-assessment",
      {
        ...input,
        // Kept only for compatibility with the current Edge Function
        // contract. Whole-assessment duration is no longer configurable.
        overallTimeLimitMinutes:
          null,
      },
    );
  }

  async function updateAssessment(
    assessmentId: string,
    input: AssessmentDetailsInput,
  ) {
    return await invoke<
      MessageResponse & {
        assessment: AssessmentWithClassroom;
      }
    >(
      "update-assessment",
      {
        assessmentId,
        ...input,
        // Keep the deprecated whole-assessment duration disabled.
        overallTimeLimitMinutes:
          null,
      },
    );
  }

  async function setAssessmentAssignments(
    assessmentId: string,
    classroomIds: string[],
  ) {
    return await invoke<
      MessageResponse & {
        assessment: AssessmentWithClassroom;
      }
    >(
      "set-assessment-assignments",
      {
        assessmentId,
        classroomIds,
      },
    );
  }

  async function publishAssessment(
    assessmentId: string,
  ) {
    return await invoke<
      MessageResponse & {
        assessment: Assessment;
      }
    >(
      "publish-assessment",
      {
        assessmentId,
      },
    );
  }

  async function returnAssessmentToDraft(
    assessmentId: string,
  ) {
    return await invoke<
      MessageResponse & {
        assessment: Assessment;
      }
    >(
      "return-to-draft",
      {
        assessmentId,
      },
    );
  }

  async function archiveAssessment(
    assessmentId: string,
  ) {
    return await invoke<
      MessageResponse & {
        assessment: Assessment;
      }
    >(
      "archive-assessment",
      {
        assessmentId,
      },
    );
  }

  async function restoreAssessment(
    assessmentId: string,
  ) {
    return await invoke<
      MessageResponse & {
        assessment: Assessment;
      }
    >(
      "restore-assessment",
      {
        assessmentId,
      },
    );
  }

  async function duplicateAssessment(
    assessmentId: string,
  ) {
    return await invoke<
      MessageResponse & {
        assessment: Assessment;
      }
    >(
      "duplicate-assessment",
      {
        assessmentId,
      },
    );
  }

  async function listStudentClassAssessments(
    classroomId: string,
  ) {
    return await invoke<{
      assessments: StudentPublishedAssessment[];
    }>(
      "list-student-class-assessments",
      {
        classroomId,
      },
    );
  }

  return {
    listClassOptions,
    listInstructorAssessments,
    getInstructorAssessment,
    createAssessment,
    updateAssessment,
    setAssessmentAssignments,
    publishAssessment,
    returnAssessmentToDraft,
    archiveAssessment,
    restoreAssessment,
    duplicateAssessment,
    listStudentClassAssessments,
  };
}
