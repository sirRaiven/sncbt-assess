<script setup lang="ts">
import type {
  FormSubmitEvent,
} from "@nuxt/ui";

import {
  z,
} from "zod";

import type {
  Profile,
} from "~/types/profile";

import {
  resolveRequestedDestination,
} from "~/utils/auth-navigation";

definePageMeta({
  layout: "auth",
});

useSeoMeta({
  title: "Sign in",
});

const route = useRoute();
const supabase = useSupabaseClient();

const schema = z.object({
  email: z
    .string()
    .trim()
    .email(
      "Enter a valid email address.",
    ),

  password: z
    .string()
    .min(
      1,
      "Password is required.",
    ),
});

type SignInSchema =
  z.output<typeof schema>;

const state = reactive<SignInSchema>({
  email: "",
  password: "",
});

const isSubmitting = ref(false);
const errorMessage = ref("");

const successMessage = computed(() => {
  if (route.query.reset === "success") {
    return "Your password was updated. You may now sign in.";
  }

  if (route.query.confirmed === "true") {
    return "Your email address was confirmed. You may now sign in.";
  }

  return "";
});

async function signIn(
  event: FormSubmitEvent<SignInSchema>,
): Promise<void> {
  isSubmitting.value = true;
  errorMessage.value = "";

  try {
    const {
      data: authData,
      error: authError,
    } = await supabase.auth.signInWithPassword({
      email:
        event.data.email
          .trim()
          .toLowerCase(),

      password:
        event.data.password,
    });

    if (authError) {
      if (
        authError.message
          .toLowerCase()
          .includes("email not confirmed")
      ) {
        throw new Error(
          "Confirm your email address before signing in.",
        );
      }

      throw new Error(
        "The email address or password is incorrect.",
      );
    }

    const userId =
      authData.user?.id;

    if (!userId) {
      throw new Error(
        "Supabase did not return a valid user account.",
      );
    }

    const {
      data: profileData,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      console.error(
        "Profile lookup failed after sign in.",
        {
          code: profileError.code,
          message: profileError.message,
          details: profileError.details,
          hint: profileError.hint,
          userId,
        },
      );

      await supabase.auth.signOut({
        scope: "local",
      });

      throw new Error(
        `Your account profile could not be loaded: ${profileError.message}`,
      );
    }

    if (!profileData) {
      await supabase.auth.signOut({
        scope: "local",
      });

      throw new Error(
        "Your authentication account exists, but its SNCBT Assess profile is missing.",
      );
    }

    const profile =
      profileData as Profile;

    const {
      setProfile,
    } = useCurrentProfile();

    setProfile(profile);

    const destination =
      resolveRequestedDestination(
        profile,
        route.query.redirect,
      );

    await navigateTo(destination);
  } catch (error) {
    errorMessage.value =
      error instanceof Error
        ? error.message
        : "Unable to sign in.";
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="mx-auto w-full max-w-md">
    <UCard class="shadow-xl shadow-slate-950/5">
      <template #header>
        <div class="text-center">
          <div class="mx-auto flex size-12 items-center justify-center rounded-xl bg-brand-700 text-white">
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

      <UAlert
        v-if="successMessage"
        class="mb-5"
        color="success"
        variant="soft"
        icon="i-lucide-circle-check-big"
        title="Account ready"
        :description="successMessage"
      />

      <UAlert
        v-if="errorMessage"
        class="mb-5"
        color="error"
        variant="soft"
        icon="i-lucide-circle-alert"
        title="Sign-in unsuccessful"
        :description="errorMessage"
      />

      <UForm
        :schema="schema"
        :state="state"
        class="space-y-5"
        @submit="signIn"
      >
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
            placeholder="Enter your email address"
            class="w-full"
            autocomplete="email"
          />
        </UFormField>

        <UFormField
          label="Password"
          name="password"
          required
        >
          <UInput
            v-model="state.password"
            type="password"
            size="lg"
            icon="i-lucide-lock-keyhole"
            placeholder="Enter your password"
            class="w-full"
            autocomplete="current-password"
          />
        </UFormField>

        <div class="flex justify-end">
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
      </UForm>

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
