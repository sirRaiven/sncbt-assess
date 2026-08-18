<script setup lang="ts">
import type {
  AssessmentImport,
  AssessmentImportRow,
} from "~/types/assessment-import";

definePageMeta({
  layout: "instructor",
});

useSeoMeta({
  title: "Import preview",
});

const route = useRoute();
const toast = useToast();

const assessmentId = computed(
  () =>
    String(
      route.params.id,
    ),
);

const importId = computed(() => {
  const value =
    route.query.import;

  return typeof value === "string"
    ? value
    : "";
});

const {
  getImport,
  commitImport,
  cancelImport,
} = useAssessmentImport();

const assessmentImport =
  ref<AssessmentImport | null>(
    null,
  );

const rows =
  ref<AssessmentImportRow[]>([]);

const excludedRowIds =
  ref<Set<string>>(
    new Set(),
  );

const isLoading = ref(true);
const isCommitting = ref(false);
const isCancelling = ref(false);
const errorMessage = ref("");
const statusFilter = ref("All rows");

const selectedValidCount = computed(
  () =>
    rows.value.filter(
      (row) =>
        row.is_valid
        && !excludedRowIds.value
          .has(row.id),
    ).length,
);

const filteredRows = computed(() => {
  if (
    statusFilter.value
    === "Valid rows"
  ) {
    return rows.value.filter(
      (row) => row.is_valid,
    );
  }

  if (
    statusFilter.value
    === "Invalid rows"
  ) {
    return rows.value.filter(
      (row) => !row.is_valid,
    );
  }

  if (
    statusFilter.value
    === "Excluded rows"
  ) {
    return rows.value.filter(
      (row) =>
        excludedRowIds.value
          .has(row.id),
    );
  }

  return rows.value;
});

function formatFileSize(
  size: number,
): string {
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
}

