<script setup lang="ts">
import {
  APP_VERSION_LABEL,
} from "~/utils/app-version";

const props = withDefaults(
  defineProps<{
    inverse?: boolean;
    compact?: boolean;
  }>(),
  {
    inverse:
      false,
    compact:
      false,
  },
);

const open =
  ref(false);

const triggerClass =
  computed(
    () =>
      props.inverse
        ? "text-slate-400 hover:bg-white/8 hover:text-white focus-visible:ring-primary/30"
        : "text-muted hover:bg-elevated hover:text-highlighted focus-visible:ring-primary/20",
  );
</script>

<template>
  <div>
    <UTooltip
      v-if="compact"
      text="About SNCBT Assess"
    >
      <UButton
        color="neutral"
        variant="ghost"
        square
        size="sm"
        icon="i-lucide-info"
        aria-label="About SNCBT Assess"
        @click="open = true"
      />
    </UTooltip>

    <button
      v-else
      type="button"
      class="flex min-h-9 w-full items-center justify-center gap-2 rounded-lg px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-3"
      :class="triggerClass"
      aria-label="Open information about SNCBT Assess"
      @click="open = true"
    >
      <UIcon
        name="i-lucide-info"
        class="size-3.5"
      />

      <span>
        {{ APP_VERSION_LABEL }}
      </span>
    </button>

    <AboutAppModal
      v-model:open="open"
    />
  </div>
</template>
