import type {
  FunctionsHttpError,
} from "@supabase/supabase-js";

import type {
  DeliveryQuestionPayload,
  InstructorDeliveryListItem,
  InstructorDeliveryMonitor,
  SaveDeliveryAnswerResult,
  StudentAssessmentDelivery,
  StudentResultReview,
  SubmitDeliveryAttemptResult,
} from "~/types/assessment-delivery";

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

export function useAssessmentDelivery() {
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
        : "The assessment delivery request could not be completed.";

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
    payload?:
      Record<string, unknown>,
  ): Promise<FunctionResult<T>> {
    try {
      const {
        data,
        error,
      } =
        await supabase.functions
          .invoke<T>(
            "assessment-delivery",
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

  async function saveAnswer(
    attemptId: string,
    questionId: string,
    selectedOptionIds: string[],
    finalize: boolean,
  ) {
    return await invoke<
      SaveDeliveryAnswerResult
    >(
      "save-answer",
      {
        attemptId,
        questionId,
        selectedOptionIds,
        finalize,
      },
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

  async function getResultReview(
    assignmentId: string,
  ) {
    return await invoke<{
      serverNow: string;
      review:
        StudentResultReview;
    }>(
      "get-result-review",
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
    saveAnswer,
    submitAttempt,
    getResult,
    getResultReview,
    listInstructorDeliveries,
    getInstructorMonitor,
  };
}
