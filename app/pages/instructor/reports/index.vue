<script setup lang="ts">
import type { CsvColumn } from "~/utils/instructor-report-export";
import type {
  InstructorAssessmentPerformanceRow,
  InstructorClassPerformanceRow,
  InstructorReportFilters,
  InstructorReportsOverview,
  InstructorStudentResultRow,
} from "~/types/instructor-report";
import {
  downloadCsv,
  printCurrentReport,
} from "~/utils/instructor-report-export";

definePageMeta({ layout: "instructor" });
useSeoMeta({ title: "Reports" });

type PrimaryReportSection = "classes" | "assessments" | "students";

const { getOverview } = useInstructorReports();

const overview = ref<InstructorReportsOverview | null>(null);
const activeSection = ref<PrimaryReportSection>("classes");
const isLoading = ref(true);
const query = ref("");
const errorModalOpen = ref(false);
const errorMessage = ref("");

function localDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const today = new Date();
const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

const filters = reactive<InstructorReportFilters>({
  dateFrom: localDateInput(monthStart),
  dateTo: localDateInput(today),
  classroomId: null,
  assessmentId: null,
});

const summary = computed(
  () =>
    overview.value?.summary ?? {
      classesInReport: 0,
      assessmentDeliveries: 0,
      expectedSubmissions: 0,
      studentsStarted: 0,
      completedAttempts: 0,
      autoSubmittedAttempts: 0,
      completionRate: 0,
      averagePercentage: null,
      highestPercentage: null,
    },
);

const classroomItems = computed(() => [
  { label: "All classes", value: "__all__" },
  ...(overview.value?.options.classrooms ?? []),
]);

const assessmentItems = computed(() => [
  { label: "All assessments", value: "__all__" },
  ...(overview.value?.options.assessments ?? []),
]);

const selectedClassroom = computed({
  get: () => filters.classroomId || "__all__",
  set: (value: string) => {
    filters.classroomId = value === "__all__" ? null : value;
  },
});

const selectedAssessment = computed({
  get: () => filters.assessmentId || "__all__",
  set: (value: string) => {
    filters.assessmentId = value === "__all__" ? null : value;
  },
});

const selectedClassroomLabel = computed(
  () =>
    classroomItems.value.find((item) => item.value === selectedClassroom.value)
      ?.label ?? "All classes",
);

const selectedAssessmentLabel = computed(
  () =>
    assessmentItems.value.find((item) => item.value === selectedAssessment.value)
      ?.label ?? "All assessments",
);

const normalizedQuery = computed(() => query.value.trim().toLowerCase());

const filteredClasses = computed(() => {
  const rows = overview.value?.classes ?? [];
  if (!normalizedQuery.value) return rows;

  return rows.filter((row) =>
    [row.name, row.subjectCode, row.section, row.schoolYear, row.semester]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery.value),
  );
});

const filteredAssessments = computed(() => {
  const rows = overview.value?.assessments ?? [];
  if (!normalizedQuery.value) return rows;

  return rows.filter((row) =>
    [row.title, row.subjectName, row.subjectCode, row.assessmentType]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery.value),
  );
});

const filteredStudents = computed(() => {
  const rows = overview.value?.students ?? [];
  if (!normalizedQuery.value) return rows;

  return rows.filter((row) =>
    [
      row.studentName,
      row.studentNumber,
      row.assessmentTitle,
      row.subjectCode,
      row.classroomName,
      row.section,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery.value),
  );
});

const activeRowCount = computed(() => {
  if (activeSection.value === "classes") return filteredClasses.value.length;
  if (activeSection.value === "assessments") return filteredAssessments.value.length;
  return filteredStudents.value.length;
});

const reportTitle = computed(
  () =>
    ({
      classes: "Class Assessment Summary",
      assessments: "Assessment Performance Summary",
      students: "Student Assessment Results",
    })[activeSection.value],
);

