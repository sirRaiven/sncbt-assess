<script setup lang="ts">
import type {
  FormSubmitEvent,
} from "@nuxt/ui";

import {
  z,
} from "zod";

import {
  toUserFacingError,
} from "~/utils/user-facing-error";

definePageMeta({
  layout: "auth",
});

useSeoMeta({
  title: "Reset password",
});

const supabase = useSupabaseClient();
const route = useRoute();

const recoveryGate = useCookie<string | null>(
  "sncbt_recovery_gate",
  {
    sameSite: "strict",
    secure: import.meta.env.PROD,
    maxAge: 60 * 60,
  },
);

const schema = z
  .object({
    password: z
      .string()
      .min(
        8,
        "Password must contain at least eight characters.",
      )
      .regex(
        /[A-Z]/,
        "Password must include an uppercase letter.",
      )
      .regex(
        /[a-z]/,
        "Password must include a lowercase letter.",
      )
      .regex(
        /\d/,
        "Password must include a number.",
      ),

    confirmPassword: z
      .string(),
  })
  .superRefine(
    (
      data,
      context,
    ) => {
      if (
        data.password
        !== data.confirmPassword
      ) {
        context.addIssue({
          code: "custom",
          path: [
            "confirmPassword",
          ],
          message:
            "The passwords do not match.",
        });
      }
    },
  );

type ResetPasswordSchema =
  z.output<typeof schema>;

const state = reactive<ResetPasswordSchema>({
  password: "",
  confirmPassword: "",
});

const isVerifying = ref(true);
const isReady = ref(false);
const isSubmitting = ref(false);
const errorMessage = ref("");

function queryString(
  value: unknown,
): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (
    Array.isArray(value)
    && typeof value[0] === "string"
  ) {
    return value[0].trim();
  }

  return "";
}

function cleanRecoveryUrl(): void {
  if (!import.meta.client) {
    return;
  }

  globalThis.history.replaceState(
    globalThis.history.state,
    "",
    "/reset-password?mode=recovery",
  );
}

function recoveryErrorMessage(
  code: string,
): string {
  if (
    code === "otp_expired"
    || code === "token_expired"
  ) {
    return "The password-reset link has expired. Request a new reset link and try again.";
  }

  if (
    code === "otp_disabled"
    || code === "invalid_token"
    || code === "bad_jwt"
  ) {
    return "The password-reset link is invalid or has already been used. Request a new reset link and try again.";
  }

  return "The password-reset link could not be verified. Request a new reset link and try again.";
}

async function verifyRecoveryLink(): Promise<void> {
  isVerifying.value = true;
  isReady.value = false;
  errorMessage.value = "";

  const returnedError =
    queryString(route.query.error_code)
    || queryString(route.query.error);

  if (returnedError) {
    recoveryGate.value = null;
    errorMessage.value =
      recoveryErrorMessage(
        returnedError.toLowerCase(),
      );
    isVerifying.value = false;
    return;
  }

  const tokenHash = queryString(
    route.query.token_hash,
  );

  const recoveryType = queryString(
    route.query.type,
  ).toLowerCase();

  // Production recovery uses Supabase TokenHash verification instead of the
  // browser-bound PKCE code verifier. This works even when the reset email is
  // opened on a different browser/device and avoids pkce_code_verifier_not_found.
  if (
    tokenHash
    && recoveryType === "recovery"
  ) {
    const {
      data,
      error,
    } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "recovery",
    });

    if (error || !data.session?.user) {
      const errorCode = String(
        (error as { code?: unknown } | null)?.code || "",
      ).toLowerCase();

      if (import.meta.dev) {
        console.error(
          "[auth-recovery] Recovery token verification failed.",
          {
            code: errorCode || "unknown",
            status: Number(
              (error as { status?: unknown } | null)?.status || 0,
            ),
          },
        );
      }

      recoveryGate.value = null;
      errorMessage.value =
        recoveryErrorMessage(errorCode);
      isVerifying.value = false;
      return;
    }

    recoveryGate.value = "1";
    cleanRecoveryUrl();
    isReady.value = true;
    isVerifying.value = false;
    return;
  }

  // Support a refresh after successful token verification. The recovery gate
  // is created only after verifyOtp succeeds; then getUser() revalidates the
  // temporary Auth session with Supabase before showing the password form.
  if (recoveryGate.value === "1") {
    const {
      data,
      error,
    } = await supabase.auth.getUser();

    if (!error && data.user) {
      isReady.value = true;
      isVerifying.value = false;
      return;
    }
  }

  recoveryGate.value = null;
  errorMessage.value =
    "The password-reset link is not in the expected SNCBT-AMS recovery format. Request a new reset link after the Supabase recovery email template is updated.";
  isVerifying.value = false;
}

