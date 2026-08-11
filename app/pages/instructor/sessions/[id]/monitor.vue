<script setup lang="ts">
import type {
  InstructorDeliveryMonitor,
} from "~/types/assessment-delivery";

definePageMeta({
  layout:
    "instructor",
});

useSeoMeta({
  title:
    "Assessment Monitor",
});

const route =
  useRoute();

const toast =
  useToast();

const assignmentId =
  computed(
    () =>
      String(
        route.params.id,
      ),
  );

const {
  getInstructorMonitor,
} = useAssessmentDelivery();

const monitor =
  ref<
    InstructorDeliveryMonitor
    | null
  >(
    null,
  );

const isLoading =
  ref(true);

const isRefreshing =
  ref(false);

const errorMessage =
  ref("");

const activeView =
  ref<
    | "progress"
    | "ranking"
    | "integrity"
  >(
    "progress",
  );

const query =
  ref("");

const previousIntegritySignalCount =
  ref<number | null>(null);

const previousHighPrioritySignalCount =
  ref<number | null>(null);

let refreshTimer:
  | ReturnType<
      typeof setInterval
    >
  | null =
    null;

const filteredStudents =
  computed(
    () => {
      const students =
        monitor.value?.students
        ?? [];

      const keyword =
        query.value
          .trim()
          .toLowerCase();

      if (!keyword) {
        return students;
      }

      return students.filter(
        (student) =>
          [
            student.studentName,
            student.studentNumber,
            student.email,
            student.status,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(keyword),
      );
    },
  );

const rankingStudents =
  computed(
    () =>
      filteredStudents.value
        .filter(
          (student) =>
            student.rank
            !== null,
        )
        .sort(
          (
            first,
            second,
          ) =>
            (
              first.rank
              ?? Number.MAX_SAFE_INTEGER
            )
            - (
              second.rank
              ?? Number.MAX_SAFE_INTEGER
            ),
        ),
  );

const integrityStudents =
  computed(
    () =>
      filteredStudents.value
        .filter(
          (student) =>
            student.integrity
              .signalCount > 0,
        )
        .sort(
          (first, second) =>
            Date.parse(
              second.integrity
                .latestSignalAt
              || "1970-01-01",
            )
            - Date.parse(
              first.integrity
                .latestSignalAt
              || "1970-01-01",
            )
            || second.integrity
              .signalCount
            - first.integrity
              .signalCount,
        ),
  );

function integrityEventLabel(
  eventType: string | null,
): string {
  if (eventType === "tab_hidden") {
    return "Left the assessment tab";
  }

  if (eventType === "window_blur") {
    return "Switched away from the assessment window";
  }

  if (eventType === "fullscreen_exit") {
    return "Exited Focus Mode";
  }

  if (eventType === "copy_attempt") {
    return "Tried to copy assessment content";
  }

  if (eventType === "cut_attempt") {
    return "Tried to cut assessment content";
  }

  if (eventType === "paste_attempt") {
    return "Tried to paste content";
  }

  if (eventType === "context_menu_attempt") {
    return "Opened the right-click menu";
  }

  return "Assessment activity recorded";
}

function integrityEventIcon(
  eventType: string | null,
): string {
  if (eventType === "tab_hidden") {
    return "i-lucide-panels-top-left";
  }

  if (eventType === "window_blur") {
    return "i-lucide-monitor-off";
  }

  if (eventType === "fullscreen_exit") {
    return "i-lucide-minimize-2";
  }

  if (eventType === "copy_attempt") {
    return "i-lucide-copy";
  }

  if (eventType === "cut_attempt") {
    return "i-lucide-scissors";
  }

  if (eventType === "paste_attempt") {
    return "i-lucide-clipboard-paste";
  }

  if (eventType === "context_menu_attempt") {
    return "i-lucide-mouse-pointer-click";
  }

  return "i-lucide-activity";
}


function formatDate(
  value: string | null,
): string {
  if (!value) {
    return "Not recorded";
  }

  return new Intl
    .DateTimeFormat(
      "en-PH",
      {
        dateStyle:
          "medium",
        timeStyle:
          "short",
      },
    )
    .format(
      new Date(value),
    );
}

const serverClockOffsetMs = computed(() => {
  const serverNow = monitor.value?.serverNow;

  if (!serverNow) {
    return 0;
  }

  const parsed = Date.parse(serverNow);

  return Number.isFinite(parsed)
    ? parsed - Date.now()
    : 0;
});

function currentServerTimeMs(): number {
  return Date.now() + serverClockOffsetMs.value;
}

function formatRemaining(
  expiresAt: string | null,
): string {
  if (!expiresAt) {
    return "—";
  }

  const seconds =
    Math.max(
      0,
      Math.ceil(
        (
          new Date(expiresAt)
            .getTime()
          - currentServerTimeMs()
        ) / 1000,
      ),
    );

  const hours =
    Math.floor(
      seconds / 3600,
    );

  const minutes =
    Math.floor(
      (
        seconds % 3600
      ) / 60,
    );

  const remainingSeconds =
    seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

async function loadMonitor(
  silent = false,
): Promise<void> {
  if (silent) {
    isRefreshing.value = true;
  } else {
    isLoading.value = true;
  }

  if (!silent) {
    errorMessage.value = "";
  }

  const result =
    await getInstructorMonitor(
      assignmentId.value,
    );

  if (result.error || !result.data) {
    if (!silent) {
      errorMessage.value =
        result.error
        || "Unable to load the assessment monitor.";
    }

    isLoading.value = false;
    isRefreshing.value = false;
    return;
  }

  const nextIntegrityCount =
    result.data.summary
      .integritySignals;
  const nextHighPriorityCount =
    result.data.summary
      .highPriorityIntegritySignals;

  if (
    silent
    && previousIntegritySignalCount.value
      !== null
    && nextIntegrityCount
      > previousIntegritySignalCount.value
  ) {
    const newSignalCount =
      nextIntegrityCount
      - previousIntegritySignalCount.value;
    const newHighPriorityCount =
      nextHighPriorityCount
      - (
        previousHighPrioritySignalCount.value
        ?? 0
      );

    toast.add({
      title:
        newHighPriorityCount > 0
          ? "Assessment activity needs review"
          : "New assessment activity",
      description:
        `${newSignalCount} new assessment ${newSignalCount === 1 ? "event was" : "events were"} recorded. Open Activity Review to see what happened.`,
      color:
        newHighPriorityCount > 0
          ? "error"
          : "warning",
    });
  }

  previousIntegritySignalCount.value =
    nextIntegrityCount;
  previousHighPrioritySignalCount.value =
    nextHighPriorityCount;

  monitor.value = result.data;
  isLoading.value = false;
  isRefreshing.value = false;
}

onMounted(
  async () => {
    await loadMonitor();

    refreshTimer =
      setInterval(
        () => {
          void loadMonitor(
            true,
          );
        },
        5000,
      );
  },
);

onBeforeUnmount(
  () => {
    if (refreshTimer) {
      clearInterval(
        refreshTimer,
      );
    }
  },
);
</script>

<template>
  <div class="page-stack">
    <PortalBackButton
      fallback-to="/instructor/sessions"
    />
    <PageHeader
      eyebrow="Live assessment monitoring"
      :title="
        monitor?.delivery.title
        || 'Assessment Monitor'
      "
      :description="
        monitor
          ? `${monitor.delivery.subjectCode} · ${monitor.delivery.classroom.section} · ${formatDate(monitor.delivery.startsAt)} to ${formatDate(monitor.delivery.endsAt)}`
          : 'Loading delivery'
      "
    >
      <template #actions>
        <div class="flex gap-2">
          <UButton
            color="neutral"
            variant="outline"
            icon="i-lucide-refresh-cw"
            :loading="isRefreshing"
            @click="
              loadMonitor(
                true,
              )
            "
          >
            Refresh
          </UButton>
        </div>
      </template>
    </PageHeader>

    <UAlert
      v-if="errorMessage"
      color="error"
      variant="soft"
      title="Monitor could not be loaded"
      :description="errorMessage"
    />

    <div
      v-if="isLoading"
      class="space-y-4"
    >
      <USkeleton class="h-44 rounded-xl" />
      <USkeleton class="h-96 rounded-xl" />
    </div>

    <template
      v-else-if="monitor"
    >
      <section class="rounded-xl bg-gradient-to-r from-blue-900 via-blue-800 to-violet-800 p-6 text-white">
        <div class="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div class="flex flex-wrap gap-2">
              <StatusPill
                :status="
                  monitor.delivery.status
                "
              />

              <UBadge
                color="neutral"
                variant="soft"
              >
                {{ monitor.delivery.classroom.name }}
              </UBadge>
            </div>

            <h1 class="mt-4 text-3xl font-black">
              {{ monitor.delivery.title }}
            </h1>

            <p class="mt-2 text-sm text-blue-100">
              Monitoring updates every five seconds. Live progress and assessment activity are shown without exposing numeric scores.
            </p>
          </div>

          <div class="rounded-xl bg-white/10 p-4">
            <p class="text-xs font-bold uppercase tracking-[0.16em] text-blue-100">
              Assessment window
            </p>

            <p class="mt-2 font-bold">
              {{ formatDate(monitor.delivery.startsAt) }}
            </p>

            <p class="text-sm text-blue-100">
              to
              {{ formatDate(monitor.delivery.endsAt) }}
            </p>
          </div>
        </div>
      </section>

      <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard
          label="Class members"
          :value="
            String(
              monitor.summary.classMembers,
            )
          "
          icon="i-lucide-users"
        />

        <StatCard
          label="Started"
          :value="
            String(
              monitor.summary.started,
            )
          "
          icon="i-lucide-play"
          tone="info"
        />

        <StatCard
          label="In progress"
          :value="
            String(
              monitor.summary.inProgress,
            )
          "
          icon="i-lucide-loader-circle"
          tone="warning"
        />

        <StatCard
          label="Submitted"
          :value="
            String(
              monitor.summary.submitted,
            )
          "
          icon="i-lucide-circle-check"
          tone="success"
        />

        <StatCard
          label="Auto-submitted"
          :value="
            String(
              monitor.summary.autoSubmitted,
            )
          "
          icon="i-lucide-clock-alert"
          tone="neutral"
        />

        <StatCard
          label="Not started"
          :value="
            String(
              monitor.summary.notStarted,
            )
          "
          icon="i-lucide-circle-dashed"
          tone="neutral"
        />

      </section>

      <section class="grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Recorded activity"
          :value="String(monitor.summary.integritySignals)"
          icon="i-lucide-activity"
          :tone="monitor.summary.integritySignals > 0 ? 'warning' : 'success'"
        />

        <StatCard
          label="Students to review"
          :value="String(monitor.summary.studentsWithIntegritySignals)"
          icon="i-lucide-user-round-search"
          :tone="monitor.summary.studentsWithIntegritySignals > 0 ? 'warning' : 'success'"
        />
      </section>

      <UCard>
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div class="flex flex-wrap rounded-xl border border-default bg-elevated p-1">
            <button
              type="button"
              class="min-h-10 rounded-lg px-4 text-sm font-bold transition"
              :class="
                activeView
                === 'progress'
                  ? 'bg-primary/12 text-primary'
                  : 'text-muted hover:bg-default hover:text-highlighted'
              "
              @click="
                activeView =
                  'progress'
              "
            >
              Student Progress
            </button>

            <button
              type="button"
              class="min-h-10 rounded-lg px-4 text-sm font-bold transition"
              :class="
                activeView
                === 'ranking'
                  ? 'bg-primary/12 text-primary'
                  : 'text-muted hover:bg-default hover:text-highlighted'
              "
              @click="
                activeView =
                  'ranking'
              "
            >
              Live Ranking
            </button>

            <button
              type="button"
              class="min-h-10 rounded-lg px-4 text-sm font-bold transition"
              :class="
                activeView
                === 'integrity'
                  ? 'bg-primary/12 text-primary'
                  : 'text-muted hover:bg-default hover:text-highlighted'
              "
              @click="
                activeView =
                  'integrity'
              "
            >
              Activity Review
            </button>
          </div>

          <UInput
            v-model="query"
            icon="i-lucide-search"
            placeholder="Search student"
            class="w-full lg:ml-auto lg:max-w-sm"
          />
        </div>
      </UCard>

      <UCard
        v-if="
          activeView
          === 'progress'
        "
      >
        <template #header>
          <div>
            <h2 class="font-black text-highlighted">
              Student progress
            </h2>

            <p class="mt-1 text-sm text-muted">
              The roster includes every active member. Progress is separated into correct, wrong, unanswered, timed-out, and remaining questions. "Closes in" is the shared class schedule deadline.
            </p>
          </div>
        </template>

        <div class="table-shell table-scroll">
          <table class="app-table">
            <thead>
              <tr>
                <th>
                  Student
                </th>
                <th>
                  Status
                </th>
                <th>
                  Progress
                </th>
                <th>
                  Closes in
                </th>
                <th>
                  Answer outcomes
                </th>
                <th>
                  Activity
                </th>
                <th>
                  Last activity
                </th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="student in filteredStudents"
                :key="student.studentId"
              >
                <td>
                  <p class="font-black text-highlighted">
                    {{ student.studentName }}
                  </p>

                  <p class="mt-1 text-xs text-muted">
                    {{
                      student.studentNumber
                      || "No student number"
                    }}
                  </p>
                </td>

                <td>
                  <StatusPill
                    :status="
                      student.status
                    "
                  />
                </td>

                <td>
                  <div class="min-w-36">
                    <div class="flex justify-between text-xs text-muted">
                      <span>
                        {{ student.correctCount + student.wrongCount + student.unansweredCount }}
                        /
                        {{ student.questionCount }}
                        resolved
                      </span>

                      <span>
                        {{ student.progressPercent }}%
                      </span>
                    </div>

                    <UProgress
                      class="mt-2"
                      :model-value="student.progressPercent"
                      :max="100"
                      color="primary"
                      size="sm"
                    />
                  </div>
                </td>

                <td class="font-mono text-sm">
                  {{
                    student.status
                    === "in_progress"
                      ? formatRemaining(
                          monitor.delivery.endsAt,
                        )
                      : "—"
                  }}
                </td>

                <td>
                  <AssessmentOutcomeProgress
                    :correct-count="student.correctCount"
                    :wrong-count="student.wrongCount"
                    :unanswered-count="student.unansweredCount"
                    :timed-out-count="student.timedOutCount"
                    :remaining-count="student.remainingCount"
                    :total="student.questionCount"
                    compact
                  />
                </td>

                <td>
                  <UBadge
                    v-if="student.integrity.signalCount > 0"
                    :color="student.integrity.highPriorityCount > 0 ? 'error' : 'warning'"
                    variant="soft"
                  >
                    <UIcon
                      name="i-lucide-shield-alert"
                      class="mr-1 size-3.5"
                    />
                    {{ student.integrity.signalCount }}
                    event{{ student.integrity.signalCount === 1 ? '' : 's' }}
                  </UBadge>

                  <UBadge
                    v-else
                    color="success"
                    variant="soft"
                  >
                    No recorded activity
                  </UBadge>
                </td>

                <td class="text-sm text-muted">
                  {{
                    formatDate(
                      student.lastActivityAt,
                    )
                  }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </UCard>

      <UCard
        v-else-if="
          activeView
          === 'ranking'
        "
      >
        <template #header>
          <div>
            <h2 class="font-black text-highlighted">
              Live ranking
            </h2>

            <p class="mt-1 text-sm text-muted">
              Ranking is server-calculated. Numeric scores stay hidden here; use the outcome colors to follow each student’s assessment progress.
            </p>
          </div>
        </template>

        <EmptyPanel
          v-if="
            rankingStudents.length
            === 0
          "
          icon="i-lucide-trophy"
          title="No ranking yet"
          description="Students appear after they begin answering the assessment."
        />

        <div
          v-else
          class="space-y-3"
        >
          <div
            v-for="student in rankingStudents"
            :key="student.studentId"
            class="flex flex-col gap-3 rounded-xl border border-default p-4 sm:flex-row sm:items-center"
          >
            <div
              class="flex size-10 shrink-0 items-center justify-center rounded-xl font-black"
              :class="
                student.rank
                === 1
                  ? 'bg-amber-400 text-amber-950'
                  : 'bg-elevated text-highlighted'
              "
            >
              {{ student.rank }}
            </div>

            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <p class="font-black text-highlighted">
                  {{ student.studentName }}
                </p>

                <StatusPill :status="student.status" />
              </div>

              <p class="mt-1 text-xs text-muted">
                {{ student.correctCount + student.wrongCount + student.unansweredCount }}
                /
                {{ student.questionCount }}
                questions resolved
              </p>

              <AssessmentOutcomeProgress
                class="mt-3 max-w-2xl"
                :correct-count="student.correctCount"
                :wrong-count="student.wrongCount"
                :unanswered-count="student.unansweredCount"
                :timed-out-count="student.timedOutCount"
                :remaining-count="student.remainingCount"
                :total="student.questionCount"
              />
            </div>
          </div>
        </div>
      </UCard>

      <UCard v-else>
        <template #header>
          <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 class="font-black text-highlighted">
                Student assessment activity
              </h2>

              <p class="mt-1 max-w-3xl text-sm text-muted">
                Students with recorded activity appear below. Open a student only when you need to review the details.
              </p>
            </div>

            <div class="flex shrink-0 flex-wrap gap-x-4 gap-y-1.5 text-xs">
              <span class="inline-flex items-center gap-1.5 text-muted">
                <span class="size-2 rounded-full bg-error" aria-hidden="true" />
                Needs closer review
              </span>
              <span class="inline-flex items-center gap-1.5 text-muted">
                <span class="size-2 rounded-full bg-warning" aria-hidden="true" />
                Check context
              </span>
              <span class="inline-flex items-center gap-1.5 text-muted">
                <span class="size-2 rounded-full bg-primary" aria-hidden="true" />
                Recorded activity
              </span>
            </div>
          </div>
        </template>

        <EmptyPanel
          v-if="integrityStudents.length === 0"
          icon="i-lucide-circle-check-big"
          title="No activity to review"
          description="No focus changes or restricted browser actions have been recorded for students in this session."
        />

        <div
          v-else
          class="space-y-2"
        >
          <UCollapsible
            v-for="student in integrityStudents"
            :key="student.studentId"
            class="overflow-hidden rounded-xl border border-default bg-elevated/20"
          >
            <template #default="{ open }">
              <button
                type="button"
                class="flex w-full items-center gap-3 px-3.5 py-3 text-left transition hover:bg-elevated/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset sm:px-4"
              >
                <div
                  class="flex size-9 shrink-0 items-center justify-center rounded-lg"
                  :class="{
                    'bg-error/10 text-error': student.integrity.highPriorityCount > 0,
                    'bg-warning/10 text-warning': student.integrity.highPriorityCount === 0 && student.integrity.mediumPriorityCount > 0,
                    'bg-primary/10 text-primary': student.integrity.highPriorityCount === 0 && student.integrity.mediumPriorityCount === 0,
                  }"
                >
                  <UIcon
                    name="i-lucide-activity"
                    class="size-4"
                  />
                </div>

                <div class="min-w-0 flex-1 sm:max-w-56">
                  <div class="flex items-center gap-2">
                    <p class="truncate font-black text-highlighted">
                      {{ student.studentName }}
                    </p>

                    <UBadge
                      color="neutral"
                      variant="soft"
                      size="sm"
                    >
                      {{ student.integrity.signalCount }}
                      event{{ student.integrity.signalCount === 1 ? '' : 's' }}
                    </UBadge>
                  </div>

                  <p class="mt-0.5 truncate text-xs text-muted">
                    {{ student.studentNumber || 'No student number' }}
                    <span class="md:hidden">
                      · {{ integrityEventLabel(student.integrity.latestEventType) }}
                    </span>
                  </p>
                </div>

                <div class="hidden min-w-0 flex-1 md:block">
                  <p class="truncate text-sm font-semibold text-highlighted">
                    {{ integrityEventLabel(student.integrity.latestEventType) }}
                  </p>

                  <p class="mt-0.5 text-xs text-muted">
                    {{ formatDate(student.integrity.latestSignalAt) }}
                  </p>
                </div>

                <div class="ml-auto flex shrink-0 items-center gap-2">
                  <span class="hidden text-xs font-medium text-muted sm:inline">
                    {{ open ? 'Hide activity' : 'Review activity' }}
                  </span>

                  <UIcon
                    :name="open ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
                    class="size-4 text-muted"
                  />
                </div>
              </button>
            </template>

            <template #content>
              <div class="border-t border-default bg-default/30 px-3.5 py-2 sm:px-4">
                <div class="mb-2 flex items-center justify-between gap-3 md:hidden">
                  <div class="min-w-0">
                    <p class="text-[11px] font-medium uppercase tracking-wide text-muted">
                      Most recent activity
                    </p>
                    <p class="truncate text-sm font-semibold text-highlighted">
                      {{ integrityEventLabel(student.integrity.latestEventType) }}
                    </p>
                  </div>

                  <p class="shrink-0 text-xs text-muted">
                    {{ formatDate(student.integrity.latestSignalAt) }}
                  </p>
                </div>

                <div class="max-h-72 divide-y divide-default overflow-y-auto pr-1">
                  <div
                    v-for="event in student.integrity.recentEvents"
                    :key="`${event.eventType}-${event.receivedAt}-${event.questionIndex ?? 'none'}`"
                    class="flex items-center gap-3 py-2.5"
                  >
                    <div
                      class="flex size-8 shrink-0 items-center justify-center rounded-lg"
                      :class="{
                        'bg-error/10 text-error': event.severity === 'high',
                        'bg-warning/10 text-warning': event.severity === 'medium',
                        'bg-primary/10 text-primary': event.severity === 'low',
                        'bg-elevated text-muted': !['high', 'medium', 'low'].includes(event.severity),
                      }"
                    >
                      <UIcon
                        :name="integrityEventIcon(event.eventType)"
                        class="size-4"
                      />
                    </div>

                    <div class="min-w-0 flex-1">
                      <p class="truncate text-sm font-semibold text-highlighted">
                        {{ integrityEventLabel(event.eventType) }}
                      </p>

                      <p class="mt-0.5 text-xs text-muted sm:hidden">
                        <span v-if="event.questionIndex !== null">
                          Question {{ event.questionIndex + 1 }} ·
                        </span>
                        {{ formatDate(event.receivedAt) }}
                      </p>
                    </div>

                    <UBadge
                      v-if="event.questionIndex !== null"
                      color="neutral"
                      variant="soft"
                      size="sm"
                      class="hidden shrink-0 sm:inline-flex"
                    >
                      Question {{ event.questionIndex + 1 }}
                    </UBadge>

                    <span class="hidden shrink-0 text-xs text-muted sm:inline">
                      {{ formatDate(event.receivedAt) }}
                    </span>
                  </div>
                </div>
              </div>
            </template>
          </UCollapsible>
        </div>
      </UCard>
    </template>


  </div>
</template>
