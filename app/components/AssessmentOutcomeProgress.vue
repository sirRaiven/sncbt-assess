<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    correctCount: number;
    wrongCount: number;
    unansweredCount: number;
    timedOutCount: number;
    remainingCount: number;
    total: number;
    compact?: boolean;
  }>(),
  {
    compact: false,
  },
);  

function safeCount(value: number): number {
  return Math.max(0, Math.trunc(Number(value) || 0));
}

const totalCount = computed(
  () => Math.max(0, safeCount(props.total)),
);

const correct = computed(
  () => Math.min(safeCount(props.correctCount), totalCount.value),
);

const wrong = computed(
  () => Math.min(safeCount(props.wrongCount), totalCount.value),
);

const unanswered = computed(
  () => Math.min(safeCount(props.unansweredCount), totalCount.value),
);

const timedOut = computed(
  () => Math.min(safeCount(props.timedOutCount), unanswered.value),
);

const remaining = computed(
  () => Math.min(safeCount(props.remainingCount), totalCount.value),
);

const resolved = computed(
  () => Math.min(
    totalCount.value,
    correct.value + wrong.value + unanswered.value,
  ),
);

const resolvedPercent = computed(
  () => totalCount.value > 0
    ? Math.round((resolved.value / totalCount.value) * 100)
    : 0,
);

const segments = computed(() => {
  if (totalCount.value < 1) {
    return [];
  }

  return [
    {
      key: "correct",
      label: "Correct",
      count: correct.value,
      color: "success" as const,
      textClass: "text-success",
    },
    {
      key: "wrong",
      label: "Wrong",
      count: wrong.value,
      color: "error" as const,
      textClass: "text-error",
    },
    {
      key: "unanswered",
      label: "Unanswered",
      count: unanswered.value,
      color: "warning" as const,
      textClass: "text-warning",
    },
    {
      key: "remaining",
      label: "Remaining",
      count: remaining.value,
      color: "neutral" as const,
      textClass: "text-muted",
    },
  ].filter((segment) => segment.count > 0);
});

function segmentWidth(count: number): string {
  if (totalCount.value < 1) {
    return "0%";
  }

  return `${(count / totalCount.value) * 100}%`;
}
</script>

<template>
  <div
    class="w-full"
    :class="compact ? 'min-w-56' : 'min-w-64'"
    :aria-label="`${correct} correct, ${wrong} wrong, ${unanswered} unanswered, ${timedOut} timed out, ${remaining} remaining out of ${totalCount} questions`"
  >
    <div
      class="mt-2 flex h-2.5 overflow-hidden rounded-full bg-elevated ring-1 ring-default"
      aria-hidden="true"
    >
      <div
        v-for="segment in segments"
        :key="segment.key"
        class="h-full min-w-0"
        :style="{ width: segmentWidth(segment.count) }"
      >
        <UProgress
          :model-value="100"
          :max="100"
          :color="segment.color"
          size="xs"
          class="h-full w-full rounded-none"
          :ui="{
            root: 'h-full rounded-none',
            base: 'h-full rounded-none bg-transparent',
            indicator: 'h-full rounded-none transition-none',
          }"
        />
      </div>
    </div>

    <div
      class="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px]"
      :class="compact ? '' : 'sm:text-xs'"
    >
      <span class="font-semibold text-success">
        ✓ {{ correct }} correct
      </span>

      <span class="font-semibold text-error">
        ✕ {{ wrong }} wrong
      </span>

      <span class="font-semibold text-warning">
        ○ {{ unanswered }} unanswered
      </span>

      <span
        v-if="timedOut > 0"
        class="font-semibold text-warning"
      >
        ⏱ {{ timedOut }} timed out
      </span>

      <span class="font-semibold text-muted">
        {{ remaining }} remaining
      </span>
    </div>
  </div>
</template>
