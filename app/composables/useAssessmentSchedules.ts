import type {
  FunctionsHttpError,
} from "@supabase/supabase-js";

import type {
  AssessmentScheduleInput,
  InstructorAssessmentScheduleOverview,
} from "~/types/assessment-schedule";

interface FunctionErrorBody {
  code?: string;
  message?: string;
}

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
    const fallback =
      error instanceof Error
        ? error.message
        : "The assessment schedule request could not be completed.";

    const functionError =
      error as FunctionsHttpError;

    if (
      !functionError?.context
      || typeof functionError.context.json
        !== "function"
    ) {
      return {
        message:
          fallback,
        code:
          null,
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
        message:
          fallback,
        code:
          null,
      };
    }
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

  return {
    getInstructorSchedule,
    saveSchedules,
    closeSchedule,
  };
}
