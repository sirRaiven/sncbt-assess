import type {
  AttemptSelectionPolicyResponse,
  DeliveryQuestionPayload,
  InstructorDeliveryListItem,
  InstructorDeliveryMonitor,
  SaveDeliveryAnswerResult,
  StudentAssessmentDelivery,
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
    const timeoutMessage =
      "__SNCBT_ASSESSMENT_REQUEST_TIMEOUT__";

    let timeoutId:
      ReturnType<typeof setTimeout>
      | null =
        null;

    try {
      const request =
        supabase.functions
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
            },
          );

      const timeout =
        new Promise<never>(
          (_, reject) => {
            timeoutId =
              setTimeout(
                () =>
                  reject(
                    new Error(
                      timeoutMessage,
                    ),
                  ),
                timeoutMs,
              );
          },
        );

      const {
        data,
        error,
      } = await Promise.race([
        request,
        timeout,
      ]);

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
        error instanceof Error
        && error.message
          === timeoutMessage
      ) {
        return {
          data:
            null,
          error:
            "We couldn't confirm that action in time. Your selection is still kept on this device and can be retried.",
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
  ) {
    return await invoke<{
      serverNow: string;
      deliveries:
        StudentAssessmentDelivery[];
    }>(
      "list-student-deliveries",
      classroomId
        ? {
            classroomId,
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
      8000,
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
    submitAttempt,
    getResult,
    listInstructorDeliveries,
    getInstructorMonitor,
  };
}
