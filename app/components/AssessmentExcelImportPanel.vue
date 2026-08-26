<script setup lang="ts">
import type {
  AssessmentImport,
  AssessmentImportRow,
} from "~/types/assessment-import";

const props = withDefaults(
  defineProps<{
    assessmentId: string;
    disabled?: boolean;
  }>(),
  {
    disabled: false,
  },
);

const emit = defineEmits<{
  imported: [];
  historyLocked: [];
}>();

const toast = useToast();

const {
  validateWorkbook,
  commitImport,
  cancelImport,
} = useAssessmentImport();

const selectedFile = ref<File | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const isDragging = ref(false);
const isValidating = ref(false);
const isCommitting = ref(false);
const isCancelling = ref(false);
const errorMessage = ref("");
const previewOpen = ref(false);
const statusFilter = ref("All rows");

const assessmentImport = ref<AssessmentImport | null>(null);
const rows = ref<AssessmentImportRow[]>([]);
const excludedRowIds = ref<Set<string>>(new Set());

const formattedFileSize = computed(() => {
  if (!selectedFile.value) {
    return "";
  }

  return formatFileSize(selectedFile.value.size);
});

const selectedValidCount = computed(
  () =>
    rows.value.filter(
      (row) =>
        row.is_valid
        && !excludedRowIds.value.has(row.id),
    ).length,
);

const filteredRows = computed(() => {
  if (statusFilter.value === "Valid rows") {
    return rows.value.filter((row) => row.is_valid);
  }

  if (statusFilter.value === "Invalid rows") {
    return rows.value.filter((row) => !row.is_valid);
  }

  if (statusFilter.value === "Excluded rows") {
    return rows.value.filter((row) => excludedRowIds.value.has(row.id));
  }

  return rows.value;
});

