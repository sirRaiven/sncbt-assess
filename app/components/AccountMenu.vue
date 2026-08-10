<script setup lang="ts">
import type {
  DropdownMenuItem,
} from "@nuxt/ui";

import {
  APP_DESCRIPTION,
  APP_NAME,
  APP_RELEASE_DATE,
  APP_RELEASE_NAME,
  APP_VERSION,
  APP_VERSION_LABEL,
} from "~/utils/app-version";

const props = withDefaults(
  defineProps<{
    displayName: string;
    accountDetail: string;
    initials: string;
    avatarUrl?: string | null;
    profilePath: string;
    placement?:
      | "sidebar"
      | "header"
      | "compact";
    inverse?: boolean;
  }>(),
  {
    avatarUrl:
      null,
    placement:
      "header",
    inverse:
      false,
  },
);

const supabase =
  useSupabaseClient();

const {
  clearProfile,
} = useCurrentProfile();

const aboutOpen =
  ref(false);

const signOutOpen =
  ref(false);

const isSigningOut =
  ref(false);

const signOutError =
  ref("");

const copyrightYear =
  new Date().getFullYear();

const dropdownContent =
  computed(
    () => {
      if (
        props.placement
        === "sidebar"
      ) {
        return {
          align:
            "start",
          side:
            "top",
          sideOffset:
            8,
        } as const;
      }

      if (
        props.placement
        === "compact"
      ) {
        return {
          align:
            "start",
          side:
            "right",
          sideOffset:
            8,
        } as const;
      }

      return {
        align:
          "end",
        side:
          "bottom",
        sideOffset:
          8,
      } as const;
    },
  );

const menuItems =
  computed<
    DropdownMenuItem[][]
  >(
    () => [
      [
        {
          label:
            "My Profile",
          icon:
            "i-lucide-user-round",
          to:
            props.profilePath,
        },
        {
          label:
            `About App · ${APP_VERSION_LABEL}`,
          icon:
            "i-lucide-info",
          onSelect: () => {
            aboutOpen.value =
              true;
          },
        },
      ],
      [
        {
          label:
            "Sign out",
          icon:
            "i-lucide-log-out",
          color:
            "error",
          onSelect: () => {
            signOutError.value =
              "";

            signOutOpen.value =
              true;
          },
        },
      ],
    ],
  );

const sidebarTriggerClass =
  computed(
    () => [
      "flex min-h-14 w-full items-center gap-3 rounded-xl border p-3 text-left transition",
      "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/30",
      props.inverse
        ? "border-white/10 bg-white/5 text-white hover:bg-white/8"
        : "border-default bg-default text-highlighted hover:bg-elevated",
    ],
  );

const compactTriggerClass =
  computed(
    () => [
      "flex size-11 items-center justify-center rounded-xl transition",
      "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/30",
      props.inverse
        ? "text-white hover:bg-white/8"
        : "text-highlighted hover:bg-elevated",
    ],
  );

async function signOut():
  Promise<void> {
  isSigningOut.value =
    true;

  signOutError.value =
    "";

  try {
    const {
      error,
    } = await supabase.auth.signOut({
      scope:
        "local",
    });

    if (error) {
      throw error;
    }

    clearProfile();

    signOutOpen.value =
      false;

    await navigateTo("/");
  } catch {
    signOutError.value =
      "Your account could not be signed out. Check your connection and try again.";
  } finally {
    isSigningOut.value =
      false;
  }
}
</script>

