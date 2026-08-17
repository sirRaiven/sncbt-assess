<script setup lang="ts">
import type {
  AuthChangeEvent,
  Session,
} from "@supabase/supabase-js";

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
const user = useSupabaseUser();

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

const isReady = ref(
  Boolean(user.value?.sub),
);

const isSubmitting = ref(false);
const resetCompleted = ref(false);
const errorMessage = ref("");

let recoveryTimeout:
  | ReturnType<typeof setTimeout>
  | undefined;

let unsubscribe:
  | (() => void)
  | undefined;

function handleAuthEvent(
  event: AuthChangeEvent,
  session: Session | null,
): void {
  if (
    event === "PASSWORD_RECOVERY"
    || event === "SIGNED_IN"
    || session?.user
  ) {
    isReady.value = true;
    errorMessage.value = "";

    if (recoveryTimeout) {
      clearTimeout(recoveryTimeout);
    }
  }
}

async function updatePassword(
  event: FormSubmitEvent<ResetPasswordSchema>,
): Promise<void> {
  isSubmitting.value = true;
  errorMessage.value = "";

  try {
    const {
      error,
    } = await supabase.auth.updateUser({
      password:
        event.data.password,
    });

    if (error) {
      throw error;
    }

    resetCompleted.value = true;

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
  const {
    data: authListener,
  } = supabase.auth.onAuthStateChange(
    handleAuthEvent,
  );

  unsubscribe = () => {
    authListener.subscription.unsubscribe();
  };

  const {
    data,
  } = await supabase.auth.getSession();

  if (data.session?.user) {
    isReady.value = true;
  }

  recoveryTimeout = setTimeout(
    () => {
      if (!isReady.value) {
        errorMessage.value =
          "The password-reset link is invalid or has expired.";
      }
    },
    12_000,
  );
});

onBeforeUnmount(() => {
  if (recoveryTimeout) {
    clearTimeout(recoveryTimeout);
  }

  unsubscribe?.();
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
        v-if="
          !isReady
          && !errorMessage
        "
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
        v-if="
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
        v-if="isReady"
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
