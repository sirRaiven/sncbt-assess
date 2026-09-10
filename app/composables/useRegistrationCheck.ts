import type {
  RegistrationAccountType,
  RegistrationCheckResponse,
  RegistrationCheckResult,
} from "~/types/auth-registration";

import {
  parseUserFacingFunctionError,
} from "~/utils/user-facing-error";

export function useRegistrationCheck() {
  const supabase = useSupabaseClient();

  async function checkRegistrationIdentity(
    accountType: RegistrationAccountType,
    email: string,
    accountNumber: string,
  ): Promise<RegistrationCheckResult> {
    try {
      const {
        data,
        error,
      } = await supabase.functions.invoke<RegistrationCheckResponse>(
        "auth-register-check",
        {
          body: {
            accountType,
            email: email.trim().toLowerCase(),
            accountNumber:
              accountType === "instructor"
                ? accountNumber.trim().toUpperCase()
                : accountNumber.trim(),
          },
        },
      );

      if (error) {
        const parsed = await parseUserFacingFunctionError(
          error,
          "We couldn't verify your registration information right now. Please try again.",
        );

        return {
          allowed: false,
          error: parsed.message,
          code: parsed.code,
        };
      }

      if (!data?.ok) {
        return {
          allowed: false,
          error:
            "We couldn't verify your registration information right now. Please try again.",
          code: "INVALID_RESPONSE",
        };
      }

      return {
        allowed: true,
        error: null,
        code: null,
      };
    } catch (error) {
      const parsed = await parseUserFacingFunctionError(
        error,
        "We couldn't verify your registration information right now. Please try again.",
      );

      return {
        allowed: false,
        error: parsed.message,
        code: parsed.code,
      };
    }
  }

  return {
    checkRegistrationIdentity,
  };
}
