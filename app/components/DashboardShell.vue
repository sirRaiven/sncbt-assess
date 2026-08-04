<script setup lang="ts">
import type {
  AppRole,
} from "~/types/ui";

import {
  getNavigation,
  getRoleLabel,
} from "~/utils/navigation";

const props = defineProps<{
  role: AppRole;
}>();

const route = useRoute();
const supabase = useSupabaseClient();

const mobileOpen = ref(false);
const isSigningOut = ref(false);
const signOutError = ref("");

const navigation = computed(
  () => getNavigation(props.role),
);

const roleLabel = computed(
  () => getRoleLabel(props.role),
);

const {
  profile,
  loadProfile,
  clearProfile,
} = useCurrentProfile();

await loadProfile();

const displayName = computed(() => {
  if (!profile.value) {
    return roleLabel.value;
  }

  const name = [
    profile.value.first_name,
    profile.value.middle_name,
    profile.value.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return name
    || profile.value.email
    || roleLabel.value;
});

const initials = computed(() => {
  const firstName =
    profile.value?.first_name?.trim()
    ?? "";

  const lastName =
    profile.value?.last_name?.trim()
    ?? "";

  const value =
    `${firstName.charAt(0)}${lastName.charAt(0)}`
      .toUpperCase();

  return value || "SA";
});

const accountDetail = computed(() => {
  if (props.role === "student") {
    return profile.value?.student_number
      || "Student";
  }

  if (props.role === "instructor") {
    return profile.value?.employee_number
      || "Instructor";
  }

  return "System Administrator";
});

function isActive(
  path: string,
): boolean {
  if (route.path === path) {
    return true;
  }

  const dashboardPath =
    `/${props.role}/dashboard`;

  return (
    path !== dashboardPath
    && route.path.startsWith(`${path}/`)
  );
}

async function signOut(): Promise<void> {
  isSigningOut.value = true;
  signOutError.value = "";

  try {
    const {
      error,
    } = await supabase.auth.signOut({
      scope: "local",
    });

    if (error) {
      throw error;
    }

    clearProfile();

    await navigateTo("/");
  } catch (error) {
    signOutError.value =
      error instanceof Error
        ? error.message
        : "Unable to sign out.";
  } finally {
    isSigningOut.value = false;
  }
}

watch(
  () => route.fullPath,
  () => {
    mobileOpen.value = false;
  },
);
</script>

<template>
  <div class="min-h-screen bg-muted/30">
    <button
      v-if="mobileOpen"
      type="button"
      class="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-sm lg:hidden"
      aria-label="Close navigation"
      @click="mobileOpen = false"
    />

    <aside
      class="fixed inset-y-0 left-0 z-50 flex w-68 flex-col border-r border-white/10 bg-slate-950 text-white shadow-xl transition-transform duration-200 lg:translate-x-0"
      :class="
        mobileOpen
          ? 'translate-x-0'
          : '-translate-x-full'
      "
    >
      <div class="border-b border-white/10 px-5 py-5">
        <BrandMark inverse />
      </div>

      <div class="px-4 pt-4">
        <div class="rounded-xl border border-white/10 bg-white/5 p-3">
          <div class="flex items-center gap-3">
            <UAvatar
              :text="initials"
              size="md"
            />

            <div class="min-w-0">
              <p class="truncate text-sm font-bold text-white">
                {{ displayName }}
              </p>

              <p class="truncate text-xs text-slate-400">
                {{ accountDetail }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <nav class="flex-1 overflow-y-auto px-4 py-5">
        <p class="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
          {{ roleLabel }}
        </p>

        <div class="space-y-1">
          <NuxtLink
            v-for="item in navigation"
            :key="item.to"
            :to="item.to"
            class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition"
            :class="
              isActive(item.to)
                ? 'bg-brand-600 text-white'
                : 'text-slate-300 hover:bg-white/8 hover:text-white'
            "
          >
            <UIcon
              :name="item.icon"
              class="size-5 shrink-0"
            />

            <span class="truncate">
              {{ item.label }}
            </span>
          </NuxtLink>
        </div>
      </nav>

      <div class="border-t border-white/10 p-4">
        <button
          type="button"
          class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/8 hover:text-white disabled:cursor-wait disabled:opacity-60"
          :disabled="isSigningOut"
          @click="signOut"
        >
          <UIcon
            :name="
              isSigningOut
                ? 'i-lucide-loader-circle'
                : 'i-lucide-log-out'
            "
            class="size-5"
            :class="{
              'animate-spin': isSigningOut,
            }"
          />

          {{
            isSigningOut
              ? "Signing out..."
              : "Sign out"
          }}
        </button>

        <p
          v-if="signOutError"
          class="mt-2 px-3 text-xs text-red-300"
        >
          {{ signOutError }}
        </p>
      </div>
    </aside>

    <div class="min-h-screen lg:pl-68">
      <header class="sticky top-0 z-30 border-b border-default bg-default/90 backdrop-blur-xl">
        <div class="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-menu"
            class="lg:hidden"
            aria-label="Open navigation"
            @click="mobileOpen = true"
          />

          <div class="hidden min-w-0 flex-1 md:block">
            <div class="relative max-w-lg">
              <UIcon
                name="i-lucide-search"
                class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
              />

              <input
                class="h-10 w-full rounded-lg border border-default bg-elevated/60 pl-10 pr-4 text-sm outline-none transition placeholder:text-dimmed focus:border-primary focus:ring-3 focus:ring-primary/10"
                placeholder="Search classes, assessments, or students"
              >
            </div>
          </div>

          <div class="ml-auto flex items-center gap-2">
            <UColorModeButton />

            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-bell"
              aria-label="Notifications"
            />

            <UAvatar
              :text="initials"
              size="sm"
            />
          </div>
        </div>
      </header>

      <main class="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <slot />
      </main>
    </div>
  </div>
</template>
