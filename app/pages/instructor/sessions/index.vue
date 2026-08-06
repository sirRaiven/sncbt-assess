<script setup lang="ts">
import type {
  AssessmentSessionStatus,
  InstructorSessionItem,
} from "~/types/assessment-session";

definePageMeta({
  layout: "instructor",
});

useSeoMeta({
  title: "Live sessions",
});

const {
  listInstructorSessions,
} = useAssessmentSessions();

const sessions =
  ref<InstructorSessionItem[]>([]);

const isLoading =
  ref(true);

const errorMessage =
  ref("");

const query =
  ref("");

const statusFilter =
  ref("All statuses");

const counts = computed(() => ({
  all:
    sessions.value.length,

  lobby:
    sessions.value.filter(
      (item) =>
        item.session.status
        === "lobby",
    ).length,

  active:
    sessions.value.filter(
      (item) =>
        item.session.status
        === "active",
    ).length,

  closed:
    sessions.value.filter(
      (item) =>
        [
          "ended",
          "cancelled",
        ].includes(
          item.session.status,
        ),
    ).length,
}));

const openSession = computed(
  () =>
    sessions.value.find(
      (item) =>
        [
          "lobby",
          "active",
        ].includes(
          item.session.status,
        ),
    )
    ?? null,
);

const filteredSessions = computed(() => {
  const keyword =
    query.value
      .trim()
      .toLowerCase();

  return sessions.value.filter(
    (item) => {
      const matchesQuery =
        !keyword
        || [
          item.assessment.title,
          item.assessment.subjectCode,
          item.classroom.name,
          item.classroom.section,
          item.session.session_code,
        ]
          .join(" ")
          .toLowerCase()
          .includes(keyword);

      const matchesStatus =
        statusFilter.value
        === "All statuses"
        || item.session.status
        === statusFilter.value
          .toLowerCase();

      return (
        matchesQuery
        && matchesStatus
      );
    },
  );
});

function sessionRoute(
  item: InstructorSessionItem,
): string {
  if (
    item.session.status
    === "lobby"
  ) {
    return `/instructor/sessions/${item.session.id}/lobby`;
  }

  return `/instructor/sessions/${item.session.id}/monitor`;
}

function modeLabel(
  value: string,
): string {
  return value
    === "teacher_led"
    ? "Teacher-led"
    : "Student-paced";
}

function statusLabel(
  value: AssessmentSessionStatus,
): string {
  return value
    .charAt(0)
    .toUpperCase()
    + value.slice(1);
}

async function loadSessions(): Promise<void> {
  isLoading.value =
    true;

  errorMessage.value =
    "";

  const result =
    await listInstructorSessions();

  if (
    result.error
    || !result.data
  ) {
    errorMessage.value =
      result.error
      || "Unable to load live sessions.";

    isLoading.value =
      false;

    return;
  }

  sessions.value =
    result.data.sessions;

  isLoading.value =
    false;
}

onMounted(
  loadSessions,
);
</script>

