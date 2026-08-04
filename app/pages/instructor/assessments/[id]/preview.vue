<script setup lang="ts">
import type {
  AssessmentWithClassroom,
} from "~/types/assessment";

definePageMeta({
  layout: "instructor",
});

useSeoMeta({
  title: "Assessment preview",
});

const route = useRoute();

const assessmentId = computed(
  () => String(route.params.id),
);

const {
  getInstructorAssessment,
} = useAssessments();

const assessment =
  ref<AssessmentWithClassroom | null>(null);

const isLoading = ref(true);
const errorMessage = ref("");

function label(
  value: string,
): string {
  return value
    .split("_")
    .map(
      (part) =>
        part.charAt(0).toUpperCase()
        + part.slice(1),
    )
    .join(" ");
}

async function loadAssessment(): Promise<void> {
  isLoading.value = true;

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
      || "Unable to load the assessment preview.";

    isLoading.value = false;
    return;
  }

  assessment.value =
    result.data.assessment;

  isLoading.value = false;
}

onMounted(
  loadAssessment,
);
</script>

<template>
  <div class="page-stack">
    <PageHeader
      eyebrow="Assessment preview"
      :title="assessment?.title || 'Assessment'"
      description="Review the instructions and delivery settings that will be used for the student assessment experience."
    >
      <template #actions>
        <UButton
          :to="`/instructor/assessments/${assessmentId}/settings`"
          color="neutral"
          variant="outline"
          icon="i-lucide-settings-2"
        >
          Settings
        </UButton>
      </template>
    </PageHeader>

    <UAlert
      v-if="errorMessage"
      color="error"
      variant="soft"
      title="Preview could not be loaded"
      :description="errorMessage"
    />

    <div
      v-if="isLoading"
      class="space-y-5"
    >
      <USkeleton class="h-56 rounded-xl" />
      <USkeleton class="h-72 rounded-xl" />
    </div>

    <template v-else-if="assessment">
      <div class="mx-auto w-full max-w-5xl">
        <UCard>
          <div class="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div class="max-w-3xl">
              <div class="flex flex-wrap gap-2">
                <StatusPill
                  :status="assessment.status"
                />

                <UBadge
                  color="info"
                  variant="soft"
                >
                  {{ label(assessment.assessment_type) }}
                </UBadge>
              </div>

              <h1 class="mt-5 text-3xl font-black leading-tight text-highlighted">
                {{ assessment.title }}
              </h1>

              <p class="mt-2 text-sm text-muted">
                {{ assessment.subject_code }}
                ·
                {{ assessment.classroom.section }}
                ·
                {{ assessment.classroom.name }}
              </p>
            </div>

            <div class="rounded-xl border border-default bg-elevated p-4 text-sm">
              <p class="text-muted">
                Questions
              </p>
              <p class="mt-1 text-2xl font-black text-highlighted">
                {{ assessment.question_count }}
              </p>
            </div>
          </div>

          <USeparator class="my-7" />

          <div>
            <h2 class="font-bold text-highlighted">
              Instructions
            </h2>

            <p class="mt-3 whitespace-pre-line text-sm leading-7 text-muted">
              {{
                assessment.instructions
                || "No instructions were provided."
              }}
            </p>
          </div>

          <USeparator class="my-7" />

          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div class="rounded-lg bg-elevated p-4">
              <p class="text-xs text-muted">
                Scoring
              </p>
              <p class="mt-1 font-semibold text-highlighted">
                {{ label(assessment.scoring_mode) }}
              </p>
            </div>

            <div class="rounded-lg bg-elevated p-4">
              <p class="text-xs text-muted">
                Results
              </p>
              <p class="mt-1 font-semibold text-highlighted">
                {{ label(assessment.result_visibility) }}
              </p>
            </div>

            <div class="rounded-lg bg-elevated p-4">
              <p class="text-xs text-muted">
                Time limit
              </p>
              <p class="mt-1 font-semibold text-highlighted">
                {{
                  assessment.overall_time_limit_seconds
                    ? `${Math.round(
                        assessment.overall_time_limit_seconds / 60,
                      )} minutes`
                    : "Per-question"
                }}
              </p>
            </div>

            <div class="rounded-lg bg-elevated p-4">
              <p class="text-xs text-muted">
                Backtracking
              </p>
              <p class="mt-1 font-semibold text-highlighted">
                {{
                  assessment.allow_backtracking
                    ? "Allowed"
                    : "Not allowed"
                }}
              </p>
            </div>
          </div>
        </UCard>

        <EmptyPanel
          class="mt-6"
          icon="i-lucide-list-plus"
          title="Question builder begins in Phase 3"
          description="Questions will appear in this preview after the manual builder is connected to the database."
        />
      </div>
    </template>
  </div>
</template>
