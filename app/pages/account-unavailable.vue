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
          class="mx-auto flex size-16 items-center justify-center rounded-full bg-error/10 text-error"
        >
          <UIcon
            name="i-lucide-circle-slash-2"
            class="size-8"
           />
        </div>
        <h1 class="mt-6 text-2xl font-black text-highlighted">
          Account unavailable
        </h1>
        <p class="mt-3 text-sm leading-6 text-muted">
          This account cannot currently access SNCBT Assess. Contact the administrator for assistance.
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
