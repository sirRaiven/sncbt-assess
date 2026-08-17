import type {
  IdentifierSignInResponse,
} from "~/types/auth-sign-in";

import {
  parseUserFacingFunctionError,
} from "~/utils/user-facing-error";

interface IdentifierSignInResult {
  userId: string | null;
  error: string | null;
  code: string | null;
}

export function useIdentifierSignIn() {
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
      "We couldn't sign you in right now. Check your connection and try again.",
    );
  }

  async function signInWithIdentifier(
    identifier: string,
    password: string,
  ): Promise<IdentifierSignInResult> {
    try {
      const {
        data,
        error,
      } = await supabase.functions.invoke<IdentifierSignInResponse>(
        "auth-sign-in",
        {
          body: {
            identifier:
              identifier.trim(),
            password,
          },
        },
      );

      if (error) {
        const parsed =
          await parseFunctionError(error);

        return {
          userId: null,
          error: parsed.message,
          code: parsed.code,
        };
      }

      if (
        !data?.accessToken
        || !data.refreshToken
      ) {
        return {
          userId: null,
          error:
            "We couldn't finish signing you in. Please try again.",
          code:
            "INCOMPLETE_SESSION",
        };
      }

      const {
        data: sessionData,
        error: sessionError,
      } = await supabase.auth.setSession({
        access_token:
          data.accessToken,
        refresh_token:
          data.refreshToken,
      });

      if (
        sessionError
        || !sessionData.user?.id
      ) {
        return {
          userId: null,
          error:
            "We couldn't finish signing you in. Please try again.",
          code:
            "SESSION_SETUP_FAILED",
        };
      }

      return {
        userId:
          sessionData.user.id,
        error: null,
        code: null,
      };
    } catch (error) {
      const parsed =
        await parseFunctionError(error);

      return {
        userId: null,
        error: parsed.message,
        code: parsed.code,
      };
    }
  }

  return {
    signInWithIdentifier,
  };
}
