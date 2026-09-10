<script setup lang="ts">
definePageMeta({
  layout: "auth",
});

useSeoMeta({
  title: "Account temporarily unavailable",
  robots: "noindex, nofollow",
});

const route = useRoute();
const isRetrying = ref(false);

function retryDestination(): string {
  const requested = route.query.redirect;

  if (
    typeof requested === "string"
    && requested.startsWith("/")
    && !requested.startsWith("//")
    && !requested.startsWith("/account-access-error")
  ) {
    return requested;
  }

  return "/";
}

async function retry(): Promise<void> {
  isRetrying.value = true;

  try {
    await navigateTo(
      retryDestination(),
      {
        replace: true,
      },
    );
  } finally {
    isRetrying.value = false;
  }
}
</script>

<template>
  <div class="mx-auto w-full max-w-lg">
    <UCard>
      <div class="py-7 text-center sm:py-9">
        <div class="mx-auto flex size-14 items-center justify-center rounded-xl bg-warning/10 text-warning">
          <UIcon
            name="i-lucide-wifi-off"
            class="size-7"
          />
        </div>

        <h1 class="mt-5 text-2xl font-black text-highlighted">
          We couldn't load your account
        </h1>

        <p class="mx-auto mt-3 max-w-md text-sm leading-6 text-muted">
          Your sign-in session is still active, but SNCBT Assess could not load your account information right now. Check your connection and try again.
        </p>

        <div class="mt-7 grid gap-2 sm:grid-cols-2">
          <UButton
            size="lg"
            block
            icon="i-lucide-refresh-cw"
            :loading="isRetrying"
            @click="retry"
          >
            Try again
          </UButton>

          <SignOutButton
            block
            variant="outline"
          />
        </div>
      </div>
    </UCard>
  </div>
</template>
