import type {
  InstructorAttemptReview,
  InstructorStudentProgressDetail,
  InstructorStudentProgressOverview,
  StudentProgressFunctionResult,
} from "~/types/instructor-student-progress";

import {
  parseUserFacingFunctionError,
} from "~/utils/user-facing-error";

export function useInstructorStudentProgress() {
  const supabase =
    useSupabaseClient();

  async function invoke<T>(
    action: string,
    payload?:
      Record<
        string,
        unknown
      >,
  ): Promise<
    StudentProgressFunctionResult<T>
  > {
    try {
      const {
        data,
        error,
      } =
        await supabase.functions
          .invoke<T>(
            "instructor-student-progress",
            {
              body: {
                action,
                ...(payload
                  ? {
                      payload,
                    }
                  : {}),
              },
            },
          );

      if (error) {
        const parsed =
          await parseUserFacingFunctionError(
            error,
            "We couldn't load Student progress right now. Please try again.",
          );

        return {
          data:
            null,
          error:
            parsed.message,
          code:
            parsed.code,
        };
      }

      return {
        data,
        error:
          null,
        code:
          null,
      };
    } catch (error) {
      const parsed =
        await parseUserFacingFunctionError(
          error,
          "We couldn't load Student progress right now. Please try again.",
        );

      return {
        data:
          null,
        error:
          parsed.message,
        code:
          parsed.code,
      };
    }
  }

  async function getOverview() {
    return await invoke<
      InstructorStudentProgressOverview
    >(
      "get-overview",
    );
  }

  async function getStudentDetail(
    studentId: string,
  ) {
    return await invoke<
      InstructorStudentProgressDetail
    >(
      "get-student-detail",
      {
        studentId,
      },
    );
  }

  async function reviewAttempt(
    attemptId: string,
  ) {
    return await invoke<
      InstructorAttemptReview
    >(
      "review-attempt",
      {
        attemptId,
      },
    );
  }

  return {
    getOverview,
    getStudentDetail,
    reviewAttempt,
  };
}
