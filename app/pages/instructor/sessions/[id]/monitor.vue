<script setup lang="ts">
import type {
  InstructorDeliveryMonitor,
  InstructorMonitorStudent,
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
  forceSubmitAttempt,
  grantExtraTime,
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
  >(
    "progress",
  );

const query =
  ref("");

const forceSubmitModalOpen =
  ref(false);

const extraTimeModalOpen =
  ref(false);

const pendingStudent =
  ref<
    InstructorMonitorStudent
    | null
  >(
    null,
  );

const extraMinutes =
  ref(15);

const busyAction =
  ref<
    string | null
  >(
    null,
  );

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
          - Date.now()
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

function scoreLabel(
  student:
    InstructorMonitorStudent,
): string {
  return `${student.score} / ${student.maximumScore}`;
}

async function loadMonitor(
  silent = false,
): Promise<void> {
  if (silent) {
    isRefreshing.value =
      true;
  } else {
    isLoading.value =
      true;
  }

  if (!silent) {
    errorMessage.value =
      "";
  }

  const result =
    await getInstructorMonitor(
      assignmentId.value,
    );

  if (
    result.error
    || !result.data
  ) {
    if (!silent) {
      errorMessage.value =
        result.error
        || "Unable to load the assessment monitor.";
    }

    isLoading.value =
      false;

    isRefreshing.value =
      false;

    return;
  }

  monitor.value =
    result.data;

  isLoading.value =
    false;

  isRefreshing.value =
    false;
}

function requestForceSubmit(
  student:
    InstructorMonitorStudent,
): void {
  if (
    !student.attemptId
    || student.status
    !== "in_progress"
  ) {
    return;
  }

  pendingStudent.value =
    student;

  forceSubmitModalOpen.value =
    true;
}

async function confirmForceSubmit():
  Promise<void> {
  if (
    !pendingStudent.value
      ?.attemptId
  ) {
    return;
  }

  busyAction.value =
    pendingStudent.value
      .attemptId;

  const result =
    await forceSubmitAttempt(
      pendingStudent.value
        .attemptId,
    );

  if (
    result.error
    || !result.data
  ) {
    toast.add({
      title:
        "Attempt could not be submitted",
      description:
        result.error
        || "The server did not accept the instructor submission.",
      color:
        "error",
    });

    busyAction.value =
      null;

    return;
  }

  forceSubmitModalOpen.value =
    false;

  toast.add({
    title:
      "Attempt submitted",
    description:
      result.data.message,
    color:
      "success",
  });

  pendingStudent.value =
    null;

  busyAction.value =
    null;

  await loadMonitor(
    true,
  );
}

function requestExtraTime(
  student:
    InstructorMonitorStudent,
): void {
  if (
    !student.attemptId
    || student.status
    !== "in_progress"
  ) {
    return;
  }

  pendingStudent.value =
    student;

  extraMinutes.value =
    15;

  extraTimeModalOpen.value =
    true;
}

async function confirmExtraTime():
  Promise<void> {
  if (
    !pendingStudent.value
      ?.attemptId
  ) {
    return;
  }

  busyAction.value =
    pendingStudent.value
      .attemptId;

  const result =
    await grantExtraTime(
      pendingStudent.value
        .attemptId,
      extraMinutes.value,
    );

  if (
    result.error
    || !result.data
  ) {
    toast.add({
      title:
        "Extra time could not be added",
      description:
        result.error
        || "The accommodation could not be saved.",
      color:
        "error",
    });

    busyAction.value =
      null;

    return;
  }

  extraTimeModalOpen.value =
    false;

  toast.add({
    title:
      "Extra time added",
    description:
      `${extraMinutes.value} minutes were added to the student's deadline.`,
    color:
      "success",
  });

  pendingStudent.value =
    null;

  busyAction.value =
    null;

  await loadMonitor(
    true,
  );
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
            to="/instructor/sessions"
            color="neutral"
            variant="outline"
            icon="i-lucide-arrow-left"
          >
            Sessions
          </UButton>

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
              Monitoring updates every five seconds. Scores for in-progress students are provisional.
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

      <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
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

        <StatCard
          label="Class average"
          :value="
            monitor.summary.classAverage
            === null
              ? '—'
              : String(
                  monitor.summary.classAverage,
                )
          "
          icon="i-lucide-chart-column"
          tone="info"
        />

        <StatCard
          label="Highest score"
          :value="
            monitor.summary.highestScore
            === null
              ? '—'
              : String(
                  monitor.summary.highestScore,
                )
          "
          icon="i-lucide-trophy"
          tone="warning"
        />
      </section>

      <UCard>
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div class="flex rounded-xl border border-default bg-elevated p-1">
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
              Ranking and Scores
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
              The roster includes every active member of the assigned class.
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
                  Remaining
                </th>
                <th>
                  Provisional score
                </th>
                <th>
                  Last activity
                </th>
                <th>
                  Actions
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
                  <div class="min-w-40">
                    <div class="flex justify-between text-xs text-muted">
                      <span>
                        {{ student.answeredCount }}
                        /
                        {{ student.questionCount }}
                      </span>

                      <span>
                        {{ student.progressPercent }}%
                      </span>
                    </div>

                    <UProgress
                      class="mt-2"
                      :model-value="
                        student.progressPercent
                      "
                    />
                  </div>
                </td>

                <td class="font-mono text-sm">
                  {{
                    student.status
                    === "in_progress"
                      ? formatRemaining(
                          student.expiresAt,
                        )
                      : "—"
                  }}
                </td>

                <td class="font-black text-highlighted">
                  {{ scoreLabel(student) }}
                </td>

                <td class="text-sm text-muted">
                  {{
                    formatDate(
                      student.lastActivityAt,
                    )
                  }}
                </td>

                <td>
                  <div class="flex flex-wrap gap-2">
                    <UButton
                      color="warning"
                      variant="soft"
                      size="xs"
                      icon="i-lucide-clock-plus"
                      :disabled="
                        student.status
                        !== 'in_progress'
                      "
                      @click="
                        requestExtraTime(
                          student,
                        )
                      "
                    >
                      Extra Time
                    </UButton>

                    <UButton
                      color="error"
                      variant="soft"
                      size="xs"
                      icon="i-lucide-send"
                      :disabled="
                        student.status
                        !== 'in_progress'
                      "
                      @click="
                        requestForceSubmit(
                          student,
                        )
                      "
                    >
                      Force Submit
                    </UButton>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </UCard>

      <UCard v-else>
        <template #header>
          <div>
            <h2 class="font-black text-highlighted">
              Live ranking and scoring
            </h2>

            <p class="mt-1 text-sm text-muted">
              In-progress scores are provisional. Submitted scores are final.
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
              <p class="font-black text-highlighted">
                {{ student.studentName }}
              </p>

              <p class="mt-1 text-xs text-muted">
                {{ student.answeredCount }}
                /
                {{ student.questionCount }}
                answered
                ·
                {{ student.status }}
              </p>
            </div>

            <div class="text-right">
              <p class="text-xl font-black text-highlighted">
                {{ scoreLabel(student) }}
              </p>

              <p class="text-xs text-muted">
                {{
                  student.status
                  === "in_progress"
                    ? "Provisional"
                    : "Final"
                }}
              </p>
            </div>
          </div>
        </div>
      </UCard>
    </template>

    <ConfirmationModal
      v-model:open="
        forceSubmitModalOpen
      "
      title="Force-submit this attempt?"
      :description="
        pendingStudent
          ? `${pendingStudent.studentName}'s saved answers will be locked and graded immediately.`
          : 'The attempt will be submitted.'
      "
      confirm-label="Force Submit"
      confirm-color="error"
      icon="i-lucide-send"
      :loading="
        Boolean(
          busyAction,
        )
      "
      @confirm="confirmForceSubmit"
    />

    <ConfirmationModal
      v-model:open="
        extraTimeModalOpen
      "
      title="Add approved extra time?"
      :description="
        pendingStudent
          ? `Add an individual accommodation to ${pendingStudent.studentName}'s active attempt.`
          : 'Add extra time to the active attempt.'
      "
      confirm-label="Add Extra Time"
      confirm-color="warning"
      icon="i-lucide-clock-plus"
      :loading="
        Boolean(
          busyAction,
        )
      "
      @confirm="confirmExtraTime"
    >
      <UFormField
        class="mt-4"
        label="Additional minutes"
      >
        <UInput
          v-model.number="extraMinutes"
          type="number"
          min="1"
          max="120"
          class="w-full"
        />
      </UFormField>
    </ConfirmationModal>
  </div>
</template>
