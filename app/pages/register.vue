<script setup lang="ts">
import type {
  FormSubmitEvent,
} from "@nuxt/ui";

import {
  z,
} from "zod";

definePageMeta({
  layout: "auth",
});

useSeoMeta({
  title: "Create account",
});

const supabase = useSupabaseClient();
const requestUrl = useRequestURL();

const schema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(
        1,
        "First name is required.",
      )
      .max(
        80,
        "First name is too long.",
      ),

    middleName: z
      .string()
      .trim()
      .max(
        80,
        "Middle name is too long.",
      ),

    lastName: z
      .string()
      .trim()
      .min(
        1,
        "Last name is required.",
      )
      .max(
        80,
        "Last name is too long.",
      ),

    accountType: z.enum([
      "Student",
      "Instructor",
    ]),

    accountNumber: z
      .string()
      .trim()
      .min(
        1,
        "The account number is required.",
      )
      .max(
        50,
        "The account number is too long.",
      ),

    email: z
      .string()
      .trim()
      .email(
        "Enter a valid email address.",
      ),

    password: z
      .string()
      .min(
        8,
        "Password must contain at least eight characters.",
      )
      .regex(
        /[A-Z]/,
        "Password must include an uppercase letter.",
      )
      .regex(
        /[a-z]/,
        "Password must include a lowercase letter.",
      )
      .regex(
        /\d/,
        "Password must include a number.",
      ),

    confirmPassword: z
      .string(),

    acceptedPolicy: z
      .boolean()
      .refine(
        (value) => value,
        "You must acknowledge the account declaration.",
      ),
  })
  .superRefine(
    (
      data,
      context,
    ) => {
      if (
        data.password
        !== data.confirmPassword
      ) {
        context.addIssue({
          code: "custom",
          path: [
            "confirmPassword",
          ],
          message:
            "The passwords do not match.",
        });
      }
    },
  );

type RegistrationSchema =
  z.output<typeof schema>;

const state = reactive<RegistrationSchema>({
  firstName: "",
  middleName: "",
  lastName: "",
  accountType: "Student",
  accountNumber: "",
  email: "",
  password: "",
  confirmPassword: "",
  acceptedPolicy: false,
});

const isSubmitting = ref(false);
const registrationCompleted = ref(false);
const errorMessage = ref("");

