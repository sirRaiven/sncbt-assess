<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    label: string;
    value: string;
    icon: string;
    change?: string;
    tone?:
      | "primary"
      | "success"
      | "warning"
      | "info"
      | "neutral";
  }>(),
  {
    change:
      "",
    tone:
      "primary",
  },
);

const toneClass =
  computed(
    () => {
      const classes = {
        primary:
          "bg-primary/10 text-primary",
        success:
          "bg-success/10 text-success",
        warning:
          "bg-warning/10 text-warning",
        info:
          "bg-info/10 text-info",
        neutral:
          "bg-elevated text-muted",
      };

      return classes[props.tone];
    },
  );
</script>

<template>
  <UCard
    class="app-stat-card"
    :ui="{
      body:
        'p-4 sm:p-5',
    }"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="text-xs font-medium text-muted sm:text-sm">
          {{ label }}
        </p>

        <p class="mt-2 break-words text-2xl font-black tracking-tight text-highlighted sm:mt-3 sm:text-3xl">
          {{ value }}
        </p>

        <p
          v-if="change"
          class="mt-2 text-xs leading-5 text-muted"
        >
          {{ change }}
        </p>
      </div>

      <div
        class="flex size-10 shrink-0 items-center justify-center rounded-xl"
        :class="toneClass"
      >
        <UIcon
          :name="icon"
          class="size-5"
        />
      </div>
    </div>
  </UCard>
</template>
