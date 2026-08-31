<script setup lang="ts">
import type {
  InstructorStudentProgressDetail,
  InstructorStudentProgressOverview,
  StudentProgressListItem,
  StudentRecentResponse,
} from "~/types/instructor-student-progress";

definePageMeta({
  layout:
    "instructor",
});

useSeoMeta({
  title:
    "Student Progress",
});

const {
  getOverview,
  getStudentDetail,
} =
  useInstructorStudentProgress();

const overview =
  ref<
    InstructorStudentProgressOverview
    | null
  >(
    null,
  );

const selectedStudentId =
  ref("");

const ALL_CLASSES_VALUE =
  "__all_classes__";

const selectedClassroom =
  ref(
    ALL_CLASSES_VALUE,
  );

const ALL_ASSESSMENTS_VALUE =
  "__all_assessments__";

const selectedAssessment =
  ref(
    ALL_ASSESSMENTS_VALUE,
  );

const query =
  ref("");

const detail =
  ref<
    InstructorStudentProgressDetail
    | null
  >(
    null,
  );

interface RecentResponseGroup {
  key: string;
  attemptId: string;
  assessmentId: string;
  classroomId: string | null;
  assessmentTitle: string;
  subjectCode: string;
  classroomName: string;
  attemptNumber: number;
  latestActivityAt: string;
  responses: StudentRecentResponse[];
}

const recentResponseGroups =
  computed<
    RecentResponseGroup[]
  >(
    () => {
      const attemptsById =
        new Map(
          (
            detail.value
              ?.attempts
            ?? []
          ).map(
            (attempt) => [
              attempt.attemptId,
              attempt,
            ],
          ),
        );

      const groups =
        new Map<
          string,
          RecentResponseGroup
        >();

      for (
        const activity
        of detail.value
          ?.recentActivity
        ?? []
      ) {
        const key =
          activity.attemptId;

        const existing =
          groups.get(
            key,
          );

        if (existing) {
          existing.responses.push(
            activity,
          );

          if (
            Date.parse(
              activity.activityAt,
            )
            > Date.parse(
                existing.latestActivityAt,
              )
          ) {
            existing.latestActivityAt =
              activity.activityAt;
          }

          continue;
        }

        groups.set(
          key,
          {
            key,
            attemptId:
              activity.attemptId,
            assessmentId:
              attemptsById.get(
                activity.attemptId,
              )?.assessmentId
              ?? activity.attemptId,
            classroomId:
              attemptsById.get(
                activity.attemptId,
              )?.classroomId
              ?? null,
            assessmentTitle:
              activity.assessmentTitle,
            subjectCode:
              activity.subjectCode,
            classroomName:
              activity.classroomName,
            attemptNumber:
              activity.attemptNumber,
            latestActivityAt:
              activity.activityAt,
            responses: [
              activity,
            ],
          },
        );
      }

      return [
        ...groups.values(),
      ].sort(
        (
          first,
          second,
        ) =>
          Date.parse(
            second.latestActivityAt,
          )
          - Date.parse(
              first.latestActivityAt,
            ),
      );
    },
  );

const classScopedAttempts =
  computed(
    () =>
      (
        detail.value
          ?.attempts
        ?? []
      ).filter(
        (attempt) =>
          selectedClassroom.value
            === ALL_CLASSES_VALUE
          || attempt.classroomId
            === selectedClassroom.value,
      ),
  );

const assessmentItems =
  computed(
    () => {
      const seen =
        new Set<string>();

      const items =
        classScopedAttempts.value
          .filter(
            (attempt) => {
              if (
                seen.has(
                  attempt.assessmentId,
                )
              ) {
                return false;
              }

              seen.add(
                attempt.assessmentId,
              );

              return true;
            },
          )
          .map(
            (attempt) => ({
              label:
                `${attempt.subjectCode} · ${attempt.assessmentTitle}`,
              value:
                attempt.assessmentId,
            }),
          );

      return [
        {
          label:
            "All assessments",
          value:
            ALL_ASSESSMENTS_VALUE,
        },
        ...items,
      ];
    },
  );