async function register(
  event: FormSubmitEvent<RegistrationSchema>,
): Promise<void> {
  isSubmitting.value = true;
  errorMessage.value = "";

  try {
    const isInstructor =
      event.data.accountType
      === "Instructor";

    const requestedRole =
      isInstructor
        ? "instructor"
        : "student";

    const {
      data,
      error,
    } = await supabase.auth.signUp({
      email:
        event.data.email
          .trim()
          .toLowerCase(),

      password:
        event.data.password,

      options: {
        emailRedirectTo:
          `${requestUrl.origin}/confirm`,

        data: {
          first_name:
            event.data.firstName.trim(),

          middle_name:
            event.data.middleName.trim()
            || null,

          last_name:
            event.data.lastName.trim(),

          requested_role:
            requestedRole,

          student_number:
            isInstructor
              ? null
              : event.data.accountNumber.trim(),

          employee_number:
            isInstructor
              ? event.data.accountNumber.trim()
              : null,
        },
      },
    });

    if (error) {
      throw error;
    }

    if (
      data.session
      && data.user
    ) {
      const {
        loadProfile,
      } = useCurrentProfile();

      const profile = await loadProfile({
        force: true,
        userId: data.user.id,
      });

      if (profile) {
        await navigateTo(
          profile.account_status === "pending"
            ? "/account-pending"
            : "/student/dashboard",
        );

        return;
      }
    }

    registrationCompleted.value = true;
  } catch (error) {
    errorMessage.value =
      error instanceof Error
        ? error.message
        : "Unable to create the account.";
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="mx-auto w-full max-w-7xl px-1 sm:px-2">
    <div class="overflow-hidden rounded-3xl border border-default bg-default shadow-2xl shadow-slate-950/10">
      <div class="grid lg:grid-cols-[0.5fr_1.5fr] xl:grid-cols-[0.46fr_1.54fr]">
        <aside
          class="relative hidden overflow-hidden border-r border-default bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-7 lg:flex xl:p-8"
        >
          <div
            class="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-primary/10 blur-3xl"
            aria-hidden="true"
          />

          <div class="relative flex min-h-[620px] w-full flex-col">
            <div class="flex items-center gap-3">
              <InstitutionLogo
                size="lg"
                eager
              />

              <div>
                <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
                  SNCBT Digital Learning
                </p>
                <p class="mt-0.5 text-sm font-semibold text-highlighted">
                  Account Registration
                </p>
              </div>
            </div>

            <div class="mt-10">
              <UBadge
                color="primary"
                variant="soft"
                icon="i-lucide-user-round-plus"
              >
                Institutional account
              </UBadge>

              <h1 class="mt-4 text-3xl font-black tracking-tight text-highlighted">
                Create your SNCBT Assess account.
              </h1>

              <p class="mt-3 text-sm leading-6 text-muted">
                Use your official school information so your account is connected to the correct learning role and records.
              </p>

              <div class="mt-7 space-y-4">
                <div class="flex items-start gap-3">
                  <div class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <UIcon
                      name="i-lucide-id-card"
                      class="size-4"
                    />
                  </div>
                  <div>
                    <p class="text-sm font-semibold text-highlighted">
                      Official school identity
                    </p>
                    <p class="mt-0.5 text-xs leading-5 text-muted">
                      Register using your assigned Student Number or Employee Number.
                    </p>
                  </div>
                </div>

                <div class="flex items-start gap-3">
                  <div class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <UIcon
                      name="i-lucide-mail-check"
                      class="size-4"
                    />
                  </div>
                  <div>
                    <p class="text-sm font-semibold text-highlighted">
                      Verified contact
                    </p>
                    <p class="mt-0.5 text-xs leading-5 text-muted">
                      Your active email is used for confirmation and account recovery.
                    </p>
                  </div>
                </div>

                <div class="flex items-start gap-3">
                  <div class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <UIcon
                      name="i-lucide-shield-user"
                      class="size-4"
                    />
                  </div>
                  <div>
                    <p class="text-sm font-semibold text-highlighted">
                      Role verification
                    </p>
                    <p class="mt-0.5 text-xs leading-5 text-muted">
                      Instructor accounts require administrator approval before access is activated.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div class="mt-auto border-t border-default/70 pt-5">
              <p class="text-xs font-medium text-highlighted">
                St. Nicolas College of Business and Technology
              </p>
              <p class="mt-1 text-[11px] leading-4 text-muted">
                Assessment Classroom Management System
              </p>
            </div>
          </div>
        </aside>

        <section class="p-5 sm:p-6 lg:p-7 xl:p-8">
          <div class="mx-auto w-full max-w-4xl">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
                  New account
                </p>
                <h2 class="mt-1.5 text-2xl font-black tracking-tight text-highlighted sm:text-3xl">
                  Create your account
                </h2>
                <p class="mt-1.5 text-sm text-muted">
                  Enter your official institutional information. Required fields are marked with an asterisk.
                </p>
              </div>

              <UButton
                to="/"
                color="neutral"
                variant="ghost"
                size="sm"
                icon="i-lucide-arrow-left"
                class="hidden shrink-0 sm:inline-flex"
              >
                Sign In
              </UButton>
            </div>

            <UAlert
              v-if="registrationCompleted"
              class="mt-5"
              color="success"
              variant="soft"
              icon="i-lucide-mail-check"
              title="Check your email"
              description="Open the confirmation message sent to your email address to finish creating the account."
            />

            <UForm
              v-else
              :schema="schema"
              :state="state"
              class="mt-5 space-y-4"
              @submit="register"
            >
              <UAlert
                v-if="errorMessage"
                color="error"
                variant="soft"
                icon="i-lucide-circle-alert"
                title="Registration unsuccessful"
                :description="errorMessage"
              />

              <section class="rounded-2xl border border-default p-4 sm:p-5">
                <div class="mb-3 flex items-center gap-2.5">
                  <div class="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <UIcon
                      name="i-lucide-user-round"
                      class="size-4"
                    />
                  </div>
                  <div>
                    <h3 class="text-sm font-bold text-highlighted">
                      Personal information
                    </h3>
                    <p class="text-[11px] text-muted">
                      Use the name shown in your institutional records.
                    </p>
                  </div>
                </div>

                <div class="grid gap-3 sm:grid-cols-3">
                  <UFormField
                    label="First name"
                    name="firstName"
                    required
                  >
                    <UInput
                      v-model="state.firstName"
                      class="w-full"
                      placeholder="Enter first name"
                      autocomplete="given-name"
                    />
                  </UFormField>

                  <UFormField
                    label="Middle name"
                    name="middleName"
                  >
                    <UInput
                      v-model="state.middleName"
                      class="w-full"
                      placeholder="Middle name (optional)"
                      autocomplete="additional-name"
                    />
                  </UFormField>

                  <UFormField
                    label="Last name"
                    name="lastName"
                    required
                  >
                    <UInput
                      v-model="state.lastName"
                      class="w-full"
                      placeholder="Enter last name"
                      autocomplete="family-name"
                    />
                  </UFormField>
                </div>
              </section>

              <section class="rounded-2xl border border-default p-4 sm:p-5">
                <div class="mb-3 flex items-center gap-2.5">
                  <div class="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <UIcon
                      name="i-lucide-id-card"
                      class="size-4"
                    />
                  </div>
                  <div>
                    <h3 class="text-sm font-bold text-highlighted">
                      Institutional account
                    </h3>
                    <p class="text-[11px] text-muted">
                      Your school ID number becomes your username.
                    </p>
                  </div>
                </div>

                <div class="grid gap-3 md:grid-cols-3">
                  <UFormField
                    label="Account type"
                    name="accountType"
                    required
                  >
                    <USelect
                      v-model="state.accountType"
                      :items="[
                        'Student',
                        'Instructor',
                      ]"
                      class="w-full"
                    />
                  </UFormField>

                  <UFormField
                    :label="
                      state.accountType === 'Student'
                        ? 'Student number'
                        : 'Employee number'
                    "
                    name="accountNumber"
                    required
                  >
                    <UInput
                      v-model="state.accountNumber"
                      icon="i-lucide-id-card"
                      class="w-full"
                      autocomplete="username"
                      autocapitalize="none"
                      spellcheck="false"
                      :placeholder="
                        state.accountType === 'Student'
                          ? 'Enter Student Number'
                          : 'Enter Employee Number'
                      "
                    />
                  </UFormField>

                  <UFormField
                    label="Email address"
                    name="email"
                    required
                  >
                    <UInput
                      v-model="state.email"
                      type="email"
                      icon="i-lucide-mail"
                      class="w-full"
                      placeholder="Enter active email"
                      autocomplete="email"
                    />
                  </UFormField>
                </div>

                <UAlert
                  v-if="state.accountType === 'Instructor'"
                  class="mt-3"
                  color="warning"
                  variant="soft"
                  icon="i-lucide-clock-3"
                  title="Administrator approval required"
                  description="Instructor access remains pending until the registration is verified and approved by an administrator."
                />
              </section>

              <section class="rounded-2xl border border-default p-4 sm:p-5">
                <div class="mb-3 flex items-center gap-2.5">
                  <div class="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <UIcon
                      name="i-lucide-shield-check"
                      class="size-4"
                    />
                  </div>
                  <div>
                    <h3 class="text-sm font-bold text-highlighted">
                      Account security
                    </h3>
                    <p class="text-[11px] text-muted">
                      Create a password you do not use or share elsewhere.
                    </p>
                  </div>
                </div>

                <div class="grid gap-3 sm:grid-cols-2">
                  <UFormField
                    label="Password"
                    name="password"
                    required
                  >
                    <PasswordField
                      v-model="state.password"
                      icon="i-lucide-lock-keyhole"
                      placeholder="Create a secure password"
                      autocomplete="new-password"
                    />
                  </UFormField>

                  <UFormField
                    label="Confirm password"
                    name="confirmPassword"
                    required
                  >
                    <PasswordField
                      v-model="state.confirmPassword"
                      icon="i-lucide-lock-keyhole"
                      placeholder="Re-enter password"
                      autocomplete="new-password"
                    />
                  </UFormField>
                </div>

                <PasswordRequirements
                  class="mt-3"
                  :password="state.password"
                  :confirm-password="state.confirmPassword"
                  show-match
                />
              </section>

              <UFormField
                name="acceptedPolicy"
                class="rounded-2xl border border-default bg-muted/20 px-4 py-3.5"
              >
                <UCheckbox
                  v-model="state.acceptedPolicy"
                  label="I confirm that the information provided is accurate and agree to comply with SNCBT's applicable account-use, data privacy, and academic-integrity policies."
                />
              </UFormField>

              <div class="flex flex-col gap-3 border-t border-default pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p class="text-xs text-muted">
                  Already registered?
                  <NuxtLink
                    to="/"
                    class="font-semibold text-primary hover:underline"
                  >
                    Sign in to your account
                  </NuxtLink>
                </p>

                <div class="flex gap-2">
                  <UButton
                    to="/"
                    color="neutral"
                    variant="outline"
                    class="flex-1 sm:hidden"
                    icon="i-lucide-arrow-left"
                  >
                    Sign In
                  </UButton>

                  <UButton
                    type="submit"
                    class="flex-1 sm:flex-none"
                    icon="i-lucide-user-round-plus"
                    :loading="isSubmitting"
                  >
                    Create Account
                  </UButton>
                </div>
              </div>
            </UForm>

            <div
              v-if="registrationCompleted"
              class="mt-5"
            >
              <UButton
                to="/"
                block
                color="neutral"
                variant="outline"
                icon="i-lucide-arrow-left"
              >
                Return to Sign In
              </UButton>
            </div>
          </div>
        </section>
      </div>
    </div>

    <p class="mt-4 text-center text-[11px] text-muted">
      SNCBT Assess · Institutional account registration
    </p>
  </div>
</template>
