<script setup lang="ts">
import type {
  AppBreadcrumbItem,
} from "~/types/navigation";

withDefaults(
  defineProps<{
    title: string;
    description?: string;
    eyebrow?: string;
    breadcrumbs?: AppBreadcrumbItem[];
  }>(),
  {
    description: "",
    eyebrow: "",
    breadcrumbs: () => [],
  },
);
</script>

<template>
  <div class="min-w-0">
    <AppBreadcrumbs
      v-if="breadcrumbs.length"
      :items="breadcrumbs"
      class="mb-3"
    />

    <div class="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
      <div class="min-w-0">
        <p
          v-if="eyebrow"
          class="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-primary sm:text-xs sm:tracking-[0.18em]"
        >
          {{ eyebrow }}
        </p>

        <h1 class="break-words text-2xl font-black tracking-tight text-highlighted sm:text-3xl">
          {{ title }}
        </h1>

        <p
          v-if="description"
          class="mt-2 max-w-3xl text-sm leading-6 text-muted"
        >
          {{ description }}
        </p>
      </div>

      <div
        v-if="$slots.actions"
        class="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end [&>*]:w-full sm:[&>*]:w-auto"
      >
        <slot name="actions" />
      </div>
    </div>
  </div>
</template>
