<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";
import type {
  InstructorReportFilters,
  InstructorReportsOverview,
  InstructorStudentResultRow,
} from "~/types/instructor-report";
import type { CsvColumn, ReportExportMeta } from "~/utils/instructor-report-export";
import {
  downloadCsvReport,
  downloadExcelReport,
  printCurrentReport,
} from "~/utils/instructor-report-export";

definePageMeta({ layout: "instructor" });
useSeoMeta({ title: "Student Results" });

const { getOverview } = useInstructorReports();
const overview = ref<InstructorReportsOverview | null>(null);
const isLoading = ref(true);
const query = ref("");
const errorModalOpen = ref(false);
const errorMessage = ref("");
const isRefreshing = ref(false);
let filterLoadTimer: ReturnType<typeof setTimeout> | null = null;
let requestSequence = 0;

const isBusy = computed(() => isLoading.value || isRefreshing.value);

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

const classroomItems = computed(() => [
  { label: "All classes / sections", value: "__all__" },
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
  () => classroomItems.value.find((item) => item.value === selectedClassroom.value)?.label ?? "All classes / sections",
);
const selectedAssessmentLabel = computed(
  () => assessmentItems.value.find((item) => item.value === selectedAssessment.value)?.label ?? "All assessments",
);
const normalizedQuery = computed(() => query.value.trim().toLowerCase());
const dateRangeError = computed(() =>
  filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo
    ? "The starting date must be on or before the ending date."
    : "",
);

const filteredResults = computed(() => {
  const rows = overview.value?.students ?? [];
  const matches = normalizedQuery.value
    ? rows.filter((row) =>
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
          .includes(normalizedQuery.value),
      )
    : rows;

  return [...matches].sort((first, second) => {
    const firstTime = first.submittedAt ? new Date(first.submittedAt).getTime() : 0;
    const secondTime = second.submittedAt ? new Date(second.submittedAt).getTime() : 0;
    return secondTime - firstTime;
  });
});

const averagePercentage = computed(() => {
  const values = filteredResults.value
    .map((row) => row.percentage)
    .filter((value): value is number => value !== null);
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
});
const highestPercentage = computed(() => {
  const values = filteredResults.value
    .map((row) => row.percentage)
    .filter((value): value is number => value !== null);
  return values.length ? Math.max(...values) : null;
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
function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  const rounded = Math.max(Math.round(seconds), 0);
  const minutes = Math.floor(rounded / 60);
  const remainder = rounded % 60;
  if (minutes < 60) return `${minutes}m ${String(remainder).padStart(2, "0")}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}
function readableValue(value: string): string {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const periodLabel = computed(() => {
  if (filters.dateFrom && filters.dateTo) {
    return `${formatDateOnly(filters.dateFrom)} to ${formatDateOnly(filters.dateTo)}`;
  }
  if (filters.dateFrom) return `From ${formatDateOnly(filters.dateFrom)}`;
  if (filters.dateTo) return `Up to ${formatDateOnly(filters.dateTo)}`;
  return "All recorded assessments";
});

function showError(message: string): void {
  errorMessage.value = message;
  errorModalOpen.value = true;
}

async function loadResults(): Promise<void> {
  const requestId = ++requestSequence;

  if (dateRangeError.value) {
    isLoading.value = false;
    isRefreshing.value = false;
    return;
  }

  const hasExistingResults = overview.value !== null;
  if (hasExistingResults) {
    isRefreshing.value = true;
  } else {
    isLoading.value = true;
  }

  const result = await getOverview({ ...filters });
  if (requestId !== requestSequence) return;

  if (result.error || !result.data) {
    isLoading.value = false;
    isRefreshing.value = false;
    showError(result.error || "The student results could not be loaded. Please try again.");
    return;
  }

  overview.value = result.data;
  isLoading.value = false;
  isRefreshing.value = false;
}

function scheduleResultsLoad(delay = 300): void {
  if (filterLoadTimer) clearTimeout(filterLoadTimer);
  filterLoadTimer = setTimeout(() => {
    filterLoadTimer = null;
    void loadResults();
  }, delay);
}

function resetFilters(): void {
  filters.dateFrom = localDateInput(monthStart);
  filters.dateTo = localDateInput(today);
  filters.classroomId = null;
  filters.assessmentId = null;
  query.value = "";
}

const resultColumns: CsvColumn<InstructorStudentResultRow>[] = [
  { header: "Student Number", value: (row) => row.studentNumber },
  { header: "Student", value: (row) => row.studentName },
  { header: "Class", value: (row) => row.classroomName },
  { header: "Section", value: (row) => row.section },
  { header: "Assessment", value: (row) => row.assessmentTitle },
  { header: "Subject Code", value: (row) => row.subjectCode },
  { header: "Status", value: (row) => readableValue(row.status) },
  { header: "Score", value: (row) => `${row.score} / ${row.maximumScore}` },
  { header: "Percentage", value: (row) => formatPercent(row.percentage) },
  { header: "Correct", value: (row) => row.correctCount },
  { header: "Wrong", value: (row) => row.wrongCount },
  { header: "Unanswered", value: (row) => row.unansweredCount },
  { header: "Completion Time", value: (row) => formatDuration(row.durationSeconds) },
  { header: "Submitted", value: (row) => formatDateTime(row.submittedAt) },
];

function exportMeta(): ReportExportMeta {
  return {
    title: "Student Assessment Results",
    subtitle: "Final submitted scores and completion records",
    period: periodLabel.value,
    classroom: selectedClassroomLabel.value,
    assessment: selectedAssessmentLabel.value,
    generatedAt: overview.value?.generatedAt ?? new Date().toISOString(),
  };
}
function exportCsv(): void {
  const stamp = new Date().toISOString().slice(0, 10);
  downloadCsvReport(`sncbt-student-results-${stamp}.csv`, exportMeta(), resultColumns, filteredResults.value);
}
function exportExcel(): void {
  const stamp = new Date().toISOString().slice(0, 10);
  downloadExcelReport(`sncbt-student-results-${stamp}.xls`, exportMeta(), resultColumns, filteredResults.value);
}

const exportMenuItems = computed<DropdownMenuItem[][]>(() => [
  [
    {
      label: "Excel (.xls)",
      icon: "i-lucide-file-spreadsheet",
      disabled: filteredResults.value.length === 0,
      onSelect: exportExcel,
    },
    {
      label: "CSV (.csv)",
      icon: "i-lucide-file-text",
      disabled: filteredResults.value.length === 0,
      onSelect: exportCsv,
    },
    {
      label: "Print / Save as PDF",
      icon: "i-lucide-printer",
      disabled: filteredResults.value.length === 0,
      onSelect: printCurrentReport,
    },
  ],
]);

watch(
  () => [filters.dateFrom, filters.dateTo, filters.classroomId, filters.assessmentId] as const,
  () => scheduleResultsLoad(),
);

onMounted(loadResults);
onBeforeUnmount(() => {
  if (filterLoadTimer) clearTimeout(filterLoadTimer);
  requestSequence += 1;
});
</script>

<template>
  <div class="page-stack report-print-area">
    <InstructorReportPrintHeader
      title="Student Assessment Results"
      subtitle="Final submitted scores and completion records"
      :period="periodLabel"
      :generated-at="overview?.generatedAt || null"
    />

    <div class="print-only report-scope">
      <div><span>Class / Section:</span> <strong>{{ selectedClassroomLabel }}</strong></div>
      <div><span>Assessment:</span> <strong>{{ selectedAssessmentLabel }}</strong></div>
    </div>

    <PageHeader
      class="no-print"
      eyebrow="Student records"
      title="Student Results"
      description="Open submitted scores directly by class or assessment, without entering an assessment report first."
    >
      <template #actions>
        <div class="flex w-full items-center justify-end gap-2 sm:w-auto">
          <UTooltip text="Refresh results">
            <UButton
              color="neutral"
              variant="outline"
              icon="i-lucide-refresh-cw"
              square
              :loading="isBusy"
              aria-label="Refresh student results"
              @click="loadResults"
            />
          </UTooltip>

          <UDropdownMenu
            :items="exportMenuItems"
            :content="{ align: 'end', side: 'bottom', sideOffset: 6 }"
            :ui="{ content: 'w-56', item: 'min-h-10', itemLabel: 'font-semibold' }"
          >
            <UButton
              icon="i-lucide-download"
              :disabled="isBusy || filteredResults.length === 0"
            >
              Export
            </UButton>
          </UDropdownMenu>
        </div>
      </template>
    </PageHeader>

    <UCard class="no-print" :ui="{ body: 'p-4 sm:p-5' }">
      <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1.2fr_1.2fr_auto]">
        <UFormField label="From" :error="dateRangeError || undefined">
          <UInput v-model="filters.dateFrom" type="date" class="w-full" />
        </UFormField>
        <UFormField label="To" :error="dateRangeError || undefined">
          <UInput v-model="filters.dateTo" type="date" class="w-full" />
        </UFormField>
        <UFormField label="Class / Section">
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
        <div class="flex items-end">
          <UTooltip text="Reset filters">
            <UButton
              color="neutral"
              variant="outline"
              icon="i-lucide-rotate-ccw"
              square
              aria-label="Reset student result filters"
              @click="resetFilters"
            />
          </UTooltip>
        </div>
      </div>

      <div class="mt-4 flex flex-col gap-3 border-t border-default pt-4 lg:flex-row lg:items-center">
        <UInput
          v-model="query"
          icon="i-lucide-search"
          placeholder="Search student, student number, class, or assessment"
          class="w-full lg:max-w-md"
        />
        <div class="flex flex-wrap items-center gap-2 lg:ml-auto">
          <UBadge v-if="isRefreshing" color="primary" variant="soft" icon="i-lucide-loader-circle">
            Updating results…
          </UBadge>
          <UBadge color="neutral" variant="soft" icon="i-lucide-list-checks">
            {{ filteredResults.length }} result{{ filteredResults.length === 1 ? "" : "s" }}
          </UBadge>
          <UBadge color="primary" variant="soft">Average {{ formatPercent(averagePercentage) }}</UBadge>
          <UBadge color="success" variant="soft">Highest {{ formatPercent(highestPercentage) }}</UBadge>
        </div>
      </div>
    </UCard>

    <div v-if="isLoading" class="no-print grid gap-3">
      <USkeleton class="h-16 w-full rounded-xl" />
      <USkeleton class="h-16 w-full rounded-xl" />
      <USkeleton class="h-16 w-full rounded-xl" />
    </div>

    <EmptyPanel
      v-else-if="filteredResults.length === 0"
      icon="i-lucide-graduation-cap"
      title="No student results"
      description="Completed assessment results matching this class, assessment, and date range will appear here."
    />

    <template v-else>
      <div class="hidden table-shell table-scroll lg:block">
        <table class="app-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Class</th>
              <th>Assessment</th>
              <th>Status</th>
              <th>Score</th>
              <th>Correct / Wrong</th>
              <th>Unanswered</th>
              <th>Completion time</th>
              <th>Submitted</th>
              <th class="no-print">Analysis</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in filteredResults" :key="row.attemptId">
              <td>
                <p class="font-black text-highlighted">{{ row.studentName }}</p>
                <p class="mt-1 text-xs text-muted">{{ row.studentNumber || "—" }}</p>
              </td>
              <td>
                <p class="font-semibold text-highlighted">{{ row.classroomName }}</p>
                <p class="mt-1 text-xs text-muted">{{ row.subjectCode }} · {{ row.section }}</p>
              </td>
              <td><p class="max-w-72 font-semibold text-highlighted">{{ row.assessmentTitle }}</p></td>
              <td><UBadge color="success" variant="soft">{{ readableValue(row.status) }}</UBadge></td>
              <td>
                <p class="font-black text-highlighted">{{ row.score }} / {{ row.maximumScore }}</p>
                <p class="mt-1 text-xs font-bold text-primary">{{ formatPercent(row.percentage) }}</p>
              </td>
              <td>
                <span class="font-black text-success">{{ row.correctCount }}</span>
                <span class="mx-1 text-muted">/</span>
                <span class="font-black text-error">{{ row.wrongCount }}</span>
              </td>
              <td>{{ row.unansweredCount }}</td>
              <td>{{ formatDuration(row.durationSeconds) }}</td>
              <td>{{ formatDateTime(row.submittedAt) }}</td>
              <td class="no-print">
                <UButton
                  :to="`/instructor/reports/${row.assessmentId}`"
                  color="neutral"
                  variant="outline"
                  size="sm"
                  icon="i-lucide-chart-no-axes-combined"
                >
                  Analysis
                </UButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="no-print space-y-3 lg:hidden">
        <UCard v-for="row in filteredResults" :key="row.attemptId" :ui="{ body: 'p-4 sm:p-4' }">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="truncate font-black text-highlighted">{{ row.studentName }}</p>
              <p class="mt-1 text-xs text-muted">{{ row.studentNumber || "Student" }} · {{ row.section }}</p>
            </div>
            <div class="text-right">
              <p class="font-black text-primary">{{ formatPercent(row.percentage) }}</p>
              <p class="mt-1 text-xs text-muted">{{ row.score }} / {{ row.maximumScore }}</p>
            </div>
          </div>

          <div class="mt-4 rounded-xl bg-elevated p-3">
            <p class="font-bold text-highlighted">{{ row.assessmentTitle }}</p>
            <p class="mt-1 text-xs text-muted">{{ row.classroomName }} · {{ row.subjectCode }}</p>
          </div>

          <div class="mt-3 grid grid-cols-3 gap-2 text-center">
            <div class="rounded-lg border border-default p-2.5">
              <p class="text-xs text-muted">Correct</p>
              <p class="mt-1 font-black text-success">{{ row.correctCount }}</p>
            </div>
            <div class="rounded-lg border border-default p-2.5">
              <p class="text-xs text-muted">Wrong</p>
              <p class="mt-1 font-black text-error">{{ row.wrongCount }}</p>
            </div>
            <div class="rounded-lg border border-default p-2.5">
              <p class="text-xs text-muted">Unanswered</p>
              <p class="mt-1 font-black text-highlighted">{{ row.unansweredCount }}</p>
            </div>
          </div>

          <div class="mt-3 flex items-center justify-between gap-3 text-xs text-muted">
            <span>{{ formatDuration(row.durationSeconds) }}</span>
            <span class="text-right">{{ formatDateTime(row.submittedAt) }}</span>
          </div>

          <UButton
            class="mt-4"
            block
            :to="`/instructor/reports/${row.assessmentId}`"
            color="neutral"
            variant="outline"
            icon="i-lucide-chart-no-axes-combined"
          >
            Open Assessment Analysis
          </UButton>
        </UCard>
      </div>

      <div class="print-only">
        <table class="app-table">
          <thead>
            <tr>
              <th>Student No.</th>
              <th>Student</th>
              <th>Class / Section</th>
              <th>Assessment</th>
              <th>Score</th>
              <th>%</th>
              <th>Correct</th>
              <th>Wrong</th>
              <th>Unanswered</th>
              <th>Time</th>
              <th>Submitted</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in filteredResults" :key="`print-${row.attemptId}`">
              <td>{{ row.studentNumber || "—" }}</td>
              <td>{{ row.studentName }}</td>
              <td>{{ row.classroomName }} · {{ row.section }}</td>
              <td>{{ row.assessmentTitle }}</td>
              <td>{{ row.score }} / {{ row.maximumScore }}</td>
              <td>{{ formatPercent(row.percentage) }}</td>
              <td>{{ row.correctCount }}</td>
              <td>{{ row.wrongCount }}</td>
              <td>{{ row.unansweredCount }}</td>
              <td>{{ formatDuration(row.durationSeconds) }}</td>
              <td>{{ formatDateTime(row.submittedAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <UModal v-model:open="errorModalOpen" title="Student results could not be loaded">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-start gap-3">
              <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-error/10 text-error">
                <UIcon name="i-lucide-circle-alert" class="size-5" />
              </div>
              <div>
                <h2 class="font-black text-highlighted">Student results could not be loaded</h2>
                <p class="mt-1 text-sm text-muted">{{ errorMessage }}</p>
              </div>
            </div>
          </template>
          <div class="flex justify-end">
            <UButton color="neutral" variant="outline" @click="errorModalOpen = false">Close</UButton>
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
}
</style>
