<script setup lang="ts">
import type {
  FormSubmitEvent,
} from "@nuxt/ui";

import {
  z,
} from "zod";

import type {
  AppRole,
} from "~/types/ui";

const props = defineProps<{
  role: AppRole;
}>();

const toast =
  useToast();

const supabase =
  useSupabaseClient();

const {
  profile,
  isLoadingProfile,
  profileError,
  loadProfile,
  setProfile,
} = useCurrentProfile();

const {
  updateProfile,
} = useAccountProfile();

const personalSchema =
  z.object({
    firstName:
      z
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

    middleName:
      z
        .string()
        .trim()
        .max(
          80,
          "Middle name is too long.",
        ),

    lastName:
      z
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

    avatarUrl:
      z
        .string()
        .trim()
        .max(
          500,
          "Avatar URL is too long.",
        )
        .refine(
          (value) =>
            !value
            || /^https?:\/\//i
              .test(value),
          "Use an HTTP or HTTPS image URL.",
        ),
  });

const passwordSchema =
  z
    .object({
      currentPassword:
        z
          .string()
          .min(
            1,
            "Enter your current password.",
          ),

      newPassword:
        z
          .string()
          .min(
            8,
            "Use at least eight characters.",
          )
          .regex(
            /[A-Z]/,
            "Include an uppercase letter.",
          )
          .regex(
            /[a-z]/,
            "Include a lowercase letter.",
          )
          .regex(
            /\d/,
            "Include a number.",
          ),

      confirmPassword:
        z
          .string(),
    })
    .superRefine(
      (
        value,
        context,
      ) => {
        if (
          value.newPassword
          !== value.confirmPassword
        ) {
          context.addIssue({
            code:
              "custom",
            path: [
              "confirmPassword",
            ],
            message:
              "The passwords do not match.",
          });
        }

        if (
          value.currentPassword
          === value.newPassword
        ) {
          context.addIssue({
            code:
              "custom",
            path: [
              "newPassword",
            ],
            message:
              "Use a password different from your current password.",
          });
        }
      },
    );

type PersonalForm =
  z.output<typeof personalSchema>;

type PasswordForm =
  z.output<typeof passwordSchema>;

const personalState =
  reactive<PersonalForm>({
    firstName:
      "",
    middleName:
      "",
    lastName:
      "",
    avatarUrl:
      "",
  });

const passwordState =
  reactive<PasswordForm>({
    currentPassword:
      "",
    newPassword:
      "",
    confirmPassword:
      "",
  });

const pendingProfileUpdate =
  ref<PersonalForm | null>(
    null,
  );

const pendingPasswordChange =
  ref<PasswordForm | null>(
    null,
  );

const profileModalOpen =
  ref(false);

const passwordModalOpen =
  ref(false);

const signOutModalOpen =
  ref(false);

const isSavingProfile =
  ref(false);

const isChangingPassword =
  ref(false);

await loadProfile();

watch(
  profile,
  (value) => {
    if (!value) {
      return;
    }

    personalState.firstName =
      value.first_name
      || "";

    personalState.middleName =
      value.middle_name
      || "";

    personalState.lastName =
      value.last_name
      || "";

    personalState.avatarUrl =
      value.avatar_url
      || "";
  },
  {
    immediate:
      true,
  },
);

const roleLabel =
  computed(
    () => ({
      admin:
        "System Administrator",
      instructor:
        "Instructor",
      student:
        "Student",
    })[props.role],
  );

const roleDescription =
  computed(
    () => ({
      admin:
        "Manages platform configuration and institutional accounts.",
      instructor:
        "Creates classes, assessments, schedules, and live sessions.",
      student:
        "Joins classes and completes assigned assessments.",
    })[props.role],
  );

const roleIcon =
  computed(
    () => ({
      admin:
        "i-lucide-shield-check",
      instructor:
        "i-lucide-presentation",
      student:
        "i-lucide-graduation-cap",
    })[props.role],
  );

const initials =
  computed(
    () => {
      const first =
        personalState.firstName
          .trim()
          .charAt(0);

      const last =
        personalState.lastName
          .trim()
          .charAt(0);

      return (
        `${first}${last}`
          .toUpperCase()
        || "SA"
      );
    },
  );

