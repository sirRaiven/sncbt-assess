import type {
  InstructorReportFilters,
  InstructorReportFunctionResult,
  InstructorReportsOverview,
} from "~/types/instructor-report";

import {
  parseUserFacingFunctionError,
} from "~/utils/user-facing-error";

export function useInstructorReports() {
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
      "We couldn't load the student results right now. Please try again.",
    );
  }

  async function invoke<T>(
    action: string,
    payload:
      | Record<string, unknown>
      | undefined,
  ): Promise<
    InstructorReportFunctionResult<T>
  > {
    try {
      const {
        data,
        error,
      } =
        await supabase.functions
          .invoke<T>(
            "instructor-reports",
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
        data:
          data
          ?? null,
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

  async function getOverview(
    filters:
      InstructorReportFilters,
  ) {
    return await invoke<
      InstructorReportsOverview
    >(
      "get-overview",
      {
        ...filters,
      },
    );
  }

  return {
    getOverview,
  };
}
