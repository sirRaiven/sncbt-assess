<script setup lang="ts">
import type {
  CsvColumn,
} from "~/utils/instructor-report-export";

import type {
  InstructorAssessmentPerformanceRow,
  InstructorClassPerformanceRow,
  InstructorQuestionAnalysisRow,
  InstructorReportFilters,
  InstructorReportSection,
  InstructorReportsOverview,
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
    "Reports",
});

const {
  getOverview,
} = useInstructorReports();

const overview =
  ref<
    InstructorReportsOverview
    | null
  >(
    null,
  );

const activeSection =
  ref<InstructorReportSection>(
    "classes",
  );

const isLoading =
  ref(true);

const query =
  ref("");

const errorModalOpen =
  ref(false);

const errorMessage =
  ref("");

function localDateInput(
  date: Date,
): string {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1,
    ).padStart(
      2,
      "0",
    );

  const day =
    String(
      date.getDate(),
    ).padStart(
      2,
      "0",
    );

  return `${year}-${month}-${day}`;
}

const today =
  new Date();

const monthStart =
  new Date(
    today.getFullYear(),
    today.getMonth(),
    1,
  );

const filters =
  reactive<InstructorReportFilters>({
    dateFrom:
      localDateInput(
        monthStart,
      ),
    dateTo:
      localDateInput(
        today,
      ),
    classroomId:
      null,
    assessmentId:
      null,
  });

const summary =
  computed(
    () =>
      overview.value?.summary
      ?? {
        classesInReport:
          0,
        assessmentDeliveries:
          0,
        expectedSubmissions:
          0,
        studentsStarted:
          0,
        completedAttempts:
          0,
        autoSubmittedAttempts:
          0,
        completionRate:
          0,
        averagePercentage:
          null,
        highestPercentage:
          null,
      },
  );

const ALL_CLASSROOMS_VALUE =
  "__all_classrooms__";

const ALL_ASSESSMENTS_VALUE =
  "__all_assessments__";

const classroomItems =
  computed(
    () => [
      {
        label:
          "All classes",
        value:
          ALL_CLASSROOMS_VALUE,
      },
      ...(
        overview.value
          ?.options.classrooms
        ?? []
      ),
    ],
  );

const assessmentItems =
  computed(
    () => [
      {
        label:
          "All assessments",
        value:
          ALL_ASSESSMENTS_VALUE,
      },
      ...(
        overview.value
          ?.options.assessments
        ?? []
      ),
    ],
  );

const selectedClassroom =
  computed({
    get:
      () =>
        filters.classroomId
        || ALL_CLASSROOMS_VALUE,
    set:
      (
        value: string,
      ) => {
        filters.classroomId =
          value
            === ALL_CLASSROOMS_VALUE
          ? null
          : value;
      },
  });

