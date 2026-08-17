import type {
  AssessmentIntegrityEventInput,
  AssessmentIntegrityPolicy,
  AssessmentIntegrityReportResult,
} from "~/types/assessment-integrity";

import {
  parseUserFacingFunctionError,
} from "~/utils/user-facing-error";

interface FunctionResult<T> {
  data: T | null;
  error: string | null;
  code: string | null;
}

export function useAssessmentIntegrity() {
  const supabase = useSupabaseClient();

  async function parseFunctionError(
    error: unknown,
  ): Promise<{
    message: string;
    code: string | null;
  }> {
    return await parseUserFacingFunctionError(
      error,
      "We couldn't record assessment activity right now. The app will retry automatically.",
    );
  }

  async function invoke<T>(
    action: string,
    payload: Record<string, unknown>,
    timeoutMs = 5000,
  ): Promise<FunctionResult<T>> {
    let timeoutId:
      | ReturnType<typeof setTimeout>
      | null = null;

    try {
      const invocation =
        supabase.functions.invoke<T>(
          "assessment-integrity",
          {
            body: {
              action,
              payload,
            },
          },
        );

      const timeout =
        new Promise<never>(
          (_resolve, reject) => {
            timeoutId = setTimeout(
              () =>
                reject(
                  new Error(
                    "INTEGRITY_REQUEST_TIMEOUT",
                  ),
                ),
              timeoutMs,
            );
          },
        );

      const { data, error } =
        await Promise.race([
          invocation,
          timeout,
        ]);

      if (error) {
        const parsed = await parseFunctionError(error);

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
      if (
        error instanceof Error
        && error.message
          === "INTEGRITY_REQUEST_TIMEOUT"
      ) {
        return {
          data: null,
          error:
            "The integrity monitoring service did not respond in time.",
          code:
            "REQUEST_TIMEOUT",
        };
      }

      const parsed = await parseFunctionError(error);

      return {
        data: null,
        error: parsed.message,
        code: parsed.code,
      };
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  async function getAssignmentIntegrityPolicy(
    assignmentId: string,
  ) {
    return await invoke<AssessmentIntegrityPolicy>(
      "get-assignment-policy",
      {
        assignmentId,
      },
    );
  }

  async function getAttemptIntegrityPolicy(
    attemptId: string,
  ) {
    return await invoke<AssessmentIntegrityPolicy>(
      "get-attempt-policy",
      {
        attemptId,
      },
    );
  }

  async function reportIntegrityEvents(
    attemptId: string,
    events: AssessmentIntegrityEventInput[],
  ) {
    return await invoke<AssessmentIntegrityReportResult>(
      "report-events",
      {
        attemptId,
        events,
      },
    );
  }

  return {
    getAssignmentIntegrityPolicy,
    getAttemptIntegrityPolicy,
    reportIntegrityEvents,
  };
}
