<script setup lang="ts">
import {
  getAccountDestination,
} from "~/utils/auth-navigation";

definePageMeta({
  layout: "auth",
});

useSeoMeta({
  title: "Confirm account",
});

const user = useSupabaseUser();

const isProcessing = ref(true);
const errorMessage = ref("");

let confirmationTimeout:
  | ReturnType<typeof setTimeout>
  | undefined;

async function completeConfirmation(): Promise<void> {
  if (!user.value?.sub) {
    return;
  }

  try {
    const {
      loadProfile,
    } = useCurrentProfile();

    const profile = await loadProfile({
      force: true,
      userId: user.value.sub,
    });

    if (!profile) {
      throw new Error(
        "Your email was confirmed, but the SNCBT Assess profile could not be loaded.",
      );
    }

    if (confirmationTimeout) {
      clearTimeout(confirmationTimeout);
    }

    await navigateTo(
      getAccountDestination(profile),
    );
  } catch (error) {
    isProcessing.value = false;

    errorMessage.value =
      error instanceof Error
        ? error.message
        : "Unable to complete account confirmation.";
  }
}

watch(
  user,
  async (
    currentUser,
  ) => {
    if (currentUser?.sub) {
      await completeConfirmation();
    }
  },
  {
    immediate: true,
  },
);

onMounted(() => {
  confirmationTimeout = setTimeout(
    () => {
      if (!user.value?.sub) {
        isProcessing.value = false;
        errorMessage.value =
          "The confirmation link is invalid or has expired.";
      }
    },
    15_000,
  );
});

onBeforeUnmount(() => {
  if (confirmationTimeout) {
    clearTimeout(confirmationTimeout);
  }
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
            Please wait while Supabase verifies your email and loads your SNCBT Assess profile.
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
