<script setup lang="ts">
import type {
  DropdownMenuItem,
} from "@nuxt/ui";

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

const primaryLabels =
  new Set([
    "Overview",
    "My Classes",
    "Assessments",
    "My Results",
  ]);

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

const studentNavigation =
  computed(
    () =>
      getNavigation(
        "student",
      ),
  );

const primaryItems =
  computed<
    StudentBottomNavigationItem[]
  >(
    () =>
      studentNavigation.value
        .filter(
          (item) =>
            primaryLabels.has(
              item.label,
            ),
        )
        .map(
          (item) => ({
            ...item,
            shortLabel:
              labelMap[
                item.label
              ]
              ?? item.label,
          }),
        ),
  );

const secondaryItems =
  computed(
    () =>
      studentNavigation.value
        .filter(
          (item) =>
            !primaryLabels.has(
              item.label,
            ),
        ),
  );

const moreMenuItems =
  computed<
    DropdownMenuItem[][]
  >(
    () => [
      [
        ...secondaryItems.value.map(
          (item) => ({
            label:
              item.label,
            icon:
              item.icon,
            to:
              item.to,
          }),
        ),

        {
          label:
            "My Profile",
          icon:
            "i-lucide-user-round",
          to:
            "/student/profile",
        },
      ],
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

const moreActive =
  computed(
    () =>
      secondaryItems.value.some(
        (item) =>
          isActive(
            item.to,
          ),
      )
      || isActive(
        "/student/profile",
      ),
  );
</script>

<template>
  <div
    class="fixed inset-x-0 bottom-0 z-50 border-t border-default/80 bg-default/96 shadow-[0_-10px_28px_rgba(15,23,42,0.08)] backdrop-blur-2xl supports-[backdrop-filter]:bg-default/88 dark:shadow-black/25 lg:hidden"
  >
    <nav
      aria-label="Student primary navigation"
      class="mx-auto grid w-full max-w-xl grid-cols-5 px-1.5 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1.5"
    >
      <NuxtLink
        v-for="item in primaryItems"
        :key="item.to"
        :to="item.to"
        class="group relative flex min-h-[3.75rem] min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[10px] font-bold leading-none transition-[background-color,color,transform] duration-150 motion-reduce:transition-none active:scale-[0.98]"
        :class="
          isActive(item.to)
            ? 'text-primary'
            : 'text-muted hover:bg-elevated hover:text-highlighted'
        "
        :aria-current="
          isActive(item.to)
            ? 'page'
            : undefined
        "
        :aria-label="item.label"
      >
        <span
          class="relative flex h-8 min-w-10 items-center justify-center rounded-full px-2 transition-[background-color,color,box-shadow] duration-150 motion-reduce:transition-none"
          :class="
            isActive(item.to)
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
            isActive(item.to)
              ? 'text-primary'
              : 'text-muted group-hover:text-highlighted'
          "
        >
          {{ item.shortLabel }}
        </span>
      </NuxtLink>

      <UDropdownMenu
        :items="moreMenuItems"
        :content="{
          align: 'end',
          side: 'top',
          sideOffset: 10,
        }"
        :ui="{
          content: 'w-56',
          item: 'min-h-11',
          itemLabel: 'font-semibold',
          itemLeadingIcon: 'size-4.5',
        }"
      >
        <button
          type="button"
          class="group relative flex min-h-[3.75rem] min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[10px] font-bold leading-none text-muted transition-[background-color,color,transform] duration-150 hover:bg-elevated hover:text-highlighted motion-reduce:transition-none active:scale-[0.98]"
          :class="
            moreActive
              ? 'text-primary'
              : undefined
          "
          :aria-current="
            moreActive
              ? 'page'
              : undefined
          "
          aria-label="More student navigation options"
        >
          <span
            class="relative flex h-8 min-w-10 items-center justify-center rounded-full px-2 transition-[background-color,color,box-shadow] duration-150 motion-reduce:transition-none"
            :class="
              moreActive
                ? 'bg-primary text-white shadow-sm shadow-primary/20'
                : 'text-muted group-hover:bg-elevated group-hover:text-highlighted'
            "
          >
            <UIcon
              name="i-lucide-ellipsis"
              class="size-5"
              aria-hidden="true"
            />
          </span>

          <span
            :class="
              moreActive
                ? 'text-primary'
                : 'text-muted group-hover:text-highlighted'
            "
          >
            More
          </span>
        </button>
      </UDropdownMenu>
    </nav>
  </div>
</template>
