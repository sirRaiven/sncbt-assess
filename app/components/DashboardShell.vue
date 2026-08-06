<script setup lang="ts">
import type {
  NavigationMenuItem,
} from "@nuxt/ui";

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

const route =
  useRoute();

const sidebarOpen =
  useCookie<boolean>(
    "sncbt-assess-sidebar-open",
    {
      default:
        () => true,
      sameSite:
        "lax",
    },
  );

const navigation =
  computed(
    () =>
      getNavigation(
        props.role,
      ),
  );

const roleLabel =
  computed(
    () =>
      getRoleLabel(
        props.role,
      ),
  );

const profilePath =
  computed(
    () =>
      `/${props.role}/profile`,
  );

const {
  profile,
  loadProfile,
} = useCurrentProfile();

await loadProfile();

const displayName =
  computed(
    () => {
      if (!profile.value) {
        return roleLabel.value;
      }

      const name =
        [
          profile.value.first_name,
          profile.value.middle_name,
          profile.value.last_name,
        ]
          .filter(Boolean)
          .join(" ")
          .trim();

      return (
        name
        || profile.value.email
        || roleLabel.value
      );
    },
  );

const initials =
  computed(
    () => {
      const firstName =
        profile.value?.first_name
          ?.trim()
        ?? "";

      const lastName =
        profile.value?.last_name
          ?.trim()
        ?? "";

      return (
        `${firstName.charAt(0)}${lastName.charAt(0)}`
          .toUpperCase()
        || "SA"
      );
    },
  );

const accountDetail =
  computed(
    () => {
      if (
        props.role === "student"
      ) {
        return (
          profile.value
            ?.student_number
          || "Student account"
        );
      }

      if (
        props.role
        === "instructor"
      ) {
        return (
          profile.value
            ?.employee_number
          || "Instructor account"
        );
      }

      return "System administrator";
    },
  );

function isActive(
  path: string,
): boolean {
  if (
    route.path === path
  ) {
    return true;
  }

  const dashboardPath =
    `/${props.role}/dashboard`;

  return (
    path !== dashboardPath
    && route.path.startsWith(
      `${path}/`,
    )
  );
}

const navigationItems =
  computed<
    NavigationMenuItem[]
  >(
    () =>
      navigation.value.map(
        (item) => ({
          label:
            item.label,
          icon:
            item.icon,
          to:
            item.to,
          active:
            isActive(
              item.to,
            ),
        }),
      ),
  );

watch(
  () => route.fullPath,
  () => {
    if (
      import.meta.client
      && window.matchMedia(
        "(max-width: 1023px)",
      ).matches
    ) {
      sidebarOpen.value =
        false;
    }
  },
);
</script>

<template>
  <div class="flex min-h-screen bg-muted/30">
    <USidebar
      v-model:open="sidebarOpen"
      variant="sidebar"
      collapsible="icon"
      mode="slideover"
      rail
      close
      title="SNCBT Assess"
      :description="roleLabel"
      class="border-r border-white/10 bg-slate-950 text-white"
      :menu="{
        title:
          'SNCBT Assess',
        description:
          roleLabel,
      }"
      :ui="{
        container:
          'border-r border-white/10 bg-slate-950 text-white shadow-xl',
        inner:
          'bg-slate-950 text-white',
        header:
          'min-h-18 border-b border-white/10 px-3 py-3',
        body:
          'px-3 py-4',
        footer:
          'border-t border-white/10 px-3 py-3',
        rail:
          'after:bg-white/15 hover:after:bg-primary',
      }"
    >
      <template #header="{ state }">
        <div class="flex min-w-0 flex-1 items-center">
          <BrandMark
            inverse
            :compact="
              state
              === 'collapsed'
            "
          />
        </div>
      </template>

      <template #default="{ state }">
        <div
          v-if="
            state
            === 'expanded'
          "
          class="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500"
        >
          {{ roleLabel }}
        </div>

        <UNavigationMenu
          orientation="vertical"
          :items="navigationItems"
          :collapsed="
            state
            === 'collapsed'
          "
          tooltip
          highlight
          class="w-full"
          :ui="{
            link:
              'min-h-10 text-slate-300 hover:bg-white/8 hover:text-white data-[active]:bg-primary/12 data-[active]:rounded-lg data-[active]:text-white',
            linkLabel:
              'font-semibold',
            linkLeadingIcon:
              'size-5',
          }"
        />
      </template>

      <template #footer="{ state }">
        <div
          v-if="
            state
            === 'expanded'
          "
          class="space-y-3"
        >
          <NuxtLink
            :to="profilePath"
            class="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 transition hover:bg-white/8"
          >
            <UAvatar
              :src="
                profile?.avatar_url
                || undefined
              "
              :text="initials"
              size="md"
            />

            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-bold text-white">
                {{ displayName }}
              </p>

              <p class="truncate text-xs text-slate-400">
                {{ accountDetail }}
              </p>
            </div>

            <UIcon
              name="i-lucide-chevron-right"
              class="size-4 text-slate-500"
            />
          </NuxtLink>

          <SignOutButton
            block
            variant="ghost"
          />
        </div>

        <div
          v-else
          class="flex flex-col items-center gap-3"
        >
          <UTooltip text="Open my profile">
            <UButton
              :to="profilePath"
              color="neutral"
              variant="ghost"
              square
              aria-label="Open my profile"
            >
              <UAvatar
                :src="
                  profile?.avatar_url
                  || undefined
                "
                :text="initials"
                size="xs"
              />
            </UButton>
          </UTooltip>

          <SignOutButton
            compact
            variant="ghost"
          />
        </div>
      </template>
    </USidebar>

    <div class="min-w-0 flex-1">
      <header class="sticky top-0 z-30 border-b border-default bg-default/90 backdrop-blur-xl">
        <div class="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-panel-left"
            aria-label="Toggle side navigation"
            @click="
              sidebarOpen =
                !sidebarOpen
            "
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

            <UTooltip text="Open my profile">
              <UButton
                :to="profilePath"
                color="neutral"
                variant="ghost"
                square
                aria-label="Open my profile"
              >
                <UAvatar
                  :src="
                    profile?.avatar_url
                    || undefined
                  "
                  :text="initials"
                  size="xs"
                />
              </UButton>
            </UTooltip>
          </div>
        </div>
      </header>

      <main class="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <slot />
      </main>
    </div>
  </div>
</template>