<template>
  <div>
    <UDropdownMenu
      :items="menuItems"
      :content="dropdownContent"
      :ui="{
        content:
          'w-64 sm:w-72',
        item:
          'min-h-11',
        itemLabel:
          'font-semibold',
        itemLeadingIcon:
          'size-4.5',
      }"
    >
      <button
        v-if="placement === 'sidebar'"
        type="button"
        :class="sidebarTriggerClass"
        aria-label="Open account menu"
      >
        <UAvatar
          :src="avatarUrl || undefined"
          :text="initials"
          size="md"
        />

        <span class="min-w-0 flex-1">
          <span class="block truncate text-sm font-bold">
            {{ displayName }}
          </span>

          <span
            class="block truncate text-xs"
            :class="
              inverse
                ? 'text-slate-400'
                : 'text-muted'
            "
          >
            {{ accountDetail }}
          </span>
        </span>

        <UIcon
          name="i-lucide-chevrons-up-down"
          class="size-4 shrink-0"
          :class="
            inverse
              ? 'text-slate-500'
              : 'text-muted'
          "
        />
      </button>

      <button
        v-else-if="placement === 'compact'"
        type="button"
        :class="compactTriggerClass"
        aria-label="Open account menu"
      >
        <UAvatar
          :src="avatarUrl || undefined"
          :text="initials"
          size="xs"
        />
      </button>

      <UButton
        v-else
        type="button"
        color="neutral"
        variant="ghost"
        size="lg"
        square
        class="rounded-full"
        :aria-label="`Open account menu for ${displayName}`"
      >
        <UAvatar
          :src="avatarUrl || undefined"
          :text="initials"
          size="xs"
        />
      </UButton>
    </UDropdownMenu>

    <UModal
      v-model:open="aboutOpen"
      :ui="{
        content:
          'w-[calc(100%-1rem)] sm:max-w-md',
      }"
    >
      <template #content>
        <div class="bg-default p-5 sm:p-6">
          <div class="flex items-start justify-between gap-4">
            <div class="flex min-w-0 items-center gap-4">
              <InstitutionLogo
                size="md"
                eager
              />

              <div class="min-w-0">
                <p class="text-xs font-bold uppercase tracking-[0.16em] text-primary">
                  About the application
                </p>

                <h2 class="mt-1 truncate text-xl font-black text-highlighted">
                  {{ APP_NAME }}
                </h2>

                <p class="mt-1 text-sm text-muted">
                  {{ APP_DESCRIPTION }}
                </p>
              </div>
            </div>

            <UButton
              color="neutral"
              variant="ghost"
              square
              icon="i-lucide-x"
              aria-label="Close application information"
              @click="aboutOpen = false"
            />
          </div>

          <div class="mt-6 grid gap-3 sm:grid-cols-2">
            <div class="rounded-xl border border-default bg-elevated/60 p-4">
              <p class="text-xs font-semibold text-muted">
                Version
              </p>

              <p class="mt-1 font-black text-highlighted">
                {{ APP_VERSION_LABEL }}
              </p>
            </div>

            <div class="rounded-xl border border-default bg-elevated/60 p-4">
              <p class="text-xs font-semibold text-muted">
                Release
              </p>

              <p class="mt-1 font-black text-highlighted">
                {{ APP_RELEASE_NAME }}
              </p>
            </div>
          </div>

          <div class="mt-4 rounded-xl border border-default p-4">
            <div class="flex items-start gap-3">
              <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <UIcon
                  name="i-lucide-school"
                  class="size-4.5"
                />
              </div>

              <div>
                <p class="font-bold text-highlighted">
                  Built for the SNCBT community
                </p>

                <p class="mt-1 text-sm leading-6 text-muted">
                  A classroom assessment platform for instructors and students of St. Nicolas College of Business and Technology.
                </p>
              </div>
            </div>
          </div>

          <dl class="mt-5 space-y-3 text-sm">
            <div class="flex items-center justify-between gap-4">
              <dt class="text-muted">
                Release date
              </dt>

              <dd class="text-right font-semibold text-highlighted">
                {{ APP_RELEASE_DATE }}
              </dd>
            </div>

            <div class="flex items-center justify-between gap-4">
              <dt class="text-muted">
                Version number
              </dt>

              <dd class="font-mono font-semibold text-highlighted">
                {{ APP_VERSION }}
              </dd>
            </div>
          </dl>

          <div class="mt-6 border-t border-default pt-4 text-center">
            <p class="text-xs text-muted">
              © {{ copyrightYear }} St. Nicolas College of Business and Technology
            </p>
          </div>
        </div>
      </template>
    </UModal>

    <ConfirmationModal
      v-model:open="signOutOpen"
      title="Sign out of SNCBT Assess?"
      description="You will return to the sign-in page. Unsaved information on the current page may be lost."
      confirm-label="Yes, Sign Out"
      confirm-color="error"
      icon="i-lucide-log-out"
      :loading="isSigningOut"
      :dismissible="!isSigningOut"
      @confirm="signOut"
    >
      <p
        v-if="signOutError"
        class="mt-4 rounded-xl border border-error/30 bg-error/10 p-3 text-sm leading-6 text-error"
        role="alert"
      >
        {{ signOutError }}
      </p>
    </ConfirmationModal>
  </div>
</template>
