import type {
  AssessmentScheduleInput,
  InstructorAssessmentScheduleOverview,
} from "~/types/assessment-schedule";

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

export function useAssessmentSchedules() {
  const supabase =
    useSupabaseClient();

  async function parseFunctionError(
    error: unknown,
  ): Promise<{
    message: string;
    code: string | null;
  }> {
    return await parseUserFacingFunctionError(
      error,
      "We couldn't update the assessment schedule right now. Please try again.",
    );
  }

  async function invoke<T>(
    action: string,
    payload:
      | Record<string, unknown>
      | undefined,
  ): Promise<FunctionResult<T>> {
    try {
      const {
        data,
        error,
      } =
        await supabase.functions
          .invoke<T>(
            "assessment-schedules",
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
          await parseFunctionError(
            error,
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
        await parseFunctionError(
          error,
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

  async function getInstructorSchedule(
    assessmentId: string,
  ) {
    return await invoke<
      InstructorAssessmentScheduleOverview
    >(
      "get-instructor-schedule",
      {
        assessmentId,
      },
    );
  }

  async function saveSchedules(
    assessmentId: string,
    schedules:
      AssessmentScheduleInput[],
  ) {
    return await invoke<
      MessageResponse
      & InstructorAssessmentScheduleOverview
    >(
      "save-schedules",
      {
        assessmentId,
        schedules,
      },
    );
  }

  async function closeSchedule(
    assignmentId: string,
  ) {
    return await invoke<MessageResponse>(
      "close-schedule",
      {
        assignmentId,
      },
    );
  }

  async function editSchedule(
    assignmentId: string,
    startsAt: string,
    endsAt: string,
    reason = "",
  ) {
    return await invoke<
      MessageResponse
      & InstructorAssessmentScheduleOverview
    >(
      "edit-schedule",
      {
        assignmentId,
        startsAt,
        endsAt,
        reason,
      },
    );
  }

  async function extendSchedule(
    assignmentId: string,
    endsAt: string,
    reason: string,
  ) {
    return await invoke<
      MessageResponse
      & InstructorAssessmentScheduleOverview
    >(
      "extend-schedule",
      {
        assignmentId,
        endsAt,
        reason,
      },
    );
  }

  async function reopenSchedule(
    assignmentId: string,
    startsAt: string,
    endsAt: string,
    reason: string,
  ) {
    return await invoke<
      MessageResponse
      & InstructorAssessmentScheduleOverview
    >(
      "reopen-schedule",
      {
        assignmentId,
        startsAt,
        endsAt,
        reason,
      },
    );
  }

  return {
    getInstructorSchedule,
    saveSchedules,
    closeSchedule,
    editSchedule,
    extendSchedule,
    reopenSchedule,
  };
}
