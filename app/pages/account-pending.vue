<script setup lang="ts">
definePageMeta({
  layout: "auth",
});

useSeoMeta({
  title: "Account pending",
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
        <div class="mx-auto flex size-14 items-center justify-center rounded-xl bg-warning/10 text-warning">
          <UIcon
            name="i-lucide-clock-3"
            class="size-7"
          />
        </div>

        <h1 class="mt-5 text-2xl font-black text-highlighted">
          Instructor account pending
        </h1>

        <p class="mt-3 text-sm leading-6 text-muted">
          Your email is confirmed. An administrator must approve your instructor account before you can create classes and assessments.
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

            <StatusPill status="Pending approval" />
          </div>
        </div>

        <SignOutButton
          class="mt-7"
        />
      </div>
    </UCard>
  </div>
</template>
