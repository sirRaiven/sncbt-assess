<script setup lang="ts">
import type {
  CsvColumn,
} from "~/utils/instructor-report-export";

import type {
  InstructorAssessmentDetailedReport,
  InstructorAssessmentReportClassRow,
  InstructorQuestionAnalysisRow,
  InstructorStudentResultRow,
} from "~/types/instructor-report";

import {
  downloadCsv,
  printCurrentReport,
} from "~/utils/instructor-report-export";

definePageMeta({
  layout:
    "instructor",
});

useSeoMeta({
  title:
    "Assessment Report",
});

const route =
  useRoute();

const {
  getAssessmentReport,
} = useInstructorReports();

const assessmentId =
  computed(
    () =>
      String(
        route.params.id,
      ),
  );

const report =
  ref<
    InstructorAssessmentDetailedReport
    | null
  >(
    null,
  );

const isLoading =
  ref(true);

const activeSection =
  ref<
    | "classes"
    | "students"
    | "questions"
  >(
    "students",
  );

const query =
  ref("");

const errorModalOpen =
  ref(false);

const errorMessage =
  ref("");

const normalizedQuery =
  computed(
    () =>
      query.value
        .trim()
        .toLowerCase(),
  );

const filteredClasses =
  computed(
    () => {
      const rows =
        report.value?.classes
        ?? [];

      if (
        !normalizedQuery.value
      ) {
        return rows;
      }

      return rows.filter(
        (row) =>
          [
            row.classroomName,
            row.subjectCode,
            row.section,
            row.schoolYear,
            row.semester,
          ]
            .join(" ")
            .toLowerCase()
            .includes(
              normalizedQuery.value,
            ),
      );
    },
  );

