<script setup lang="ts">
const props = withDefaults(defineProps<{
    label: string;
    value: string;
    icon: string;
    change?: string;
    tone?: "primary" | "success" | "warning" | "info" | "neutral";
}>(), {
    change: "",
    tone: "primary",
});
const toneClass = computed(() => {
    const classes = {
        primary: "bg-primary/10 text-primary",
        success: "bg-success/10 text-success",
        warning: "bg-warning/10 text-warning",
        info: "bg-info/10 text-info",
        neutral: "bg-elevated text-muted",
    };
    return classes[props.tone];
});
</script>

<template>
  <UCard>
    <div class="flex items-start justify-between gap-4">
      <div>
        <p class="text-sm font-medium text-muted">
          {{ label }}
        </p>
        <p class="mt-3 text-3xl font-black tracking-tight text-highlighted">
          {{ value }}
        </p>
        <p
          v-if="change"
          class="mt-2 text-xs text-muted"
        >
          {{ change }}
        </p>
      </div>
      <div
        class="flex size-10 items-center justify-center rounded-xl"
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
