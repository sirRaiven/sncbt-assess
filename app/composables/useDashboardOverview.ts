import type {
  InstructorDashboardOverview,
  StudentDashboardOverview,
} from "~/types/dashboard-overview";

import {
  parseUserFacingFunctionError,
} from "~/utils/user-facing-error";

interface FunctionResult<T> {
  data: T | null;
  error: string | null;
  code: string | null;
}

export function useDashboardOverview() {
  const supabase = useSupabaseClient();

  async function parseFunctionError(
    error: unknown,
  ): Promise<{
    message: string;
    code: string | null;
  }> {
    return await parseUserFacingFunctionError(
      error,
      "We couldn't load the dashboard right now. Please try again.",
    );
  }

  async function invoke<T>(): Promise<FunctionResult<T>> {
    try {
      const {
        data,
        error,
      } = await supabase.functions.invoke<T>(
        "dashboard-overview",
        {
          body: {
            action: "get-overview",
          },
        },
      );

      if (error) {
        const parsed =
          await parseFunctionError(error);

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
        await parseFunctionError(error);

      return {
        data: null,
        error: parsed.message,
        code: parsed.code,
      };
    }
  }

  async function getInstructorOverview() {
    return await invoke<InstructorDashboardOverview>();
  }

  async function getStudentOverview() {
    return await invoke<StudentDashboardOverview>();
  }

  return {
    getInstructorOverview,
    getStudentOverview,
  };
}
