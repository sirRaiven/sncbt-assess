import type {
  FunctionsHttpError,
} from "@supabase/supabase-js";

import type {
  AssessmentQuestion,
  QuestionEditorInput,
} from "~/types/question";

interface FunctionErrorBody {
  code?: string;
  message?: string;
  issues?: unknown;
}

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
    const fallback =
      error instanceof Error
        ? error.message
        : "The question request could not be completed.";

    const functionError =
      error as FunctionsHttpError;

    if (
      !functionError?.context
      || typeof functionError.context.json
        !== "function"
    ) {
      return {
        message: fallback,
        code: null,
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
        message: fallback,
        code: null,
      };
    }
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
    validateForPublish,
  };
}
