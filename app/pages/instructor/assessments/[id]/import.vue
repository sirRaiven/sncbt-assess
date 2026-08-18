<script setup lang="ts">
import type {
  AssessmentWithClassroom,
} from "~/types/assessment";

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
  validateWorkbook,
} = useAssessmentImport();

const assessment =
  ref<AssessmentWithClassroom | null>(
    null,
  );

const selectedFile =
  ref<File | null>(null);

const fileInput =
  ref<HTMLInputElement | null>(null);

const isDragging = ref(false);
const isLoading = ref(true);
const isUploading = ref(false);
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

function validateSelectedFile(
  file: File,
): string | null {
  if (
    !file.name
      .toLowerCase()
      .endsWith(".xlsx")
  ) {
    return "Only .xlsx workbooks are supported.";
  }

  if (
    file.size > 5 * 1024 * 1024
  ) {
    return "The workbook must not exceed 5 MB.";
  }

  if (file.size < 1) {
    return "The selected workbook is empty.";
  }

  return null;
}

function chooseFile(
  file: File | null,
): void {
  errorMessage.value = "";

  if (!file) {
    selectedFile.value = null;
    return;
  }

  const validation =
    validateSelectedFile(file);

  if (validation) {
    errorMessage.value =
      validation;
    selectedFile.value = null;
    return;
  }

  selectedFile.value = file;
}

function onFileInput(
  event: Event,
): void {
  const target =
    event.target as HTMLInputElement;

  chooseFile(
    target.files?.[0]
    || null,
  );
}

function onDrop(
  event: DragEvent,
): void {
  isDragging.value = false;

  chooseFile(
    event.dataTransfer
      ?.files?.[0]
    || null,
  );
}

async function upload(): Promise<void> {
  if (
    !selectedFile.value
    || !assessment.value
    || assessment.value.status
      !== "draft"
  ) {
    return;
  }

  isUploading.value = true;
  errorMessage.value = "";

  const result =
    await validateWorkbook(
      assessment.value.id,
      selectedFile.value,
    );

  if (
    result.error
    || !result.data
  ) {
    errorMessage.value =
      result.error
      || "The workbook could not be validated.";

    isUploading.value = false;
    return;
  }

  toast.add({
    title:
      "Workbook checked",
    description:
      result.data.message,
    color:
      result.data.assessmentImport
        .invalid_rows > 0
        ? "warning"
        : "success",
  });

  await navigateTo({
    path:
      `/instructor/assessments/${assessment.value.id}/import-preview`,
    query: {
      import:
        result.data.assessmentImport.id,
    },
  });
}

onMounted(
  loadAssessment,
);
</script>

<template>
  <div class="page-stack">
    <PageHeader
      :breadcrumbs="[
        { label: 'Overview', to: '/instructor/dashboard', icon: 'i-lucide-layout-dashboard' },
        { label: 'Assessments', to: '/instructor/assessments' },
        { label: assessment?.title || 'Assessment', to: `/instructor/assessments/${assessmentId}/edit` },
        { label: 'Questions', to: `/instructor/assessments/${assessmentId}/edit` },
        { label: 'Import' },
      ]"
      eyebrow="Import questions"
      :title="
        assessment?.title
        || 'Import questions'
      "
      description="Use the supported template to validate and append questions to this draft assessment."
    />

    <AssessmentWorkspaceNavigation
      :assessment-id="assessmentId"
      active="questions"
    />

    <UAlert
      v-if="errorMessage"
      color="error"
      variant="soft"
      title="Excel import unavailable"
      :description="errorMessage"
    />

    <div
      v-if="isLoading"
      class="grid gap-6 xl:grid-cols-[1fr_360px]"
    >
      <USkeleton class="h-96 rounded-xl" />
      <USkeleton class="h-80 rounded-xl" />
    </div>

    <div
      v-else-if="assessment"
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
          "
          aria-label="Choose an Excel workbook to import questions"
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

          <div
            class="flex size-16 items-center justify-center rounded-xl"
            :class="
              selectedFile
                ? 'bg-success/10 text-success'
                : 'bg-primary/10 text-primary'
            "
          >
            <UIcon
              :name="
                selectedFile
                  ? 'i-lucide-file-check-2'
                  : 'i-lucide-file-up'
              "
              class="size-8"
            />
          </div>

          <template v-if="selectedFile">
            <p class="mt-5 max-w-lg break-all font-black text-highlighted">
              {{ selectedFile.name }}
            </p>

            <p class="mt-2 text-sm text-muted">
              {{ formattedFileSize }}
            </p>

            <p class="mt-4 text-xs font-semibold text-primary">
              Select or drop another file to replace it
            </p>
          </template>

          <template v-else>
            <p class="mt-5 text-lg font-black text-highlighted">
              Drop the Excel workbook here
            </p>

            <p class="mt-2 max-w-lg text-sm leading-6 text-muted">
              Or select this area to choose a file. Only `.xlsx` files up to 5 MB are accepted.
            </p>
          </template>
        </button>

        <UButton
          block
          size="lg"
          class="mt-5"
          icon="i-lucide-shield-check"
          :loading="isUploading"
          :disabled="
            !selectedFile
            || assessment.status !== 'draft'
          "
          @click="upload"
        >
          Validate and Preview
        </UButton>
      </UCard>

      <div class="space-y-6">
        <UCard>
          <template #header>
            <h2 class="font-bold text-highlighted">
              Supported template
            </h2>
          </template>

          <p class="text-sm leading-6 text-muted">
            Download the SNCBT Assess template and begin entering questions on row 3. Do not rename the `Create a Quiz` worksheet or row-1 headers.
          </p>

          <div class="mt-5 grid gap-2">
            <UButton
              to="/templates/sncbt-assess-question-import-template.xlsx"
              external
              block
              color="neutral"
              variant="outline"
              icon="i-lucide-download"
            >
              Download Excel Template
            </UButton>

            <UButton
              to="/templates/sncbt-assess-question-import-sample.xlsx"
              external
              block
              color="neutral"
              variant="ghost"
              icon="i-lucide-file-spreadsheet"
            >
              View Filled Sample
            </UButton>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <h2 class="font-bold text-highlighted">
              Import rules
            </h2>
          </template>

          <ul class="space-y-3 text-sm leading-6 text-muted">
            <li class="flex gap-3">
              <UIcon
                name="i-lucide-check"
                class="mt-1 size-4 shrink-0 text-success"
              />
              Supports Multiple Choice, Checkbox, Fill in the Blanks, and both True or False formats
            </li>

            <li class="flex gap-3">
              <UIcon
                name="i-lucide-check"
                class="mt-1 size-4 shrink-0 text-success"
              />
              Choice questions use option numbers such as `2` or `1,3` for the correct answer
            </li>

            <li class="flex gap-3">
              <UIcon
                name="i-lucide-check"
                class="mt-1 size-4 shrink-0 text-success"
              />
              Text answers and False corrections use the Accepted Text Answer(s) column; separate alternatives with `|`
            </li>

            <li class="flex gap-3">
              <UIcon
                name="i-lucide-check"
                class="mt-1 size-4 shrink-0 text-success"
              />
              Empty time cells use 30 seconds, and imported questions use 1 point by default
            </li>
          </ul>
        </UCard>

        <UAlert
          color="info"
          variant="soft"
          title="Secure workbook validation"
          description="SNCBT Assess checks the workbook before import and only accepts rows that match the supported assessment template."
        />
      </div>
    </div>
  </div>
</template>
