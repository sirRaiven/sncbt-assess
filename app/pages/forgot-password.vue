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

function getPublicSupabaseConfig(): {
  url: string;
  key: string;
} {
  const publicRuntime =
    runtimeConfig.public as unknown as {
      supabase?: {
        url?: unknown;
        key?: unknown;
      };
    };

  const url = String(
    publicRuntime.supabase?.url || "",
  )
    .trim()
    .replace(/\/+$/, "");

  const key = String(
    publicRuntime.supabase?.key || "",
  ).trim();

  return {
    url,
    key,
  };
}

/**
 * Password recovery intentionally starts with the Auth server's implicit
 * recovery flow instead of PKCE.
 *
 * @nuxtjs/supabase uses @supabase/ssr, whose browser client starts email
 * recovery with PKCE and therefore stores a one-time code verifier in the
 * browser. That verifier can be unavailable when the email callback is opened,
 * producing pkce_code_verifier_not_found. The Supabase Auth /recover endpoint
 * accepts recovery requests without a code_challenge; the resulting default
 * recovery email redirects back with an access/refresh-token fragment, which
 * the normal Supabase browser client consumes automatically.
 */
async function sendDefaultRecoveryEmail(
  email: string,
): Promise<void> {
  const {
    url,
    key,
  } = getPublicSupabaseConfig();

  if (!url || !key) {
    throw new Error(
      "Password recovery is temporarily unavailable.",
    );
  }

  const endpoint = new URL(
    `${url}/auth/v1/recover`,
  );

  endpoint.searchParams.set(
    "redirect_to",
    `${appUrl.value}/reset-password`,
  );

  const response = await globalThis.fetch(
    endpoint,
    {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
      }),
    },
  );

  if (response.ok) {
    return;
  }

  if (response.status === 429) {
    throw new Error(
      "Too many password-reset requests were made. Please wait before trying again.",
    );
  }

  throw new Error(
    "We couldn't send the password-reset email right now. Please try again.",
  );
}

async function requestPasswordReset(
  event: FormSubmitEvent<ForgotPasswordSchema>,
): Promise<void> {
  isSubmitting.value = true;
  errorMessage.value = "";
  requestCompleted.value = false;

  // A recovery callback should never inherit an ordinary authenticated
  // session. This also makes the pending recovery marker safe to use as a
  // fallback if the PASSWORD_RECOVERY event is emitted before the page mounts.
  try {
    await supabase.auth.signOut({
      scope: "local",
    });
  } catch {
    // A guest normally has no session, so sign-out failure is non-blocking.
  }

  recoveryGate.value = "requested";

  try {
    await sendDefaultRecoveryEmail(
      event.data.email
        .trim()
        .toLowerCase(),
    );

    // Keep the public response identical regardless of whether the address
    // exists, preventing account-enumeration feedback.
    requestCompleted.value = true;
  } catch (error) {
    recoveryGate.value = null;

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
