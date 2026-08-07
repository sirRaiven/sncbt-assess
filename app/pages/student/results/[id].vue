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

const attempt =
  computed(
    () =>
      delivery.value?.attempt
      || null,
  );

const canShowScore =
  computed(
    () =>
      Boolean(
        delivery.value
        && delivery.value.resultVisibility
          !== "hidden"
        && attempt.value,
      ),
  );

const scorePercent =
  computed(
    () => {
      if (
        !attempt.value
        || attempt.value.maximumScore
          <= 0
      ) {
        return 0;
      }

      return Math.round(
        (
          attempt.value.totalScore
          / attempt.value.maximumScore
        ) * 100,
      );
    },
  );

const completionTime =
  computed(
    () => {
      if (
        !attempt.value?.startedAt
        || !attempt.value.submittedAt
      ) {
        return "Not recorded";
      }

      const elapsedSeconds =
        Math.max(
          0,
          Math.round(
            (
              new Date(
                attempt.value.submittedAt,
              ).getTime()
              - new Date(
                attempt.value.startedAt,
              ).getTime()
            ) / 1000,
          ),
        );

      const hours =
        Math.floor(
          elapsedSeconds / 3600,
        );

      const minutes =
        Math.floor(
          (
            elapsedSeconds % 3600
          ) / 60,
        );

      const seconds =
        elapsedSeconds % 60;

      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      }

      if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
      }

      return `${seconds}s`;
    },
  );

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
      || "Unable to load this assessment result.";

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
    <PortalBackButton
      fallback-to="/student/results"
    />

    <PageHeader
      eyebrow="Assessment result"
      :title="
        delivery?.title
        || 'Assessment Result'
      "
      :description="
        delivery
          ? `${delivery.subjectCode} · ${delivery.classroom.section}`
          : 'Loading result'
      "
    >
      <template #actions>
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-refresh-cw"
          :loading="isLoading"
          @click="loadResult"
        >
          Refresh
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
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <USkeleton
          v-for="number in 4"
          :key="number"
          class="h-28 rounded-xl"
        />
      </div>
      <USkeleton class="h-52 rounded-xl" />
    </div>

    <template
      v-else-if="
        delivery
        && attempt
      "
    >
      <section
        v-if="canShowScore"
        class="rounded-xl bg-gradient-to-r from-brand-900 via-brand-700 to-indigo-700 p-6 text-white sm:p-7"
      >
        <div class="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p class="text-blue-100">
              Final score
            </p>

            <p class="mt-2 text-5xl font-black sm:text-6xl">
              {{ attempt.totalScore }}
              /
              {{ attempt.maximumScore }}
            </p>

            <p class="mt-3 text-blue-100">
              {{ scorePercent }}% · {{ attempt.answeredCount }} of {{ delivery.questionCount }} questions answered
            </p>
          </div>

          <StatusPill
            :status="attempt.status"
          />
        </div>
      </section>

      <UAlert
        v-else
        color="info"
        variant="soft"
        title="Result not yet available"
        description="Your submission is recorded, but your instructor has not released the score for this assessment."
      />

      <section
        v-if="canShowScore"
        class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <StatCard
          label="Correct"
          :value="
            attempt.correctCount === null
              ? '—'
              : String(attempt.correctCount)
          "
          icon="i-lucide-circle-check-big"
          tone="success"
        />

        <StatCard
          label="Incorrect"
          :value="
            attempt.wrongCount === null
              ? '—'
              : String(attempt.wrongCount)
          "
          icon="i-lucide-circle-x"
          tone="warning"
        />

        <StatCard
          label="Unanswered"
          :value="String(attempt.unansweredCount)"
          icon="i-lucide-circle-help"
          tone="neutral"
        />

        <StatCard
          label="Completion time"
          :value="completionTime"
          icon="i-lucide-clock-3"
          tone="info"
        />
      </section>

      <UCard>
        <template #header>
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 class="font-black text-highlighted">
                Submission details
              </h2>

              <p class="mt-1 text-sm text-muted">
                Server-recorded information for this assessment attempt.
              </p>
            </div>

            <StatusPill
              :status="attempt.status"
            />
          </div>
        </template>

        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div class="rounded-xl border border-default p-4">
            <p class="text-xs font-bold uppercase tracking-[0.14em] text-muted">
              Started
            </p>

            <p class="mt-2 font-bold text-highlighted">
              {{ formatDate(attempt.startedAt) }}
            </p>
          </div>

          <div class="rounded-xl border border-default p-4">
            <p class="text-xs font-bold uppercase tracking-[0.14em] text-muted">
              Submitted
            </p>

            <p class="mt-2 font-bold text-highlighted">
              {{ formatDate(attempt.submittedAt) }}
            </p>
          </div>

          <div class="rounded-xl border border-default p-4">
            <p class="text-xs font-bold uppercase tracking-[0.14em] text-muted">
              Class
            </p>

            <p class="mt-2 font-bold text-highlighted">
              {{ delivery.classroom.name }}
            </p>

            <p class="mt-1 text-sm text-muted">
              {{ delivery.classroom.section }}
            </p>
          </div>

          <div class="rounded-xl border border-default p-4">
            <p class="text-xs font-bold uppercase tracking-[0.14em] text-muted">
              Result access
            </p>

            <p class="mt-2 font-bold text-highlighted">
              {{
                delivery.resultVisibility === "hidden"
                  ? "Not released"
                  : delivery.resultVisibility === "score_only"
                    ? "Score only"
                    : "Score and answer review"
              }}
            </p>
          </div>
        </div>

        <UAlert
          v-if="attempt.status === 'auto_submitted'"
          class="mt-6"
          color="warning"
          variant="soft"
          title="Automatically submitted"
          :description="
            attempt.submittedReason
            || 'The assessment timer or availability period ended.'
          "
        />
      </UCard>

      <UCard>
        <template #header>
          <h2 class="font-black text-highlighted">
            Answer review
          </h2>
        </template>

        <UAlert
          v-if="delivery.resultVisibility === 'hidden'"
          color="info"
          variant="soft"
          title="Review is not available yet"
          description="Your instructor has not released this assessment result."
        />

        <UAlert
          v-else-if="delivery.resultVisibility === 'score_only'"
          color="neutral"
          variant="soft"
          title="Score-only result"
          description="Your instructor has released the score but has not enabled question-by-question answer review."
        />

        <UAlert
          v-else
          color="success"
          variant="soft"
          title="Question review is being prepared"
          description="Your instructor has allowed answer review. Your score is available now; question-by-question details will appear when the review data is available."
        />
      </UCard>

      <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <UButton
          to="/student/results"
          color="neutral"
          variant="outline"
          icon="i-lucide-arrow-left"
        >
          Back to My Results
        </UButton>

        <UButton
          to="/student/assessments"
          color="neutral"
          variant="soft"
          icon="i-lucide-clipboard-list"
        >
          View Assessments
        </UButton>
      </div>
    </template>

    <EmptyPanel
      v-else-if="!errorMessage"
      icon="i-lucide-file-question"
      title="No result was found"
      description="This assessment does not have a submitted attempt that can be displayed."
    />
  </div>
</template>