const accountNumber =
  computed(
    () => {
      if (
        props.role
        === "student"
      ) {
        return (
          profile.value
            ?.student_number
          || "Not assigned"
        );
      }

      if (
        props.role
        === "instructor"
      ) {
        return (
          profile.value
            ?.employee_number
          || "Not assigned"
        );
      }

      return "Administrator account";
    },
  );

const accountNumberLabel =
  computed(
    () => {
      if (
        props.role
        === "student"
      ) {
        return "Student number";
      }

      if (
        props.role
        === "instructor"
      ) {
        return "Employee number";
      }

      return "Account type";
    },
  );

function formatDate(
  value: string | null | undefined,
): string {
  if (!value) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat(
    "en-PH",
    {
      dateStyle:
        "medium",
      timeStyle:
        "short",
    },
  ).format(
    new Date(value),
  );
}

function requestProfileSave(
  event: FormSubmitEvent<PersonalForm>,
): void {
  pendingProfileUpdate.value = {
    ...event.data,
  };

  profileModalOpen.value =
    true;
}

async function confirmProfileSave(): Promise<void> {
  if (!pendingProfileUpdate.value) {
    return;
  }

  isSavingProfile.value =
    true;

  const result =
    await updateProfile({
      firstName:
        pendingProfileUpdate.value
          .firstName
          .trim(),

      middleName:
        pendingProfileUpdate.value
          .middleName
          .trim()
        || null,

      lastName:
        pendingProfileUpdate.value
          .lastName
          .trim(),

      avatarUrl:
        pendingProfileUpdate.value
          .avatarUrl
          .trim()
        || null,
    });

  if (
    result.error
    || !result.data
  ) {
    toast.add({
      title:
        "Profile could not be updated",
      description:
        result.error
        || "The profile update failed.",
      color:
        "error",
    });

    isSavingProfile.value =
      false;

    return;
  }

  setProfile(
    result.data.profile,
  );

  profileModalOpen.value =
    false;

  pendingProfileUpdate.value =
    null;

  toast.add({
    title:
      "Profile updated",
    description:
      result.data.message,
    color:
      "success",
  });

  isSavingProfile.value =
    false;
}

function requestPasswordChange(
  event: FormSubmitEvent<PasswordForm>,
): void {
  pendingPasswordChange.value = {
    ...event.data,
  };

  passwordModalOpen.value =
    true;
}

async function signOutFromProfile(): Promise<void> {
  const {
    error,
  } = await supabase.auth.signOut({
    scope:
      "local",
  });

  if (error) {
    toast.add({
      title:
        "Sign-out unsuccessful",
      description:
        error.message,
      color:
        "error",
    });

    return;
  }

  const {
    clearProfile,
  } = useCurrentProfile();

  clearProfile();

  signOutModalOpen.value =
    false;

  await navigateTo("/");
}

async function confirmPasswordChange(): Promise<void> {
  if (
    !pendingPasswordChange.value
    || !profile.value?.email
  ) {
    return;
  }

  isChangingPassword.value =
    true;

  try {
    const {
      error: reauthenticationError,
    } =
      await supabase.auth
        .signInWithPassword({
          email:
            profile.value.email,
          password:
            pendingPasswordChange.value
              .currentPassword,
        });

    if (reauthenticationError) {
      throw new Error(
        "The current password is incorrect.",
      );
    }

    const {
      error: passwordError,
    } =
      await supabase.auth.updateUser({
        password:
          pendingPasswordChange.value
            .newPassword,
      });

    if (passwordError) {
      throw passwordError;
    }

    passwordState.currentPassword =
      "";

    passwordState.newPassword =
      "";

    passwordState.confirmPassword =
      "";

    pendingPasswordChange.value =
      null;

    passwordModalOpen.value =
      false;

    toast.add({
      title:
        "Password updated",
      description:
        "Use the new password the next time you sign in.",
      color:
        "success",
    });
  } catch (error) {
    toast.add({
      title:
        "Password could not be updated",
      description:
        error instanceof Error
          ? error.message
          : "The password update failed.",
      color:
        "error",
    });
  } finally {
    isChangingPassword.value =
      false;
  }
}
</script>

