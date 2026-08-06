<script setup lang="ts">
import type {
  AssessmentWithClassroom,
} from "~/types/assessment";

import type {
  ExcelQuestionImportPreview,
  ExcelQuestionImportPreviewRow,
} from "~/types/assessment-import";

import {
  parseAssessmentQuestionWorkbook,
  validateAssessmentWorkbookFile,
} from "~/utils/assessment-excel-import";

definePageMeta({
  layout: "instructor",
});

useSeoMeta({
  title: "Import questions",
});

const route = useRoute();
const toast = useToast();

const assessmentId = computed(
  () =>
    String(
      route.params.id,
    ),
);

const {
  getInstructorAssessment,
} = useAssessments();

const {
  importQuestions,
} = useAssessmentImport();

const assessment =
  ref<AssessmentWithClassroom | null>(
    null,
  );

const preview =
  ref<ExcelQuestionImportPreview | null>(
    null,
  );

const selectedFile =
  ref<File | null>(null);

const fileInput =
  ref<HTMLInputElement | null>(null);

const isDragging = ref(false);
const isLoading = ref(true);
const isParsing = ref(false);
const isImporting = ref(false);
const errorMessage = ref("");

const formattedFileSize = computed(() => {
  if (!selectedFile.value) {
    return "";
  }

  const size =
    selectedFile.value.size;

  if (size < 1024) {
    return `${size} bytes`;
  }

  if (size < 1024 * 1024) {
    return `${(
      size / 1024
    ).toFixed(1)} KB`;
  }

  return `${(
    size / 1024 / 1024
  ).toFixed(2)} MB`;
});

const selectedRows = computed(
  () =>
    preview.value?.rows.filter(
      (row) =>
        row.selected
        && row.question,
    )
    ?? [],
);

const selectedCount = computed(
  () =>
    selectedRows.value.length,
);

const allValidSelected = computed({
  get: () => {
    const validRows =
      preview.value?.rows.filter(
        (row) =>
          row.question,
      )
      ?? [];

    return (
      validRows.length > 0
      && validRows.every(
        (row) =>
          row.selected,
      )
    );
  },
  set: (value: boolean) => {
    if (!preview.value) {
      return;
    }

    preview.value.rows.forEach(
      (row) => {
        if (row.question) {
          row.selected = value;
        }
      },
    );
  },
});

async function loadAssessment(): Promise<void> {
  isLoading.value = true;
  errorMessage.value = "";

  const result =
    await getInstructorAssessment(
      assessmentId.value,
    );

  if (
    result.error
    || !result.data
  ) {
    errorMessage.value =
      result.error
      || "Unable to load the assessment.";

    isLoading.value = false;
    return;
  }

  assessment.value =
    result.data.assessment;

  if (
    assessment.value.status
    !== "draft"
  ) {
    errorMessage.value =
      "Return or restore this assessment to draft before importing questions.";
  }

  isLoading.value = false;
}

function formatQuestionType(
  row: ExcelQuestionImportPreviewRow,
): string {
  if (
    row.question?.questionType
    === "multiple_choice"
  ) {
    return "Multiple Choice";
  }

  if (
    row.question?.questionType
    === "checkbox"
  ) {
    return "Checkbox";
  }

  return (
    row.rawQuestionType
    || "Unknown"
  );
}

function resetWorkbook(): void {
  selectedFile.value = null;
  preview.value = null;
  errorMessage.value = "";

  if (fileInput.value) {
    fileInput.value.value = "";
  }
}

