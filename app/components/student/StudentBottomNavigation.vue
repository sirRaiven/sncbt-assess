<script setup lang="ts">
import type {
  NavigationItem,
} from "~/types/ui";

import {
  getNavigation,
} from "~/utils/navigation";

const route =
  useRoute();

interface StudentBottomNavigationItem
  extends NavigationItem {
  shortLabel: string;
}

const primaryItems =
  computed<
    StudentBottomNavigationItem[]
  >(
    () => {
      const labelMap:
        Record<
          string,
          string
        > = {
          Overview:
            "Home",
          "My Classes":
            "Classes",
          Assessments:
            "Assess",
          "My Results":
            "Results",
        };

      return getNavigation(
        "student",
      ).map(
        (item) => ({
          ...item,
          shortLabel:
            labelMap[
              item.label
            ]
            ?? item.label,
        }),
      );
    },
  );

const items =
  computed<
    StudentBottomNavigationItem[]
  >(
    () => [
      ...primaryItems.value,
      {
        label:
          "My Profile",
        shortLabel:
          "Profile",
        icon:
          "i-lucide-user-round",
        to:
          "/student/profile",
      },
    ],
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

  return (
    path
      !== "/student/dashboard"
    && route.path.startsWith(
      `${path}/`,
    )
  );
}
</script>

<template>
  <div
    class="pointer-events-none fixed inset-x-0 bottom-0 z-50 lg:hidden"
  >
    <div
      class="mx-auto w-full max-w-xl px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2"
    >
      <nav
        aria-label="Student primary navigation"
        class="pointer-events-auto grid grid-cols-5 gap-1 rounded-[1.35rem] border border-default/80 bg-default/95 p-1.5 shadow-[0_18px_45px_rgba(15,23,42,0.18)] backdrop-blur-2xl supports-[backdrop-filter]:bg-default/85 dark:shadow-black/35"
      >
        <NuxtLink
          v-for="item in items"
          :key="item.to"
          :to="item.to"
          class="group relative flex min-h-[3.75rem] min-w-0 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 text-[10px] font-bold leading-none transition-[background-color,color,transform] duration-150 motion-reduce:transition-none active:scale-[0.98]"
          :class="
            isActive(
              item.to,
            )
              ? 'bg-primary/10 text-primary'
              : 'text-muted hover:bg-elevated hover:text-highlighted'
          "
          :aria-current="
            isActive(
              item.to,
            )
              ? 'page'
              : undefined
          "
          :aria-label="item.label"
        >
          <span
            class="relative flex h-8 min-w-10 items-center justify-center rounded-full px-2 transition-[background-color,color,box-shadow] duration-150 motion-reduce:transition-none"
            :class="
              isActive(
                item.to,
              )
                ? 'bg-primary text-white shadow-sm shadow-primary/20'
                : 'text-muted group-hover:bg-elevated group-hover:text-highlighted'
            "
          >
            <UIcon
              :name="item.icon"
              class="size-5"
              aria-hidden="true"
            />
          </span>

          <span
            class="max-w-full truncate px-0.5"
            :class="
              isActive(
                item.to,
              )
                ? 'text-primary'
                : 'text-muted group-hover:text-highlighted'
            "
          >
            {{ item.shortLabel }}
          </span>
        </NuxtLink>
      </nav>
    </div>
  </div>
</template>
