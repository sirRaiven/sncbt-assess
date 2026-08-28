import type {
  AssessmentQuestion,
  QuestionEditorInput,
} from "~/types/question";

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

export function useQuestions() {
  const supabase = useSupabaseClient();

  async function parseFunctionError(
    error: unknown,
  ): Promise<{
    message: string;
    code: string | null;
  }> {
    return await parseUserFacingFunctionError(
      error,
      "We couldn't complete the question action right now. Please try again.",
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
        "questions",
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

      const responseBody =
        data as (
          T
          & FunctionErrorBody
        ) | null;

      if (
        responseBody
        && responseBody.ok === false
      ) {
        return {
          data: null,
          error:
            responseBody.message
            || "The question request could not be completed.",
          code:
            responseBody.code
            || null,
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

  async function listQuestions(
    assessmentId: string,
  ) {
    return await invoke<{
      questions: AssessmentQuestion[];
    }>(
      "list-questions",
      {
        assessmentId,
      },
    );
  }

  async function createQuestion(
    assessmentId: string,
    input: QuestionEditorInput,
  ) {
    return await invoke<
      MessageResponse & {
        question: AssessmentQuestion;
      }
    >(
      "create-question",
      {
        assessmentId,
        ...input,
      },
    );
  }

  async function updateQuestion(
    assessmentId: string,
    questionId: string,
    input: QuestionEditorInput,
  ) {
    return await invoke<
      MessageResponse & {
        question: AssessmentQuestion;
      }
    >(
      "update-question",
      {
        assessmentId,
        questionId,
        ...input,
      },
    );
  }

  async function duplicateQuestion(
    questionId: string,
  ) {
    return await invoke<
      MessageResponse & {
        question: AssessmentQuestion;
      }
    >(
      "duplicate-question",
      {
        questionId,
      },
    );
  }

  async function deleteQuestion(
    questionId: string,
  ) {
    return await invoke<
      MessageResponse & {
        assessmentId: string;
      }
    >(
      "delete-question",
      {
        questionId,
      },
    );
  }

  async function reorderQuestions(
    assessmentId: string,
    questionIds: string[],
  ) {
    return await invoke<MessageResponse>(
      "reorder-questions",
      {
        assessmentId,
        questionIds,
      },
    );
  }

  async function updateAllQuestionTimerSettings(
    assessmentId: string,
    input: {
      timeLimitSeconds: number | null;
      showTimerProgress: boolean;
    },
  ) {
    return await invoke<
      MessageResponse & {
        updatedQuestionCount: number;
        defaults: {
          timeLimitSeconds: number | null;
          showTimerProgress: boolean;
        };
      }
    >(
      "update-all-question-timer-settings",
      {
        assessmentId,
        ...input,
      },
    );
  }

  async function validateForPublish(
    assessmentId: string,
  ) {
    return await invoke<
      MessageResponse & {
        valid: boolean;
      }
    >(
      "validate-for-publish",
      {
        assessmentId,
      },
    );
  }

  return {
    listQuestions,
    createQuestion,
    updateQuestion,
    duplicateQuestion,
    deleteQuestion,
    reorderQuestions,
    updateAllQuestionTimerSettings,
    validateForPublish,
  };
}
