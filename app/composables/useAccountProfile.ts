import type {
  AccountProfileUpdateInput,
  AccountProfileUpdateResponse,
} from "~/types/account-profile";

import {
  parseUserFacingFunctionError,
} from "~/utils/user-facing-error";

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
    return await parseUserFacingFunctionError(
      error,
      "We couldn't update your account right now. Please try again.",
    );
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
