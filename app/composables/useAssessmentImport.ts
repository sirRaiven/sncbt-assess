import type {
  FunctionsHttpError,
} from "@supabase/supabase-js";

import type {
  ExcelQuestionImportQuestion,
  ExcelQuestionImportResult,
} from "~/types/assessment-import";

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

export function useAssessmentImport() {
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
        : "The question import request could not be completed.";

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

  async function importQuestions(
    assessmentId: string,
    questions: ExcelQuestionImportQuestion[],
  ): Promise<FunctionResult<ExcelQuestionImportResult>> {
    try {
      const {
        data,
        error,
      } = await supabase.functions.invoke<ExcelQuestionImportResult>(
        "assessment-import",
        {
          body: {
            action:
              "import-questions",
            payload: {
              assessmentId,
              questions,
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

  return {
    importQuestions,
  };
}
