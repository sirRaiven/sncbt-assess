<script setup lang="ts">
import type {
  AttemptReviewQuestion,
  InstructorAttemptReview,
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
  reviewAttempt,
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

const query =
  ref("");

const detail =
  ref<
    InstructorStudentProgressDetail
    | null
  >(
    null,
  );

const attemptReview =
  ref<
    InstructorAttemptReview
    | null
  >(
    null,
  );

interface RecentResponseGroup {
  key: string;
  attemptId: string;
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

const isLoadingOverview =
  ref(true);

const isLoadingDetail =
  ref(false);

const isLoadingReview =
  ref(false);

const errorMessage =
  ref("");

const reviewError =
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

function statusLabel(
  value: string,
): string {
  return value
    .replaceAll(
      "_",
      " ",
    )
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase(),
    );
}

function attemptStatusColor(
  status: string,
):
  | "success"
  | "warning"
  | "error"
  | "neutral"
  | "primary" {
  if (
    [
      "submitted",
      "auto_submitted",
    ].includes(
      status,
    )
  ) {
    return "success";
  }

  if (
    status
    === "in_progress"
  ) {
    return "primary";
  }

  if (
    status
    === "locked"
  ) {
    return "warning";
  }

  if (
    status
    === "cancelled"
  ) {
    return "error";
  }

  return "neutral";
}

function responseState(
  question:
    AttemptReviewQuestion,
): {
  label: string;
  color:
    | "success"
    | "error"
    | "warning"
    | "neutral";
} {
  if (
    question.timedOut
  ) {
    return {
      label:
        "Timed out",
      color:
        "warning",
    };
  }

  if (
    !question.studentResponse
      .answered
  ) {
    return {
      label:
        "Unanswered",
      color:
        "neutral",
    };
  }

  if (
    question.isCorrect
    === true
  ) {
    return {
      label:
        "Correct",
      color:
        "success",
    };
  }

  if (
    question.isCorrect
    === false
  ) {
    return {
      label:
        "Incorrect",
      color:
        "error",
    };
  }

  return {
    label:
      question.studentResponse
        .isFinal
        ? "Recorded"
        : "Saved",
    color:
      "neutral",
  };
}

function studentResponseText(
  question:
    AttemptReviewQuestion,
): string {
  if (
    !question.studentResponse
      .answered
  ) {
    return "No response";
  }

  switch (
    question.type
  ) {
    case "multiple_choice":
    case "checkbox":
      return (
        question.studentResponse
          .selectedOptions
          .join(", ")
        || "No choice selected"
      );

    case "fill_blank":
      return (
        question.studentResponse
          .textResponse
        || "No text response"
      );

    case "true_false":
      return question.studentResponse
        .booleanResponse
        === null
        ? "No True/False response"
        : question.studentResponse
          .booleanResponse
          ? "True"
          : "False";

    case "true_false_correction": {
      const booleanText =
        question.studentResponse
          .booleanResponse
          === null
          ? "No True/False response"
          : question.studentResponse
            .booleanResponse
            ? "True"
            : "False";

      return question.studentResponse
        .textResponse
        ? `${booleanText} — ${question.studentResponse.textResponse}`
        : booleanText;
    }

    default:
      return "Response recorded";
  }
}

function answerKeyText(
  question:
    AttemptReviewQuestion,
): string {
  switch (
    question.type
  ) {
    case "multiple_choice":
    case "checkbox":
      return (
        question.answerKey
          .correctOptions
          .join(", ")
        || "No answer key"
      );

    case "fill_blank":
      return (
        question.answerKey
          .acceptedAnswers
          .join(" | ")
        || "No accepted answer configured"
      );

    case "true_false":
      return question.answerKey
        .correctBoolean
        === null
        ? "No answer key"
        : question.answerKey
          .correctBoolean
          ? "True"
          : "False";

    case "true_false_correction": {
      const booleanText =
        question.answerKey
          .correctBoolean
          === null
          ? "No answer key"
          : question.answerKey
            .correctBoolean
            ? "True"
            : "False";

      const correction =
        question.answerKey
          .acceptedAnswers
          .join(" | ");

      return correction
        ? `${booleanText} — ${correction}`
        : booleanText;
    }

    default:
      return "No answer key";
  }
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

  attemptReview.value =
    null;

  reviewError.value =
    "";

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

async function openAttemptReview(
  attemptId: string,
): Promise<void> {
  isLoadingReview.value =
    true;

  reviewError.value =
    "";

  const result =
    await reviewAttempt(
      attemptId,
    );

  if (
    result.error
    || !result.data
  ) {
    attemptReview.value =
      null;

    reviewError.value =
      result.error
      || "The Student responses could not be loaded.";

    isLoadingReview.value =
      false;

    return;
  }

  attemptReview.value =
    result.data;

  isLoadingReview.value =
    false;

  await nextTick();

  document
    .getElementById(
      "attempt-response-review",
    )
    ?.scrollIntoView({
      behavior:
        "smooth",
      block:
        "start",
    });
}

function selectStudent(
  studentId: string,
): void {
  selectedStudentId.value =
    studentId;
}

watch(
  selectedStudentId,
  (studentId) => {
    void loadStudent(
      studentId,
    );
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
      description="Review assessment progress, recent responses, and question-by-question answers when a Student needs help."
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
      <div class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
        <UFormField label="Class">
          <USelect
            v-model="selectedClassroom"
            :items="classroomItems"
            value-key="value"
            label-key="label"
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
            <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
              <div class="flex min-w-0 items-center gap-4">
                <UAvatar
                  :src="detail.student.avatarUrl || undefined"
                  :text="initials(detail.student.name)"
                  :alt="detail.student.name"
                  size="xl"
                  class="shrink-0 ring-2 ring-primary/10"
                />

                <div class="min-w-0">
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
                </div>
              </div>

              <div class="rounded-xl bg-elevated/60 px-4 py-3 lg:min-w-48">
                <p class="text-xs font-bold uppercase tracking-[0.08em] text-muted">
                  Last activity
                </p>

                <p class="mt-1 text-sm font-semibold text-highlighted">
                  {{ formatDateTime(detail.summary.lastActivityAt) }}
                </p>
              </div>
            </div>

            <div class="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div class="rounded-xl bg-elevated/60 p-4">
                <p class="text-xs font-bold uppercase tracking-[0.08em] text-muted">
                  Assigned
                </p>
                <p class="mt-1 text-2xl font-black text-highlighted">
                  {{ detail.summary.assignedCount }}
                </p>
              </div>

              <div class="rounded-xl bg-elevated/60 p-4">
                <p class="text-xs font-bold uppercase tracking-[0.08em] text-muted">
                  Completed attempts
                </p>
                <p class="mt-1 text-2xl font-black text-highlighted">
                  {{ detail.summary.completedCount }}
                </p>
              </div>

              <div class="rounded-xl bg-elevated/60 p-4">
                <p class="text-xs font-bold uppercase tracking-[0.08em] text-muted">
                  In progress
                </p>
                <p class="mt-1 text-2xl font-black text-highlighted">
                  {{ detail.summary.inProgressCount }}
                </p>
              </div>

              <div class="rounded-xl bg-elevated/60 p-4">
                <p class="text-xs font-bold uppercase tracking-[0.08em] text-muted">
                  Average score
                </p>
                <p class="mt-1 text-2xl font-black text-highlighted">
                  {{ formatPercent(detail.summary.averagePercentage) }}
                </p>
              </div>
            </div>
          </UCard>

          <UCard>
            <template #header>
              <div>
                <h2 class="font-black text-highlighted">
                  Recent responses
                </h2>

                <p class="mt-1 text-sm text-muted">
                  Latest question responses grouped by assessment attempt.
                </p>
              </div>
            </template>

            <EmptyPanel
              v-if="recentResponseGroups.length === 0"
              icon="i-lucide-clipboard-list"
              title="No recent responses"
              description="This Student has not recorded an assessment response yet."
            />

            <div
              v-else
              class="space-y-4"
            >
              <section
                v-for="group in recentResponseGroups"
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
                        response{{ group.responses.length === 1 ? "" : "s" }}
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
                          Student response
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

          <UCard>
            <template #header>
              <div>
                <h2 class="font-black text-highlighted">
                  Assessment activity
                </h2>

                <p class="mt-1 text-sm text-muted">
                  Open an attempt to review the Student's response to every question.
                </p>
              </div>
            </template>

            <EmptyPanel
              v-if="detail.attempts.length === 0"
              icon="i-lucide-clipboard-list"
              title="No assessment attempts"
              description="This Student has not started one of your assessments yet."
            />

            <div
              v-else
              class="space-y-3"
            >
              <div
                v-for="attempt in detail.attempts"
                :key="attempt.attemptId"
                class="rounded-xl border border-default p-4"
              >
                <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap items-center gap-2">
                      <h3 class="font-black text-highlighted">
                        {{ attempt.assessmentTitle }}
                      </h3>

                      <UBadge
                        :color="attemptStatusColor(attempt.status)"
                        variant="soft"
                        size="sm"
                      >
                        {{ statusLabel(attempt.status) }}
                      </UBadge>

                      <UBadge
                        color="neutral"
                        variant="soft"
                        size="sm"
                      >
                        Attempt {{ attempt.attemptNumber }}
                      </UBadge>

                      <UBadge
                        color="neutral"
                        variant="soft"
                        size="sm"
                      >
                        {{ attempt.source === "live" ? "Live session" : "Scheduled" }}
                      </UBadge>
                    </div>

                    <p class="mt-1 text-xs text-muted">
                      {{ attempt.subjectCode }} · {{ attempt.classroomName }}
                    </p>

                    <div class="mt-3 grid gap-3 sm:grid-cols-3">
                      <div>
                        <p class="text-xs text-muted">Progress</p>
                        <p class="mt-1 font-bold text-highlighted">
                          {{ attempt.answeredCount }} / {{ attempt.questionCount }} answered
                        </p>
                      </div>

                      <div>
                        <p class="text-xs text-muted">Score</p>
                        <p class="mt-1 font-bold text-highlighted">
                          {{ attempt.score }} / {{ attempt.maximumScore }}
                          <span class="text-muted">
                            ({{ formatPercent(attempt.percentage) }})
                          </span>
                        </p>
                      </div>

                      <div>
                        <p class="text-xs text-muted">Last activity</p>
                        <p class="mt-1 font-bold text-highlighted">
                          {{ formatDateTime(attempt.lastActivityAt || attempt.submittedAt || attempt.startedAt) }}
                        </p>
                      </div>
                    </div>

                    <UProgress
                      class="mt-3"
                      :model-value="
                        attempt.questionCount
                          ? (attempt.answeredCount / attempt.questionCount) * 100
                          : 0
                      "
                    />
                  </div>

                  <UButton
                    color="neutral"
                    variant="outline"
                    icon="i-lucide-eye"
                    :loading="
                      isLoadingReview
                      && attemptReview?.attempt.attemptId === attempt.attemptId
                    "
                    @click="openAttemptReview(attempt.attemptId)"
                  >
                    Review responses
                  </UButton>
                </div>
              </div>
            </div>
          </UCard>

          <section
            id="attempt-response-review"
            class="scroll-mt-24"
          >
            <UAlert
              v-if="reviewError"
              color="error"
              variant="soft"
              title="Responses unavailable"
              :description="reviewError"
            />

            <UCard
              v-if="isLoadingReview"
            >
              <div class="space-y-4">
                <USkeleton class="h-10 w-2/3 rounded" />
                <USkeleton class="h-32 rounded-xl" />
                <USkeleton class="h-32 rounded-xl" />
                <USkeleton class="h-32 rounded-xl" />
              </div>
            </UCard>

            <UCard
              v-else-if="attemptReview"
            >
              <template #header>
                <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p class="text-xs font-bold uppercase tracking-[0.1em] text-primary">
                      Question-by-question review
                    </p>

                    <h2 class="mt-1 text-lg font-black text-highlighted">
                      {{ attemptReview.assessment.title }}
                    </h2>

                    <p class="mt-1 text-sm text-muted">
                      {{ attemptReview.student.name }}
                      · Attempt {{ attemptReview.attempt.attemptNumber }}
                      <template v-if="attemptReview.classroom">
                        · {{ attemptReview.classroom.name }}
                      </template>
                    </p>
                  </div>

                  <div class="flex flex-wrap items-center gap-2">
                    <UBadge
                      :color="attemptStatusColor(attemptReview.attempt.status)"
                      variant="soft"
                    >
                      {{ statusLabel(attemptReview.attempt.status) }}
                    </UBadge>

                    <UBadge color="neutral" variant="soft">
                      {{ attemptReview.attempt.score }} / {{ attemptReview.attempt.maximumScore }}
                    </UBadge>

                    <UBadge color="neutral" variant="soft">
                      {{ formatPercent(attemptReview.attempt.percentage) }}
                    </UBadge>
                  </div>
                </div>
              </template>

              <div class="space-y-4">
                <article
                  v-for="question in attemptReview.questions"
                  :key="question.questionId"
                  class="rounded-2xl border border-default p-4 sm:p-5"
                >
                  <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div class="min-w-0">
                      <div class="flex flex-wrap items-center gap-2">
                        <UBadge color="neutral" variant="soft" size="sm">
                          Question {{ question.number }}
                        </UBadge>

                        <UBadge
                          :color="responseState(question).color"
                          variant="soft"
                          size="sm"
                        >
                          {{ responseState(question).label }}
                        </UBadge>

                        <span class="text-xs text-muted">
                          {{ question.points }} point{{ question.points === 1 ? "" : "s" }}
                        </span>
                      </div>

                      <p class="mt-3 whitespace-pre-wrap font-semibold leading-6 text-highlighted">
                        {{ question.text }}
                      </p>

                      <img
                        v-if="question.imageUrl"
                        :src="question.imageUrl"
                        alt=""
                        class="mt-3 max-h-72 rounded-xl border border-default object-contain"
                        loading="lazy"
                      >
                    </div>

                    <div class="shrink-0 text-xs text-muted sm:text-right">
                      <p>Response: {{ formatDuration(question.studentResponse.responseSeconds) }}</p>
                      <p class="mt-1">
                        Points:
                        {{
                          question.awardedPoints === null
                            ? "—"
                            : question.awardedPoints
                        }}
                        <template v-if="question.speedBonus > 0">
                          + {{ question.speedBonus }} bonus
                        </template>
                      </p>
                    </div>
                  </div>

                  <div class="mt-4 grid gap-3 lg:grid-cols-2">
                    <div class="rounded-xl bg-elevated/60 p-4">
                      <p class="text-xs font-bold uppercase tracking-[0.08em] text-muted">
                        Student response
                      </p>

                      <p class="mt-2 break-words text-sm font-semibold text-highlighted">
                        {{ studentResponseText(question) }}
                      </p>

                      <div
                        v-if="question.options.length > 0"
                        class="mt-3 space-y-2"
                      >
                        <div
                          v-for="(option, optionIndex) in question.options"
                          :key="`${question.questionId}-${optionIndex}`"
                          class="flex items-start gap-2 rounded-lg border px-3 py-2 text-sm"
                          :class="
                            option.selected
                              ? 'border-primary/30 bg-primary/5'
                              : 'border-default'
                          "
                        >
                          <span
                            class="mt-0.5 size-2 shrink-0 rounded-full"
                            :class="
                              option.selected
                                ? 'bg-primary'
                                : 'bg-muted'
                            "
                          />
                          <span class="min-w-0 flex-1">
                            {{ option.text }}
                          </span>

                          <span
                            v-if="option.selected"
                            class="text-xs font-bold text-primary"
                          >
                            Selected
                          </span>
                        </div>
                      </div>
                    </div>

                    <div class="rounded-xl border border-success/20 bg-success/5 p-4">
                      <p class="text-xs font-bold uppercase tracking-[0.08em] text-success">
                        Instructor answer key
                      </p>

                      <p class="mt-2 break-words text-sm font-semibold text-highlighted">
                        {{ answerKeyText(question) }}
                      </p>

                      <p
                        v-if="question.answerKey.explanation"
                        class="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted"
                      >
                        {{ question.answerKey.explanation }}
                      </p>
                    </div>
                  </div>
                </article>
              </div>
            </UCard>
          </section>
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