function formatFileSize(size: number): string {
  if (size < 1024) {
    return `${size} bytes`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

function questionTypeLabel(value: string | null): string {
  switch (value) {
    case "multiple_choice":
      return "Multiple Choice";
    case "checkbox":
      return "Checkbox";
    case "fill_blank":
      return "Fill in the Blanks";
    case "true_false":
      return "True or False";
    case "true_false_correction":
      return "True or False + Correction";
    default:
      return "Unknown";
  }
}

function validateSelectedFile(file: File): string | null {
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    return "Only .xlsx workbooks are supported.";
  }

  if (file.size > 5 * 1024 * 1024) {
    return "The workbook must not exceed 5 MB.";
  }

  if (file.size < 1) {
    return "The selected workbook is empty.";
  }

  return null;
}

function chooseFile(file: File | null): void {
  errorMessage.value = "";

  if (!file) {
    selectedFile.value = null;
    return;
  }

  const validation = validateSelectedFile(file);

  if (validation) {
    errorMessage.value = validation;
    selectedFile.value = null;
    return;
  }

  selectedFile.value = file;
  assessmentImport.value = null;
  rows.value = [];
  excludedRowIds.value = new Set();
}

function onFileInput(event: Event): void {
  const target = event.target as HTMLInputElement;
  chooseFile(target.files?.[0] || null);
}

function onDrop(event: DragEvent): void {
  isDragging.value = false;
  chooseFile(event.dataTransfer?.files?.[0] || null);
}

function toggleExcluded(row: AssessmentImportRow): void {
  if (!row.is_valid) {
    return;
  }

  const updated = new Set(excludedRowIds.value);

  if (updated.has(row.id)) {
    updated.delete(row.id);
  } else {
    updated.add(row.id);
  }

  excludedRowIds.value = updated;
}

async function validateAndReview(): Promise<void> {
  if (!selectedFile.value || props.disabled) {
    return;
  }

  if (assessmentImport.value) {
    previewOpen.value = true;
    return;
  }

  isValidating.value = true;
  errorMessage.value = "";

  const result = await validateWorkbook(
    props.assessmentId,
    selectedFile.value,
  );

  isValidating.value = false;

  if (result.error || !result.data) {
    if (
      result.code === "ASSESSMENT_HISTORY_LOCKED"
      || String(result.error || "")
        .toLowerCase()
        .includes("editable revision")
    ) {
      emit("historyLocked");
      return;
    }

    errorMessage.value =
      result.error
      || "The workbook could not be validated.";
    return;
  }

  assessmentImport.value = result.data.assessmentImport;
  rows.value = result.data.rows;
  excludedRowIds.value = new Set(
    rows.value
      .filter((row) => row.is_excluded || !row.is_valid)
      .map((row) => row.id),
  );
  statusFilter.value = "All rows";
  previewOpen.value = true;

  toast.add({
    title: "Workbook checked",
    description: result.data.message,
    color:
      result.data.assessmentImport.invalid_rows > 0
        ? "warning"
        : "success",
  });
}

async function commit(): Promise<void> {
  if (!assessmentImport.value || selectedValidCount.value < 1) {
    return;
  }

  isCommitting.value = true;
  errorMessage.value = "";

  const result = await commitImport(
    assessmentImport.value.id,
    Array.from(excludedRowIds.value),
  );

  isCommitting.value = false;

  if (result.error || !result.data) {
    if (
      result.code === "ASSESSMENT_HISTORY_LOCKED"
      || String(result.error || "")
        .toLowerCase()
        .includes("editable revision")
    ) {
      previewOpen.value = false;
      emit("historyLocked");
      return;
    }

    errorMessage.value =
      result.error
      || "The selected questions could not be imported.";
    return;
  }

  toast.add({
    title: "Questions imported",
    description: result.data.message,
    color: "success",
  });

  previewOpen.value = false;
  selectedFile.value = null;
  assessmentImport.value = null;
  rows.value = [];
  excludedRowIds.value = new Set();

  if (fileInput.value) {
    fileInput.value.value = "";
  }

  emit("imported");
}

async function cancelStagedImport(): Promise<void> {
  if (!assessmentImport.value) {
    previewOpen.value = false;
    return;
  }

  isCancelling.value = true;

  const result = await cancelImport(assessmentImport.value.id);

  isCancelling.value = false;

  if (result.error || !result.data) {
    toast.add({
      title: "Import could not be cancelled",
      description:
        result.error
        || "The staged import could not be cancelled.",
      color: "error",
    });
    return;
  }

  previewOpen.value = false;
  selectedFile.value = null;
  assessmentImport.value = null;
  rows.value = [];
  excludedRowIds.value = new Set();

  if (fileInput.value) {
    fileInput.value.value = "";
  }

  toast.add({
    title: "Import cancelled",
    description: result.data.message,
    color: "success",
  });
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center gap-3">
        <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success">
          <UIcon
            name="i-lucide-file-spreadsheet"
            class="size-5"
          />
        </div>

        <div class="min-w-0">
          <h2 class="font-bold text-highlighted">
            Import from Excel
          </h2>
          <p class="text-xs text-muted">
            Add many questions without leaving this page.
          </p>
        </div>
      </div>
    </template>

    <div class="space-y-3">
      <button
        type="button"
        class="w-full rounded-xl border border-dashed p-4 text-left transition"
        :class="[
          isDragging
            ? 'border-primary bg-primary/5'
            : selectedFile
              ? 'border-success/60 bg-success/5'
              : 'border-default hover:border-primary/50 hover:bg-primary/5',
          disabled ? 'cursor-not-allowed opacity-60' : '',
        ]"
        :disabled="disabled"
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

        <div class="flex items-center gap-3">
          <div
            class="flex size-10 shrink-0 items-center justify-center rounded-lg"
            :class="selectedFile ? 'bg-success/10 text-success' : 'bg-elevated text-muted'"
          >
            <UIcon
              :name="selectedFile ? 'i-lucide-file-check-2' : 'i-lucide-upload'"
              class="size-5"
            />
          </div>

          <div class="min-w-0 flex-1">
            <p
              v-if="selectedFile"
              class="truncate text-sm font-semibold text-highlighted"
            >
              {{ selectedFile.name }}
            </p>
            <p
              v-else
              class="text-sm font-semibold text-highlighted"
            >
              Choose or drop .xlsx file
            </p>

            <p class="mt-0.5 text-xs text-muted">
              {{ selectedFile ? formattedFileSize : 'Maximum file size: 5 MB' }}
            </p>
          </div>
        </div>
      </button>

      <UAlert
        v-if="errorMessage && !previewOpen"
        color="error"
        variant="soft"
        title="Excel import"
        :description="errorMessage"
      />

      <UButton
        block
        icon="i-lucide-scan-search"
        :loading="isValidating"
        :disabled="disabled || !selectedFile"
        @click="validateAndReview"
      >
        Review questions
      </UButton>

      <div class="grid grid-cols-2 gap-2">
        <UButton
          to="/templates/sncbt-assess-question-import-template.xlsx"
          external
          color="neutral"
          variant="ghost"
          size="sm"
          icon="i-lucide-download"
        >
          Template
        </UButton>

        <UButton
          to="/templates/sncbt-assess-question-import-sample.xlsx"
          external
          color="neutral"
          variant="ghost"
          size="sm"
          icon="i-lucide-file-check"
        >
          Sample
        </UButton>
      </div>
    </div>

    <UModal
      v-model:open="previewOpen"
      :dismissible="!isCommitting && !isCancelling"
      :ui="{
        content: 'sm:max-w-5xl max-h-[92vh] overflow-hidden',
      }"
    >
      <template #content>
        <div class="flex max-h-[92vh] flex-col">
          <div class="border-b border-default px-5 py-4 sm:px-6">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p class="text-xs font-bold uppercase tracking-[0.14em] text-primary">
                  Excel import review
                </p>
                <h2 class="mt-1 text-xl font-black text-highlighted">
                  Review questions before importing
                </h2>
                <p class="mt-1 text-sm text-muted">
                  Invalid rows stay excluded. You can also exclude any valid row you do not want to add.
                </p>
              </div>

              <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-x"
                aria-label="Close import review"
                :disabled="isCommitting || isCancelling"
                @click="previewOpen = false"
              />
            </div>

            <div
              v-if="assessmentImport"
              class="mt-4 grid gap-2 sm:grid-cols-4"
            >
              <div class="rounded-lg bg-elevated/60 px-3 py-2">
                <p class="text-xs text-muted">Rows</p>
                <p class="font-bold text-highlighted">{{ assessmentImport.total_rows }}</p>
              </div>
              <div class="rounded-lg bg-success/10 px-3 py-2">
                <p class="text-xs text-success">Valid</p>
                <p class="font-bold text-highlighted">{{ assessmentImport.valid_rows }}</p>
              </div>
              <div class="rounded-lg bg-warning/10 px-3 py-2">
                <p class="text-xs text-warning">Needs attention</p>
                <p class="font-bold text-highlighted">{{ assessmentImport.invalid_rows }}</p>
              </div>
              <div class="rounded-lg bg-primary/10 px-3 py-2">
                <p class="text-xs text-primary">Selected</p>
                <p class="font-bold text-highlighted">{{ selectedValidCount }}</p>
              </div>
            </div>
          </div>

          <div class="flex-1 overflow-y-auto px-5 py-4 sm:px-6">
            <UAlert
              v-if="errorMessage"
              class="mb-4"
              color="error"
              variant="soft"
              title="Import could not be completed"
              :description="errorMessage"
            />

            <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div class="min-w-0">
                <p class="truncate text-sm font-semibold text-highlighted">
                  {{ assessmentImport?.original_filename }}
                </p>
                <p
                  v-if="assessmentImport"
                  class="text-xs text-muted"
                >
                  {{ formatFileSize(assessmentImport.file_size_bytes) }}
                </p>
              </div>

              <USelect
                v-model="statusFilter"
                :items="[
                  'All rows',
                  'Valid rows',
                  'Invalid rows',
                  'Excluded rows',
                ]"
                class="w-full sm:w-48"
              />
            </div>

            <div class="space-y-3">
              <article
                v-for="row in filteredRows"
                :key="row.id"
                class="rounded-xl border border-default p-4 transition"
                :class="excludedRowIds.has(row.id) ? 'opacity-60' : ''"
              >
                <div class="flex flex-col gap-4 lg:flex-row lg:items-start">
                  <div class="flex items-center gap-3 lg:w-32 lg:shrink-0">
                    <span
                      class="flex size-9 items-center justify-center rounded-lg text-sm font-black"
                      :class="row.is_valid ? 'bg-success/10 text-success' : 'bg-error/10 text-error'"
                    >
                      {{ row.source_row_number }}
                    </span>

                    <UBadge
                      :color="row.is_valid ? 'success' : 'error'"
                      variant="soft"
                      size="sm"
                    >
                      {{ row.is_valid ? 'Valid' : 'Invalid' }}
                    </UBadge>
                  </div>

                  <div class="min-w-0 flex-1">
                    <p class="font-bold leading-6 text-highlighted">
                      {{ row.normalized_data.questionText || 'Question text missing' }}
                    </p>

                    <div class="mt-2 flex flex-wrap gap-2">
                      <UBadge color="info" variant="soft" size="sm">
                        {{ questionTypeLabel(row.normalized_data.questionType) }}
                      </UBadge>
                      <UBadge color="neutral" variant="soft" size="sm" icon="i-lucide-clock-3">
                        {{ row.normalized_data.timeLimitSeconds }} sec
                      </UBadge>
                      <UBadge
                        v-if="row.normalized_data.options.length"
                        color="neutral"
                        variant="soft"
                        size="sm"
                      >
                        {{ row.normalized_data.options.length }} choices
                      </UBadge>
                    </div>

                    <div
                      v-if="row.normalized_data.options.length"
                      class="mt-3 grid gap-2 sm:grid-cols-2"
                    >
                      <div
                        v-for="(option, optionIndex) in row.normalized_data.options"
                        :key="optionIndex"
                        class="rounded-lg bg-elevated/50 px-3 py-2 text-sm"
                      >
                        <span class="font-semibold text-muted">{{ optionIndex + 1 }}.</span>
                        <span class="ml-1 text-highlighted">{{ option.text }}</span>
                        <span
                          v-if="option.isCorrect"
                          class="ml-1 text-xs font-bold text-success"
                        >
                          ✓
                        </span>
                      </div>
                    </div>

                    <div
                      v-if="row.normalized_data.acceptedAnswers.length"
                      class="mt-3 flex flex-wrap gap-2"
                    >
                      <UBadge
                        v-for="answer in row.normalized_data.acceptedAnswers"
                        :key="answer"
                        color="success"
                        variant="soft"
                        size="sm"
                      >
                        {{ answer }}
                      </UBadge>
                    </div>

                    <UAlert
                      v-if="row.validation_errors.length"
                      class="mt-3"
                      color="error"
                      variant="soft"
                      title="Row needs correction"
                    >
                      <template #description>
                        <ul class="list-disc space-y-1 pl-5">
                          <li
                            v-for="validationError in row.validation_errors"
                            :key="validationError"
                          >
                            {{ validationError }}
                          </li>
                        </ul>
                      </template>
                    </UAlert>
                  </div>

                  <UButton
                    v-if="row.is_valid"
                    class="lg:w-28 lg:shrink-0"
                    :color="excludedRowIds.has(row.id) ? 'success' : 'neutral'"
                    variant="soft"
                    size="sm"
                    :icon="excludedRowIds.has(row.id) ? 'i-lucide-rotate-ccw' : 'i-lucide-eye-off'"
                    @click="toggleExcluded(row)"
                  >
                    {{ excludedRowIds.has(row.id) ? 'Restore' : 'Exclude' }}
                  </UButton>
                </div>
              </article>
            </div>
          </div>

          <div class="border-t border-default px-5 py-4 sm:px-6">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p class="text-sm text-muted">
                <strong class="text-highlighted">{{ selectedValidCount }}</strong>
                question{{ selectedValidCount === 1 ? '' : 's' }} will be appended to this assessment.
              </p>

              <div class="flex flex-col-reverse gap-2 sm:flex-row">
                <UButton
                  color="neutral"
                  variant="outline"
                  :loading="isCancelling"
                  :disabled="isCommitting"
                  @click="cancelStagedImport"
                >
                  Cancel import
                </UButton>

                <UButton
                  color="success"
                  icon="i-lucide-list-plus"
                  :loading="isCommitting"
                  :disabled="selectedValidCount < 1 || isCancelling"
                  @click="commit"
                >
                  Import {{ selectedValidCount }} question{{ selectedValidCount === 1 ? '' : 's' }}
                </UButton>
              </div>
            </div>
          </div>
        </div>
      </template>
    </UModal>
  </UCard>
</template>
