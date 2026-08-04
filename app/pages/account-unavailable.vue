<script setup lang="ts">
definePageMeta({
  layout: "auth",
});

useSeoMeta({
  title: "Account unavailable",
});

const {
  profile,
  loadProfile,
} = useCurrentProfile();

await loadProfile({
  force: true,
});
</script>

<template>
  <div class="mx-auto max-w-lg">
    <UCard>
      <div class="py-8 text-center">
        <div class="mx-auto flex size-14 items-center justify-center rounded-xl bg-error/10 text-error">
          <UIcon
            name="i-lucide-circle-slash-2"
            class="size-7"
          />
        </div>

        <h1 class="mt-5 text-2xl font-black text-highlighted">
          Account unavailable
        </h1>

        <p class="mt-3 text-sm leading-6 text-muted">
          This account cannot currently access SNCBT Assess. Contact the system administrator for assistance.
        </p>

        <div class="mt-6 rounded-xl border border-default bg-elevated/50 p-4 text-left text-sm">
          <div class="flex items-center justify-between gap-4">
            <span class="text-muted">
              Email address
            </span>

            <span class="truncate font-semibold text-highlighted">
              {{ profile?.email }}
            </span>
          </div>

          <div class="mt-3 flex items-center justify-between gap-4">
            <span class="text-muted">
              Account status
            </span>

            <StatusPill
              :status="
                profile?.account_status
                || 'Unavailable'
              "
            />
          </div>
        </div>

        <SignOutButton
          class="mt-7"
        />
      </div>
    </UCard>
  </div>
</template>
