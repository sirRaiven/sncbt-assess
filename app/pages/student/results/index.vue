<script setup lang="ts">
import type {
  StudentAssessmentDelivery,
} from "~/types/assessment-delivery";

definePageMeta({
  layout:
    "student",
});

useSeoMeta({
  title:
    "My Results",
});

const {
  listStudentDeliveries,
} = useAssessmentDelivery();

const results =
  ref<
    StudentAssessmentDelivery[]
  >(
    [],
  );

const isLoading =
  ref(true);

const errorMessage =
  ref("");

function formatDate(
  value: string | null,
): string {
  if (!value) {
    return "Not recorded";
  }

  return new Intl
    .DateTimeFormat(
      "en-PH",
      {
        dateStyle:
          "medium",
        timeStyle:
          "short",
      },
    )
    .format(
      new Date(value),
    );
}


function baseScore(
  delivery:
    StudentAssessmentDelivery,
): number {
  const attempt =
    delivery.attempt;

  if (!attempt) {
    return 0;
  }

  return Math.max(
    0,
    attempt.totalScore
    - (attempt.speedBonus || 0),
  );
}

function percentage(
  delivery:
    StudentAssessmentDelivery,
): number {
  const attempt =
    delivery.attempt;

  if (
    !attempt
    || attempt.maximumScore <= 0
  ) {
    return 0;
  }

  return Math.round(
    (
      baseScore(delivery)
      / attempt.maximumScore
    ) * 100,
  );
}

async function loadResults():
  Promise<void> {
  isLoading.value =
    true;

  errorMessage.value =
    "";

  const result =
    await listStudentDeliveries();

  if (
    result.error
    || !result.data
  ) {
    errorMessage.value =
      result.error
      || "Unable to load your assessment results.";

    isLoading.value =
      false;

    return;
  }

  results.value =
    result.data.deliveries
      .filter(
        (delivery) =>
          delivery.attempt
          && [
            "submitted",
            "auto_submitted",
          ].includes(
            delivery.attempt.status,
          ),
      )
      .sort(
        (
          first,
          second,
        ) =>
          new Date(
            second.attempt
              ?.submittedAt
            || 0,
          ).getTime()
          - new Date(
            first.attempt
              ?.submittedAt
            || 0,
          ).getTime(),
      );

  isLoading.value =
    false;
}

onMounted(
  loadResults,
);
</script>

<template>
  <div class="page-stack">
    <PageHeader
      :breadcrumbs="[
        { label: 'Overview', to: '/student/dashboard', icon: 'i-lucide-layout-dashboard' },
        { label: 'My Results' },
      ]"
      eyebrow="Academic performance"
      title="My Results"
      description="Review your submitted classroom assessments and any scores your instructor has released."
    >
      <template #actions>
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-refresh-cw"
          :loading="isLoading"
          @click="loadResults"
        >
          Refresh
        </UButton>
      </template>
    </PageHeader>

    <UAlert
      v-if="errorMessage"
      color="error"
      variant="soft"
      title="Results could not be loaded"
      :description="errorMessage"
    />

    <div
      v-if="isLoading"
      class="grid gap-4 xl:grid-cols-2"
    >
      <USkeleton
        v-for="number in 4"
        :key="number"
        class="h-60 rounded-xl"
      />
    </div>

    <EmptyPanel
      v-else-if="
        results.length === 0
      "
      icon="i-lucide-trophy"
      title="No submitted results"
      description="Submitted assessments will appear here. Score visibility and instant feedback remain controlled by your instructor."
    />

    <div
      v-else
      class="grid gap-4 xl:grid-cols-2"
    >
      <UCard
        v-for="delivery in results"
        :key="delivery.assignmentId"
      >
        <div class="flex items-start gap-4">
          <div class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <UIcon
              name="i-lucide-trophy"
              class="size-5"
            />
          </div>

          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p class="text-xs font-bold uppercase tracking-[0.14em] text-primary">
                  {{ delivery.subjectCode }}
                  ·
                  {{ delivery.classroom.section }}
                </p>

                <h2 class="mt-2 text-lg font-black text-highlighted">
                  {{ delivery.title }}
                </h2>
              </div>

              <StatusPill
                :status="
                  delivery.attempt?.status
                  || 'submitted'
                "
              />
            </div>

            <div
              v-if="
                delivery.resultVisibility
                !== 'hidden'
                && delivery.attempt
              "
              class="mt-5 grid grid-cols-3 gap-3"
            >
              <div class="rounded-lg bg-elevated p-3 text-center">
                <p class="text-xs text-muted">
                  {{
                    delivery.scoringMode === "speed_bonus"
                      ? "Points"
                      : "Score"
                  }}
                </p>

                <p class="mt-1 font-black text-highlighted">
                  <template v-if="delivery.scoringMode === 'speed_bonus'">
                    {{ delivery.attempt.totalScore }}
                  </template>

                  <template v-else>
                    {{ delivery.attempt.totalScore }}
                    /
                    {{ delivery.attempt.maximumScore }}
                  </template>
                </p>

                <p
                  v-if="delivery.scoringMode === 'speed_bonus'"
                  class="mt-1 text-[11px] text-muted"
                >
                  Base {{ baseScore(delivery) }} / {{ delivery.attempt.maximumScore }} · +{{ delivery.attempt.speedBonus }} bonus
                </p>
              </div>

              <div class="rounded-lg bg-elevated p-3 text-center">
                <p class="text-xs text-muted">
                  Percentage
                </p>

                <p class="mt-1 font-black text-highlighted">
                  {{ percentage(delivery) }}%
                </p>
              </div>

              <div class="rounded-lg bg-elevated p-3 text-center">
                <p class="text-xs text-muted">
                  Answered
                </p>

                <p class="mt-1 font-black text-highlighted">
                  {{ delivery.attempt.answeredCount }}
                  /
                  {{ delivery.questionCount }}
                </p>
              </div>
            </div>

            <UAlert
              v-else
              class="mt-5"
              color="info"
              variant="soft"
              title="Score hidden"
              description="Your submission is recorded, but the instructor has not released the score."
            />

            <div class="mt-5 flex flex-wrap items-center justify-between gap-3">
              <p class="text-xs text-muted">
                Submitted:
                {{
                  formatDate(
                    delivery.attempt
                      ?.submittedAt
                    || null,
                  )
                }}
              </p>

              <UButton
                v-if="
                  delivery.canViewResult
                "
                :to="`/student/results/${delivery.assignmentId}`"
                color="neutral"
                variant="outline"
                icon="i-lucide-eye"
              >
                View Result
              </UButton>
            </div>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
