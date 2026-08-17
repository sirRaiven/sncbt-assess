import type {
  AssessmentImportCancelResult,
  AssessmentImportCommitResult,
  AssessmentImportPreviewResult,
  AssessmentImportValidationResult,
  ExcelQuestionImportQuestion,
  ExcelQuestionImportResult,
} from "~/types/assessment-import";

import {
  parseUserFacingFunctionError,
} from "~/utils/user-facing-error";

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
    return await parseUserFacingFunctionError(
      error,
      "We couldn't process the question import right now. Please try again.",
    );
  }

  async function invokeJson<T>(
    action: string,
    payload: Record<string, unknown>,
  ): Promise<FunctionResult<T>> {
    try {
      const {
        data,
        error,
      } = await supabase.functions.invoke<T>(
        "assessment-import",
        {
          body: {
            action,
            payload,
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

  async function validateWorkbook(
    assessmentId: string,
    file: File,
  ): Promise<FunctionResult<AssessmentImportValidationResult>> {
    try {
      const formData =
        new FormData();

      formData.append(
        "action",
        "validate",
      );
      formData.append(
        "assessmentId",
        assessmentId,
      );
      formData.append(
        "file",
        file,
        file.name,
      );

      const {
        data,
        error,
      } = await supabase.functions.invoke<AssessmentImportValidationResult>(
        "assessment-import",
        {
          body: formData,
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

  async function getImport(
    importId: string,
  ): Promise<FunctionResult<AssessmentImportPreviewResult>> {
    return await invokeJson<AssessmentImportPreviewResult>(
      "get-import",
      {
        importId,
      },
    );
  }

  async function commitImport(
    importId: string,
    excludedRowIds: string[],
  ): Promise<FunctionResult<AssessmentImportCommitResult>> {
    return await invokeJson<AssessmentImportCommitResult>(
      "commit-import",
      {
        importId,
        excludedRowIds,
      },
    );
  }

  async function cancelImport(
    importId: string,
  ): Promise<FunctionResult<AssessmentImportCancelResult>> {
    return await invokeJson<AssessmentImportCancelResult>(
      "cancel-import",
      {
        importId,
      },
    );
  }

  // Retained for compatibility with the earlier browser-preview import flow.
  async function importQuestions(
    assessmentId: string,
    questions: ExcelQuestionImportQuestion[],
  ): Promise<FunctionResult<ExcelQuestionImportResult>> {
    return await invokeJson<ExcelQuestionImportResult>(
      "import-questions",
      {
        assessmentId,
        questions,
      },
    );
  }

  return {
    validateWorkbook,
    getImport,
    commitImport,
    cancelImport,
    importQuestions,
  };
}