const filteredRecentResponseGroups =
  computed(
    () =>
      recentResponseGroups.value
        .filter(
          (group) =>
            selectedClassroom.value
              === ALL_CLASSES_VALUE
            || group.classroomId
              === selectedClassroom.value,
        )
        .filter(
          (group) =>
            selectedAssessment.value
              === ALL_ASSESSMENTS_VALUE
            || group.assessmentId
              === selectedAssessment.value,
        ),
  );

const hasResponseFilters =
  computed(
    () =>
      selectedClassroom.value
        !== ALL_CLASSES_VALUE
      || selectedAssessment.value
        !== ALL_ASSESSMENTS_VALUE,
  );

const isLoadingOverview =
  ref(true);

const isLoadingDetail =
  ref(false);

const errorMessage =
  ref("");

const classroomItems =
  computed(
    () => [
      {
        label:
          "All classes",
        value:
          ALL_CLASSES_VALUE,
      },
      ...(
        overview.value
          ?.classes
        ?? []
      ).map(
        (classroom) => ({
          label:
            `${classroom.subjectCode} · ${classroom.name} · ${classroom.section}`,
          value:
            classroom.id,
        }),
      ),
    ],
  );

const filteredStudents =
  computed(
    () => {
      const rows =
        overview.value
          ?.students
        ?? [];

      const keyword =
        query.value
          .trim()
          .toLowerCase();

      return rows.filter(
        (student) => {
          const inClass =
            selectedClassroom.value
              === ALL_CLASSES_VALUE
            || student.classrooms
              .some(
                (classroom) =>
                  classroom.id
                  === selectedClassroom.value,
              );

          const matches =
            !keyword
            || [
                student.name,
                student.studentNumber,
                ...student.classrooms
                  .flatMap(
                    (classroom) => [
                      classroom.name,
                      classroom.subjectCode,
                      classroom.section,
                    ],
                  ),
              ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(
                  keyword,
                );

          return (
            inClass
            && matches
          );
        },
      );
    },
  );

const selectedStudent =
  computed<
    StudentProgressListItem
    | null
  >(
    () =>
      overview.value
        ?.students
        .find(
          (student) =>
            student.studentId
            === selectedStudentId.value,
        )
      ?? null,
  );

const latestAttempt =
  computed(
    () =>
      classScopedAttempts.value
        .find(
          (attempt) =>
            selectedAssessment.value
              === ALL_ASSESSMENTS_VALUE
            || attempt.assessmentId
              === selectedAssessment.value,
        )
      ?? null,
  );

const latestAttemptProgress =
  computed(
    () => {
      const attempt =
        latestAttempt.value;

      if (
        !attempt
        || attempt.questionCount
          <= 0
      ) {
        return 0;
      }

      return Math.min(
        100,
        Math.max(
          0,
          (
            attempt.answeredCount
            / attempt.questionCount
          ) * 100,
        ),
      );
    },
  );

function formatDateTime(
  value:
    string
    | null
    | undefined,
): string {
  if (!value) {
    return "No activity yet";
  }

  const date =
    new Date(
      value,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat(
    "en-PH",
    {
      timeZone:
        "Asia/Manila",
      month:
        "short",
      day:
        "numeric",
      year:
        "numeric",
      hour:
        "numeric",
      minute:
        "2-digit",
    },
  ).format(
    date,
  );
}

function formatPercent(
  value:
    number
    | null
    | undefined,
): string {
  return value
    === null
    || value
      === undefined
      ? "—"
      : `${Math.round(value)}%`;
}

function formatDuration(
  seconds:
    number
    | null
    | undefined,
): string {
  if (
    seconds
    === null
    || seconds
      === undefined
  ) {
    return "—";
  }

  if (
    seconds < 60
  ) {
    return `${Math.max(0, Math.round(seconds))}s`;
  }

  const minutes =
    Math.floor(
      seconds / 60,
    );

  const remaining =
    Math.round(
      seconds % 60,
    );

  return `${minutes}m ${remaining}s`;
}

function initials(
  name: string,
): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map(
      (part) =>
        part.charAt(0),
    )
    .slice(
      0,
      2,
    )
    .join("")
    .toUpperCase()
    || "ST";
}

async function loadOverview(): Promise<void> {
  isLoadingOverview.value =
    true;

  errorMessage.value =
    "";

  const result =
    await getOverview();

  if (
    result.error
    || !result.data
  ) {
    overview.value =
      null;

    errorMessage.value =
      result.error
      || "Student progress could not be loaded.";

    isLoadingOverview.value =
      false;

    return;
  }

  overview.value =
    result.data;

  const visible =
    filteredStudents.value;

  if (
    !selectedStudentId.value
    || !visible.some(
      (student) =>
        student.studentId
        === selectedStudentId.value,
    )
  ) {
    selectedStudentId.value =
      visible[0]
        ?.studentId
      ?? "";
  }

  isLoadingOverview.value =
    false;
}

async function loadStudent(
  studentId: string,
): Promise<void> {
  if (!studentId) {
    detail.value =
      null;

    return;
  }

  isLoadingDetail.value =
    true;

  const result =
    await getStudentDetail(
      studentId,
    );

  if (
    result.error
    || !result.data
  ) {
    detail.value =
      null;

    errorMessage.value =
      result.error
      || "Student progress could not be loaded.";

    isLoadingDetail.value =
      false;

    return;
  }

  detail.value =
    result.data;

  isLoadingDetail.value =
    false;
}

function selectStudent(
  studentId: string,
): void {
  if (
    selectedStudentId.value
    !== studentId
  ) {
    selectedAssessment.value =
      ALL_ASSESSMENTS_VALUE;
  }

  selectedStudentId.value =
    studentId;
}

watch(
  selectedStudentId,
  (studentId) => {
    selectedAssessment.value =
      ALL_ASSESSMENTS_VALUE;

    void loadStudent(
      studentId,
    );
  },
);

watch(
  [
    selectedClassroom,
    assessmentItems,
  ],
  () => {
    if (
      selectedAssessment.value
        === ALL_ASSESSMENTS_VALUE
    ) {
      return;
    }

    if (
      !assessmentItems.value
        .some(
          (item) =>
            item.value
            === selectedAssessment.value,
        )
    ) {
      selectedAssessment.value =
        ALL_ASSESSMENTS_VALUE;
    }
  },
);

watch(
  [
    selectedClassroom,
    query,
  ],
  () => {
    const visible =
      filteredStudents.value;

    if (
      visible.length
      === 0
    ) {
      return;
    }

    if (
      !visible.some(
        (student) =>
          student.studentId
          === selectedStudentId.value,
      )
    ) {
      selectedStudentId.value =
        visible[0]
          .studentId;
    }
  },
);

onMounted(
  async () => {
    await loadOverview();

    if (
      selectedStudentId.value
    ) {
      await loadStudent(
        selectedStudentId.value,
      );
    }
  },
);
</script>

<template>
  <div class="mx-auto w-full max-w-7xl space-y-5 sm:space-y-6">
    <PageHeader
      :breadcrumbs="[
        {
          label: 'Overview',
          to: '/instructor/dashboard',
          icon: 'i-lucide-layout-dashboard',
        },
        {
          label: 'Student Progress',
        },
      ]"
      eyebrow="Student activity"
      title="Student progress"
      description="Check each Student's progress and review their answers when they need help."
    >
      <template #actions>
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-refresh-cw"
          :loading="isLoadingOverview"
          @click="loadOverview"
        >
          Refresh
        </UButton>
      </template>
    </PageHeader>

    <UAlert
      v-if="errorMessage"
      color="error"
      variant="soft"
      title="Student progress unavailable"
      :description="errorMessage"
    />

    <UCard
      :ui="{
        body: 'p-4 sm:p-5',
      }"
    >
      <div class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(18rem,24rem)]">
        <UFormField label="Class">
          <USelect
            v-model="selectedClassroom"
            :items="classroomItems"
            value-key="value"
            label-key="label"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Assessment">
          <USelect
            v-model="selectedAssessment"
            :items="assessmentItems"
            value-key="value"
            label-key="label"
            :disabled="isLoadingDetail || !detail"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Find a Student">
          <UInput
            v-model="query"
            icon="i-lucide-search"
            placeholder="Name or Student number"
            class="w-full"
          />
        </UFormField>
      </div>
    </UCard>

    <div
      v-if="isLoadingOverview"
      class="grid gap-5 xl:grid-cols-[22rem_minmax(0,1fr)]"
    >
      <USkeleton class="h-[34rem] rounded-2xl" />

      <div class="space-y-5">
        <USkeleton class="h-40 rounded-2xl" />
        <USkeleton class="h-64 rounded-2xl" />
        <USkeleton class="h-80 rounded-2xl" />
      </div>
    </div>

    <EmptyPanel
      v-else-if="filteredStudents.length === 0"
      icon="i-lucide-users"
      title="No Students found"
      description="No active Students match the selected class or search."
    />

    <div
      v-else
      class="grid items-start gap-5 xl:grid-cols-[22rem_minmax(0,1fr)]"
    >
      <aside class="xl:sticky xl:top-24">
        <UCard
          class="overflow-hidden"
          :ui="{
            body: 'p-0',
          }"
        >
          <template #header>
            <div class="flex items-center justify-between gap-3">
              <div>
                <h2 class="font-black text-highlighted">
                  Students
                </h2>

                <p class="mt-1 text-xs text-muted">
                  {{ filteredStudents.length }} active Student{{ filteredStudents.length === 1 ? "" : "s" }}
                </p>
              </div>
            </div>
          </template>

          <div class="max-h-[68vh] divide-y divide-default overflow-y-auto">
            <button
              v-for="student in filteredStudents"
              :key="student.studentId"
              type="button"
              class="w-full px-4 py-4 text-left transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
              :class="
                selectedStudentId === student.studentId
                  ? 'bg-primary/10'
                  : ''
              "
              @click="selectStudent(student.studentId)"
            >
              <div class="flex items-start gap-3">
                <UAvatar
                  :src="student.avatarUrl || undefined"
                  :text="initials(student.name)"
                  :alt="student.name"
                  size="md"
                  class="shrink-0"
                />

                <div class="min-w-0 flex-1">
                  <p class="truncate font-bold text-highlighted">
                    {{ student.name }}
                  </p>

                  <p class="mt-0.5 text-xs text-muted">
                    {{ student.studentNumber || "Student" }}
                  </p>

                  <div class="mt-3 flex items-center justify-between gap-3 text-xs">
                    <span class="text-muted">
                      {{ student.completedCount }} / {{ student.assignedCount }} completed
                    </span>

                    <span class="font-bold text-highlighted">
                      {{ formatPercent(student.completionRate) }}
                    </span>
                  </div>

                  <UProgress
                    class="mt-2"
                    :model-value="student.completionRate"
                  />

                  <p class="mt-2 truncate text-[11px] text-muted">
                    Last activity: {{ formatDateTime(student.lastActivityAt) }}
                  </p>
                </div>
              </div>
            </button>
          </div>
        </UCard>
      </aside>

      <main class="min-w-0 space-y-5">
        <div
          v-if="isLoadingDetail"
          class="space-y-5"
        >
          <USkeleton class="h-40 rounded-2xl" />
          <USkeleton class="h-64 rounded-2xl" />
          <USkeleton class="h-80 rounded-2xl" />
        </div>

        <template v-else-if="detail">
          <UCard>
            <div class="flex min-w-0 items-start gap-4">
              <UAvatar
                :src="detail.student.avatarUrl || undefined"
                :text="initials(detail.student.name)"
                :alt="detail.student.name"
                size="xl"
                class="shrink-0 ring-2 ring-primary/10"
              />

              <div class="min-w-0 flex-1">
                <p class="text-xs font-bold uppercase tracking-[0.12em] text-primary">
                  Student
                </p>

                <h2 class="mt-1 break-words text-xl font-black leading-tight text-highlighted sm:text-2xl">
                  {{ detail.student.name }}
                </h2>

                <p class="mt-1 text-sm text-muted">
                  {{ detail.student.studentNumber || "Student number unavailable" }}
                </p>

                <div class="mt-3 flex flex-wrap gap-2">
                  <UBadge
                    v-for="classroom in detail.student.classrooms"
                    :key="classroom.id"
                    color="neutral"
                    variant="soft"
                  >
                    {{ classroom.subjectCode }} · {{ classroom.section }}
                  </UBadge>
                </div>

                <div class="mt-5 border-t border-default pt-4">
                  <div class="grid gap-x-6 gap-y-4 sm:grid-cols-3">
                    <div>
                      <p class="text-sm text-muted">
                        Progress
                      </p>

                      <p class="mt-1 text-base font-black text-highlighted sm:text-lg">
                        <template v-if="latestAttempt">
                          {{ latestAttempt.answeredCount }} / {{ latestAttempt.questionCount }} answered
                        </template>

                        <template v-else>
                          No attempt yet
                        </template>
                      </p>
                    </div>

                    <div>
                      <p class="text-sm text-muted">
                        Score
                      </p>

                      <p class="mt-1 text-base font-black text-highlighted sm:text-lg">
                        <template v-if="latestAttempt">
                          {{ latestAttempt.score }} / {{ latestAttempt.maximumScore }}
                          <span class="text-muted">
                            ({{ formatPercent(latestAttempt.percentage) }})
                          </span>
                        </template>

                        <template v-else>
                          —
                        </template>
                      </p>
                    </div>

                    <div>
                      <p class="text-sm text-muted">
                        Last activity
                      </p>

                      <p class="mt-1 text-base font-black leading-5 text-highlighted sm:text-lg">
                        {{
                          formatDateTime(
                            latestAttempt?.lastActivityAt
                            || latestAttempt?.submittedAt
                            || latestAttempt?.startedAt
                            || detail.summary.lastActivityAt,
                          )
                        }}
                      </p>
                    </div>
                  </div>

                  <UProgress
                    class="mt-4"
                    :model-value="latestAttemptProgress"
                  />
                </div>
              </div>
            </div>
          </UCard>

          <UCard>
            <template #header>
              <div>
                <h2 class="font-black text-highlighted">
                  Assessment responses
                </h2>

                <p class="mt-1 text-sm text-muted">
                  Review recorded answers for the selected class and assessment.
                </p>
              </div>
            </template>

            <EmptyPanel
              v-if="filteredRecentResponseGroups.length === 0"
              icon="i-lucide-clipboard-list"
              :title="hasResponseFilters ? 'No matching responses' : 'No responses yet'"
              :description="
                hasResponseFilters
                  ? 'This Student has no recorded responses for the selected class or assessment.'
                  : 'This Student has not answered an assessment question yet.'
              "
            />

            <div
              v-else
              class="space-y-4"
            >
              <section
                v-for="group in filteredRecentResponseGroups"
                :key="group.key"
                class="overflow-hidden rounded-2xl border border-default"
              >
                <header class="border-b border-primary/10 bg-primary/5 px-4 py-4 sm:px-5 dark:bg-primary/10">
                  <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div class="min-w-0">
                      <p class="text-xs font-bold uppercase tracking-[0.1em] text-primary">
                        Assessment
                      </p>

                      <h3 class="mt-1 break-words text-base font-black leading-6 text-highlighted sm:text-lg">
                        {{ group.assessmentTitle }}
                      </h3>

                      <p class="mt-1 text-xs text-muted">
                        {{ group.subjectCode }}
                        · {{ group.classroomName }}
                        · Attempt {{ group.attemptNumber }}
                      </p>
                    </div>

                    <div class="flex shrink-0 items-center gap-2">
                      <UBadge
                        color="neutral"
                        variant="soft"
                        size="sm"
                      >
                        {{ group.responses.length }}
                        answer{{ group.responses.length === 1 ? "" : "s" }}
                      </UBadge>

                      <span class="text-xs text-muted">
                        {{ formatDateTime(group.latestActivityAt) }}
                      </span>
                    </div>
                  </div>
                </header>

                <div class="divide-y divide-default">
                  <article
                    v-for="activity in group.responses"
                    :key="`${activity.attemptId}-${activity.activityAt}-${activity.questionNumber}`"
                    class="px-4 py-4 sm:px-5"
                  >
                    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div class="min-w-0 flex-1">
                        <div class="flex flex-wrap items-center gap-2">
                          <UBadge
                            color="neutral"
                            variant="soft"
                            size="sm"
                          >
                            {{
                              activity.questionNumber
                                ? `Question ${activity.questionNumber}`
                                : "Question"
                            }}
                          </UBadge>

                          <UBadge
                            :color="
                              activity.isCorrect === true
                                ? 'success'
                                : activity.isCorrect === false
                                  ? 'error'
                                  : 'neutral'
                            "
                            variant="soft"
                            size="sm"
                          >
                            {{
                              activity.isCorrect === true
                                ? "Correct"
                                : activity.isCorrect === false
                                  ? "Incorrect"
                                  : activity.isFinal
                                    ? "Recorded"
                                    : "Saved"
                            }}
                          </UBadge>
                        </div>

                        <h4 class="mt-2 whitespace-pre-wrap text-sm font-bold leading-6 text-highlighted sm:text-base">
                          {{ activity.questionText }}
                        </h4>
                      </div>

                      <div class="shrink-0 text-xs text-muted sm:text-right">
                        <p>{{ formatDateTime(activity.activityAt) }}</p>
                        <p class="mt-1">
                          Response time: {{ formatDuration(activity.responseSeconds) }}
                        </p>
                      </div>
                    </div>

                    <div
                      class="mt-4 grid gap-3"
                      :class="
                        activity.isCorrect === false
                        && activity.correctAnswerPreview
                          ? 'md:grid-cols-2'
                          : 'grid-cols-1'
                      "
                    >
                      <div class="rounded-xl bg-elevated/60 p-4">
                        <p class="text-xs font-bold uppercase tracking-[0.08em] text-muted">
                          Student answer
                        </p>

                        <p class="mt-2 break-words text-sm font-semibold leading-6 text-highlighted">
                          {{ activity.responsePreview }}
                        </p>
                      </div>

                      <div
                        v-if="
                          activity.isCorrect === false
                          && activity.correctAnswerPreview
                        "
                        class="rounded-xl border border-success/20 bg-success/5 p-4"
                      >
                        <p class="text-xs font-bold uppercase tracking-[0.08em] text-success">
                          Correct answer
                        </p>

                        <p class="mt-2 break-words text-sm font-semibold leading-6 text-highlighted">
                          {{ activity.correctAnswerPreview }}
                        </p>
                      </div>
                    </div>

                    <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                      <span v-if="activity.awardedPoints !== null">
                        Awarded: {{ activity.awardedPoints }} point{{ activity.awardedPoints === 1 ? "" : "s" }}
                      </span>

                      <span v-if="activity.speedBonus > 0">
                        Speed bonus: +{{ activity.speedBonus }}
                      </span>
                    </div>
                  </article>
                </div>
              </section>
            </div>
          </UCard>

        </template>

        <EmptyPanel
          v-else
          icon="i-lucide-users"
          title="Select a Student"
          description="Choose a Student from the list to review their assessment progress."
        />
      </main>
    </div>
  </div>
</template>
