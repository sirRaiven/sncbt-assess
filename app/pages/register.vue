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
        "You must accept the account-use policy.",
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
  <div class="mx-auto max-w-4xl">
    <UCard>
      <template #header>
        <PageHeader
          eyebrow="Account registration"
          title="Create your account"
          description="Students may register directly. Instructor accounts require administrator approval."
        />
      </template>

      <UAlert
        v-if="registrationCompleted"
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
        class="space-y-6"
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

        <div class="grid gap-5 md:grid-cols-3">
          <UFormField
            label="First name"
            name="firstName"
            required
          >
            <UInput
              v-model="state.firstName"
              size="lg"
              class="w-full"
              autocomplete="given-name"
            />
          </UFormField>

          <UFormField
            label="Middle name"
            name="middleName"
          >
            <UInput
              v-model="state.middleName"
              size="lg"
              class="w-full"
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
              size="lg"
              class="w-full"
              autocomplete="family-name"
            />
          </UFormField>
        </div>

        <div class="grid gap-5 md:grid-cols-2">
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
              size="lg"
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
              size="lg"
              class="w-full"
              :placeholder="
                state.accountType === 'Student'
                  ? 'Enter your student number'
                  : 'Enter your employee number'
              "
            />
          </UFormField>
        </div>

        <UAlert
          v-if="state.accountType === 'Instructor'"
          color="warning"
          variant="soft"
          icon="i-lucide-clock-3"
          title="Administrator approval required"
          description="After confirming your email, your instructor account will remain pending until an administrator approves it."
        />

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
            class="w-full"
            autocomplete="email"
          />
        </UFormField>

        <div class="grid gap-5 md:grid-cols-2">
          <UFormField
            label="Password"
            name="password"
            required
            help="Use at least eight characters with an uppercase letter, lowercase letter, and number."
          >
            <UInput
              v-model="state.password"
              type="password"
              size="lg"
              icon="i-lucide-lock-keyhole"
              class="w-full"
              autocomplete="new-password"
            />
          </UFormField>

          <UFormField
            label="Confirm password"
            name="confirmPassword"
            required
          >
            <UInput
              v-model="state.confirmPassword"
              type="password"
              size="lg"
              icon="i-lucide-lock-keyhole"
              class="w-full"
              autocomplete="new-password"
            />
          </UFormField>
        </div>

        <UFormField
          name="acceptedPolicy"
        >
          <UCheckbox
            v-model="state.acceptedPolicy"
            label="I agree to follow the institution's acceptable-use and academic-integrity policies."
          />
        </UFormField>

        <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <UButton
            to="/"
            color="neutral"
            variant="outline"
            size="lg"
          >
            Return to Sign In
          </UButton>

          <UButton
            type="submit"
            size="lg"
            :loading="isSubmitting"
          >
            Create Account
          </UButton>
        </div>
      </UForm>

      <template
        v-if="registrationCompleted"
        #footer
      >
        <UButton
          to="/"
          block
          color="neutral"
          variant="outline"
        >
          Return to Sign In
        </UButton>
      </template>
    </UCard>
  </div>
</template>