function questionTypeLabel(
  value: string | null,
): string {
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

function toggleExcluded(
  row: AssessmentImportRow,
): void {
  const updated =
    new Set(
      excludedRowIds.value,
    );

  if (updated.has(row.id)) {
    updated.delete(row.id);
  } else {
    updated.add(row.id);
  }

  excludedRowIds.value =
    updated;
}

async function loadPreview(): Promise<void> {
  isLoading.value = true;
  errorMessage.value = "";

  if (!importId.value) {
    errorMessage.value =
      "The staged import ID is missing.";
    isLoading.value = false;
    return;
  }

  const result =
    await getImport(
      importId.value,
    );

  if (
    result.error
    || !result.data
  ) {
    errorMessage.value =
      result.error
      || "Unable to load the staged import.";

    isLoading.value = false;
    return;
  }

  assessmentImport.value =
    result.data.assessmentImport;

  if (
    assessmentImport.value.assessment_id
    !== assessmentId.value
  ) {
    errorMessage.value =
      "This staged import does not belong to the selected assessment.";

    isLoading.value = false;
    return;
  }

  rows.value =
    result.data.rows;

  excludedRowIds.value =
    new Set(
      rows.value
        .filter(
          (row) =>
            row.is_excluded
            || !row.is_valid,
        )
        .map(
          (row) => row.id,
        ),
    );

  isLoading.value = false;
}

async function commit(): Promise<void> {
  if (
    !assessmentImport.value
    || selectedValidCount.value < 1
  ) {
    return;
  }

  isCommitting.value = true;
  errorMessage.value = "";

  const result =
    await commitImport(
      assessmentImport.value.id,
      Array.from(
        excludedRowIds.value,
      ),
    );

  if (
    result.error
    || !result.data
  ) {
    errorMessage.value =
      result.error
      || "The selected questions could not be imported.";

    isCommitting.value = false;
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
    `/instructor/assessments/${result.data.assessmentId}/edit`,
  );
}

async function cancel(): Promise<void> {
  if (!assessmentImport.value) {
    return;
  }

  isCancelling.value = true;

  const result =
    await cancelImport(
      assessmentImport.value.id,
    );

  if (
    result.error
    || !result.data
  ) {
    toast.add({
      title:
        "Import could not be cancelled",
      description:
        result.error
        || "The action could not be completed.",
      color:
        "error",
    });

    isCancelling.value = false;
    return;
  }

  toast.add({
    title:
      "Import cancelled",
    description:
      result.data.message,
    color:
      "success",
  });

  await navigateTo(
    `/instructor/assessments/${assessmentId.value}/edit`,
  );
}

onMounted(
  loadPreview,
);
</script>

<template>
  <div class="page-stack">
    <PageHeader
      :breadcrumbs="[
        { label: 'Overview', to: '/instructor/dashboard', icon: 'i-lucide-layout-dashboard' },
        { label: 'Assessments', to: '/instructor/assessments' },
        { label: 'Questions', to: `/instructor/assessments/${assessmentId}/edit` },
        { label: 'Import', to: `/instructor/assessments/${assessmentId}/import` },
        { label: 'Review' },
      ]"
      eyebrow="Import review"
      title="Review imported questions"
      description="Check every detected row. Invalid and excluded rows will not be inserted into the assessment."
    >
      <template #actions>
        <UButton
          :to="`/instructor/assessments/${assessmentId}/import`"
          color="neutral"
          variant="outline"
          icon="i-lucide-upload"
        >
          Upload Another File
        </UButton>
      </template>
    </PageHeader>

    <AssessmentWorkspaceNavigation
      :assessment-id="assessmentId"
      active="questions"
    />

    <UAlert
      v-if="errorMessage"
      color="error"
      variant="soft"
      title="Unable to load import preview"
      :description="errorMessage"
    />

    <div
      v-if="isLoading"
      class="space-y-5"
    >
      <USkeleton class="h-28 rounded-xl" />
      <USkeleton class="h-96 rounded-xl" />
    </div>

    <template
      v-else-if="assessmentImport"
    >
      <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Detected rows"
          :value="String(assessmentImport.total_rows)"
          icon="i-lucide-rows-3"
          tone="primary"
        />

        <StatCard
          label="Valid rows"
          :value="String(assessmentImport.valid_rows)"
          icon="i-lucide-circle-check-big"
          tone="success"
        />

        <StatCard
          label="Invalid rows"
          :value="String(assessmentImport.invalid_rows)"
          icon="i-lucide-circle-alert"
          tone="warning"
        />

        <StatCard
          label="Selected to import"
          :value="String(selectedValidCount)"
          icon="i-lucide-list-checks"
          tone="info"
        />

        <StatCard
          label="File size"
          :value="formatFileSize(assessmentImport.file_size_bytes)"
          icon="i-lucide-file-spreadsheet"
          tone="neutral"
        />
      </section>

      <UCard>
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p class="font-black text-highlighted">
              {{ assessmentImport.original_filename }}
            </p>

            <p class="mt-1 text-sm text-muted">
              Staged rows expire at
              {{ new Date(assessmentImport.expires_at).toLocaleString() }}
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
            class="w-full lg:w-52"
          />
        </div>
      </UCard>

      <div class="space-y-4">
        <UCard
          v-for="row in filteredRows"
          :key="row.id"
          :class="{
            'opacity-55': excludedRowIds.has(row.id),
          }"
        >
          <div class="flex flex-col gap-5 xl:flex-row xl:items-start">
            <div class="flex items-start gap-3 xl:w-52 xl:shrink-0">
              <div
                class="flex size-10 shrink-0 items-center justify-center rounded-xl font-black"
                :class="
                  row.is_valid
                    ? 'bg-success/10 text-success'
                    : 'bg-error/10 text-error'
                "
              >
                {{ row.source_row_number }}
              </div>

              <div>
                <p class="text-xs font-bold uppercase tracking-[0.14em] text-muted">
                  Spreadsheet row
                </p>

                <StatusPill
                  class="mt-2"
                  :status="
                    excludedRowIds.has(row.id)
                      ? 'Excluded'
                      : row.is_valid
                        ? 'Valid'
                        : 'Invalid'
                  "
                />
              </div>
            </div>

            <div class="min-w-0 flex-1">
              <p class="font-black leading-6 text-highlighted">
                {{ row.normalized_data.questionText || 'Question text missing' }}
              </p>

              <div class="mt-2 flex flex-wrap gap-2">
                <UBadge
                  color="info"
                  variant="soft"
                >
                  {{ questionTypeLabel(row.normalized_data.questionType) }}
                </UBadge>

                <UBadge
                  color="neutral"
                  variant="soft"
                  icon="i-lucide-clock-3"
                >
                  {{ row.normalized_data.timeLimitSeconds }} sec
                </UBadge>

                <UBadge
                  v-if="row.normalized_data.options.length"
                  color="neutral"
                  variant="soft"
                >
                  {{ row.normalized_data.options.length }} choices
                </UBadge>

                <UBadge
                  v-if="row.normalized_data.acceptedAnswers.length"
                  color="neutral"
                  variant="soft"
                >
                  {{ row.normalized_data.acceptedAnswers.length }} accepted text answer{{ row.normalized_data.acceptedAnswers.length === 1 ? '' : 's' }}
                </UBadge>

                <UBadge
                  v-if="row.normalized_data.correctBoolean !== null"
                  color="success"
                  variant="soft"
                >
                  Correct: {{ row.normalized_data.correctBoolean ? 'True' : 'False' }}
                </UBadge>
              </div>

              <div
                v-if="row.normalized_data.options.length"
                class="mt-4 grid gap-2 sm:grid-cols-2"
              >
                <div
                  v-for="(option, optionIndex) in row.normalized_data.options"
                  :key="optionIndex"
                  class="rounded-lg border border-default px-3 py-2 text-sm"
                >
                  <span class="font-bold text-muted">
                    {{ optionIndex + 1 }}.
                  </span>

                  <span class="ml-1 text-highlighted">
                    {{ option.text }}
                  </span>

                  <UBadge
                    v-if="option.isCorrect"
                    color="success"
                    variant="soft"
                    size="sm"
                    class="ml-2"
                  >
                    Correct
                  </UBadge>
                </div>
              </div>

              <div
                v-if="row.normalized_data.acceptedAnswers.length"
                class="mt-4 rounded-xl border border-default bg-elevated/40 p-3"
              >
                <p class="text-xs font-bold uppercase tracking-[0.12em] text-muted">
                  Accepted text answer{{ row.normalized_data.acceptedAnswers.length === 1 ? '' : 's' }}
                </p>
                <div class="mt-2 flex flex-wrap gap-2">
                  <UBadge
                    v-for="answer in row.normalized_data.acceptedAnswers"
                    :key="answer"
                    color="success"
                    variant="soft"
                  >
                    {{ answer }}
                  </UBadge>
                </div>
              </div>

              <UAlert
                v-if="row.validation_errors.length"
                class="mt-4"
                color="error"
                variant="soft"
                title="Row errors"
              >
                <template #description>
                  <ul class="mt-1 list-disc space-y-1 pl-5">
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

            <div class="xl:w-36 xl:shrink-0">
              <UButton
                block
                :color="
                  excludedRowIds.has(row.id)
                    ? 'success'
                    : 'neutral'
                "
                variant="soft"
                :icon="
                  excludedRowIds.has(row.id)
                    ? 'i-lucide-rotate-ccw'
                    : 'i-lucide-eye-off'
                "
                @click="toggleExcluded(row)"
              >
                {{
                  excludedRowIds.has(row.id)
                    ? 'Restore'
                    : 'Exclude'
                }}
              </UButton>
            </div>
          </div>
        </UCard>
      </div>

      <UCard>
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p class="font-black text-highlighted">
              Ready to append {{ selectedValidCount }} question{{ selectedValidCount === 1 ? '' : 's' }}
            </p>

            <p class="mt-1 text-sm text-muted">
              SNCBT Assess will import only the valid questions you have kept in this review.
            </p>
          </div>

          <div class="flex flex-col-reverse gap-3 sm:flex-row">
            <UButton
              color="neutral"
              variant="outline"
              :loading="isCancelling"
              @click="cancel"
            >
              Cancel Import
            </UButton>

            <UButton
              color="success"
              size="lg"
              icon="i-lucide-list-plus"
              :loading="isCommitting"
              :disabled="selectedValidCount < 1"
              @click="commit"
            >
              Import Selected Questions
            </UButton>
          </div>
        </div>
      </UCard>
    </template>
  </div>
</template>
