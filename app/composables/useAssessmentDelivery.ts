import type {
  AttemptSelectionPolicyResponse,
  DeliveryQuestionPayload,
  ExpireDeliveryQuestionResult,
  ExamAccessStatus,
  InstructorDeliveryListItem,
  InstructorDeliveryMonitor,
  SaveDeliveryAnswerResult,
  StudentAssessmentDelivery,
  StudentLiveLeaderboard,
  SubmitDeliveryAttemptResult,
} from "~/types/assessment-delivery";

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

export function useAssessmentDelivery() {
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
      "We couldn't complete the assessment request. Check your connection and try again.",
    );
  }

  async function invoke<T>(
    action: string,
    payload?:
      Record<string, unknown>,
    timeoutMs = 15000,
    functionName =
      "assessment-delivery",
  ): Promise<FunctionResult<T>> {
    let timeoutId:
      ReturnType<typeof setTimeout>
      | null =
        null;

    const controller =
      new AbortController();

    let requestTimedOut =
      false;

    try {
      timeoutId =
        setTimeout(
          () => {
            requestTimedOut =
              true;

            // Supabase Functions supports AbortSignal. Cancelling the
            // real fetch is important here: a Promise.race timeout
            // leaves the original request running, which can overlap
            // the timeout-recovery request for the same attempt row.
            controller.abort();
          },
          timeoutMs,
        );

      const {
        data,
        error,
      } = await supabase.functions
        .invoke<T>(
          functionName,
          {
            body: {
              action,
              ...(payload
                ? {
                    payload,
                  }
                : {}),
            },
            signal:
              controller.signal,
          },
        );

      if (
        requestTimedOut
        || controller.signal.aborted
      ) {
        return {
          data:
            null,
          error:
            "We couldn't confirm that action in time. Your answer is still kept on this device and SNCBT Assess will recover automatically.",
          code:
            "REQUEST_TIMEOUT",
        };
      }

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
      if (
        requestTimedOut
        || controller.signal.aborted
        || (
          error instanceof DOMException
          && error.name
            === "AbortError"
        )
      ) {
        return {
          data:
            null,
          error:
            "We couldn't confirm that action in time. Your answer is still kept on this device and SNCBT Assess will recover automatically.",
          code:
            "REQUEST_TIMEOUT",
        };
      }

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
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  async function invokeInstructorMonitor<T>(
    assignmentId: string,
  ): Promise<FunctionResult<T>> {
    try {
      const {
        data,
        error,
      } = await supabase.functions.invoke<T>(
        "assessment-monitor",
        {
          body: {
            action: "get-monitor",
            payload: {
              assignmentId,
            },
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

  async function listStudentDeliveries(
    classroomId?: string,
    options?: {
      includeArchivedCompleted?:
        boolean;
    },
  ) {
    const includeArchivedCompleted =
      options
        ?.includeArchivedCompleted
      ?? false;

    return await invoke<{
      serverNow: string;
      deliveries:
        StudentAssessmentDelivery[];
    }>(
      "list-student-deliveries",
      (
        classroomId
        || includeArchivedCompleted
      )
        ? {
            classroomId:
              classroomId
              || undefined,

            includeArchivedCompleted,
          }
        : undefined,
    );
  }

  async function getStudentDelivery(
    assignmentId: string,
  ) {
    return await invoke<{
      serverNow: string;
      delivery:
        StudentAssessmentDelivery;
    }>(
      "get-student-delivery",
      {
        assignmentId,
      },
    );
  }

  async function beginAttempt(
    assignmentId: string,
    examAccess?: {
      status: ExamAccessStatus;
      referenceNumber?: string | null;
    },
  ) {
    return await invoke<
      MessageResponse
      & {
        attemptId: string;
        delivery:
          StudentAssessmentDelivery;
      }
    >(
      "begin-attempt",
      {
        assignmentId,
        examAccessStatus:
          examAccess?.status,
        referenceNumber:
          examAccess?.referenceNumber
          ?? null,
      },
    );
  }

  async function getQuestion(
    attemptId: string,
    questionIndex: number,
  ) {
    return await invoke<{
      payload:
        DeliveryQuestionPayload;
    }>(
      "get-question",
      {
        attemptId,
        questionIndex,
      },
    );
  }

  async function getAttemptSelectionPolicy(
    attemptId: string,
  ) {
    return await invoke<
      AttemptSelectionPolicyResponse
    >(
      "get-attempt-policy",
      {
        attemptId,
      },
      10000,
      "assessment-question-policy",
    );
  }

  async function saveAnswer(
    attemptId: string,
    questionId: string,
    answer: {
      selectedOptionIds: string[];
      textResponse: string | null;
      booleanResponse: boolean | null;
    },
    finalize: boolean,
    commitForFeedback = false,
  ) {
    return await invoke<
      SaveDeliveryAnswerResult
    >(
      "save-answer",
      {
        attemptId,
        questionId,
        selectedOptionIds:
          answer.selectedOptionIds,
        textResponse:
          answer.textResponse,
        booleanResponse:
          answer.booleanResponse,
        finalize,
        commitForFeedback,
      },
      (
        finalize
        || commitForFeedback
      )
        ? 12000
        : 10000,
    );
  }

  async function expireQuestion(
    attemptId: string,
    questionId: string,
    questionIndex: number,
    answer: {
      selectedOptionIds: string[];
      textResponse: string | null;
      booleanResponse: boolean | null;
    },
  ) {
    return await invoke<
      ExpireDeliveryQuestionResult
    >(
      "expire-question",
      {
        attemptId,
        questionId,
        questionIndex,
        selectedOptionIds:
          answer.selectedOptionIds,
        textResponse:
          answer.textResponse,
        booleanResponse:
          answer.booleanResponse,
      },
      12000,
    );
  }

  async function submitAttempt(
    attemptId: string,
    auto = false,
    reason =
      auto
        ? "automatic_submission"
        : "student_submission",
  ) {
    return await invoke<
      SubmitDeliveryAttemptResult
    >(
      "submit-attempt",
      {
        attemptId,
        auto,
        reason,
      },
    );
  }

  async function getResult(
    assignmentId: string,
  ) {
    return await invoke<{
      serverNow: string;
      delivery:
        StudentAssessmentDelivery;
    }>(
      "get-result",
      {
        assignmentId,
      },
    );
  }

  async function getStudentLeaderboard(
    assignmentId: string,
  ) {
    return await invoke<{
      serverNow: string;
      leaderboard:
        StudentLiveLeaderboard;
    }>(
      "get-student-leaderboard",
      {
        assignmentId,
      },
      10000,
    );
  }

  async function listInstructorDeliveries() {
    return await invoke<{
      serverNow: string;
      deliveries:
        InstructorDeliveryListItem[];
    }>(
      "list-instructor-deliveries",
    );
  }

  async function getInstructorMonitor(
    assignmentId: string,
  ) {
    return await invokeInstructorMonitor<
      InstructorDeliveryMonitor
    >(assignmentId);
  }

  return {
    listStudentDeliveries,
    getStudentDelivery,
    beginAttempt,
    getQuestion,
    getAttemptSelectionPolicy,
    saveAnswer,
    expireQuestion,
    submitAttempt,
    getResult,
    getStudentLeaderboard,
    listInstructorDeliveries,
    getInstructorMonitor,
  };
}
