<script setup lang="ts">
import type {
  FormSubmitEvent,
} from "@nuxt/ui";

import {
  z,
} from "zod";

import {
  resolveRequestedDestination,
} from "~/utils/auth-navigation";

import {
  toUserFacingError,
} from "~/utils/user-facing-error";

definePageMeta({
  layout: "auth",
});

useSeoMeta({
  title: "Sign in",
});

const route = useRoute();
const supabase = useSupabaseClient();
const schema = z.object({
  identifier: z
    .string()
    .trim()
    .min(
      1,
      "Username is required.",
    )
    .max(
      100,
      "Username is too long.",
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
  identifier: "",
  password: "",
});

const isSubmitting = ref(false);
const errorMessage = ref("");

const {
  signInWithIdentifier,
} = useIdentifierSignIn();

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
    const signInResult =
      await signInWithIdentifier(
        event.data.identifier,
        event.data.password,
      );

    if (
      signInResult.error
      || !signInResult.userId
    ) {
      throw new Error(
        signInResult.error
        || "The username or password is incorrect.",
      );
    }

    const userId =
      signInResult.userId;

    const {
      loadProfile,
    } = useCurrentProfile();

    const profile =
      await loadProfile({
        force: true,
        userId,
      });

    if (!profile) {
      await supabase.auth.signOut({
        scope: "local",
      });

      throw new Error(
        "Your account setup is incomplete. Please contact the system administrator.",
      );
    }

    const destination =
      resolveRequestedDestination(
        profile,
        route.query.redirect,
      );

    await navigateTo(destination);
  } catch (error) {
    errorMessage.value =
      toUserFacingError(
        error,
        "We couldn't sign you in right now. Please try again.",
      );
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="mx-auto w-full max-w-5xl">
    <div class="overflow-hidden rounded-xl border border-default bg-default shadow-2xl shadow-slate-950/10">
      <div class="grid lg:grid-cols-[1.05fr_0.95fr]">
        <section
          class="relative hidden overflow-hidden border-r border-default bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-6 sm:p-8 lg:flex lg:p-10"
        >
          <div
            class="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-primary/10 blur-3xl"
            aria-hidden="true"
          />
          <div
            class="pointer-events-none absolute -bottom-24 -left-20 size-64 rounded-full bg-primary/10 blur-3xl"
            aria-hidden="true"
          />

          <div class="relative flex h-full flex-col">
            <div class="flex items-center gap-3">
              <InstitutionLogo
                size="lg"
                eager
              />

              <div>
                <p class="text-xs font-bold uppercase tracking-[0.2em] text-primary">
                  SNCBT E-Learning
                </p>
                <p class="mt-1 text-sm font-semibold text-highlighted">
                  Assessment Classroom Management System
                </p>
              </div>
            </div>

            <div class="my-auto py-8 lg:py-12">
              <UBadge
                color="primary"
                variant="soft"
                icon="i-lucide-graduation-cap"
              >
                Learning and assessment portal
              </UBadge>

              <h1 class="mt-5 max-w-xl text-3xl font-black tracking-tight text-highlighted sm:text-4xl">
                Assessment access designed for the classroom.
              </h1>

              <p class="mt-4 max-w-lg text-sm leading-6 text-muted sm:text-base">
                Access assigned assessments, classroom activities, and academic progress through one secure SNCBT learning portal.
              </p>

              <div class="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                <div class="rounded-lg border border-default/80 bg-default/55 p-4 backdrop-blur-sm">
                  <UIcon
                    name="i-lucide-book-open-check"
                    class="size-5 text-primary"
                  />
                  <p class="mt-3 text-sm font-semibold text-highlighted">
                    Classroom assessments
                  </p>
                  <p class="mt-1 text-xs leading-5 text-muted">
                    Open quizzes and examinations assigned to your classes.
                  </p>
                </div>

                <div class="rounded-lg border border-default/80 bg-default/55 p-4 backdrop-blur-sm">
                  <UIcon
                    name="i-lucide-timer"
                    class="size-5 text-primary"
                  />
                  <p class="mt-3 text-sm font-semibold text-highlighted">
                    Guided question timing
                  </p>
                  <p class="mt-1 text-xs leading-5 text-muted">
                    Follow instructor-defined answering time for each question.
                  </p>
                </div>

                <div class="rounded-lg border border-default/80 bg-default/55 p-4 backdrop-blur-sm">
                  <UIcon
                    name="i-lucide-chart-no-axes-combined"
                    class="size-5 text-primary"
                  />
                  <p class="mt-3 text-sm font-semibold text-highlighted">
                    Learning progress
                  </p>
                  <p class="mt-1 text-xs leading-5 text-muted">
                    Review available results and classroom assessment activity.
                  </p>
                </div>
              </div>
            </div>

            <p class="text-xs text-muted">
              St. Nicolas College of Business and Technology
            </p>
          </div>
        </section>

        <section class="p-6 sm:p-8 lg:p-10">
          <div class="mx-auto w-full max-w-md">
            <p class="text-xs font-bold uppercase tracking-[0.2em] text-primary">
              Account access
            </p>

            <h2 class="mt-2 text-3xl font-black tracking-tight text-highlighted">
              Welcome back
            </h2>

            <p class="mt-2 text-sm leading-6 text-muted">
              Sign in with your institutional username to continue to SNCBT Assess.
            </p>

            <UAlert
              v-if="successMessage"
              class="mt-6"
              color="success"
              variant="soft"
              icon="i-lucide-circle-check-big"
              title="Account ready"
              :description="successMessage"
            />

            <UAlert
              v-if="errorMessage"
              class="mt-6"
              color="error"
              variant="soft"
              icon="i-lucide-circle-alert"
              title="Unable to sign in"
              :description="errorMessage"
            />

            <UForm
              :schema="schema"
              :state="state"
              class="mt-7 space-y-5"
              @submit="signIn"
            >
              <UFormField
                label="Username"
                name="identifier"
                required
              >
                <UInput
                  v-model="state.identifier"
                  type="text"
                  size="xl"
                  icon="i-lucide-id-card"
                  placeholder="Student Number or Employee Number"
                  class="w-full"
                  autocomplete="username"
                  autocapitalize="none"
                  spellcheck="false"
                />
              </UFormField>

              <UFormField
                label="Password"
                name="password"
                required
              >
                <PasswordField
                  v-model="state.password"
                  size="xl"
                  icon="i-lucide-lock-keyhole"
                  placeholder="Enter your password"
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
                size="xl"
                icon="i-lucide-log-in"
                :loading="isSubmitting"
              >
                Sign In
              </UButton>
            </UForm>

            <div class="mt-7 border-t border-default pt-6">
              <p class="text-center text-sm text-muted">
                New to SNCBT Assess?

                <NuxtLink
                  to="/register"
                  class="font-semibold text-primary hover:underline"
                >
                  Create an account
                </NuxtLink>
              </p>
            </div>

            <div class="mt-6 flex items-start gap-3 rounded-lg border border-default bg-muted/20 p-4">
              <UIcon
                name="i-lucide-shield-check"
                class="mt-0.5 size-5 shrink-0 text-primary"
              />

              <p class="text-xs leading-5 text-muted">
                Use only your assigned institutional account. Authentication activity is protected by SNCBT Assess security controls.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>

    <p class="mt-5 text-center text-xs text-muted">
      SNCBT Assess · Assessment Classroom Management System
    </p>
  </div>
</template>
