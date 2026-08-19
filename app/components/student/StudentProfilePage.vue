<script setup lang="ts">
import type { FormSubmitEvent } from "@nuxt/ui";

import { z } from "zod";

import { toUserFacingError } from "~/utils/user-facing-error";

const toast = useToast();
const supabase = useSupabaseClient();

const { profile, isLoadingProfile, profileError, loadProfile, setProfile } =
  useCurrentProfile();

const { updateProfile } = useAccountProfile();

const personalSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "First name is required.")
    .max(80, "First name is too long."),

  middleName: z.string().trim().max(80, "Middle name is too long."),

  lastName: z
    .string()
    .trim()
    .min(1, "Last name is required.")
    .max(80, "Last name is too long."),

  avatarUrl: z
    .string()
    .trim()
    .max(500, "Profile photo link is too long.")
    .refine(
      (value) => !value || /^https?:\/\//i.test(value),
      "Use an HTTP or HTTPS image link.",
    ),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),

    newPassword: z
      .string()
      .min(8, "Use at least eight characters.")
      .regex(/[A-Z]/, "Include an uppercase letter.")
      .regex(/[a-z]/, "Include a lowercase letter.")
      .regex(/\d/, "Include a number."),

    confirmPassword: z.string(),
  })
  .superRefine((value, context) => {
    if (value.newPassword !== value.confirmPassword) {
      context.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "The passwords do not match.",
      });
    }

    if (value.currentPassword === value.newPassword) {
      context.addIssue({
        code: "custom",
        path: ["newPassword"],
        message: "Use a password different from your current password.",
      });
    }
  });

type PersonalForm = z.output<typeof personalSchema>;
type PasswordForm = z.output<typeof passwordSchema>;

const personalState = reactive<PersonalForm>({
  firstName: "",
  middleName: "",
  lastName: "",
  avatarUrl: "",
});

const passwordState = reactive<PasswordForm>({
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
});

const pendingPasswordChange = ref<PasswordForm | null>(null);
const passwordModalOpen = ref(false);
const signOutModalOpen = ref(false);
const isSavingProfile = ref(false);
const isChangingPassword = ref(false);

await loadProfile();

watch(
  profile,
  (value) => {
    if (!value) {
      return;
    }

    personalState.firstName = value.first_name || "";
    personalState.middleName = value.middle_name || "";
    personalState.lastName = value.last_name || "";
    personalState.avatarUrl = value.avatar_url || "";
  },
  {
    immediate: true,
  },
);

