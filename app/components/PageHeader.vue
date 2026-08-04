<script setup lang="ts">
withDefaults(defineProps<{
    title: string;
    description?: string;
    eyebrow?: string;
}>(), { description: '', eyebrow: '' });
</script>

<template>
  <div class="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
    <div>
      <p
        v-if="eyebrow"
        class="mb-2 text-xs font-bold uppercase tracking-[.18em] text-primary"
      >
        {{ eyebrow }}
      </p>
      <h1 class="text-2xl font-black tracking-tight text-highlighted sm:text-3xl">
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
      class="flex shrink-0 flex-wrap gap-2"
    >
      <slot name="actions" />
    </div>
  </div>
</template>