async function chooseFile(
  file: File | null,
): Promise<void> {
  errorMessage.value = "";
  preview.value = null;

  if (!file) {
    selectedFile.value = null;
    return;
  }

  const validation =
    validateAssessmentWorkbookFile(
      file,
    );

  if (validation) {
    errorMessage.value =
      validation;
    selectedFile.value = null;
    return;
  }

  selectedFile.value = file;
  isParsing.value = true;

  try {
    preview.value =
      await parseAssessmentQuestionWorkbook(
        file,
      );

    toast.add({
      title:
        "Workbook reviewed",
      description:
        preview.value.invalidRows > 0
          ? `${preview.value.validRows} valid and ${preview.value.invalidRows} invalid rows were found.`
          : `${preview.value.validRows} valid question rows were found.`,
      color:
        preview.value.invalidRows > 0
          ? "warning"
          : "success",
    });
  } catch (error) {
    errorMessage.value =
      error instanceof Error
        ? error.message
        : "The workbook could not be read.";
  } finally {
    isParsing.value = false;
  }
}

function onFileInput(
  event: Event,
): void {
  const target =
    event.target as HTMLInputElement;

  void chooseFile(
    target.files?.[0]
    || null,
  );
}

function onDrop(
  event: DragEvent,
): void {
  isDragging.value = false;

  void chooseFile(
    event.dataTransfer
      ?.files?.[0]
    || null,
  );
}

async function commitImport(): Promise<void> {
  if (
    !assessment.value
    || assessment.value.status
      !== "draft"
    || selectedRows.value.length < 1
  ) {
    return;
  }

  isImporting.value = true;
  errorMessage.value = "";

  const questions =
    selectedRows.value.flatMap(
      (row) =>
        row.question
          ? [row.question]
          : [],
    );

  const result =
    await importQuestions(
      assessment.value.id,
      questions,
    );

  if (
    result.error
    || !result.data
  ) {
    errorMessage.value =
      result.error
      || "The selected questions could not be imported.";

    isImporting.value = false;
    return;
  }

  toast.add({
    title:
      "Questions imported",
    description:
      result.data.message,
    color:
      "success",
  });

  await navigateTo(
    `/instructor/assessments/${assessment.value.id}/edit`,
  );
}

onMounted(
  loadAssessment,
);
</script>

