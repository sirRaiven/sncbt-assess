<script setup lang="ts">
import type {
  StudentLiveLeaderboard,
  StudentLiveLeaderboardEntry,
} from "~/types/assessment-delivery";

const props = defineProps<{
  assignmentId: string;
}>();

const { getStudentLeaderboard } = useAssessmentDelivery();

const leaderboard = ref<StudentLiveLeaderboard | null>(null);

const isLoading = ref(true);

const errorMessage = ref("");

const POLL_INTERVAL_MS = 8000;

let pollTimer: ReturnType<typeof setInterval> | null = null;

function pointsLabel(entry: StudentLiveLeaderboardEntry): string | null {
  if (
    !entry.isCurrentStudent
    || entry.score === undefined
  ) {
    return null;
  }

  const score = Number(entry.score);

  if (leaderboard.value?.scoringMode === "speed_bonus") {
    return `${score.toFixed(Number.isInteger(score) ? 0 : 2)} pts`;
  }

  if (entry.maximumScore === undefined) {
    return null;
  }

  const maximum = Number(entry.maximumScore);

  return `${score.toFixed(Number.isInteger(score) ? 0 : 2)} / ${maximum.toFixed(
    Number.isInteger(maximum) ? 0 : 2,
  )}`;
}

function rankIcon(rank: number): string | null {
  if (rank === 1) {
    return "i-lucide-medal";
  }

  if (rank === 2 || rank === 3) {
    return "i-lucide-award";
  }

  return null;
}

async function loadLeaderboard(silent = false): Promise<void> {
  if (!silent) {
    isLoading.value = true;

    errorMessage.value = "";
  }

  const result = await getStudentLeaderboard(props.assignmentId);

  if (result.error || !result.data) {
    if (!silent) {
      errorMessage.value = "Live ranking is temporarily unavailable.";
    }

    isLoading.value = false;

    return;
  }

  leaderboard.value = result.data.leaderboard;

  errorMessage.value = "";

  isLoading.value = false;
}

function startPolling(): void {
  if (pollTimer) {
    return;
  }

  pollTimer = setInterval(() => {
    if (
      typeof document !== "undefined" &&
      document.visibilityState !== "visible"
    ) {
      return;
    }

    void loadLeaderboard(true);
  }, POLL_INTERVAL_MS);
}

onMounted(async () => {
  await loadLeaderboard();
  startPolling();
});

onBeforeUnmount(() => {
  if (pollTimer) {
    clearInterval(pollTimer);

    pollTimer = null;
  }
});
</script>

<template>
  <UCard
    class="overflow-hidden"
    :ui="{
      body: 'p-0 sm:p-0',
    }"
  >
    <div
      class="flex flex-col gap-3 border-b border-default bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-5 sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="flex items-center gap-3">
        <div
          class="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary"
        >
          <UIcon name="i-lucide-trophy" class="size-5" />
        </div>

        <div>
          <h2 class="font-black text-highlighted">Leaderboard</h2>

          <p class="mt-0.5 text-sm text-muted">
            Ranking updates as classmates submit their assessment.
          </p>
        </div>
      </div>

      <UBadge color="success" variant="soft" icon="i-lucide-radio">
        Live
      </UBadge>
    </div>

    <div class="p-5">
      <div v-if="isLoading" class="space-y-3">
        <USkeleton v-for="number in 3" :key="number" class="h-16 rounded-xl" />
      </div>

      <UAlert
        v-else-if="errorMessage"
        color="neutral"
        variant="soft"
        icon="i-lucide-wifi-off"
        title="Ranking unavailable"
        :description="errorMessage"
      />

      <div
        v-else-if="leaderboard && leaderboard.entries.length > 0"
        class="space-y-2"
        aria-live="polite"
      >
        <div
          v-for="entry in leaderboard.entries"
          :key="`${entry.rank}-${entry.studentName}`"
          class="flex items-center gap-3 rounded-xl border px-3.5 py-3 transition"
          :class="
            entry.isCurrentStudent
              ? 'border-primary/35 bg-primary/8'
              : 'border-default bg-elevated/30'
          "
        >
          <div
            class="flex size-9 shrink-0 items-center justify-center rounded-xl font-black"
            :class="
              entry.rank === 1
                ? 'bg-warning/12 text-warning'
                : entry.isCurrentStudent
                  ? 'bg-primary/12 text-primary'
                  : 'bg-elevated text-muted'
            "
          >
            <UIcon
              v-if="rankIcon(entry.rank)"
              :name="rankIcon(entry.rank) || 'i-lucide-award'"
              class="size-4.5"
            />

            <span v-else>
              {{ entry.rank }}
            </span>
          </div>

          <div class="min-w-0 flex-1">
            <div class="flex min-w-0 items-center gap-2">
              <p class="truncate text-sm font-bold text-highlighted">
                {{ entry.studentName }}
              </p>

              <UBadge
                v-if="entry.isCurrentStudent"
                color="primary"
                variant="soft"
                size="sm"
              >
                You
              </UBadge>
            </div>
          </div>

          <p
            v-if="pointsLabel(entry)"
            class="shrink-0 text-sm font-black text-highlighted"
          >
            {{ pointsLabel(entry) }}
          </p>
        </div>
      </div>

      <div
        v-else
        class="rounded-xl border border-dashed border-default bg-elevated/30 px-5 py-8 text-center"
      >
        <UIcon name="i-lucide-trophy" class="mx-auto size-7 text-muted" />

        <p class="mt-3 font-bold text-highlighted">Ranking is getting ready</p>

        <p class="mt-1 text-sm text-muted">
          Submitted results will appear here automatically.
        </p>
      </div>

      <p
        v-if="leaderboard && leaderboard.entries.length > 0"
        class="mt-4 text-center text-xs text-muted"
      >
        Only submitted results are shown. Question progress and activity are
        never displayed here.
      </p>
    </div>
  </UCard>
</template>