<template>
  <div class="page-stack">
    <PageHeader
      eyebrow="Account"
      title="My profile"
      description="Review your institutional identity, update permitted personal details, and manage account security."
    />

    <UAlert
      v-if="profileError"
      color="error"
      variant="soft"
      title="Profile could not be loaded"
      :description="profileError"
    />

    <div
      v-if="isLoadingProfile"
      class="grid gap-5 xl:grid-cols-[22rem_minmax(0,1fr)]"
    >
      <USkeleton class="h-96 rounded-xl" />
      <USkeleton class="h-[34rem] rounded-xl" />
    </div>

    <div
      v-else-if="profile"
      class="grid gap-5 xl:grid-cols-[22rem_minmax(0,1fr)]"
    >
      <div class="space-y-5">
        <UCard>
          <div class="text-center">
            <UAvatar
              :src="
                personalState.avatarUrl
                || undefined
              "
              :text="initials"
              size="3xl"
              class="mx-auto"
            />

            <h2 class="mt-4 text-xl font-black text-highlighted">
              {{
                [
                  personalState.firstName,
                  personalState.middleName,
                  personalState.lastName,
                ]
                  .filter(Boolean)
                  .join(" ")
              }}
            </h2>

            <p class="mt-1 text-sm text-muted">
              {{ profile.email }}
            </p>

            <UBadge
              class="mt-4"
              color="primary"
              variant="soft"
              :icon="roleIcon"
            >
              {{ roleLabel }}
            </UBadge>
          </div>

          <div class="mt-6 space-y-3 border-t border-default pt-5">
            <div class="flex items-start justify-between gap-4">
              <span class="text-sm text-muted">
                {{ accountNumberLabel }}
              </span>

              <span class="text-right text-sm font-bold text-highlighted">
                {{ accountNumber }}
              </span>
            </div>

            <div class="flex items-start justify-between gap-4">
              <span class="text-sm text-muted">
                Account status
              </span>

              <StatusPill
                :status="profile.account_status"
              />
            </div>

            <div class="flex items-start justify-between gap-4">
              <span class="text-sm text-muted">
                Created
              </span>

              <span class="text-right text-xs font-semibold text-highlighted">
                {{
                  formatDate(
                    profile.created_at,
                  )
                }}
              </span>
            </div>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <div class="flex items-center gap-3">
              <div class="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <UIcon
                  :name="roleIcon"
                  class="size-5"
                />
              </div>

              <div>
                <h2 class="font-black text-highlighted">
                  Portal access
                </h2>

                <p class="text-sm text-muted">
                  {{ roleDescription }}
                </p>
              </div>
            </div>
          </template>

          <p class="text-sm leading-6 text-muted">
            Role, account status, email address, and institutional number are managed by the system and cannot be changed from this page.
          </p>
        </UCard>
      </div>

      <div class="space-y-5">
        <UCard>
          <template #header>
            <div>
              <h2 class="font-black text-highlighted">
                Personal information
              </h2>

              <p class="mt-1 text-sm text-muted">
                Update the name and optional profile image displayed throughout your portal.
              </p>
            </div>
          </template>

          <UForm
            :schema="personalSchema"
            :state="personalState"
            class="space-y-5"
            @submit="requestProfileSave"
          >
            <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <UFormField
                label="First name"
                name="firstName"
                required
              >
                <UInput
                  v-model="personalState.firstName"
                  class="w-full"
                  autocomplete="given-name"
                />
              </UFormField>

              <UFormField
                label="Middle name"
                name="middleName"
              >
                <UInput
                  v-model="personalState.middleName"
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
                  v-model="personalState.lastName"
                  class="w-full"
                  autocomplete="family-name"
                />
              </UFormField>
            </div>

            <UFormField
              label="Profile image URL"
              name="avatarUrl"
              description="Optional. Use an HTTP or HTTPS image address."
            >
              <UInput
                v-model="personalState.avatarUrl"
                class="w-full"
                icon="i-lucide-image"
                placeholder="https://example.com/profile.jpg"
              />
            </UFormField>

            <div class="grid gap-5 sm:grid-cols-2">
              <UFormField label="Email address">
                <UInput
                  :model-value="profile.email || ''"
                  class="w-full"
                  icon="i-lucide-mail"
                  disabled
                />
              </UFormField>

              <UFormField :label="accountNumberLabel">
                <UInput
                  :model-value="accountNumber"
                  class="w-full"
                  icon="i-lucide-id-card"
                  disabled
                />
              </UFormField>
            </div>

            <div class="flex justify-end">
              <UButton
                type="submit"
                icon="i-lucide-save"
                class="w-full sm:w-auto"
              >
                Review Profile Changes
              </UButton>
            </div>
          </UForm>
        </UCard>

        <UCard>
          <template #header>
            <div>
              <h2 class="font-black text-highlighted">
                Password and security
              </h2>

              <p class="mt-1 text-sm text-muted">
                Confirm your current password before setting a new one.
              </p>
            </div>
          </template>

          <UForm
            :schema="passwordSchema"
            :state="passwordState"
            class="space-y-5"
            @submit="requestPasswordChange"
          >
            <UFormField
              label="Current password"
              name="currentPassword"
              required
            >
              <PasswordField
                v-model="passwordState.currentPassword"
                icon="i-lucide-lock-keyhole"
                placeholder="Enter your current password"
                autocomplete="current-password"
              />
            </UFormField>

            <div class="grid gap-5 md:grid-cols-2">
              <UFormField
                label="New password"
                name="newPassword"
                required
              >
                <PasswordField
                  v-model="passwordState.newPassword"
                  icon="i-lucide-key-round"
                  placeholder="Create a new password"
                  autocomplete="new-password"
                />
              </UFormField>

              <UFormField
                label="Confirm new password"
                name="confirmPassword"
                required
              >
                <PasswordField
                  v-model="passwordState.confirmPassword"
                  icon="i-lucide-key-round"
                  placeholder="Enter the new password again"
                  autocomplete="new-password"
                />
              </UFormField>
            </div>

            <PasswordRequirements
              :password="passwordState.newPassword"
              :confirm-password="passwordState.confirmPassword"
              show-match
            />

            <div class="flex justify-end">
              <UButton
                type="submit"
                color="warning"
                variant="soft"
                icon="i-lucide-key-round"
                class="w-full sm:w-auto"
              >
                Review Password Change
              </UButton>
            </div>
          </UForm>
        </UCard>

        <UCard>
          <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 class="font-black text-highlighted">
                End this session
              </h2>

              <p class="mt-1 text-sm text-muted">
                Sign out safely when you finish using a shared or public computer.
              </p>
            </div>

            <UButton
              color="error"
              variant="soft"
              icon="i-lucide-log-out"
              class="w-full sm:w-auto"
              @click="
                signOutModalOpen = true
              "
            >
              Sign Out
            </UButton>
          </div>
        </UCard>
      </div>
    </div>

    <ConfirmationModal
      v-model:open="profileModalOpen"
      title="Save profile changes?"
      description="Your updated name and profile image will be displayed across SNCBT Assess."
      confirm-label="Save Changes"
      confirm-color="primary"
      icon="i-lucide-user-round-check"
      :loading="isSavingProfile"
      :dismissible="
        !isSavingProfile
      "
      @confirm="confirmProfileSave"
    />

    <ConfirmationModal
      v-model:open="passwordModalOpen"
      title="Change your account password?"
      description="The new password will be required the next time you sign in."
      confirm-label="Change Password"
      confirm-color="warning"
      icon="i-lucide-key-round"
      :loading="isChangingPassword"
      :dismissible="
        !isChangingPassword
      "
      @confirm="confirmPasswordChange"
    />

    <ConfirmationModal
      v-model:open="signOutModalOpen"
      title="Sign out of SNCBT Assess?"
      description="You will return to the sign-in page. Unsaved information on the current page may be lost."
      confirm-label="Continue to Sign Out"
      confirm-color="error"
      icon="i-lucide-log-out"
      @confirm="
        signOutFromProfile
      "
    />
  </div>
</template>