async function updatePassword(
  event: FormSubmitEvent<ResetPasswordSchema>,
): Promise<void> {
  isSubmitting.value = true;
  errorMessage.value = "";

  try {
    if (recoveryGate.value !== "1") {
      throw new Error(
        "Your password-reset session is no longer valid. Request a new reset link and try again.",
      );
    }

    const {
      data: userData,
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      isReady.value = false;
      recoveryGate.value = null;

      throw new Error(
        "Your password-reset session is no longer valid. Request a new reset link and try again.",
      );
    }

    const {
      error,
    } = await supabase.auth.updateUser({
      password:
        event.data.password,
    });

    if (error) {
      throw error;
    }

    recoveryGate.value = null;

    await supabase.auth.signOut({
      scope: "local",
    });

    const {
      clearProfile,
    } = useCurrentProfile();

    clearProfile();

    await navigateTo({
      path: "/",
      query: {
        reset: "success",
      },
    });
  } catch (error) {
    errorMessage.value =
      toUserFacingError(
        error,
        "We couldn't update your password right now. Please try again.",
      );
  } finally {
    isSubmitting.value = false;
  }
}

onMounted(async () => {
  await verifyRecoveryLink();
});
</script>

<template>
  <div class="mx-auto w-full max-w-lg">
    <UCard
      :ui="{
        header:
          'p-5 sm:p-6',
        body:
          'p-5 sm:p-6',
        footer:
          'p-4 sm:p-5',
      }"
    >
      <template #header>
        <div>
          <h1 class="text-2xl font-black text-highlighted">
            Set a new password
          </h1>

          <p class="mt-2 text-sm leading-6 text-muted">
            Choose a strong password that is not used for another account.
          </p>
        </div>
      </template>

      <div
        v-if="isVerifying"
        class="py-8 text-center"
      >
        <UIcon
          name="i-lucide-loader-circle"
          class="mx-auto size-9 animate-spin text-primary"
        />

        <p class="mt-4 font-semibold text-highlighted">
          Verifying your reset link
        </p>

        <p class="mt-2 text-sm text-muted">
          Please wait while we verify your secure reset link.
        </p>
      </div>

      <UAlert
        v-else-if="
          errorMessage
          && !isReady
        "
        color="error"
        variant="soft"
        icon="i-lucide-link-2-off"
        title="Reset link unavailable"
        :description="errorMessage"
      />

      <UForm
        v-else-if="isReady"
        :schema="schema"
        :state="state"
        class="space-y-5"
        @submit="updatePassword"
      >
        <UAlert
          v-if="errorMessage"
          color="error"
          variant="soft"
          icon="i-lucide-circle-alert"
          title="Unable to update password"
          :description="errorMessage"
        />

        <UFormField
          label="New password"
          name="password"
          required
        >
          <PasswordField
            v-model="state.password"
            size="lg"
            icon="i-lucide-lock-keyhole"
            placeholder="Create a new password"
            autocomplete="new-password"
          />
        </UFormField>

        <UFormField
          label="Confirm new password"
          name="confirmPassword"
          required
        >
          <PasswordField
            v-model="state.confirmPassword"
            size="lg"
            icon="i-lucide-lock-keyhole"
            placeholder="Enter the new password again"
            autocomplete="new-password"
          />
        </UFormField>

        <PasswordRequirements
          :password="state.password"
          :confirm-password="state.confirmPassword"
          show-match
        />

        <UButton
          type="submit"
          block
          size="lg"
          :loading="isSubmitting"
        >
          Update Password
        </UButton>
      </UForm>

      <template #footer>
        <UButton
          to="/"
          block
          color="neutral"
          variant="ghost"
        >
          Return to Sign In
        </UButton>
      </template>
    </UCard>
  </div>
</template>
