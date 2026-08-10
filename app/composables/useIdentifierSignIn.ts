import type {
  FunctionsHttpError,
} from "@supabase/supabase-js";

import type {
  IdentifierSignInResponse,
} from "~/types/auth-sign-in";

interface FunctionErrorBody {
  code?: string;
  message?: string;
}

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
    const fallback =
      error instanceof Error
        ? error.message
        : "The sign-in request could not be completed.";

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
            "The sign-in service returned an incomplete session. Please try again.",
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
            "Your session could not be established. Please try again.",
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
