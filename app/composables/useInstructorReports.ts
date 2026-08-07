import type {
  FunctionsHttpError,
} from "@supabase/supabase-js";

import type {
  InstructorAssessmentDetailedReport,
  InstructorReportFilters,
  InstructorReportFunctionResult,
  InstructorReportsOverview,
} from "~/types/instructor-report";

interface FunctionErrorBody {
  code?: string;
  message?: string;
}

export function useInstructorReports() {
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
        : "The report request could not be completed.";

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

  async function getAssessmentReport(
    assessmentId: string,
  ) {
    return await invoke<
      InstructorAssessmentDetailedReport
    >(
      "get-assessment-report",
      {
        assessmentId,
      },
    );
  }

  return {
    getOverview,
    getAssessmentReport,
  };
}