<template>
  <div class="page-stack">
    <PageHeader
      eyebrow="Spreadsheet question import"
      :title="
        assessment?.title
        || 'Import questions'
      "
      description="Upload the supported Excel template, review every row, and append selected questions to this draft assessment."
    >
      <template #actions>
        <UButton
          href="/templates/sncbt-assess-question-import-template.xlsx"
          external
          color="neutral"
          variant="outline"
          icon="i-lucide-download"
          download
        >
          Download Template
        </UButton>

        <UButton
          :to="`/instructor/assessments/${assessmentId}/edit`"
          color="neutral"
          variant="outline"
          icon="i-lucide-arrow-left"
        >
          Question Builder
        </UButton>
      </template>
    </PageHeader>

    <UAlert
      v-if="errorMessage"
      color="error"
      variant="soft"
      title="Excel import error"
      :description="errorMessage"
    />

    <UAlert
      color="info"
      variant="soft"
      icon="i-lucide-shield-check"
      title="Protected import workflow"
      description="The workbook is previewed in your browser. Selected questions are validated again by the Edge Function and PostgreSQL before they are saved."
    />

    <div
      v-if="isLoading"
      class="grid gap-6 xl:grid-cols-[1fr_360px]"
    >
      <USkeleton class="h-96 rounded-xl" />
      <USkeleton class="h-80 rounded-xl" />
    </div>

    <template v-else-if="assessment">
      <div
        v-if="!preview"
        class="grid gap-6 xl:grid-cols-[1fr_360px]"
      >
        <UCard>
          <template #header>
            <h2 class="font-bold text-highlighted">
              Upload workbook
            </h2>
          </template>

          <button
            type="button"
            class="flex min-h-72 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition"
            :class="
              isDragging
                ? 'border-primary bg-primary/5'
                : selectedFile
                  ? 'border-success bg-success/5'
                  : 'border-default hover:border-primary/50 hover:bg-primary/5'
            "
            :disabled="
              assessment.status !== 'draft'
              || isParsing
            "
            @click="fileInput?.click()"
            @dragenter.prevent="isDragging = true"
            @dragover.prevent="isDragging = true"
            @dragleave.prevent="isDragging = false"
            @drop.prevent="onDrop"
          >
            <input
              ref="fileInput"
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              class="hidden"
              @change="onFileInput"
            >

            <div class="flex size-16 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <UIcon
                :name="
                  isParsing
                    ? 'i-lucide-loader-circle'
                    : 'i-lucide-file-spreadsheet'
                "
                class="size-8"
                :class="{
                  'animate-spin':
                    isParsing,
                }"
              />
            </div>

            <template v-if="isParsing">
              <p class="mt-5 text-lg font-black text-highlighted">
                Reading workbook
              </p>

              <p class="mt-2 text-sm text-muted">
                Checking the worksheet, columns, questions, answer choices, and correct answers.
              </p>
            </template>

            <template v-else-if="selectedFile">
              <p class="mt-5 max-w-lg break-all font-black text-highlighted">
                {{ selectedFile.name }}
              </p>

              <p class="mt-2 text-sm text-muted">
                {{ formattedFileSize }}
              </p>
            </template>

            <template v-else>
              <p class="mt-5 text-lg font-black text-highlighted">
                Drop the Excel workbook here
              </p>

              <p class="mt-2 max-w-lg text-sm leading-6 text-muted">
                Or select this area to choose an `.xlsx` file. Questions must begin on row 3 of the `Create a Quiz` worksheet.
              </p>
            </template>
          </button>
        </UCard>

        <div class="space-y-6">
          <UCard>
            <template #header>
              <h2 class="font-bold text-highlighted">
                Supported format
              </h2>
            </template>

            <div class="space-y-4 text-sm text-muted">
              <div>
                <p class="font-bold text-highlighted">
                  Question types
                </p>

                <p class="mt-1">
                  Multiple Choice and Checkbox
                </p>
              </div>

              <div>
                <p class="font-bold text-highlighted">
                  Correct answers
                </p>

                <p class="mt-1 font-mono">
                  2 or 1,3
                </p>
              </div>

              <div>
                <p class="font-bold text-highlighted">
                  Question limits
                </p>

                <p class="mt-1">
                  Two to five choices and up to 200 questions per workbook
                </p>
              </div>
            </div>
          </UCard>

          <UCard>
            <template #header>
              <h2 class="font-bold text-highlighted">
                Test workbook
              </h2>
            </template>

            <p class="text-sm leading-6 text-muted">
              Download a completed sample to test the import before preparing a full examination.
            </p>

            <UButton
              href="/templates/sncbt-assess-question-import-sample.xlsx"
              external
              block
              color="neutral"
              variant="outline"
              icon="i-lucide-file-check-2"
              class="mt-4"
              download
            >
              Download Sample
            </UButton>
          </UCard>
        </div>
      </div>

      <template v-else>
        <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Detected rows"
            :value="String(preview.totalRows)"
            icon="i-lucide-rows-3"
            tone="primary"
          />

          <StatCard
            label="Valid rows"
            :value="String(preview.validRows)"
            icon="i-lucide-circle-check-big"
            tone="success"
          />

          <StatCard
            label="Invalid rows"
            :value="String(preview.invalidRows)"
            icon="i-lucide-triangle-alert"
            tone="warning"
          />

          <StatCard
            label="Selected"
            :value="String(selectedCount)"
            icon="i-lucide-list-checks"
            tone="info"
          />
        </section>

        <UCard>
          <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p class="font-black text-highlighted">
                {{ preview.fileName }}
              </p>

              <p class="mt-1 text-sm text-muted">
                Worksheet: {{ preview.worksheetName }} · {{ formattedFileSize }}
              </p>
            </div>

            <div class="flex flex-wrap gap-2">
              <UCheckbox
                v-model="allValidSelected"
                label="Select all valid rows"
              />

              <UButton
                color="neutral"
                variant="outline"
                icon="i-lucide-rotate-ccw"
                @click="resetWorkbook"
              >
                Choose Another File
              </UButton>

              <UButton
                icon="i-lucide-file-input"
                :loading="isImporting"
                :disabled="selectedCount === 0"
                @click="commitImport"
              >
                Import {{ selectedCount }}
                {{ selectedCount === 1 ? 'Question' : 'Questions' }}
              </UButton>
            </div>
          </div>
        </UCard>

        <div class="space-y-4">
          <UCard
            v-for="row in preview.rows"
            :key="row.id"
          >
            <div class="flex items-start gap-4">
              <UCheckbox
                v-if="row.question"
                v-model="row.selected"
                class="mt-1"
                :aria-label="`Include spreadsheet row ${row.sourceRowNumber}`"
              />

              <div
                v-else
                class="mt-1 flex size-5 shrink-0 items-center justify-center rounded-full bg-error/10 text-error"
              >
                <UIcon
                  name="i-lucide-x"
                  class="size-3.5"
                />
              </div>

              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p class="text-xs font-bold uppercase tracking-[0.14em] text-primary">
                      Spreadsheet row {{ row.sourceRowNumber }}
                    </p>

                    <h2 class="mt-1 font-black text-highlighted">
                      {{ row.question?.questionText || 'Incomplete question row' }}
                    </h2>
                  </div>

                  <UBadge
                    :color="row.question ? 'success' : 'error'"
                    variant="soft"
                  >
                    {{ row.question ? 'Valid' : 'Needs correction' }}
                  </UBadge>
                </div>

                <div
                  v-if="row.question"
                  class="mt-4"
                >
                  <div class="flex flex-wrap gap-2">
                    <UBadge
                      color="info"
                      variant="soft"
                    >
                      {{ formatQuestionType(row) }}
                    </UBadge>

                    <UBadge
                      color="neutral"
                      variant="soft"
                    >
                      {{ row.question.timeLimitSeconds }} seconds
                    </UBadge>

                    <UBadge
                      color="neutral"
                      variant="soft"
                    >
                      1 point
                    </UBadge>
                  </div>

                  <div class="mt-4 grid gap-2 sm:grid-cols-2">
                    <div
                      v-for="(option, index) in row.question.options"
                      :key="`${row.id}-${index}`"
                      class="flex items-center gap-3 rounded-lg border p-3"
                      :class="
                        option.isCorrect
                          ? 'border-success/40 bg-success/5'
                          : 'border-default bg-elevated'
                      "
                    >
                      <span class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-default text-xs font-black text-muted">
                        {{ String.fromCharCode(65 + index) }}
                      </span>

                      <span class="min-w-0 flex-1 text-sm font-semibold text-highlighted">
                        {{ option.text }}
                      </span>

                      <UIcon
                        v-if="option.isCorrect"
                        name="i-lucide-circle-check-big"
                        class="size-4 shrink-0 text-success"
                      />
                    </div>
                  </div>
                </div>

                <UAlert
                  v-else
                  class="mt-4"
                  color="error"
                  variant="soft"
                  title="Row errors"
                >
                  <template #description>
                    <ul class="list-disc space-y-1 pl-5 text-sm">
                      <li
                        v-for="error in row.errors"
                        :key="error"
                      >
                        {{ error }}
                      </li>
                    </ul>
                  </template>
                </UAlert>
              </div>
            </div>
          </UCard>
        </div>

        <UCard>
          <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p class="font-black text-highlighted">
                Ready to import
              </p>

              <p class="mt-1 text-sm text-muted">
                Invalid and unselected rows will not be saved.
              </p>
            </div>

            <UButton
              size="lg"
              icon="i-lucide-file-input"
              :loading="isImporting"
              :disabled="selectedCount === 0"
              @click="commitImport"
            >
              Import Selected Questions
            </UButton>
          </div>
        </UCard>
      </template>
    </template>
  </div>
</template>
