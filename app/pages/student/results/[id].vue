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
  getStudentDelivery,
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

const attemptPolicy =
  computed(
    () =>
      delivery.value?.attemptPolicy
      || null,
  );

const canTakeAnotherAttempt =
  computed(
    () =>
      Boolean(
        delivery.value?.canStart
        && attempt.value
        && [
          "submitted",
          "auto_submitted",
        ].includes(
          attempt.value.status,
        ),
      ),
  );

function automaticSubmissionDescription(
  reason: string | null,
): string {
  if (
    reason === "automatic_deadline_submission"
    || reason === "deadline_expired"
    || reason === "schedule_deadline_expired"
    || reason === "schedule_deadline_expired_after_reconnect"
  ) {
    return "The class closing deadline was reached before the assessment was submitted manually.";
  }

  if (
    reason === "last_question_timer_expired"
  ) {
    return "The final question's answer time expired, so the assessment was submitted automatically.";
  }

  if (
    reason === "instructor_force_submitted"
  ) {
    return "Your instructor submitted the active attempt.";
  }

  if (
    reason === "overall_timer_expired"
    || reason === "overall_timer_expired_after_reconnect"
  ) {
    return "This historical attempt was submitted by the previous whole-assessment timer.";
  }

  return "The assessment was submitted automatically when the scheduled deadline was reached.";
}

function scorePolicyLabel(
  policy: string,
): string {
  if (policy === "highest") {
    return "Highest score";
  }

  if (policy === "latest") {
    return "Latest attempt";
  }

  if (policy === "first") {
    return "First attempt";
  }

  if (policy === "average") {
    return "Average score";
  }

  return "Assessment policy";
}

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

const speedBonus =
  computed(
    () =>
      attempt.value
        ?.speedBonus
      || 0,
  );

const baseScore =
  computed(
    () =>
      Math.max(
        0,
        (attempt.value?.totalScore || 0)
        - speedBonus.value,
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
          baseScore.value
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

  try {
    const result =
      await getResult(
        assignmentId.value,
      );

    if (
      result.error
      || !result.data
    ) {
      // Backward-compatible fallback for an older Edge Function that
      // still returned RESULT_HIDDEN as a 403. The updated function
      // returns the safe delivery state instead of a technical error.
      if (
        result.code
        === "RESULT_HIDDEN"
      ) {
        const fallback =
          await getStudentDelivery(
            assignmentId.value,
          );

        if (fallback.data) {
          delivery.value =
            fallback.data.delivery;

          return;
        }
      }

      delivery.value =
        null;

      errorMessage.value =
        "This assessment result is not available right now. Please try again later.";

      return;
    }

    delivery.value =
      result.data.delivery;
  } catch {
    delivery.value =
      null;

    errorMessage.value =
      "This assessment result could not be loaded. Please try again.";
  } finally {
    isLoading.value =
      false;
  }
}

onMounted(
  loadResult,
);
</script>

<template>
  <div class="page-stack">
    <PageHeader
      :breadcrumbs="[
        { label: 'Overview', to: '/student/dashboard', icon: 'i-lucide-layout-dashboard' },
        { label: 'My Results', to: '/student/results' },
        { label: delivery?.title || 'Assessment result' },
      ]"
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
              {{
                delivery.scoringMode === "speed_bonus"
                  ? "Final points"
                  : "Final score"
              }}
            </p>

            <p class="mt-2 text-5xl font-black sm:text-6xl">
              <template v-if="delivery.scoringMode === 'speed_bonus'">
                {{ attempt.totalScore }}
              </template>

              <template v-else>
                {{ attempt.totalScore }}
                /
                {{ attempt.maximumScore }}
              </template>
            </p>

            <p class="mt-3 text-blue-100">
              <template v-if="delivery.scoringMode === 'speed_bonus'">
                Base {{ baseScore }} / {{ attempt.maximumScore }} · {{ scorePercent }}% · Speed bonus +{{ speedBonus }}
              </template>

              <template v-else>
                {{ scorePercent }}%
              </template>
              · {{ attempt.answeredCount }} of {{ delivery.questionCount }} questions answered
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

      <StudentLeaderboardCard
        v-if="canShowScore"
        :assignment-id="
          delivery.assignmentId
        "
      />

      <UCard>
        <template #header>
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 class="font-black text-highlighted">
                Submission details
              </h2>

              <p class="mt-1 text-sm text-muted">
                Recorded information for this assessment attempt.
              </p>
            </div>

            <StatusPill
              :status="attempt.status"
            />
          </div>
        </template>

        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
        </div>

        <div
          v-if="attemptPolicy"
          class="mt-6 rounded-xl border border-default p-4"
        >
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p class="text-xs font-bold uppercase tracking-[0.14em] text-muted">
                Attempt policy
              </p>

              <p class="mt-2 font-bold text-highlighted">
                {{ attemptPolicy.attemptsUsed }} of {{ attemptPolicy.maxAttempts }} attempts used
              </p>

              <p class="mt-1 text-sm text-muted">
                {{ attemptPolicy.attemptsRemaining }} remaining · {{ scorePolicyLabel(attemptPolicy.scorePolicy) }}
              </p>
            </div>

            <UButton
              v-if="canTakeAnotherAttempt"
              :to="`/student/assessments/${delivery.assignmentId}/instructions`"
              icon="i-lucide-rotate-ccw"
            >
              Take Another Attempt
            </UButton>
          </div>
        </div>

        <UAlert
          v-if="attempt.status === 'auto_submitted'"
          class="mt-6"
          color="warning"
          variant="soft"
          title="Automatically submitted"
          :description="
            automaticSubmissionDescription(
              attempt.submittedReason,
            )
          "
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
