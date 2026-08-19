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
  title: "Recover password",
});

const supabase = useSupabaseClient();
const runtimeConfig = useRuntimeConfig();

const appUrl = computed(() => {
  const configured = String(
    runtimeConfig.public.appUrl || "",
  ).trim();

  if (configured) {
    return configured.replace(/\/+$/, "");
  }

  if (import.meta.client) {
    return globalThis.location.origin;
  }

  return "https://sncbt-assess.autox.workers.dev";
});

const recoveryGate = useCookie<string | null>(
  "sncbt_recovery_gate",
  {
    sameSite: "strict",
    secure: import.meta.env.PROD,
    maxAge: 60 * 60,
  },
);

const schema = z.object({
  email: z
    .string()
    .trim()
    .email(
      "Enter a valid email address.",
    ),
});

type ForgotPasswordSchema =
  z.output<typeof schema>;

const state = reactive<ForgotPasswordSchema>({
  email: "",
});

const isSubmitting = ref(false);
const requestCompleted = ref(false);
const errorMessage = ref("");

async function requestPasswordReset(
  event: FormSubmitEvent<ForgotPasswordSchema>,
): Promise<void> {
  isSubmitting.value = true;
  errorMessage.value = "";

  // Never carry a stale recovery gate into a new recovery attempt.
  recoveryGate.value = null;

  try {
    const {
      error,
    } = await supabase.auth.resetPasswordForEmail(
      event.data.email
        .trim()
        .toLowerCase(),
      {
        // Keep the hosted Auth redirect on the production SNCBT-AMS origin.
        // The recovery email template uses TokenHash, so this is mainly a
        // fallback/default redirect and must also be allow-listed in Supabase.
        redirectTo:
          `${appUrl.value}/reset-password`,
      },
    );

    if (error) {
      const authCode = String(
        (error as { code?: unknown }).code || "",
      ).toLowerCase();

      // Avoid account enumeration. A non-existing address receives the same
      // public result as an existing account.
      if (authCode === "user_not_found") {
        requestCompleted.value = true;
        return;
      }

      throw error;
    }

    requestCompleted.value = true;
  } catch (error) {
    errorMessage.value =
      toUserFacingError(
        error,
        "We couldn't send the password-reset email right now. Please try again.",
      );
  } finally {
    isSubmitting.value = false;
  }
}
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
        <div class="text-center">
          <div class="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <UIcon
              name="i-lucide-key-round"
              class="size-6"
            />
          </div>

          <h1 class="mt-5 text-2xl font-black text-highlighted">
            Recover your password
          </h1>

          <p class="mt-2 text-sm leading-6 text-muted">
            Enter your registered email address to receive a secure reset link.
          </p>
        </div>
      </template>

      <UAlert
        v-if="requestCompleted"
        color="success"
        variant="soft"
        icon="i-lucide-mail-check"
        title="Check your email"
        description="If the email address matches an account, a password-reset link will be sent."
      />

      <UForm
        v-else
        :schema="schema"
        :state="state"
        class="space-y-5"
        @submit="requestPasswordReset"
      >
        <UAlert
          v-if="errorMessage"
          color="error"
          variant="soft"
          icon="i-lucide-circle-alert"
          title="Unable to send reset link"
          :description="errorMessage"
        />

        <UFormField
          label="Email address"
          name="email"
          required
        >
          <UInput
            v-model="state.email"
            type="email"
            size="lg"
            icon="i-lucide-mail"
            class="w-full"
            autocomplete="email"
          />
        </UFormField>

        <UButton
          type="submit"
          block
          size="lg"
          :loading="isSubmitting"
        >
          Send Reset Link
        </UButton>
      </UForm>

      <template #footer>
        <UButton
          to="/"
          block
          color="neutral"
          variant="ghost"
          icon="i-lucide-arrow-left"
        >
          Return to Sign In
        </UButton>
      </template>
    </UCard>
  </div>
</template>
