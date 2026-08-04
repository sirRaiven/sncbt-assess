<script setup lang="ts">
definePageMeta({
    layout: "auth",
});
useSeoMeta({
    title: "Sign in",
});
const email = ref("");
const password = ref("");
const rememberMe = ref(true);
const isSubmitting = ref(false);
async function signIn(): Promise<void> {
    isSubmitting.value = true;
    try {
        await new Promise((resolve) => {
            setTimeout(resolve, 450);
        });
    }
    finally {
        isSubmitting.value = false;
    }
}
</script>

<template>
  <div class="mx-auto w-full max-w-md">
    <UCard class="shadow-xl shadow-slate-950/5">
      <template #header>
        <div class="text-center">
          <div
            class="mx-auto flex size-12 items-center justify-center rounded-xl bg-brand-700 text-white"
          >
            <UIcon
              name="i-lucide-graduation-cap"
              class="size-6"
             />
          </div>
          <p class="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-primary">
            St. Nicolas College of Business and Technology
          </p>
          <h1 class="mt-2 text-2xl font-black text-highlighted">
            Sign in to SNCBT Assess
          </h1>
          <p class="mt-2 text-sm leading-6 text-muted">
            Enter your registered account credentials to continue.
          </p>
        </div>
      </template>
      <form
        class="space-y-5"
        @submit.prevent="signIn"
      >
        <UFormField
          label="Email address"
          required
        >
          <UInput
            v-model="email"
            type="email"
            size="lg"
            icon="i-lucide-mail"
            placeholder="Enter your email address"
            class="w-full"
            autocomplete="email"
           />
        </UFormField>
        <UFormField
          label="Password"
          required
        >
          <UInput
            v-model="password"
            type="password"
            size="lg"
            icon="i-lucide-lock-keyhole"
            placeholder="Enter your password"
            class="w-full"
            autocomplete="current-password"
           />
        </UFormField>
        <div class="flex items-center justify-between gap-3">
          <UCheckbox
            v-model="rememberMe"
            label="Remember me"
           />
          <NuxtLink
            to="/forgot-password"
            class="text-sm font-semibold text-primary hover:underline"
          >
            Forgot password?
          </NuxtLink>
        </div>
        <UButton
          type="submit"
          block
          size="lg"
          :loading="isSubmitting"
        >
          Sign In
        </UButton>
      </form>
      <template #footer>
        <p class="text-center text-sm text-muted">
          Do not have an account?
          <NuxtLink
            to="/register"
            class="font-semibold text-primary hover:underline"
          >
            Create account
          </NuxtLink>
        </p>
      </template>
    </UCard>
    <p class="mt-5 text-center text-xs text-muted">
      Assessment Classroom Management System
    </p>
  </div>
</template>