const selectedAssessment =
  computed({
    get:
      () =>
        filters.assessmentId
        || ALL_ASSESSMENTS_VALUE,
    set:
      (
        value: string,
      ) => {
        filters.assessmentId =
          value
            === ALL_ASSESSMENTS_VALUE
          ? null
          : value;
      },
  });

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
        overview.value?.classes
        ?? [];

      if (
        !normalizedQuery.value
      ) {
        return rows;
      }

      return rows.filter(
        (row) =>
          [
            row.name,
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

const filteredAssessments =
  computed(
    () => {
      const rows =
        overview.value
          ?.assessments
        ?? [];

      if (
        !normalizedQuery.value
      ) {
        return rows;
      }

      return rows.filter(
        (row) =>
          [
            row.title,
            row.subjectName,
            row.subjectCode,
            row.assessmentType,
            row.status,
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
        overview.value?.students
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
            row.assessmentTitle,
            row.subjectCode,
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
        overview.value?.questions
        ?? [];

      if (
        !normalizedQuery.value
      ) {
        return rows;
      }

      return rows.filter(
        (row) =>
          [
            row.assessmentTitle,
            row.subjectCode,
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

const activeRowCount =
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
        === "assessments"
      ) {
        return filteredAssessments.value
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

const periodLabel =
  computed(
    () => {
      if (
        filters.dateFrom
        && filters.dateTo
      ) {
        return `${formatDateOnly(
          filters.dateFrom,
        )} to ${formatDateOnly(
          filters.dateTo,
        )}`;
      }

      if (
        filters.dateFrom
      ) {
        return `From ${formatDateOnly(
          filters.dateFrom,
        )}`;
      }

      if (
        filters.dateTo
      ) {
        return `Up to ${formatDateOnly(
          filters.dateTo,
        )}`;
      }

      return "All recorded deliveries";
    },
  );

const reportTitle =
  computed(
    () => ({
      classes:
        "Class Performance Report",
      assessments:
        "Assessment Performance Report",
      students:
        "Student Results Report",
      questions:
        "Question Analysis Report",
    })[activeSection.value],
  );

const searchPlaceholder =
  computed(
    () => ({
      classes:
        "Search class or section",
      assessments:
        "Search assessment",
      students:
        "Search student or assessment",
      questions:
        "Search question or assessment",
    })[activeSection.value],
  );

function formatDateOnly(
  value: string | null,
): string {
  if (!value) {
    return "All time";
  }

  return new Intl
    .DateTimeFormat(
      "en-PH",
      {
        dateStyle:
          "medium",
        timeZone:
          "Asia/Manila",
      },
    )
    .format(
      new Date(
        `${value}T00:00:00+08:00`,
      ),
    );
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

async function loadReports():
  Promise<void> {
  if (
    filters.dateFrom
    && filters.dateTo
    && filters.dateFrom
      > filters.dateTo
  ) {
    showError(
      "The starting date cannot be later than the ending date.",
    );

    return;
  }

  isLoading.value =
    true;

  const result =
    await getOverview({
      ...filters,
    });

  if (
    result.error
    || !result.data
  ) {
    isLoading.value =
      false;

    showError(
      result.error
      || "The report could not be loaded. Please try again.",
    );

    return;
  }

  overview.value =
    result.data;

  isLoading.value =
    false;
}

function resetFilters():
  void {
  filters.dateFrom =
    localDateInput(
      monthStart,
    );

  filters.dateTo =
    localDateInput(
      today,
    );

  filters.classroomId =
    null;

  filters.assessmentId =
    null;

  query.value =
    "";

  void loadReports();
}

function exportCurrentSection():
  void {
  const stamp =
    new Date()
      .toISOString()
      .slice(
        0,
        10,
      );

  if (
    activeSection.value
    === "classes"
  ) {
    const columns:
      CsvColumn<
        InstructorClassPerformanceRow
      >[] = [
        {
          header:
            "Class",
          value:
            (row) =>
              row.name,
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
            "Assessment Deliveries",
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
            "Started Attempts",
          value:
            (row) =>
              row.startedAttempts,
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
            "Average Score %",
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
        {
          header:
            "Average Time",
          value:
            (row) =>
              formatDuration(
                row.averageDurationSeconds,
              ),
        },
      ];

    downloadCsv(
      `sncbt-class-performance-${stamp}.csv`,
      columns,
      filteredClasses.value,
    );

    return;
  }

  if (
    activeSection.value
    === "assessments"
  ) {
    const columns:
      CsvColumn<
        InstructorAssessmentPerformanceRow
      >[] = [
        {
          header:
            "Assessment",
          value:
            (row) =>
              row.title,
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
            "Type",
          value:
            (row) =>
              readableValue(
                row.assessmentType,
              ),
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
            "Questions",
          value:
            (row) =>
              row.questionCount,
        },
        {
          header:
            "Points",
          value:
            (row) =>
              row.totalPoints,
        },
        {
          header:
            "Classes",
          value:
            (row) =>
              row.classCount,
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
            "Completed",
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
            "Average Score",
          value:
            (row) =>
              row.averageScore,
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
        {
          header:
            "Average Time",
          value:
            (row) =>
              formatDuration(
                row.averageDurationSeconds,
              ),
        },
      ];

    downloadCsv(
      `sncbt-assessment-performance-${stamp}.csv`,
      columns,
      filteredAssessments.value,
    );

    return;
  }

  if (
    activeSection.value
    === "students"
  ) {
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
            "Assessment",
          value:
            (row) =>
              row.assessmentTitle,
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
      `sncbt-student-results-${stamp}.csv`,
      columns,
      filteredStudents.value,
    );

    return;
  }

  const columns:
    CsvColumn<
      InstructorQuestionAnalysisRow
    >[] = [
      {
        header:
          "Assessment",
        value:
          (row) =>
            row.assessmentTitle,
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
    `sncbt-question-analysis-${stamp}.csv`,
    columns,
    filteredQuestions.value,
  );
}

onMounted(
  loadReports,
);
</script>

<template>
  <div class="page-stack report-print-area">
    <InstructorReportPrintHeader
      :title="reportTitle"
      :period="periodLabel"
      :generated-at="
        overview?.generatedAt
        || null
      "
    />

    <PageHeader
      class="no-print"
      eyebrow="Assessment reporting"
      title="Reports"
      description="Review class performance, assessment results, student scores, and question analysis from completed classroom assessments."
    >
      <template #actions>
        <div class="no-print flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <UButton
            color="neutral"
            variant="outline"
            icon="i-lucide-refresh-cw"
            :loading="isLoading"
            @click="loadReports"
          >
            Refresh
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
              || activeRowCount === 0
            "
            @click="exportCurrentSection"
          >
            Export CSV
          </UButton>
        </div>
      </template>
    </PageHeader>

    <UCard class="no-print">
      <template #header>
        <div>
          <h2 class="font-black text-highlighted">
            Report filters
          </h2>

          <p class="mt-1 text-sm text-muted">
            Choose the period, class, or assessment you want to review.
          </p>
        </div>
      </template>

      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <UFormField label="Starting date">
          <UInput
            v-model="filters.dateFrom"
            type="date"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Ending date">
          <UInput
            v-model="filters.dateTo"
            type="date"
            class="w-full"
          />
        </UFormField>

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
            class="w-full"
          />
        </UFormField>

        <div class="flex items-end gap-2">
          <UButton
            class="flex-1"
            block
            icon="i-lucide-filter"
            :loading="isLoading"
            @click="loadReports"
          >
            Apply
          </UButton>

          <UTooltip text="Reset filters">
            <UButton
              color="neutral"
              variant="outline"
              icon="i-lucide-rotate-ccw"
              square
              aria-label="Reset report filters"
              @click="resetFilters"
            />
          </UTooltip>
        </div>
      </div>
    </UCard>

    <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      <StatCard
        label="Classes"
        :value="
          String(
            summary.classesInReport,
          )
        "
        icon="i-lucide-school"
      />

      <StatCard
        label="Assessment deliveries"
        :value="
          String(
            summary.assessmentDeliveries,
          )
        "
        icon="i-lucide-calendar-check"
        tone="info"
      />

      <StatCard
        label="Students started"
        :value="
          String(
            summary.studentsStarted,
          )
        "
        icon="i-lucide-users"
        tone="primary"
      />

      <StatCard
        label="Completed attempts"
        :value="
          String(
            summary.completedAttempts,
          )
        "
        icon="i-lucide-circle-check-big"
        tone="success"
      />

      <StatCard
        label="Completion rate"
        :value="
          formatPercent(
            summary.completionRate,
          )
        "
        icon="i-lucide-chart-no-axes-combined"
        tone="info"
      />

      <StatCard
        label="Average score"
        :value="
          formatPercent(
            summary.averagePercentage,
          )
        "
        icon="i-lucide-gauge"
        tone="warning"
      />
    </section>

    <UCard class="no-print">
      <div class="flex flex-col gap-4">
        <div class="no-print overflow-x-auto">
          <div class="flex min-w-max rounded-xl border border-default bg-elevated p-1">
            <button
              type="button"
              class="flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold transition"
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
              <UIcon
                name="i-lucide-school"
                class="size-4"
              />

              Classes
            </button>

            <button
              type="button"
              class="flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold transition"
              :class="
                activeSection
                  === 'assessments'
                  ? 'bg-primary/12 text-primary'
                  : 'text-muted hover:bg-default hover:text-highlighted'
              "
              @click="
                activeSection =
                  'assessments'
              "
            >
              <UIcon
                name="i-lucide-clipboard-check"
                class="size-4"
              />

              Assessments
            </button>

            <button
              type="button"
              class="flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold transition"
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
              <UIcon
                name="i-lucide-graduation-cap"
                class="size-4"
              />

              Student Results
            </button>

            <button
              type="button"
              class="flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold transition"
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
              <UIcon
                name="i-lucide-list-checks"
                class="size-4"
              />

              Question Analysis
            </button>
          </div>
        </div>

        <div class="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div class="min-w-0 flex-1">
            <p class="text-xs font-bold uppercase tracking-[0.14em] text-muted">
              Reporting period
            </p>

            <p class="mt-1 text-sm font-semibold text-highlighted">
              {{ periodLabel }}
            </p>
          </div>

          <UBadge
            color="neutral"
            variant="soft"
          >
            {{ activeRowCount }}
            record{{
              activeRowCount === 1
                ? ""
                : "s"
            }}
          </UBadge>

          <UInput
            v-model="query"
            icon="i-lucide-search"
            :placeholder="searchPlaceholder"
            class="no-print w-full lg:max-w-sm"
          />
        </div>
      </div>
    </UCard>

    <div
      v-if="isLoading"
      class="space-y-4"
    >
      <USkeleton class="h-14 rounded-xl" />
      <USkeleton class="h-96 rounded-xl" />
    </div>

    <template v-else>
      <section
        v-if="
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
          title="No class performance records"
          description="No class assessment activity matches the selected filters."
        />

        <template v-else>
          <div class="report-desktop-table hidden table-shell table-scroll lg:block">
            <table class="app-table">
              <thead>
                <tr>
                  <th>Class</th>
                  <th>Students</th>
                  <th>Deliveries</th>
                  <th>Completion</th>
                  <th>Scores</th>
                  <th>Average time</th>
                </tr>
              </thead>

              <tbody>
                <tr
                  v-for="row in filteredClasses"
                  :key="row.id"
                >
                  <td>
                    <p class="font-black text-highlighted">
                      {{ row.name }}
                    </p>

                    <p class="mt-1 text-xs text-muted">
                      {{ row.subjectCode }}
                      ·
                      {{ row.section }}
                      ·
                      {{ row.schoolYear }}
                    </p>
                  </td>

                  <td>
                    <p class="font-black text-highlighted">
                      {{ row.activeStudents }}
                    </p>

                    <p class="mt-1 text-xs text-muted">
                      currently enrolled
                    </p>
                  </td>

                  <td>
                    <p class="font-black text-highlighted">
                      {{ row.deliveryCount }}
                    </p>

                    <p class="mt-1 text-xs text-muted">
                      {{ row.expectedSubmissions }}
                      expected submissions
                    </p>
                  </td>

                  <td>
                    <p class="font-black text-highlighted">
                      {{ row.completedAttempts }}
                      /
                      {{ row.expectedSubmissions }}
                    </p>

                    <p class="mt-1 text-xs text-muted">
                      {{ formatPercent(row.completionRate) }}
                      completion
                    </p>
                  </td>

                  <td>
                    <p class="font-black text-highlighted">
                      Avg
                      {{ formatPercent(row.averagePercentage) }}
                    </p>

                    <p class="mt-1 text-xs text-muted">
                      High
                      {{ formatPercent(row.highestPercentage) }}
                      ·
                      Low
                      {{ formatPercent(row.lowestPercentage) }}
                    </p>
                  </td>

                  <td>
                    <span class="font-semibold text-highlighted">
                      {{
                        formatDuration(
                          row.averageDurationSeconds,
                        )
                      }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="report-mobile-cards space-y-3 lg:hidden">
            <UCard
              v-for="row in filteredClasses"
              :key="row.id"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="font-black text-highlighted">
                    {{ row.name }}
                  </p>

                  <p class="mt-1 text-xs text-muted">
                    {{ row.subjectCode }}
                    ·
                    {{ row.section }}
                  </p>
                </div>

                <StatusPill
                  :status="row.status"
                />
              </div>

              <div class="mt-4 grid grid-cols-2 gap-3">
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
                    Deliveries
                  </p>
                  <p class="mt-1 font-black text-highlighted">
                    {{ row.deliveryCount }}
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
              </div>
            </UCard>
          </div>
        </template>
      </section>

      <section
        v-else-if="
          activeSection
          === 'assessments'
        "
      >
        <EmptyPanel
          v-if="
            filteredAssessments.length
            === 0
          "
          icon="i-lucide-clipboard-check"
          title="No assessment performance records"
          description="No assessment deliveries match the selected filters."
        />

        <template v-else>
          <div class="report-desktop-table hidden table-shell table-scroll lg:block">
            <table class="app-table">
              <thead>
                <tr>
                  <th>Assessment</th>
                  <th>Delivery</th>
                  <th>Completion</th>
                  <th>Average score</th>
                  <th>Score range</th>
                  <th>Average time</th>
                  <th class="no-print">Report</th>
                </tr>
              </thead>

              <tbody>
                <tr
                  v-for="row in filteredAssessments"
                  :key="row.id"
                >
                  <td>
                    <div class="flex items-start gap-3">
                      <div>
                        <p class="font-black text-highlighted">
                          {{ row.title }}
                        </p>

                        <p class="mt-1 text-xs text-muted">
                          {{ row.subjectCode }}
                          ·
                          {{ readableValue(row.assessmentType) }}
                          ·
                          {{ row.questionCount }}
                          questions
                        </p>
                      </div>

                      <StatusPill
                        :status="row.status"
                      />
                    </div>
                  </td>

                  <td>
                    <p class="font-black text-highlighted">
                      {{ row.deliveryCount }}
                      deliveries
                    </p>

                    <p class="mt-1 text-xs text-muted">
                      {{ row.classCount }}
                      classes
                      ·
                      {{ row.expectedSubmissions }}
                      expected
                    </p>
                  </td>

                  <td>
                    <p class="font-black text-highlighted">
                      {{ row.completedAttempts }}
                      completed
                    </p>

                    <p class="mt-1 text-xs text-muted">
                      {{ formatPercent(row.completionRate) }}
                      ·
                      {{ row.autoSubmittedAttempts }}
                      automatic
                    </p>
                  </td>

                  <td>
                    <p class="font-black text-highlighted">
                      {{
                        row.averageScore
                        === null
                          ? "—"
                          : `${row.averageScore.toFixed(2)} / ${row.totalPoints}`
                      }}
                    </p>

                    <p class="mt-1 text-xs text-muted">
                      {{ formatPercent(row.averagePercentage) }}
                    </p>
                  </td>

                  <td>
                    <p class="text-sm font-bold text-highlighted">
                      High
                      {{ formatPercent(row.highestPercentage) }}
                    </p>

                    <p class="mt-1 text-xs text-muted">
                      Low
                      {{ formatPercent(row.lowestPercentage) }}
                    </p>
                  </td>

                  <td>
                    {{
                      formatDuration(
                        row.averageDurationSeconds,
                      )
                    }}
                  </td>

                  <td class="no-print">
                    <UButton
                      :to="`/instructor/reports/${row.id}`"
                      color="neutral"
                      variant="outline"
                      size="sm"
                      icon="i-lucide-file-chart-column"
                    >
                      View
                    </UButton>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="report-mobile-cards space-y-3 lg:hidden">
            <UCard
              v-for="row in filteredAssessments"
              :key="row.id"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-xs font-bold text-primary">
                    {{ row.subjectCode }}
                  </p>

                  <p class="mt-1 font-black text-highlighted">
                    {{ row.title }}
                  </p>
                </div>

                <StatusPill
                  :status="row.status"
                />
              </div>

              <div class="mt-4 grid grid-cols-2 gap-3">
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

                <div class="rounded-lg bg-elevated p-3">
                  <p class="text-xs text-muted">
                    Average time
                  </p>

                  <p class="mt-1 font-black text-highlighted">
                    {{ formatDuration(row.averageDurationSeconds) }}
                  </p>
                </div>
              </div>

              <UButton
                class="mt-4"
                block
                :to="`/instructor/reports/${row.id}`"
                color="neutral"
                variant="outline"
                icon="i-lucide-file-chart-column"
              >
                Open Assessment Report
              </UButton>
            </UCard>
          </div>
        </template>
      </section>

      <section
        v-else-if="
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
          title="No student result records"
          description="Student attempts will appear after an assessment is started."
        />

        <template v-else>
          <div class="report-desktop-table hidden table-shell table-scroll lg:block">
            <table class="app-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Assessment</th>
                  <th>Status</th>
                  <th>Score</th>
                  <th>Answers</th>
                  <th>Time</th>
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
                      {{ row.studentNumber || "No student number" }}
                    </p>
                  </td>

                  <td>
                    <p class="font-semibold text-highlighted">
                      {{ row.assessmentTitle }}
                    </p>

                    <p class="mt-1 text-xs text-muted">
                      {{ row.subjectCode }}
                      ·
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
                    <p class="text-sm text-highlighted">
                      {{ row.correctCount }}
                      correct
                    </p>

                    <p class="mt-1 text-xs text-muted">
                      {{ row.wrongCount }}
                      wrong
                      ·
                      {{ row.unansweredCount }}
                      unanswered
                    </p>
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

              <div class="mt-4 rounded-lg border border-default p-3">
                <p class="text-sm font-bold text-highlighted">
                  {{ row.assessmentTitle }}
                </p>

                <p class="mt-1 text-xs text-muted">
                  {{ row.subjectCode }}
                  ·
                  {{ row.section }}
                </p>
              </div>

              <div class="mt-3 grid grid-cols-2 gap-3">
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

      <section v-else>
        <EmptyPanel
          v-if="
            filteredQuestions.length
            === 0
          "
          icon="i-lucide-list-checks"
          title="No question analysis records"
          description="Question statistics appear after students complete an assessment."
        />

        <template v-else>
          <div class="report-desktop-table hidden table-shell table-scroll lg:block">
            <table class="app-table">
              <thead>
                <tr>
                  <th>Question</th>
                  <th>Assessment</th>
                  <th>Responses</th>
                  <th>Correct / Wrong</th>
                  <th>Accuracy</th>
                  <th>Average points</th>
                  <th>Average time</th>
                </tr>
              </thead>

              <tbody>
                <tr
                  v-for="row in filteredQuestions"
                  :key="row.questionId"
                >
                  <td class="max-w-md">
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
                    <p class="font-semibold text-highlighted">
                      {{ row.assessmentTitle }}
                    </p>

                    <p class="mt-1 text-xs text-muted">
                      {{ row.subjectCode }}
                    </p>
                  </td>

                  <td>
                    <p class="font-black text-highlighted">
                      {{ row.answeredCount }}
                      answered
                    </p>

                    <p class="mt-1 text-xs text-muted">
                      {{ row.unansweredCount }}
                      unanswered
                    </p>
                  </td>

                  <td>
                    <p class="font-bold text-success">
                      {{ row.correctCount }}
                      correct
                    </p>

                    <p class="mt-1 text-xs text-error">
                      {{ row.wrongCount }}
                      wrong
                    </p>
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
                {{ row.subjectCode }}
                ·
                Question
                {{ row.orderNumber }}
              </p>

              <p class="mt-2 font-black text-highlighted">
                {{ row.questionText }}
              </p>

              <p class="mt-1 text-xs text-muted">
                {{ row.assessmentTitle }}
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
                    Answered
                  </p>

                  <p class="mt-1 font-black text-highlighted">
                    {{ row.answeredCount }}
                    /
                    {{ row.attemptsPresented }}
                  </p>
                </div>

                <div class="rounded-lg bg-elevated p-3">
                  <p class="text-xs text-muted">
                    Correct
                  </p>

                  <p class="mt-1 font-black text-success">
                    {{ row.correctCount }}
                  </p>
                </div>

                <div class="rounded-lg bg-elevated p-3">
                  <p class="text-xs text-muted">
                    Wrong
                  </p>

                  <p class="mt-1 font-black text-error">
                    {{ row.wrongCount }}
                  </p>
                </div>
              </div>
            </UCard>
          </div>
        </template>
      </section>
    </template>

    <p
      v-if="overview"
      class="text-xs text-muted"
    >
      Generated:
      {{
        formatDateTime(
          overview.generatedAt,
        )
      }}
      · Expected submissions use current class membership and are never lower than recorded attempts.
    </p>

    <UModal
      v-model:open="errorModalOpen"
      title="Report could not be loaded"
      description="Review the message below, then try again."
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
                  Report could not be loaded
                </h2>

                <p class="mt-1 text-sm text-muted">
                  {{ errorMessage }}
                </p>
              </div>
            </div>
          </template>

          <div class="flex justify-end">
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