const filteredStudents =
  computed(
    () => {
      const rows =
        report.value?.students
        ?? [];

      if (
        !normalizedQuery.value
      ) {
        return rows;
      }

      return rows.filter(
        (row) =>
          [
            row.studentName,
            row.studentNumber,
            row.email,
            row.classroomName,
            row.section,
            row.status,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(
              normalizedQuery.value,
            ),
      );
    },
  );

const filteredQuestions =
  computed(
    () => {
      const rows =
        report.value?.questions
        ?? [];

      if (
        !normalizedQuery.value
      ) {
        return rows;
      }

      return rows.filter(
        (row) =>
          [
            row.questionText,
            row.questionType,
          ]
            .join(" ")
            .toLowerCase()
            .includes(
              normalizedQuery.value,
            ),
      );
    },
  );

const activeCount =
  computed(
    () => {
      if (
        activeSection.value
        === "classes"
      ) {
        return filteredClasses.value
          .length;
      }

      if (
        activeSection.value
        === "students"
      ) {
        return filteredStudents.value
          .length;
      }

      return filteredQuestions.value
        .length;
    },
  );

function formatPercent(
  value: number | null,
): string {
  return value === null
    ? "—"
    : `${value.toFixed(1)}%`;
}

function formatDuration(
  seconds: number | null,
): string {
  if (
    seconds === null
  ) {
    return "—";
  }

  if (
    seconds < 60
  ) {
    return `${Math.round(
      seconds,
    )} sec`;
  }

  const minutes =
    Math.floor(
      seconds / 60,
    );

  const remainingSeconds =
    Math.round(
      seconds % 60,
    );

  if (
    minutes < 60
  ) {
    return remainingSeconds > 0
      ? `${minutes}m ${remainingSeconds}s`
      : `${minutes} min`;
  }

  const hours =
    Math.floor(
      minutes / 60,
    );

  const remainingMinutes =
    minutes % 60;

  return `${hours}h ${remainingMinutes}m`;
}

function formatDateTime(
  value: string | null,
): string {
  if (!value) {
    return "—";
  }

  return new Intl
    .DateTimeFormat(
      "en-PH",
      {
        dateStyle:
          "medium",
        timeStyle:
          "short",
        timeZone:
          "Asia/Manila",
      },
    )
    .format(
      new Date(value),
    );
}

function readableValue(
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

function showError(
  message: string,
): void {
  errorMessage.value =
    message;

  errorModalOpen.value =
    true;
}

async function loadReport():
  Promise<void> {
  isLoading.value =
    true;

  const result =
    await getAssessmentReport(
      assessmentId.value,
    );

  if (
    result.error
    || !result.data
  ) {
    isLoading.value =
      false;

    showError(
      result.error
      || "The assessment report could not be loaded.",
    );

    return;
  }

  report.value =
    result.data;

  isLoading.value =
    false;
}

function exportStudents():
  void {
  if (!report.value) {
    return;
  }

  const columns:
    CsvColumn<
      InstructorStudentResultRow
    >[] = [
      {
        header:
          "Student",
        value:
          (row) =>
            row.studentName,
      },
      {
        header:
          "Student Number",
        value:
          (row) =>
            row.studentNumber,
      },
      {
        header:
          "Class",
        value:
          (row) =>
            row.classroomName,
      },
      {
        header:
          "Section",
        value:
          (row) =>
            row.section,
      },
      {
        header:
          "Status",
        value:
          (row) =>
            readableValue(
              row.status,
            ),
      },
      {
        header:
          "Score",
        value:
          (row) =>
            row.score,
      },
      {
        header:
          "Maximum Score",
        value:
          (row) =>
            row.maximumScore,
      },
      {
        header:
          "Percentage",
        value:
          (row) =>
            row.percentage,
      },
      {
        header:
          "Correct",
        value:
          (row) =>
            row.correctCount,
      },
      {
        header:
          "Wrong",
        value:
          (row) =>
            row.wrongCount,
      },
      {
        header:
          "Unanswered",
        value:
          (row) =>
            row.unansweredCount,
      },
      {
        header:
          "Started",
        value:
          (row) =>
            formatDateTime(
              row.startedAt,
            ),
      },
      {
        header:
          "Submitted",
        value:
          (row) =>
            formatDateTime(
              row.submittedAt,
            ),
      },
      {
        header:
          "Completion Time",
        value:
          (row) =>
            formatDuration(
              row.durationSeconds,
            ),
      },
    ];

  downloadCsv(
    `${report.value.assessment.subjectCode}-${report.value.assessment.id}-student-results.csv`,
    columns,
    filteredStudents.value,
  );
}

function exportQuestions():
  void {
  if (!report.value) {
    return;
  }

  const columns:
    CsvColumn<
      InstructorQuestionAnalysisRow
    >[] = [
      {
        header:
          "Question Number",
        value:
          (row) =>
            row.orderNumber,
      },
      {
        header:
          "Question",
        value:
          (row) =>
            row.questionText,
      },
      {
        header:
          "Type",
        value:
          (row) =>
            readableValue(
              row.questionType,
            ),
      },
      {
        header:
          "Points",
        value:
          (row) =>
            row.points,
      },
      {
        header:
          "Presented",
        value:
          (row) =>
            row.attemptsPresented,
      },
      {
        header:
          "Answered",
        value:
          (row) =>
            row.answeredCount,
      },
      {
        header:
          "Correct",
        value:
          (row) =>
            row.correctCount,
      },
      {
        header:
          "Wrong",
        value:
          (row) =>
            row.wrongCount,
      },
      {
        header:
          "Unanswered",
        value:
          (row) =>
            row.unansweredCount,
      },
      {
        header:
          "Accuracy %",
        value:
          (row) =>
            row.accuracyPercentage,
      },
      {
        header:
          "Average Points",
        value:
          (row) =>
            row.averagePoints,
      },
      {
        header:
          "Average Response Time",
        value:
          (row) =>
            formatDuration(
              row.averageResponseSeconds,
            ),
      },
    ];

  downloadCsv(
    `${report.value.assessment.subjectCode}-${report.value.assessment.id}-question-analysis.csv`,
    columns,
    filteredQuestions.value,
  );
}

function exportClasses():
  void {
  if (!report.value) {
    return;
  }

  const columns:
    CsvColumn<
      InstructorAssessmentReportClassRow
    >[] = [
      {
        header:
          "Class",
        value:
          (row) =>
            row.classroomName,
      },
      {
        header:
          "Subject Code",
        value:
          (row) =>
            row.subjectCode,
      },
      {
        header:
          "Section",
        value:
          (row) =>
            row.section,
      },
      {
        header:
          "School Year",
        value:
          (row) =>
            row.schoolYear,
      },
      {
        header:
          "Semester",
        value:
          (row) =>
            row.semester,
      },
      {
        header:
          "Active Students",
        value:
          (row) =>
            row.activeStudents,
      },
      {
        header:
          "Deliveries",
        value:
          (row) =>
            row.deliveryCount,
      },
      {
        header:
          "Expected Submissions",
        value:
          (row) =>
            row.expectedSubmissions,
      },
      {
        header:
          "Completed Attempts",
        value:
          (row) =>
            row.completedAttempts,
      },
      {
        header:
          "Completion Rate",
        value:
          (row) =>
            `${row.completionRate}%`,
      },
      {
        header:
          "Average %",
        value:
          (row) =>
            row.averagePercentage,
      },
      {
        header:
          "Highest %",
        value:
          (row) =>
            row.highestPercentage,
      },
      {
        header:
          "Lowest %",
        value:
          (row) =>
            row.lowestPercentage,
      },
    ];

  downloadCsv(
    `${report.value.assessment.subjectCode}-${report.value.assessment.id}-class-summary.csv`,
    columns,
    filteredClasses.value,
  );
}

function exportActiveSection():
  void {
  if (
    activeSection.value
    === "classes"
  ) {
    exportClasses();

    return;
  }

  if (
    activeSection.value
    === "students"
  ) {
    exportStudents();

    return;
  }

  exportQuestions();
}

onMounted(
  loadReport,
);
</script>

<template>
  <div class="page-stack report-print-area">
    <InstructorReportPrintHeader
      v-if="report"
      title="Assessment Performance Report"
      :subtitle="
        `${report.assessment.subjectCode} · ${report.assessment.title}`
      "
      period="All recorded classroom deliveries"
      :generated-at="
        report.generatedAt
      "
    />

    <PageHeader
      class="no-print"
      eyebrow="Assessment report"
      :title="
        report?.assessment.title
        || 'Assessment Report'
      "
      :description="
        report
          ? `${report.assessment.subjectCode} · ${readableValue(report.assessment.assessmentType)}`
          : 'Loading assessment performance'
      "
    >
      <template #actions>
        <div class="no-print flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <UButton
            to="/instructor/reports"
            color="neutral"
            variant="outline"
            icon="i-lucide-arrow-left"
          >
            Reports
          </UButton>

          <UButton
            color="neutral"
            variant="outline"
            icon="i-lucide-printer"
            :disabled="isLoading"
            @click="printCurrentReport"
          >
            Print
          </UButton>

          <UButton
            icon="i-lucide-file-spreadsheet"
            :disabled="
              isLoading
              || activeCount === 0
            "
            @click="exportActiveSection"
          >
            Export CSV
          </UButton>
        </div>
      </template>
    </PageHeader>

    <div
      v-if="isLoading"
      class="space-y-4"
    >
      <USkeleton class="h-36 rounded-xl" />
      <USkeleton class="h-96 rounded-xl" />
    </div>

    <template
      v-else-if="report"
    >
      <section class="rounded-xl bg-gradient-to-r from-blue-900 via-blue-800 to-violet-800 p-5 text-white sm:p-6">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div class="flex flex-wrap gap-2">
              <UBadge
                color="neutral"
                variant="soft"
              >
                {{ report.assessment.subjectCode }}
              </UBadge>

              <StatusPill
                :status="
                  report.assessment.status
                "
              />
            </div>

            <h1 class="mt-4 text-2xl font-black sm:text-3xl">
              {{ report.assessment.title }}
            </h1>

            <p class="mt-2 text-sm text-blue-100">
              {{ report.assessment.questionCount }}
              questions
              ·
              {{ report.assessment.totalPoints }}
              total points
              ·
              {{ report.summary.classCount }}
              class{{
                report.summary.classCount === 1
                  ? ""
                  : "es"
              }}
            </p>
          </div>

          <div class="rounded-xl bg-white/10 p-4">
            <p class="text-xs font-bold uppercase tracking-[0.14em] text-blue-100">
              Overall class average
            </p>

            <p class="mt-2 text-3xl font-black">
              {{
                formatPercent(
                  report.summary.averagePercentage,
                )
              }}
            </p>
          </div>
        </div>
      </section>

      <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
        <StatCard
          label="Classes"
          :value="
            String(
              report.summary.classCount,
            )
          "
          icon="i-lucide-school"
        />

        <StatCard
          label="Deliveries"
          :value="
            String(
              report.summary.deliveryCount,
            )
          "
          icon="i-lucide-calendar-check"
          tone="info"
        />

        <StatCard
          label="Expected"
          :value="
            String(
              report.summary.expectedSubmissions,
            )
          "
          icon="i-lucide-users"
          tone="neutral"
        />

        <StatCard
          label="Completed"
          :value="
            String(
              report.summary.completedAttempts,
            )
          "
          icon="i-lucide-circle-check-big"
          tone="success"
        />

        <StatCard
          label="Completion"
          :value="
            formatPercent(
              report.summary.completionRate,
            )
          "
          icon="i-lucide-chart-no-axes-combined"
          tone="primary"
        />

        <StatCard
          label="Average"
          :value="
            formatPercent(
              report.summary.averagePercentage,
            )
          "
          icon="i-lucide-gauge"
          tone="info"
        />

        <StatCard
          label="Highest"
          :value="
            formatPercent(
              report.summary.highestPercentage,
            )
          "
          icon="i-lucide-trophy"
          tone="warning"
        />

        <StatCard
          label="Average time"
          :value="
            formatDuration(
              report.summary.averageDurationSeconds,
            )
          "
          icon="i-lucide-clock-3"
          tone="neutral"
        />
      </section>

      <UCard class="no-print">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div class="no-print overflow-x-auto">
            <div class="flex min-w-max rounded-xl border border-default bg-elevated p-1">
              <button
                type="button"
                class="min-h-10 rounded-lg px-4 text-sm font-bold transition"
                :class="
                  activeSection
                    === 'students'
                    ? 'bg-primary/12 text-primary'
                    : 'text-muted hover:bg-default hover:text-highlighted'
                "
                @click="
                  activeSection =
                    'students'
                "
              >
                Student Results
              </button>

              <button
                type="button"
                class="min-h-10 rounded-lg px-4 text-sm font-bold transition"
                :class="
                  activeSection
                    === 'classes'
                    ? 'bg-primary/12 text-primary'
                    : 'text-muted hover:bg-default hover:text-highlighted'
                "
                @click="
                  activeSection =
                    'classes'
                "
              >
                Class Breakdown
              </button>

              <button
                type="button"
                class="min-h-10 rounded-lg px-4 text-sm font-bold transition"
                :class="
                  activeSection
                    === 'questions'
                    ? 'bg-primary/12 text-primary'
                    : 'text-muted hover:bg-default hover:text-highlighted'
                "
                @click="
                  activeSection =
                    'questions'
                "
              >
                Question Analysis
              </button>
            </div>
          </div>

          <UBadge
            class="lg:ml-auto"
            color="neutral"
            variant="soft"
          >
            {{ activeCount }}
            record{{
              activeCount === 1
                ? ""
                : "s"
            }}
          </UBadge>

          <UInput
            v-model="query"
            icon="i-lucide-search"
            placeholder="Search this report"
            class="no-print w-full lg:max-w-sm"
          />
        </div>
      </UCard>

      <section
        v-if="
          activeSection
          === 'students'
        "
      >
        <EmptyPanel
          v-if="
            filteredStudents.length
            === 0
          "
          icon="i-lucide-graduation-cap"
          title="No student results"
          description="Student results will appear after attempts are started."
        />

        <template v-else>
          <div class="report-desktop-table hidden table-shell table-scroll lg:block">
            <table class="app-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Class</th>
                  <th>Status</th>
                  <th>Score</th>
                  <th>Correct / Wrong</th>
                  <th>Unanswered</th>
                  <th>Completion time</th>
                  <th>Submitted</th>
                </tr>
              </thead>

              <tbody>
                <tr
                  v-for="row in filteredStudents"
                  :key="row.attemptId"
                >
                  <td>
                    <p class="font-black text-highlighted">
                      {{ row.studentName }}
                    </p>

                    <p class="mt-1 text-xs text-muted">
                      {{ row.studentNumber || row.email || "Student" }}
                    </p>
                  </td>

                  <td>
                    <p class="font-semibold text-highlighted">
                      {{ row.classroomName }}
                    </p>

                    <p class="mt-1 text-xs text-muted">
                      {{ row.section }}
                    </p>
                  </td>

                  <td>
                    <StatusPill
                      :status="row.status"
                    />
                  </td>

                  <td>
                    <p class="font-black text-highlighted">
                      {{ row.score }}
                      /
                      {{ row.maximumScore }}
                    </p>

                    <p class="mt-1 text-xs text-muted">
                      {{ formatPercent(row.percentage) }}
                    </p>
                  </td>

                  <td>
                    <span class="font-bold text-success">
                      {{ row.correctCount }}
                    </span>

                    <span class="mx-1 text-muted">
                      /
                    </span>

                    <span class="font-bold text-error">
                      {{ row.wrongCount }}
                    </span>
                  </td>

                  <td>
                    {{ row.unansweredCount }}
                  </td>

                  <td>
                    {{
                      formatDuration(
                        row.durationSeconds,
                      )
                    }}
                  </td>

                  <td>
                    {{
                      formatDateTime(
                        row.submittedAt,
                      )
                    }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="report-mobile-cards space-y-3 lg:hidden">
            <UCard
              v-for="row in filteredStudents"
              :key="row.attemptId"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="font-black text-highlighted">
                    {{ row.studentName }}
                  </p>

                  <p class="mt-1 text-xs text-muted">
                    {{ row.studentNumber || row.email || "Student" }}
                  </p>
                </div>

                <StatusPill
                  :status="row.status"
                />
              </div>

              <p class="mt-3 text-sm text-muted">
                {{ row.classroomName }}
                ·
                {{ row.section }}
              </p>

              <div class="mt-4 grid grid-cols-2 gap-3">
                <div class="rounded-lg bg-elevated p-3">
                  <p class="text-xs text-muted">
                    Score
                  </p>

                  <p class="mt-1 font-black text-highlighted">
                    {{ row.score }}
                    /
                    {{ row.maximumScore }}
                  </p>
                </div>

                <div class="rounded-lg bg-elevated p-3">
                  <p class="text-xs text-muted">
                    Percentage
                  </p>

                  <p class="mt-1 font-black text-highlighted">
                    {{ formatPercent(row.percentage) }}
                  </p>
                </div>
              </div>

              <p class="mt-3 text-xs text-muted">
                {{ row.correctCount }}
                correct
                ·
                {{ row.wrongCount }}
                wrong
                ·
                {{ row.unansweredCount }}
                unanswered
                ·
                {{ formatDuration(row.durationSeconds) }}
              </p>
            </UCard>
          </div>
        </template>
      </section>

      <section
        v-else-if="
          activeSection
          === 'classes'
        "
      >
        <EmptyPanel
          v-if="
            filteredClasses.length
            === 0
          "
          icon="i-lucide-school"
          title="No class breakdown"
          description="This assessment has not been delivered to a class yet."
        />

        <div
          v-else
          class="grid gap-4 xl:grid-cols-2"
        >
          <UCard
            v-for="row in filteredClasses"
            :key="row.classroomId"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-xs font-bold text-primary">
                  {{ row.subjectCode }}
                  ·
                  {{ row.section }}
                </p>

                <h2 class="mt-2 font-black text-highlighted">
                  {{ row.classroomName }}
                </h2>

                <p class="mt-1 text-xs text-muted">
                  {{ row.schoolYear }}
                  ·
                  {{ row.semester }}
                </p>
              </div>

              <UBadge
                color="neutral"
                variant="soft"
              >
                {{ row.deliveryCount }}
                {{
                  row.deliveryCount === 1
                    ? "delivery"
                    : "deliveries"
                }}
              </UBadge>
            </div>

            <div class="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div class="rounded-lg bg-elevated p-3">
                <p class="text-xs text-muted">
                  Students
                </p>
                <p class="mt-1 font-black text-highlighted">
                  {{ row.activeStudents }}
                </p>
              </div>

              <div class="rounded-lg bg-elevated p-3">
                <p class="text-xs text-muted">
                  Completion
                </p>
                <p class="mt-1 font-black text-highlighted">
                  {{ formatPercent(row.completionRate) }}
                </p>
              </div>

              <div class="rounded-lg bg-elevated p-3">
                <p class="text-xs text-muted">
                  Average
                </p>
                <p class="mt-1 font-black text-highlighted">
                  {{ formatPercent(row.averagePercentage) }}
                </p>
              </div>

              <div class="rounded-lg bg-elevated p-3">
                <p class="text-xs text-muted">
                  Highest
                </p>
                <p class="mt-1 font-black text-highlighted">
                  {{ formatPercent(row.highestPercentage) }}
                </p>
              </div>
            </div>
          </UCard>
        </div>
      </section>

      <section v-else>
        <EmptyPanel
          v-if="
            filteredQuestions.length
            === 0
          "
          icon="i-lucide-list-checks"
          title="No question analysis"
          description="Question statistics will appear after students complete the assessment."
        />

        <template v-else>
          <div class="report-desktop-table hidden table-shell table-scroll lg:block">
            <table class="app-table">
              <thead>
                <tr>
                  <th>Question</th>
                  <th>Responses</th>
                  <th>Correct</th>
                  <th>Wrong</th>
                  <th>Accuracy</th>
                  <th>Average points</th>
                  <th>Average response time</th>
                </tr>
              </thead>

              <tbody>
                <tr
                  v-for="row in filteredQuestions"
                  :key="row.questionId"
                >
                  <td class="max-w-xl">
                    <p class="font-black text-highlighted">
                      Q{{ row.orderNumber }}
                      ·
                      {{ row.questionText }}
                    </p>

                    <p class="mt-1 text-xs text-muted">
                      {{ readableValue(row.questionType) }}
                      ·
                      {{ row.points }}
                      point{{
                        row.points === 1
                          ? ""
                          : "s"
                      }}
                    </p>
                  </td>

                  <td>
                    {{ row.answeredCount }}
                    /
                    {{ row.attemptsPresented }}
                  </td>

                  <td>
                    <span class="font-black text-success">
                      {{ row.correctCount }}
                    </span>
                  </td>

                  <td>
                    <span class="font-black text-error">
                      {{ row.wrongCount }}
                    </span>
                  </td>

                  <td>
                    <span class="font-black text-highlighted">
                      {{ formatPercent(row.accuracyPercentage) }}
                    </span>
                  </td>

                  <td>
                    {{
                      row.averagePoints
                      === null
                        ? "—"
                        : `${row.averagePoints.toFixed(2)} / ${row.points}`
                    }}
                  </td>

                  <td>
                    {{
                      formatDuration(
                        row.averageResponseSeconds,
                      )
                    }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="report-mobile-cards space-y-3 lg:hidden">
            <UCard
              v-for="row in filteredQuestions"
              :key="row.questionId"
            >
              <p class="text-xs font-bold text-primary">
                Question
                {{ row.orderNumber }}
              </p>

              <p class="mt-2 font-black text-highlighted">
                {{ row.questionText }}
              </p>

              <div class="mt-4 grid grid-cols-2 gap-3">
                <div class="rounded-lg bg-elevated p-3">
                  <p class="text-xs text-muted">
                    Accuracy
                  </p>

                  <p class="mt-1 font-black text-highlighted">
                    {{ formatPercent(row.accuracyPercentage) }}
                  </p>
                </div>

                <div class="rounded-lg bg-elevated p-3">
                  <p class="text-xs text-muted">
                    Responses
                  </p>

                  <p class="mt-1 font-black text-highlighted">
                    {{ row.answeredCount }}
                    /
                    {{ row.attemptsPresented }}
                  </p>
                </div>
              </div>
            </UCard>
          </div>
        </template>
      </section>

      <p class="text-xs text-muted">
        Generated:
        {{
          formatDateTime(
            report.generatedAt,
          )
        }}
        · Expected submissions use current class membership and are never lower than recorded attempts.
      </p>
    </template>

    <UModal
      v-model:open="errorModalOpen"
    >
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-start gap-3">
              <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-error/10 text-error">
                <UIcon
                  name="i-lucide-circle-alert"
                  class="size-5"
                />
              </div>

              <div>
                <h2 class="font-black text-highlighted">
                  Assessment report unavailable
                </h2>

                <p class="mt-1 text-sm text-muted">
                  {{ errorMessage }}
                </p>
              </div>
            </div>
          </template>

          <div class="flex justify-end gap-2">
            <UButton
              to="/instructor/reports"
              color="neutral"
              variant="outline"
            >
              Back to Reports
            </UButton>

            <UButton
              @click="
                errorModalOpen =
                  false
              "
            >
              Close
            </UButton>
          </div>
        </UCard>
      </template>
    </UModal>
  </div>
</template>

<style>
@media print {
  body * {
    visibility: hidden !important;
  }

  .report-print-area,
  .report-print-area * {
    visibility: visible !important;
  }

  .report-print-area {
    position: absolute !important;
    inset: 0 auto auto 0 !important;
    width: 100% !important;
    padding: 0 !important;
    color: #111827 !important;
    background: white !important;
  }

  .no-print {
    display: none !important;
  }

  .report-desktop-table {
    display: block !important;
  }

  .report-mobile-cards {
    display: none !important;
  }

  .report-print-area table {
    width: 100% !important;
    border-collapse: collapse !important;
  }

  .report-print-area th,
  .report-print-area td {
    border: 1px solid #d1d5db !important;
    padding: 7px !important;
    color: #111827 !important;
    background: white !important;
    font-size: 10px !important;
  }

  .report-print-area .text-muted,
  .report-print-area .text-highlighted {
    color: #111827 !important;
  }
}
</style>
