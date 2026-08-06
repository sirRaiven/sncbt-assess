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
    "Assessment Result",
});

const route =
  useRoute();

const assignmentId =
  computed(
    () =>
      String(
        route.params.id,
      ),
  );

const {
  getResult,
} = useAssessmentDelivery();

const delivery =
  ref<
    StudentAssessmentDelivery
    | null
  >(
    null,
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

const scorePercent =
  computed(
    () => {
      const attempt =
        delivery.value?.attempt;

      if (
        !attempt
        || attempt.maximumScore
        <= 0
      ) {
        return 0;
      }

      return Math.round(
        (
          attempt.totalScore
          / attempt.maximumScore
        ) * 100,
      );
    },
  );

async function loadResult():
  Promise<void> {
  isLoading.value =
    true;

  errorMessage.value =
    "";

  const result =
    await getResult(
      assignmentId.value,
    );

  if (
    result.error
    || !result.data
  ) {
    errorMessage.value =
      result.error
      || "Unable to load the assessment result.";

    isLoading.value =
      false;

    return;
  }

  delivery.value =
    result.data.delivery;

  isLoading.value =
    false;
}

onMounted(
  loadResult,
);
</script>

<template>
  <div class="page-stack">
    <PageHeader
      eyebrow="Assessment result"
      :title="
        delivery?.title
        || 'Assessment Submitted'
      "
      :description="
        delivery
          ? `${delivery.subjectCode} · ${delivery.classroom.section}`
          : 'Loading result'
      "
    >
      <template #actions>
        <UButton
          to="/student/assessments"
          color="neutral"
          variant="outline"
          icon="i-lucide-arrow-left"
        >
          Assessments
        </UButton>
      </template>
    </PageHeader>

    <UAlert
      v-if="errorMessage"
      color="error"
      variant="soft"
      title="Result could not be loaded"
      :description="errorMessage"
    />

    <div
      v-if="isLoading"
      class="space-y-4"
    >
      <USkeleton class="h-56 rounded-xl" />
      <USkeleton class="h-72 rounded-xl" />
    </div>

    <template
      v-else-if="
        delivery?.attempt
      "
    >
      <UCard>
        <div class="text-center">
          <div class="mx-auto flex size-16 items-center justify-center rounded-xl bg-success/10 text-success">
            <UIcon
              name="i-lucide-circle-check-big"
              class="size-8"
            />
          </div>

          <h2 class="mt-5 text-2xl font-black text-highlighted">
            Assessment submitted
          </h2>

          <p class="mt-2 text-sm text-muted">
            Your answers are locked and can no longer be changed.
          </p>

          <StatusPill
            class="mt-4"
            :status="
              delivery.attempt.status
            "
          />
        </div>

        <div
          v-if="
            delivery.resultVisibility
            !== 'hidden'
          "
          class="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          <div class="rounded-xl bg-elevated p-4 text-center">
            <p class="text-xs text-muted">
              Score
            </p>

            <p class="mt-2 text-2xl font-black text-highlighted">
              {{ delivery.attempt.totalScore }}
              /
              {{ delivery.attempt.maximumScore }}
            </p>
          </div>

          <div class="rounded-xl bg-elevated p-4 text-center">
            <p class="text-xs text-muted">
              Percentage
            </p>

            <p class="mt-2 text-2xl font-black text-highlighted">
              {{ scorePercent }}%
            </p>
          </div>

          <div class="rounded-xl bg-elevated p-4 text-center">
            <p class="text-xs text-muted">
              Answered
            </p>

            <p class="mt-2 text-2xl font-black text-highlighted">
              {{ delivery.attempt.answeredCount }}
            </p>
          </div>

          <div class="rounded-xl bg-elevated p-4 text-center">
            <p class="text-xs text-muted">
              Unanswered
            </p>

            <p class="mt-2 text-2xl font-black text-highlighted">
              {{ delivery.attempt.unansweredCount }}
            </p>
          </div>
        </div>

        <UAlert
          v-else
          class="mt-8"
          color="info"
          variant="soft"
          title="Result hidden"
          description="Your instructor has chosen not to display the score yet."
        />

        <div class="mt-8 grid gap-4 md:grid-cols-2">
          <div class="rounded-xl border border-default p-4">
            <p class="text-xs font-bold uppercase tracking-[0.14em] text-muted">
              Started
            </p>

            <p class="mt-2 font-bold text-highlighted">
              {{
                formatDate(
                  delivery.attempt.startedAt,
                )
              }}
            </p>
          </div>

          <div class="rounded-xl border border-default p-4">
            <p class="text-xs font-bold uppercase tracking-[0.14em] text-muted">
              Submitted
            </p>

            <p class="mt-2 font-bold text-highlighted">
              {{
                formatDate(
                  delivery.attempt.submittedAt,
                )
              }}
            </p>
          </div>
        </div>

        <UAlert
          v-if="
            delivery.attempt.status
            === 'auto_submitted'
          "
          class="mt-6"
          color="warning"
          variant="soft"
          title="Automatically submitted"
          :description="
            delivery.attempt.submittedReason
            || 'The timer or class availability period ended.'
          "
        />
      </UCard>
    </template>
  </div>
</template>
