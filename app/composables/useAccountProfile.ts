import type {
  FunctionsHttpError,
} from "@supabase/supabase-js";

import type {
  AccountProfileUpdateInput,
  AccountProfileUpdateResponse,
} from "~/types/account-profile";

interface FunctionErrorBody {
  code?: string;
  message?: string;
}

interface FunctionResult<T> {
  data: T | null;
  error: string | null;
  code: string | null;
}

export function useAccountProfile() {
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
        : "The account request could not be completed.";

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

  async function updateProfile(
    payload: AccountProfileUpdateInput,
  ): Promise<
    FunctionResult<
      AccountProfileUpdateResponse
    >
  > {
    try {
      const {
        data,
        error,
      } = await supabase.functions.invoke<
        AccountProfileUpdateResponse
      >(
        "account-profile",
        {
          body: {
            action:
              "update-profile",
            payload,
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

  return {
    updateProfile,
  };
}
