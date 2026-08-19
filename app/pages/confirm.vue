<script setup lang="ts">
import {
  getAccountDestination,
} from "~/utils/auth-navigation";

import {
  toUserFacingError,
} from "~/utils/user-facing-error";

definePageMeta({
  layout: "auth",
});

useSeoMeta({
  title: "Confirm account",
});

const supabase = useSupabaseClient();
const route = useRoute();

const isProcessing = ref(true);
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

async function loadConfirmedProfile(
  userId: string,
): Promise<void> {
  const {
    loadProfile,
  } = useCurrentProfile();

  const profile = await loadProfile({
    force: true,
    userId,
  });

  if (!profile) {
    throw new Error(
      "Your email was confirmed, but we couldn't finish preparing your account. Please sign in again or contact the system administrator.",
    );
  }

  await navigateTo(
    getAccountDestination(profile),
  );
}

async function completeConfirmation(): Promise<void> {
  isProcessing.value = true;
  errorMessage.value = "";

  try {
    const returnedError =
      queryString(route.query.error_description)
      || queryString(route.query.error);

    if (returnedError) {
      throw new Error(
        "The confirmation link is invalid or has expired.",
      );
    }

    const code = queryString(
      route.query.code,
    );

    const flowId = queryString(
      route.query.sb_flow_id,
    );

    if (code) {
      const {
        data,
        error,
      } = await supabase.auth.exchangeCodeForSession(
        code,
        flowId
          ? {
              flowId,
            }
          : undefined,
      );

      if (error || !data.session?.user) {
        if (import.meta.dev) {
          console.error(
            "[auth-confirmation] PKCE exchange failed.",
            {
              code: String(
                (error as { code?: unknown } | null)?.code || "unknown",
              ),
              status: Number(
                (error as { status?: unknown } | null)?.status || 0,
              ),
            },
          );
        }

        throw new Error(
          "The confirmation link is invalid or has expired.",
        );
      }

      await loadConfirmedProfile(
        data.session.user.id,
      );
      return;
    }

    // Support a refreshed/cleaned confirmation page when a valid session is
    // already present, while validating that identity against Supabase Auth.
    const {
      data,
      error,
    } = await supabase.auth.getUser();

    if (error || !data.user) {
      throw new Error(
        "The confirmation link is invalid or has expired.",
      );
    }

    await loadConfirmedProfile(
      data.user.id,
    );
  } catch (error) {
    isProcessing.value = false;

    errorMessage.value =
      toUserFacingError(
        error,
        "We couldn't complete your account confirmation. Please try the confirmation link again.",
      );
  }
}

onMounted(async () => {
  await completeConfirmation();
});
</script>

<template>
  <div class="mx-auto max-w-lg">
    <UCard>
      <div class="py-8 text-center">
        <template v-if="isProcessing">
          <UIcon
            name="i-lucide-loader-circle"
            class="mx-auto size-10 animate-spin text-primary"
          />

          <h1 class="mt-5 text-2xl font-black text-highlighted">
            Confirming your account
          </h1>

          <p class="mt-2 text-sm leading-6 text-muted">
            Please wait while we verify your email and prepare your SNCBT Assess account.
          </p>
        </template>

        <template v-else>
          <div class="mx-auto flex size-14 items-center justify-center rounded-xl bg-error/10 text-error">
            <UIcon
              name="i-lucide-link-2-off"
              class="size-7"
            />
          </div>

          <h1 class="mt-5 text-2xl font-black text-highlighted">
            Confirmation unsuccessful
          </h1>

          <p class="mt-2 text-sm leading-6 text-muted">
            {{ errorMessage }}
          </p>

          <UButton
            to="/"
            color="neutral"
            variant="outline"
            class="mt-6"
          >
            Return to Sign In
          </UButton>
        </template>
      </div>
    </UCard>
  </div>
</template>
