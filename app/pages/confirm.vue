<script setup lang="ts">
definePageMeta({
    layout: "auth",
});
</script>

<template>
  <div class="mx-auto max-w-lg">
    <UCard>
      <div class="py-8 text-center">
        <div
          class="mx-auto flex size-16 items-center justify-center rounded-full bg-success/10 text-success"
        >
          <UIcon
            name="i-lucide-badge-check"
            class="size-8"
           />
        </div>
        <h1 class="mt-6 text-2xl font-black text-highlighted">
          Email confirmed
        </h1>
        <p class="mt-3 text-sm leading-6 text-muted">
          Your confirmation screen is ready. The production version will load the profile and role.
        </p>
        <UButton
          to="/"
          color="neutral"
          variant="outline"
          class="mt-7"
        >
          Return to Sign In
        </UButton>
      </div>
    </UCard>
  </div>
</template>
