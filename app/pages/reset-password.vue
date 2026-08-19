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

const recoverySessionStorageKey =
  "sncbt_recovery_session_verified";

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
const isCancelling = ref(false);
const errorMessage = ref("");

let authSubscription:
  | {
      unsubscribe: () => void;
    }
  | null = null;

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

  // Recovery fragments contain bearer credentials. Remove them from the
  // visible URL/history as soon as they have been copied into memory.
  globalThis.history.replaceState(
    globalThis.history.state,
    "",
    "/reset-password?mode=recovery",
  );
}

function clearRecoveryMarker(): void {
  recoveryGate.value = null;

  if (import.meta.client) {
    globalThis.sessionStorage.removeItem(
      recoverySessionStorageKey,
    );
  }
}

function markRecoveryVerified(): void {
  recoveryGate.value = "1";

  if (import.meta.client) {
    globalThis.sessionStorage.setItem(
      recoverySessionStorageKey,
      "1",
    );
  }
}

function hasVerifiedRecoveryMarker(): boolean {
  if (!import.meta.client) {
    return recoveryGate.value === "1";
  }

  return (
    recoveryGate.value === "1"
    || globalThis.sessionStorage.getItem(
      recoverySessionStorageKey,
    ) === "1"
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

async function establishRecoverySessionFromHash(): Promise<
  "verified" | "invalid" | "absent"
> {
  if (!import.meta.client) {
    return "absent";
  }

  const rawHash = globalThis.location.hash;

  if (!rawHash || rawHash === "#") {
    return "absent";
  }

  const params = new URLSearchParams(
    rawHash.startsWith("#")
      ? rawHash.slice(1)
      : rawHash,
  );

  const returnedError =
    params.get("error_code")
    || params.get("error");

  if (returnedError) {
    cleanRecoveryUrl();
    clearRecoveryMarker();
    errorMessage.value = recoveryErrorMessage(
      returnedError.toLowerCase(),
    );
    return "invalid";
  }

  const type = String(
    params.get("type") || "",
  ).toLowerCase();

  const accessToken = String(
    params.get("access_token") || "",
  );

  const refreshToken = String(
    params.get("refresh_token") || "",
  );

  if (
    type !== "recovery"
    || !accessToken
    || !refreshToken
  ) {
    cleanRecoveryUrl();
    clearRecoveryMarker();
    errorMessage.value =
      "The password-reset link is incomplete or invalid. Request a new reset link and try again.";
    return "invalid";
  }

  // Copy the credentials to memory and immediately remove them from the URL.
  // Supabase's implicit flow places these bearer credentials in the fragment.
  cleanRecoveryUrl();

  const {
    data,
    error,
  } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (
    error
    || !data.session
    || !data.user
  ) {
    clearRecoveryMarker();

    if (import.meta.dev) {
      console.error(
        "[auth-recovery] Unable to establish the recovery session.",
        {
          code:
            (error as { code?: string } | null)
              ?.code
            || "session_not_created",
          status:
            (error as { status?: number } | null)
              ?.status
            || null,
        },
      );
    }

    errorMessage.value =
      "The password-reset link could not establish a recovery session. Request a new reset link and try again.";
    return "invalid";
  }

  // getUser() validates the access token against Supabase Auth rather than
  // trusting only the locally supplied token pair.
  const {
    data: userData,
    error: userError,
  } = await supabase.auth.getUser();

  if (
    userError
    || !userData.user
  ) {
    clearRecoveryMarker();

    await supabase.auth.signOut({
      scope: "local",
    });

    errorMessage.value =
      "The password-reset link could not establish a recovery session. Request a new reset link and try again.";
    return "invalid";
  }

  markRecoveryVerified();
  return "verified";
}

async function verifyStoredRecoverySession(): Promise<boolean> {
  if (!hasVerifiedRecoveryMarker()) {
    return false;
  }

  const {
    data,
    error,
  } = await supabase.auth.getUser();

  if (
    error
    || !data.user
  ) {
    clearRecoveryMarker();
    return false;
  }

  return true;
}

async function verifyRecoveryLink(): Promise<void> {
  isVerifying.value = true;
  isReady.value = false;
  errorMessage.value = "";

  const returnedError =
    queryString(route.query.error_code)
    || queryString(route.query.error);

  if (returnedError) {
    clearRecoveryMarker();
    errorMessage.value =
      recoveryErrorMessage(
        returnedError.toLowerCase(),
      );
    isVerifying.value = false;
    return;
  }

  // ?code= belongs to the PKCE variant. SNCBT-AMS currently uses the default
  // Supabase email provider with an explicit implicit /recover request, so a
  // newly generated recovery callback should contain bearer tokens in the
  // URL fragment instead.
  if (queryString(route.query.code)) {
    clearRecoveryMarker();
    errorMessage.value =
      "This reset link belongs to an older recovery flow. Request a new reset link from the deployed SNCBT-AMS site and use only the newest email.";
    isVerifying.value = false;
    return;
  }

  const hashResult =
    await establishRecoverySessionFromHash();

  if (hashResult === "verified") {
    isReady.value = true;
    isVerifying.value = false;
    return;
  }

  if (hashResult === "invalid") {
    isVerifying.value = false;
    return;
  }

  // Supports refreshing the already-verified reset page after its sensitive
  // URL fragment has been removed.
  if (await verifyStoredRecoverySession()) {
    isReady.value = true;
    isVerifying.value = false;
    return;
  }

  clearRecoveryMarker();
  errorMessage.value =
    "The password-reset link could not establish a recovery session. Request a new reset link from the deployed SNCBT-AMS site and try again.";
  isVerifying.value = false;
}

async function updatePassword(
  event: FormSubmitEvent<ResetPasswordSchema>,
): Promise<void> {
  isSubmitting.value = true;
  errorMessage.value = "";

  try {
    if (!hasVerifiedRecoveryMarker()) {
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
      clearRecoveryMarker();

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

    clearRecoveryMarker();

    // A password reset is a security-sensitive action. Revoke refresh tokens
    // for all sessions so the user signs in again with the new password.
    await supabase.auth.signOut({
      scope: "global",
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

async function cancelRecovery(): Promise<void> {
  if (isCancelling.value) {
    return;
  }

  isCancelling.value = true;
  clearRecoveryMarker();
  cleanRecoveryUrl();

  try {
    await supabase.auth.signOut({
      scope: "local",
    });
  } catch {
    // The recovery session may not have been established; navigating away is
    // still safe after clearing the local recovery marker and URL fragment.
  }

  const {
    clearProfile,
  } = useCurrentProfile();

  clearProfile();

  await navigateTo("/");
}

onMounted(async () => {
  const {
    data,
  } = supabase.auth.onAuthStateChange(
    (
      event,
      session,
    ) => {
      if (
        event === "PASSWORD_RECOVERY"
        && session?.user
      ) {
        markRecoveryVerified();
      }
    },
  );

  authSubscription = data.subscription;

  await verifyRecoveryLink();
});

onBeforeUnmount(() => {
  authSubscription?.unsubscribe();
  authSubscription = null;
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
          block
          color="neutral"
          variant="ghost"
          :loading="isCancelling"
          @click="cancelRecovery"
        >
          Return to Sign In
        </UButton>
      </template>
    </UCard>
  </div>
</template>