<template>
  <div class="page-stack">
    <PageHeader
      eyebrow="Live assessment delivery"
      title="Live sessions"
      description="Start an assessment in real time, share a six-digit code, and manage the student waiting lobby."
    >
      <template #actions>
        <UButton
          to="/instructor/sessions/create"
          icon="i-lucide-radio-tower"
          :disabled="Boolean(openSession)"
        >
          Start Live Session
        </UButton>
      </template>
    </PageHeader>

    <UAlert
      v-if="errorMessage"
      color="error"
      variant="soft"
      title="Sessions could not be loaded"
      :description="errorMessage"
    />

    <UAlert
      v-if="openSession"
      color="info"
      variant="soft"
      title="An open live session already exists"
      description="Continue or close the current session before starting another."
    >
      <template #actions>
        <UButton
          :to="sessionRoute(openSession)"
          color="info"
          variant="soft"
        >
          Open Current Session
        </UButton>
      </template>
    </UAlert>

    <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="All sessions"
        :value="String(counts.all)"
        icon="i-lucide-radio-tower"
        tone="primary"
      />

      <StatCard
        label="Waiting lobbies"
        :value="String(counts.lobby)"
        icon="i-lucide-door-open"
        tone="warning"
      />

      <StatCard
        label="Live now"
        :value="String(counts.active)"
        icon="i-lucide-activity"
        tone="success"
      />

      <StatCard
        label="Closed"
        :value="String(counts.closed)"
        icon="i-lucide-history"
        tone="neutral"
      />
    </section>

    <UCard>
      <div class="grid gap-3 lg:grid-cols-[1fr_220px_auto]">
        <UInput
          v-model="query"
          icon="i-lucide-search"
          placeholder="Search assessment, class, or code"
          class="w-full"
        />

        <USelect
          v-model="statusFilter"
          :items="[
            'All statuses',
            'Lobby',
            'Active',
            'Ended',
            'Cancelled',
          ]"
          class="w-full"
        />

        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-refresh-cw"
          :loading="isLoading"
          @click="loadSessions"
        >
          Refresh
        </UButton>
      </div>
    </UCard>

    <div
      v-if="isLoading"
      class="grid gap-4 xl:grid-cols-2"
    >
      <USkeleton
        v-for="number in 4"
        :key="number"
        class="h-72 rounded-xl"
      />
    </div>

    <EmptyPanel
      v-else-if="
        filteredSessions.length === 0
      "
      icon="i-lucide-radio-tower"
      title="No live sessions found"
      description="Publish an assessment and start a session for one of your active classes."
    >
      <template #actions>
        <UButton
          to="/instructor/sessions/create"
          icon="i-lucide-plus"
          :disabled="Boolean(openSession)"
        >
          Start Live Session
        </UButton>
      </template>
    </EmptyPanel>

    <div
      v-else
      class="grid gap-4 xl:grid-cols-2"
    >
      <UCard
        v-for="item in filteredSessions"
        :key="item.session.id"
      >
        <div class="flex items-start gap-4">
          <div class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <UIcon
              name="i-lucide-radio-tower"
              class="size-5"
            />
          </div>

          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 class="font-black text-highlighted">
                  {{ item.assessment.title }}
                </h2>

                <p class="mt-1 text-sm text-muted">
                  {{ item.assessment.subjectCode }}
                  ·
                  {{ item.classroom.section }}
                </p>
              </div>

              <StatusPill
                :status="
                  statusLabel(
                    item.session.status,
                  )
                "
              />
            </div>

            <div class="mt-4 flex flex-wrap gap-2">
              <UBadge
                color="info"
                variant="soft"
              >
                {{
                  modeLabel(
                    item.session.session_mode,
                  )
                }}
              </UBadge>

              <UBadge
                color="neutral"
                variant="soft"
                class="font-mono tracking-[0.12em]"
              >
                {{
                  item.session.session_code
                    .replace(
                      /(\d{3})(\d{3})/,
                      "$1 $2",
                    )
                }}
              </UBadge>
            </div>

            <div class="mt-5 grid grid-cols-3 gap-3">
              <div class="rounded-lg bg-elevated p-3">
                <p class="text-xs text-muted">
                  Waiting
                </p>

                <p class="mt-1 font-black text-highlighted">
                  {{ item.participantCounts.waiting }}
                </p>
              </div>

              <div class="rounded-lg bg-elevated p-3">
                <p class="text-xs text-muted">
                  Active
                </p>

                <p class="mt-1 font-black text-highlighted">
                  {{ item.participantCounts.active }}
                </p>
              </div>

              <div class="rounded-lg bg-elevated p-3">
                <p class="text-xs text-muted">
                  Finished
                </p>

                <p class="mt-1 font-black text-highlighted">
                  {{ item.participantCounts.finished }}
                </p>
              </div>
            </div>

            <div class="mt-5 flex flex-wrap gap-2">
              <UButton
                :to="sessionRoute(item)"
                variant="soft"
                :icon="
                  item.session.status
                  === 'lobby'
                    ? 'i-lucide-door-open'
                    : 'i-lucide-monitor-dot'
                "
              >
                {{
                  item.session.status
                  === "lobby"
                    ? "Open Lobby"
                    : "View Session"
                }}
              </UButton>

              <UButton
                :to="`/instructor/assessments/${item.assessment.id}/preview`"
                color="neutral"
                variant="ghost"
                icon="i-lucide-eye"
              >
                Assessment
              </UButton>
            </div>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
