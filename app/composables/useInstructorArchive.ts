import type {
  InstructorArchiveOverview,
} from "~/types/instructor-archive";

import {
  parseUserFacingFunctionError,
} from "~/utils/user-facing-error";

interface FunctionResult<T> {
  data: T | null;
  error: string | null;
  code: string | null;
}

interface DeleteResponse {
  message: string;
  deletedId: string;
}

export function useInstructorArchive() {
  const supabase = useSupabaseClient();

  async function parseFunctionError(
    error: unknown,
  ): Promise<{
    message: string;
    code: string | null;
  }> {
    return await parseUserFacingFunctionError(
      error,
      "We couldn't load or update the archive right now. Please try again.",
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
        "instructor-archive",
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

  async function getArchiveOverview() {
    return await invoke<InstructorArchiveOverview>(
      "get-archive",
    );
  }

  async function deleteArchivedAssessment(
    assessmentId: string,
  ) {
    return await invoke<DeleteResponse>(
      "delete-assessment",
      {
        assessmentId,
      },
    );
  }

  async function deleteClosedSession(
    sessionId: string,
  ) {
    return await invoke<DeleteResponse>(
      "delete-session",
      {
        sessionId,
      },
    );
  }

  return {
    getArchiveOverview,
    deleteArchivedAssessment,
    deleteClosedSession,
  };
}
