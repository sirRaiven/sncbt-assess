<script setup lang="ts">
import type {
  AppBreadcrumbItem,
} from "~/types/navigation";

withDefaults(
  defineProps<{
    items: AppBreadcrumbItem[];
  }>(),
  {
    items: () => [],
  },
);
</script>

<template>
  <UBreadcrumb
    v-if="items.length"
    :items="items"
    aria-label="Breadcrumb"
    :ui="{
      root: 'min-w-0',
      list: 'flex-wrap gap-y-1',
      item: 'min-w-0',
      link: 'max-w-56 truncate text-xs font-semibold sm:max-w-72',
      label: 'truncate',
    }"
  />
</template>