const sectionDescription = computed(
  () =>
    ({
      classes: "Completion and average performance by class.",
      assessments: "Completion and average performance by assessment.",
      students: "Final submitted assessment results.",
    })[activeSection.value],
);

const searchPlaceholder = computed(
  () =>
    ({
      classes: "Search class or section",
      assessments: "Search assessment",
      students: "Search student or assessment",
    })[activeSection.value],
);

const periodLabel = computed(() => {
  if (filters.dateFrom && filters.dateTo) {
    return `${formatDateOnly(filters.dateFrom)} to ${formatDateOnly(filters.dateTo)}`;
  }
  if (filters.dateFrom) return `From ${formatDateOnly(filters.dateFrom)}`;
  if (filters.dateTo) return `Up to ${formatDateOnly(filters.dateTo)}`;
  return "All recorded assessments";
});

function formatDateOnly(value: string | null): string {
  if (!value) return "All time";
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeZone: "Asia/Manila",
  }).format(new Date(`${value}T00:00:00+08:00`));
}

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(new Date(value));
}

function formatPercent(value: number | null): string {
  return value === null ? "—" : `${value.toFixed(1)}%`;
}

function readableValue(value: string): string {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function showError(message: string): void {
  errorMessage.value = message;
  errorModalOpen.value = true;
}

async function loadReports(): Promise<void> {
  if (filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo) {
    showError("The starting date cannot be later than the ending date.");
    return;
  }

  isLoading.value = true;
  const result = await getOverview({ ...filters });

  if (result.error || !result.data) {
    isLoading.value = false;
    showError(result.error || "The report could not be loaded. Please try again.");
    return;
  }

  overview.value = result.data;
  isLoading.value = false;
}

function resetFilters(): void {
  filters.dateFrom = localDateInput(monthStart);
  filters.dateTo = localDateInput(today);
  filters.classroomId = null;
  filters.assessmentId = null;
  query.value = "";
  void loadReports();
}

function exportCurrentSection(): void {
  const stamp = new Date().toISOString().slice(0, 10);

  if (activeSection.value === "classes") {
    const columns: CsvColumn<InstructorClassPerformanceRow>[] = [
      { header: "Class", value: (row) => row.name },
      { header: "Subject Code", value: (row) => row.subjectCode },
      { header: "Section", value: (row) => row.section },
      { header: "School Year", value: (row) => row.schoolYear },
      { header: "Semester", value: (row) => row.semester },
      { header: "Enrolled Students", value: (row) => row.activeStudents },
      { header: "Completed", value: (row) => row.completedAttempts },
      { header: "Expected", value: (row) => row.expectedSubmissions },
      { header: "Completion Rate", value: (row) => formatPercent(row.completionRate) },
      { header: "Average Score", value: (row) => formatPercent(row.averagePercentage) },
    ];

    downloadCsv(
      `sncbt-class-assessment-summary-${stamp}.csv`,
      columns,
      filteredClasses.value,
    );
    return;
  }

  if (activeSection.value === "assessments") {
    const columns: CsvColumn<InstructorAssessmentPerformanceRow>[] = [
      { header: "Assessment", value: (row) => row.title },
      { header: "Subject Code", value: (row) => row.subjectCode },
      { header: "Type", value: (row) => readableValue(row.assessmentType) },
      { header: "Questions", value: (row) => row.questionCount },
      { header: "Total Points", value: (row) => row.totalPoints },
      { header: "Classes", value: (row) => row.classCount },
      { header: "Completed", value: (row) => row.completedAttempts },
      { header: "Expected", value: (row) => row.expectedSubmissions },
      { header: "Completion Rate", value: (row) => formatPercent(row.completionRate) },
      { header: "Average Score", value: (row) => formatPercent(row.averagePercentage) },
    ];

    downloadCsv(
      `sncbt-assessment-performance-summary-${stamp}.csv`,
      columns,
      filteredAssessments.value,
    );
    return;
  }

  const columns: CsvColumn<InstructorStudentResultRow>[] = [
    { header: "Student", value: (row) => row.studentName },
    { header: "Student Number", value: (row) => row.studentNumber },
    { header: "Assessment", value: (row) => row.assessmentTitle },
    { header: "Subject Code", value: (row) => row.subjectCode },
    {
      header: "Class",
      value: (row) => `${row.classroomName} - ${row.section}`,
    },
    {
      header: "Score",
      value: (row) => `${row.score} / ${row.maximumScore}`,
    },
    { header: "Percentage", value: (row) => formatPercent(row.percentage) },
    { header: "Submitted", value: (row) => formatDateTime(row.submittedAt) },
  ];

  downloadCsv(
    `sncbt-student-assessment-results-${stamp}.csv`,
    columns,
    filteredStudents.value,
  );
}

onMounted(loadReports);
</script>

<template>
  <div class="page-stack report-print-area">
    <InstructorReportPrintHeader
      :title="reportTitle"
      :period="periodLabel"
      :generated-at="overview?.generatedAt || null"
    />

    <div class="print-only report-scope">
      <div>
        <span>Class:</span>
        <strong>{{ selectedClassroomLabel }}</strong>
      </div>
      <div>
        <span>Assessment:</span>
        <strong>{{ selectedAssessmentLabel }}</strong>
      </div>
    </div>

    <PageHeader
      class="no-print"
      eyebrow="Assessment records"
      title="Reports"
      description="Review formal class, assessment, and student performance records."
    >
      <template #actions>
        <div class="flex w-full items-center justify-end gap-2 sm:w-auto">
          <UTooltip text="Refresh report">
            <UButton
              color="neutral"
              variant="outline"
              icon="i-lucide-refresh-cw"
              square
              :loading="isLoading"
              aria-label="Refresh report"
              @click="loadReports"
            />
          </UTooltip>

          <UButton
            color="neutral"
            variant="outline"
            icon="i-lucide-printer"
            :disabled="isLoading || activeRowCount === 0"
            @click="printCurrentReport"
          >
            Print
          </UButton>

          <UButton
            icon="i-lucide-file-spreadsheet"
            :disabled="isLoading || activeRowCount === 0"
            @click="exportCurrentSection"
          >
            Export CSV
          </UButton>
        </div>
      </template>
    </PageHeader>

    <UCard class="no-print" :ui="{ body: 'p-4 sm:p-5' }">
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-sliders-horizontal" class="size-4 text-primary" />
        <h2 class="text-sm font-black text-highlighted">Report scope</h2>
      </div>

      <div class="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1.2fr_1.2fr_auto]">
        <UFormField label="From">
          <UInput v-model="filters.dateFrom" type="date" class="w-full" />
        </UFormField>

        <UFormField label="To">
          <UInput v-model="filters.dateTo" type="date" class="w-full" />
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
          <UButton icon="i-lucide-search" :loading="isLoading" @click="loadReports">
            Apply
          </UButton>

          <UTooltip text="Reset">
            <UButton
              color="neutral"
              variant="outline"
              icon="i-lucide-rotate-ccw"
              square
              aria-label="Reset report scope"
              @click="resetFilters"
            />
          </UTooltip>
        </div>
      </div>
    </UCard>

    <section class="no-print grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Assessments"
        :value="String(summary.assessmentDeliveries)"
        icon="i-lucide-clipboard-check"
        tone="info"
      />
      <StatCard
        label="Completed results"
        :value="String(summary.completedAttempts)"
        icon="i-lucide-circle-check-big"
        tone="success"
      />
      <StatCard
        label="Completion rate"
        :value="formatPercent(summary.completionRate)"
        icon="i-lucide-chart-no-axes-combined"
        tone="primary"
      />
      <StatCard
        label="Average score"
        :value="formatPercent(summary.averagePercentage)"
        icon="i-lucide-chart-column"
        tone="warning"
      />
    </section>

    <UCard class="no-print" :ui="{ body: 'p-4 sm:p-5' }">
      <div class="flex flex-col gap-4 xl:flex-row xl:items-center">
        <div class="overflow-x-auto">
          <div class="flex min-w-max rounded-xl bg-elevated p-1">
            <button
              type="button"
              class="flex min-h-9 items-center gap-2 rounded-lg px-3.5 text-sm font-bold transition"
              :class="
                activeSection === 'classes'
                  ? 'bg-primary/12 text-primary'
                  : 'text-muted hover:bg-default hover:text-highlighted'
              "
              @click="activeSection = 'classes'"
            >
              <UIcon name="i-lucide-school" class="size-4" />
              Class Summary
            </button>

            <button
              type="button"
              class="flex min-h-9 items-center gap-2 rounded-lg px-3.5 text-sm font-bold transition"
              :class="
                activeSection === 'assessments'
                  ? 'bg-primary/12 text-primary'
                  : 'text-muted hover:bg-default hover:text-highlighted'
              "
              @click="activeSection = 'assessments'"
            >
              <UIcon name="i-lucide-clipboard-check" class="size-4" />
              Assessment Summary
            </button>

            <button
              type="button"
              class="flex min-h-9 items-center gap-2 rounded-lg px-3.5 text-sm font-bold transition"
              :class="
                activeSection === 'students'
                  ? 'bg-primary/12 text-primary'
                  : 'text-muted hover:bg-default hover:text-highlighted'
              "
              @click="activeSection = 'students'"
            >
              <UIcon name="i-lucide-graduation-cap" class="size-4" />
              Student Results
            </button>
          </div>
        </div>

        <div class="min-w-0 flex-1 xl:border-l xl:border-default xl:pl-5">
          <p class="font-black text-highlighted">{{ reportTitle }}</p>
          <p class="mt-0.5 text-sm text-muted">{{ sectionDescription }}</p>
        </div>

        <UBadge color="neutral" variant="soft">
          {{ activeRowCount }} record{{ activeRowCount === 1 ? "" : "s" }}
        </UBadge>

        <UInput
          v-model="query"
          icon="i-lucide-search"
          :placeholder="searchPlaceholder"
          class="w-full xl:max-w-xs"
        />
      </div>
    </UCard>

    <div v-if="isLoading" class="space-y-4">
      <USkeleton class="h-14 rounded-xl" />
      <USkeleton class="h-80 rounded-xl" />
    </div>

    <template v-else>
      <!-- CLASS SUMMARY -->
      <section v-if="activeSection === 'classes'">
        <EmptyPanel
          v-if="filteredClasses.length === 0"
          icon="i-lucide-school"
          title="No class records"
          description="No class assessment records match the selected scope."
        />

        <template v-else>
          <div class="report-desktop-table hidden table-shell table-scroll lg:block">
            <table class="app-table">
              <thead>
                <tr>
                  <th>Class</th>
                  <th>Enrolled</th>
                  <th>Completed</th>
                  <th>Completion</th>
                  <th>Average Score</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in filteredClasses" :key="row.id">
                  <td>
                    <p class="font-black text-highlighted">{{ row.name }}</p>
                    <p class="mt-1 text-xs text-muted">
                      {{ row.subjectCode }} · {{ row.section }} · {{ row.schoolYear }} · {{ row.semester }}
                    </p>
                  </td>
                  <td><span class="font-semibold text-highlighted">{{ row.activeStudents }}</span></td>
                  <td>
                    <span class="font-semibold text-highlighted">
                      {{ row.completedAttempts }} / {{ row.expectedSubmissions }}
                    </span>
                  </td>
                  <td><span class="font-black text-highlighted">{{ formatPercent(row.completionRate) }}</span></td>
                  <td><span class="font-black text-highlighted">{{ formatPercent(row.averagePercentage) }}</span></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="report-mobile-cards space-y-3 lg:hidden">
            <UCard v-for="row in filteredClasses" :key="row.id">
              <p class="font-black text-highlighted">{{ row.name }}</p>
              <p class="mt-1 text-xs text-muted">{{ row.subjectCode }} · {{ row.section }}</p>

              <div class="mt-4 grid grid-cols-3 gap-2">
                <div class="rounded-lg bg-elevated p-3">
                  <p class="text-xs text-muted">Enrolled</p>
                  <p class="mt-1 font-black text-highlighted">{{ row.activeStudents }}</p>
                </div>
                <div class="rounded-lg bg-elevated p-3">
                  <p class="text-xs text-muted">Completion</p>
                  <p class="mt-1 font-black text-highlighted">{{ formatPercent(row.completionRate) }}</p>
                </div>
                <div class="rounded-lg bg-elevated p-3">
                  <p class="text-xs text-muted">Average</p>
                  <p class="mt-1 font-black text-highlighted">{{ formatPercent(row.averagePercentage) }}</p>
                </div>
              </div>
            </UCard>
          </div>
        </template>
      </section>

      <!-- ASSESSMENT SUMMARY -->
      <section v-else-if="activeSection === 'assessments'">
        <EmptyPanel
          v-if="filteredAssessments.length === 0"
          icon="i-lucide-clipboard-check"
          title="No assessment records"
          description="No assessment records match the selected scope."
        />

        <template v-else>
          <div class="report-desktop-table hidden table-shell table-scroll lg:block">
            <table class="app-table">
              <thead>
                <tr>
                  <th>Assessment</th>
                  <th>Classes</th>
                  <th>Completed</th>
                  <th>Completion</th>
                  <th>Average Score</th>
                  <th class="no-print">Report</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in filteredAssessments" :key="row.id">
                  <td>
                    <p class="font-black text-highlighted">{{ row.title }}</p>
                    <p class="mt-1 text-xs text-muted">
                      {{ row.subjectCode }} · {{ readableValue(row.assessmentType) }} ·
                      {{ row.questionCount }} questions · {{ row.totalPoints }} points
                    </p>
                  </td>
                  <td><span class="font-semibold text-highlighted">{{ row.classCount }}</span></td>
                  <td>
                    <span class="font-semibold text-highlighted">
                      {{ row.completedAttempts }} / {{ row.expectedSubmissions }}
                    </span>
                  </td>
                  <td><span class="font-black text-highlighted">{{ formatPercent(row.completionRate) }}</span></td>
                  <td><span class="font-black text-highlighted">{{ formatPercent(row.averagePercentage) }}</span></td>
                  <td class="no-print">
                    <UButton
                      :to="`/instructor/reports/${row.id}`"
                      color="neutral"
                      variant="outline"
                      size="sm"
                      icon="i-lucide-file-text"
                    >
                      Details
                    </UButton>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="report-mobile-cards space-y-3 lg:hidden">
            <UCard v-for="row in filteredAssessments" :key="row.id">
              <p class="text-xs font-bold text-primary">{{ row.subjectCode }}</p>
              <p class="mt-1 font-black text-highlighted">{{ row.title }}</p>

              <div class="mt-4 grid grid-cols-2 gap-2">
                <div class="rounded-lg bg-elevated p-3">
                  <p class="text-xs text-muted">Completion</p>
                  <p class="mt-1 font-black text-highlighted">{{ formatPercent(row.completionRate) }}</p>
                </div>
                <div class="rounded-lg bg-elevated p-3">
                  <p class="text-xs text-muted">Average score</p>
                  <p class="mt-1 font-black text-highlighted">{{ formatPercent(row.averagePercentage) }}</p>
                </div>
              </div>

              <UButton
                class="mt-4"
                block
                :to="`/instructor/reports/${row.id}`"
                color="neutral"
                variant="outline"
                icon="i-lucide-file-text"
              >
                Open Assessment Report
              </UButton>
            </UCard>
          </div>
        </template>
      </section>

      <!-- STUDENT RESULTS -->
      <section v-else>
        <EmptyPanel
          v-if="filteredStudents.length === 0"
          icon="i-lucide-graduation-cap"
          title="No student results"
          description="Completed student results will appear here."
        />

        <template v-else>
          <div class="report-desktop-table hidden table-shell table-scroll lg:block">
            <table class="app-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Assessment / Class</th>
                  <th>Score</th>
                  <th>Percentage</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in filteredStudents" :key="row.attemptId">
                  <td>
                    <p class="font-black text-highlighted">{{ row.studentName }}</p>
                    <p class="mt-1 text-xs text-muted">{{ row.studentNumber || "—" }}</p>
                  </td>
                  <td>
                    <p class="font-semibold text-highlighted">{{ row.assessmentTitle }}</p>
                    <p class="mt-1 text-xs text-muted">{{ row.subjectCode }} · {{ row.section }}</p>
                  </td>
                  <td><span class="font-black text-highlighted">{{ row.score }} / {{ row.maximumScore }}</span></td>
                  <td><span class="font-black text-highlighted">{{ formatPercent(row.percentage) }}</span></td>
                  <td><span class="text-sm text-highlighted">{{ formatDateTime(row.submittedAt) }}</span></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="report-mobile-cards space-y-3 lg:hidden">
            <UCard v-for="row in filteredStudents" :key="row.attemptId">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="font-black text-highlighted">{{ row.studentName }}</p>
                  <p class="mt-1 text-xs text-muted">{{ row.studentNumber || "Student" }}</p>
                </div>
                <p class="font-black text-primary">{{ formatPercent(row.percentage) }}</p>
              </div>

              <div class="mt-4 rounded-lg border border-default p-3">
                <p class="text-sm font-bold text-highlighted">{{ row.assessmentTitle }}</p>
                <p class="mt-1 text-xs text-muted">{{ row.subjectCode }} · {{ row.section }}</p>
              </div>

              <div class="mt-3 flex items-center justify-between text-sm">
                <span class="text-muted">Score</span>
                <strong class="text-highlighted">{{ row.score }} / {{ row.maximumScore }}</strong>
              </div>
            </UCard>
          </div>
        </template>
      </section>
    </template>

    <UModal v-model:open="errorModalOpen" title="Report could not be loaded">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-start gap-3">
              <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-error/10 text-error">
                <UIcon name="i-lucide-circle-alert" class="size-5" />
              </div>
              <div>
                <h2 class="font-black text-highlighted">Report could not be loaded</h2>
                <p class="mt-1 text-sm text-muted">{{ errorMessage }}</p>
              </div>
            </div>
          </template>

          <div class="flex justify-end">
            <UButton @click="errorModalOpen = false">Close</UButton>
          </div>
        </UCard>
      </template>
    </UModal>
  </div>
</template>

<style>
.print-only {
  display: none;
}

@media print {
  @page {
    size: A4 landscape;
    margin: 14mm;
  }

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

  .print-only {
    display: block !important;
  }

  .report-scope {
    margin: 10px 0 16px !important;
    padding: 9px 12px !important;
    border: 1px solid #d1d5db !important;
    font-size: 10px !important;
  }

  .report-scope > div {
    display: inline-block !important;
    margin-right: 28px !important;
  }

  .report-scope span {
    margin-right: 5px !important;
    color: #4b5563 !important;
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

  .report-print-area th {
    background: #f3f4f6 !important;
    font-weight: 700 !important;
    text-transform: uppercase !important;
    letter-spacing: 0.03em !important;
  }

  .report-print-area th,
  .report-print-area td {
    border: 1px solid #d1d5db !important;
    padding: 7px 8px !important;
    color: #111827 !important;
    background-color: white !important;
    font-size: 9.5px !important;
    vertical-align: top !important;
  }

  .report-print-area .text-muted,
  .report-print-area .text-highlighted,
  .report-print-area .text-primary {
    color: #111827 !important;
  }
}
</style>