const displayName = computed(
  () =>
    [personalState.firstName, personalState.middleName, personalState.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() || "Student",
);

const initials = computed(() => {
  const first = personalState.firstName.trim().charAt(0);
  const last = personalState.lastName.trim().charAt(0);

  return `${first}${last}`.toUpperCase() || "ST";
});

const studentNumber = computed(
  () => profile.value?.student_number || "Not assigned",
);

async function saveProfile(
  event: FormSubmitEvent<PersonalForm>,
): Promise<void> {
  isSavingProfile.value = true;

  try {
    const result = await updateProfile({
      firstName: event.data.firstName.trim(),
      middleName: event.data.middleName.trim() || null,
      lastName: event.data.lastName.trim(),
      avatarUrl: event.data.avatarUrl.trim() || null,
    });

    if (result.error || !result.data) {
      throw new Error(result.error || "The profile update failed.");
    }

    setProfile(result.data.profile);

    toast.add({
      title: "Profile updated",
      description: "Your profile changes have been saved.",
      color: "success",
    });
  } catch (error) {
    toast.add({
      title: "Profile could not be updated",
      description: toUserFacingError(
        error,
        "We couldn't save your profile right now. Please try again.",
      ),
      color: "error",
    });
  } finally {
    isSavingProfile.value = false;
  }
}

function requestPasswordChange(event: FormSubmitEvent<PasswordForm>): void {
  pendingPasswordChange.value = {
    ...event.data,
  };

  passwordModalOpen.value = true;
}

async function confirmPasswordChange(): Promise<void> {
  if (!pendingPasswordChange.value || !profile.value?.email) {
    return;
  }

  isChangingPassword.value = true;

  try {
    const { error: reauthenticationError } =
      await supabase.auth.signInWithPassword({
        email: profile.value.email,
        password: pendingPasswordChange.value.currentPassword,
      });

    if (reauthenticationError) {
      throw new Error("The current password is incorrect.");
    }

    const { error: passwordError } = await supabase.auth.updateUser({
      password: pendingPasswordChange.value.newPassword,
    });

    if (passwordError) {
      throw passwordError;
    }

    passwordState.currentPassword = "";
    passwordState.newPassword = "";
    passwordState.confirmPassword = "";

    pendingPasswordChange.value = null;
    passwordModalOpen.value = false;

    toast.add({
      title: "Password updated",
      description: "Use your new password the next time you sign in.",
      color: "success",
    });
  } catch (error) {
    toast.add({
      title: "Password could not be updated",
      description: toUserFacingError(
        error,
        "We couldn't update your password right now. Please try again.",
      ),
      color: "error",
    });
  } finally {
    isChangingPassword.value = false;
  }
}

async function signOutFromProfile(): Promise<void> {
  const { error } = await supabase.auth.signOut({
    scope: "local",
  });

  if (error) {
    toast.add({
      title: "Unable to sign out",
      description: toUserFacingError(
        error,
        "We couldn't sign you out right now. Check your connection and try again.",
      ),
      color: "error",
    });

    return;
  }

  const { clearProfile } = useCurrentProfile();

  clearProfile();
  signOutModalOpen.value = false;

  await navigateTo("/");
}
</script>

<template>
  <div class="mx-auto w-full max-w-6xl space-y-5 sm:space-y-6">
    <PageHeader
      eyebrow="Account"
      title="Profile"
      description="Manage the name shown in your Student Portal and keep your account secure."
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
      class="space-y-5"
      aria-label="Loading profile"
      aria-busy="true"
    >
      <USkeleton class="h-56 rounded-2xl" />

      <div class="grid gap-5 xl:grid-cols-2">
        <USkeleton class="h-[28rem] rounded-2xl" />
        <USkeleton class="h-[28rem] rounded-2xl" />
      </div>
    </div>

    <template v-else-if="profile">
      <section aria-labelledby="student-profile-summary-title">
        <UCard class="overflow-hidden border-default/80">
          <div
            class="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div class="flex min-w-0 items-center gap-4 sm:gap-5">
              <UAvatar
                :src="personalState.avatarUrl || undefined"
                :text="initials"
                :alt="displayName"
                size="3xl"
                class="size-24 shrink-0 ring-4 ring-primary/10"
              />

              <div class="min-w-0">
                <p
                  class="text-xs font-bold uppercase tracking-[0.16em] text-primary"
                >
                  Student account
                </p>

                <h2
                  id="student-profile-summary-title"
                  class="mt-1 truncate text-xl font-black text-highlighted sm:text-2xl"
                >
                  {{ displayName }}
                </h2>

                <p class="mt-1 flex items-center gap-1.5 text-sm text-muted">
                  <UIcon
                    name="i-lucide-id-card"
                    class="size-4 shrink-0"
                    aria-hidden="true"
                  />
                  <span>{{ studentNumber }}</span>
                </p>
              </div>
            </div>

            <StatusPill
              :status="profile.account_status"
              class="self-start sm:self-center"
            />
          </div>

          <dl
            class="mt-6 grid gap-3 border-t border-default pt-5 sm:grid-cols-2"
          >
            <div class="rounded-xl bg-elevated/60 p-4">
              <dt
                class="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-muted"
              >
                <UIcon name="i-lucide-mail" class="size-4" aria-hidden="true" />
                Email
              </dt>

              <dd
                class="mt-1.5 break-all text-sm font-semibold text-highlighted"
              >
                {{ profile.email || "Not recorded" }}
              </dd>
            </div>

            <div class="rounded-xl bg-elevated/60 p-4">
              <dt
                class="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-muted"
              >
                <UIcon
                  name="i-lucide-lock-keyhole"
                  class="size-4"
                  aria-hidden="true"
                />
                Managed by school
              </dt>

              <dd class="mt-1.5 text-sm leading-5 text-muted">
                Your email, Student number, and account status are protected
                account details.
              </dd>
            </div>
          </dl>
        </UCard>
      </section>

      <div class="grid items-start gap-5 xl:grid-cols-2">
        <section aria-labelledby="student-profile-details-title">
          <UCard class="h-full border-default/80">
            <template #header>
              <div class="flex items-start gap-3">
                <div
                  class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
                >
                  <UIcon
                    name="i-lucide-user-round"
                    class="size-5"
                    aria-hidden="true"
                  />
                </div>

                <div>
                  <h2
                    id="student-profile-details-title"
                    class="font-black text-highlighted"
                  >
                    Profile details
                  </h2>

                  <p class="mt-1 text-sm leading-5 text-muted">
                    Update the name other people see in SNCBT-AMS.
                  </p>
                </div>
              </div>
            </template>

            <UForm
              :schema="personalSchema"
              :state="personalState"
              class="space-y-5"
              @submit="saveProfile"
            >
              <div class="grid gap-4 sm:grid-cols-2">
                <UFormField label="First name" name="firstName" required>
                  <UInput
                    v-model="personalState.firstName"
                    class="w-full"
                    size="lg"
                    autocomplete="given-name"
                  />
                </UFormField>

                <UFormField label="Last name" name="lastName" required>
                  <UInput
                    v-model="personalState.lastName"
                    class="w-full"
                    size="lg"
                    autocomplete="family-name"
                  />
                </UFormField>
              </div>

              <UFormField
                label="Middle name"
                name="middleName"
                description="Optional"
              >
                <UInput
                  v-model="personalState.middleName"
                  class="w-full"
                  size="lg"
                  autocomplete="additional-name"
                />
              </UFormField>

              <details
                :open="Boolean(personalState.avatarUrl)"
                class="group rounded-xl border border-default bg-elevated/30"
              >
                <summary
                  class="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm font-bold text-highlighted outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <span class="flex items-center gap-2">
                    <UIcon
                      name="i-lucide-image"
                      class="size-4.5 text-primary"
                      aria-hidden="true"
                    />
                    Profile photo
                    <span class="font-medium text-muted"> (optional) </span>
                  </span>

                  <UIcon
                    name="i-lucide-chevron-down"
                    class="size-4 text-muted transition-transform group-open:rotate-180 motion-reduce:transition-none"
                    aria-hidden="true"
                  />
                </summary>

                <div class="border-t border-default px-4 pb-4 pt-4">
                  <UFormField
                    label="Photo link"
                    name="avatarUrl"
                    description="Paste a direct web link to an image. Leave this blank to use your initials."
                  >
                    <UInput
                      v-model="personalState.avatarUrl"
                      class="w-full"
                      size="lg"
                      icon="i-lucide-link"
                      placeholder="https://example.com/photo.jpg"
                      autocomplete="url"
                    />
                  </UFormField>
                </div>
              </details>

              <div class="flex justify-end border-t border-default pt-5">
                <UButton
                  type="submit"
                  icon="i-lucide-check"
                  size="lg"
                  :loading="isSavingProfile"
                  class="w-full sm:w-auto"
                >
                  Save Changes
                </UButton>
              </div>
            </UForm>
          </UCard>
        </section>

        <section aria-labelledby="student-password-title">
          <UCard class="h-full border-default/80">
            <template #header>
              <div class="flex items-start gap-3">
                <div
                  class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-warning/10 text-warning"
                >
                  <UIcon
                    name="i-lucide-shield-check"
                    class="size-5"
                    aria-hidden="true"
                  />
                </div>

                <div>
                  <h2
                    id="student-password-title"
                    class="font-black text-highlighted"
                  >
                    Password
                  </h2>

                  <p class="mt-1 text-sm leading-5 text-muted">
                    Confirm your current password before choosing a new one.
                  </p>
                </div>
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

              <UFormField label="New password" name="newPassword" required>
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

              <div
                v-if="
                  passwordState.newPassword || passwordState.confirmPassword
                "
                aria-live="polite"
              >
                <PasswordRequirements
                  :password="passwordState.newPassword"
                  :confirm-password="passwordState.confirmPassword"
                  show-match
                />
              </div>

              <div class="flex justify-end border-t border-default pt-5">
                <UButton
                  type="submit"
                  color="warning"
                  variant="soft"
                  icon="i-lucide-key-round"
                  size="lg"
                  class="w-full sm:w-auto"
                >
                  Change Password
                </UButton>
              </div>
            </UForm>
          </UCard>
        </section>
      </div>

      <section
        aria-labelledby="student-sign-out-title"
        class="rounded-2xl border border-error/20 bg-error/5 p-4 sm:p-5"
      >
        <div
          class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="flex items-start gap-3">
            <div
              class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-error/10 text-error"
            >
              <UIcon
                name="i-lucide-log-out"
                class="size-5"
                aria-hidden="true"
              />
            </div>

            <div>
              <h2
                id="student-sign-out-title"
                class="font-black text-highlighted"
              >
                Sign out
              </h2>

              <p class="mt-1 text-sm leading-5 text-muted">
                Sign out when you finish using a shared device.
              </p>
            </div>
          </div>

          <UButton
            color="error"
            variant="soft"
            icon="i-lucide-log-out"
            size="lg"
            class="w-full sm:w-auto"
            @click="signOutModalOpen = true"
          >
            Sign Out
          </UButton>
        </div>
      </section>
    </template>

    <ConfirmationModal
      v-model:open="passwordModalOpen"
      title="Change your password?"
      description="Your new password will be used the next time you sign in."
      confirm-label="Change Password"
      confirm-color="warning"
      icon="i-lucide-key-round"
      :loading="isChangingPassword"
      :dismissible="!isChangingPassword"
      @confirm="confirmPasswordChange"
    />

    <ConfirmationModal
      v-model:open="signOutModalOpen"
      title="Sign out of SNCBT-AMS?"
      description="You will return to the sign-in page."
      confirm-label="Sign Out"
      confirm-color="error"
      icon="i-lucide-log-out"
      @confirm="signOutFromProfile"
    />
  </div>
</template>
