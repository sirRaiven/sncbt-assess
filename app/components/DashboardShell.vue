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

const desktopSidebarOpen =
  useCookie<boolean>(
    "sncbt-assess-sidebar-open",
    {
      default:
        () => true,
      sameSite:
        "lax",
    },
  );

const mobileSidebarOpen =
  ref(false);

const isMobile =
  ref(false);

const sidebarOpen =
  computed({
    get: () =>
      isMobile.value
        ? mobileSidebarOpen.value
        : desktopSidebarOpen.value,

    set: (value: boolean) => {
      if (isMobile.value) {
        mobileSidebarOpen.value =
          value;

        return;
      }

      desktopSidebarOpen.value =
        value;
    },
  });

const sidebarToggleLabel =
  computed(
    () => {
      if (isMobile.value) {
        return mobileSidebarOpen.value
          ? "Close side navigation"
          : "Open side navigation";
      }

      return desktopSidebarOpen.value
        ? "Collapse side navigation"
        : "Expand side navigation";
    },
  );

let mobileMediaQuery:
  | MediaQueryList
  | null =
    null;

function updateViewportMode(
  event?: MediaQueryListEvent,
): void {
  isMobile.value =
    event?.matches
    ?? mobileMediaQuery?.matches
    ?? false;

  if (isMobile.value) {
    mobileSidebarOpen.value =
      false;
  }
}

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
        props.role
        === "student"
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
    route.path
    === path
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

const currentNavigationItem =
  computed(
    () =>
      [...navigation.value]
        .sort(
          (
            first,
            second,
          ) =>
            second.to.length
            - first.to.length,
        )
        .find(
          (item) =>
            isActive(
              item.to,
            ),
        ),
  );

const isProfilePage =
  computed(
    () =>
      route.path
      === profilePath.value,
  );

const currentPageLabel =
  computed(
    () => {
      if (isProfilePage.value) {
        return "My Profile";
      }

      return (
        currentNavigationItem.value
          ?.label
        || roleLabel.value
      );
    },
  );

const currentPageIcon =
  computed(
    () => {
      if (isProfilePage.value) {
        return "i-lucide-user-round";
      }

      return (
        currentNavigationItem.value
          ?.icon
        || "i-lucide-layout-dashboard"
      );
    },
  );

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
    if (isMobile.value) {
      mobileSidebarOpen.value =
        false;
    }
  },
);

onMounted(
  () => {
    mobileMediaQuery =
      window.matchMedia(
        "(max-width: 1023px)",
      );

    updateViewportMode();

    mobileMediaQuery.addEventListener(
      "change",
      updateViewportMode,
    );
  },
);

onBeforeUnmount(
  () => {
    mobileMediaQuery?.removeEventListener(
      "change",
      updateViewportMode,
    );
  },
);
</script>

<template>
  <div class="min-h-screen bg-muted/30 lg:flex">
    <USidebar
      id="portal-side-navigation"
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
          `${roleLabel} navigation`,
        side:
          'left',
        overlay:
          true,
        dismissible:
          true,
        modal:
          true,
        ui: {
          overlay:
            'bg-slate-950/55 backdrop-blur-[1px]',
          content:
            'left-0 inset-y-0 w-[84vw] max-w-[20rem] border-r border-white/10 bg-slate-950 shadow-2xl',
        },
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
          'border-t border-white/10 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]',
        rail:
          'after:bg-white/15 hover:after:bg-primary',
      }"
    >
      <template #header="{ state }">
        <div class="flex min-w-0 flex-1 items-center gap-2">
          <div class="min-w-0 flex-1">
            <BrandMark
              inverse
              :compact="
                state
                === 'collapsed'
              "
            />
          </div>

          <UButton
            v-if="
              isMobile
              && state
                === 'expanded'
            "
            type="button"
            color="neutral"
            variant="ghost"
            icon="i-lucide-x"
            size="lg"
            square
            class="shrink-0 text-slate-300 hover:bg-white/10 hover:text-white"
            aria-label="Close side navigation and return to the current page"
            @click="
              mobileSidebarOpen =
                false
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
              'min-h-11 text-slate-300 hover:bg-white/8 hover:text-white data-[active]:bg-primary/12 data-[active]:rounded-lg data-[active]:text-white',
            linkLabel:
              'font-semibold',
            linkLeadingIcon:
              'size-5',
          }"
        />
      </template>

      <template #footer="{ state }">
        <AccountMenu
          :display-name="displayName"
          :account-detail="accountDetail"
          :initials="initials"
          :avatar-url="profile?.avatar_url"
          :profile-path="profilePath"
          :placement="
            state
            === 'expanded'
              ? 'sidebar'
              : 'compact'
          "
          inverse
        />
      </template>
    </USidebar>

    <div class="min-w-0 flex-1">
      <header class="safe-area-top sticky top-0 z-30 border-b border-default bg-default/90 backdrop-blur-xl">
        <div class="flex min-h-16 items-center gap-3 px-3 sm:px-5 lg:px-8">
          <UButton
            type="button"
            color="neutral"
            variant="ghost"
            :icon="
              isMobile
                ? 'i-lucide-menu'
                : 'i-lucide-panel-left'
            "
            size="lg"
            square
            :aria-label="sidebarToggleLabel"
            :aria-expanded="sidebarOpen"
            aria-controls="portal-side-navigation"
            @click="
              sidebarOpen =
                !sidebarOpen
            "
          />

          <div class="flex min-w-0 flex-1 items-center gap-3">
            <div class="hidden size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:flex">
              <UIcon
                :name="currentPageIcon"
                class="size-4.5"
              />
            </div>

            <div class="min-w-0">
              <p class="truncate text-sm font-black text-highlighted sm:text-base">
                {{ currentPageLabel }}
              </p>

              <p class="hidden truncate text-xs text-muted sm:block">
                {{ roleLabel }} portal
              </p>
            </div>
          </div>

          <div class="ml-auto flex items-center gap-1 sm:gap-2">
            <UColorModeButton
              size="lg"
              variant="ghost"
            />

            <AccountMenu
              :display-name="displayName"
              :account-detail="accountDetail"
              :initials="initials"
              :avatar-url="profile?.avatar_url"
              :profile-path="profilePath"
              placement="header"
            />
          </div>
        </div>
      </header>

      <main class="safe-area-bottom mx-auto w-full max-w-[1600px] px-3 py-4 sm:px-5 sm:py-6 lg:px-8 lg:py-8">
        <slot />
      </main>
    </div>
  </div>
</template>
