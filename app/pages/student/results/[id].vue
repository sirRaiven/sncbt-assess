<script setup lang="ts">
import type {
  StudentAssessmentDelivery,
  StudentResultReview,
  StudentResultReviewOutcome,
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
  getResultReview,
} = useAssessmentDelivery();

const delivery =
  ref<
    StudentAssessmentDelivery
    | null
  >(
    null,
  );

const review =
  ref<
    StudentResultReview
    | null
  >(
    null,
  );

const isLoading =
  ref(true);

const isReviewLoading =
  ref(false);

const errorMessage =
  ref("");

const reviewError =
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

const canRequestReview =
  computed(
    () =>
      Boolean(
        delivery.value
        && delivery.value.resultVisibility
          === "score_and_answers"
        && attempt.value
        && [
          "submitted",
          "auto_submitted",
        ].includes(
          attempt.value.status,
        ),
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

const reviewSummary =
  computed(
    () => {
      const questions =
        review.value?.questions
        || [];

      return {
        correct:
          questions.filter(
            (question) =>
              question.outcome
              === "correct",
          ).length,
        incorrect:
          questions.filter(
            (question) =>
              question.outcome
              === "incorrect",
          ).length,
        unanswered:
          questions.filter(
            (question) =>
              question.outcome
              === "unanswered",
          ).length,
      };
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

function outcomeLabel(
  outcome:
    StudentResultReviewOutcome,
): string {
  if (outcome === "correct") {
    return "Correct";
  }

  if (outcome === "incorrect") {
    return "Incorrect";
  }

  if (outcome === "unanswered") {
    return "Unanswered";
  }

  return "Not graded";
}

function outcomeColor(
  outcome:
    StudentResultReviewOutcome,
): "success" | "error" | "warning" | "neutral" {
  if (outcome === "correct") {
    return "success";
  }

  if (outcome === "incorrect") {
    return "error";
  }

  if (outcome === "unanswered") {
    return "warning";
  }

  return "neutral";
}

function optionStateClass(
  selected: boolean,
  correct: boolean,
): string {
  if (correct) {
    return "border-success/50 bg-success/10";
  }

  if (selected) {
    return "border-error/50 bg-error/10";
  }

  return "border-default bg-default";
}

function optionIcon(
  selected: boolean,
  correct: boolean,
): string {
  if (correct) {
    return "i-lucide-circle-check-big";
  }

  if (selected) {
    return "i-lucide-circle-x";
  }

  return "i-lucide-circle";
}

async function loadReview():
  Promise<void> {
  if (!canRequestReview.value) {
    review.value =
      null;

    reviewError.value =
      "";

    return;
  }

  isReviewLoading.value =
    true;

  reviewError.value =
    "";

  const result =
    await getResultReview(
      assignmentId.value,
    );

  if (
    result.error
    || !result.data
  ) {
    review.value =
      null;

    reviewError.value =
      result.error
      || "Detailed answer review is not available yet.";

    isReviewLoading.value =
      false;

    return;
  }

  review.value =
    result.data.review;

  isReviewLoading.value =
    false;
}

async function loadResult():
  Promise<void> {
  isLoading.value =
    true;

  errorMessage.value =
    "";

  review.value =
    null;

  reviewError.value =
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

  if (canRequestReview.value) {
    await loadReview();
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
          :loading="isLoading || isReviewLoading"
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
                Recorded information for this assessment attempt.
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

      <UCard>
        <template #header>
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 class="font-black text-highlighted">
                Answer review
              </h2>

              <p class="mt-1 text-sm text-muted">
                Question details are requested only after your instructor enables score and answer review.
              </p>
            </div>

            <UButton
              v-if="canRequestReview && reviewError"
              color="neutral"
              variant="outline"
              icon="i-lucide-refresh-cw"
              :loading="isReviewLoading"
              @click="loadReview"
            >
              Retry Review
            </UButton>
          </div>
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

        <div
          v-else-if="isReviewLoading"
          class="space-y-4"
        >
          <USkeleton class="h-20 rounded-xl" />
          <USkeleton class="h-64 rounded-xl" />
          <USkeleton class="h-64 rounded-xl" />
        </div>

        <UAlert
          v-else-if="reviewError"
          color="warning"
          variant="soft"
          title="Detailed review is not available yet"
          description="Your score is available, but question-by-question answer review is not available for this attempt."
        />

        <EmptyPanel
          v-else-if="review && review.questions.length === 0"
          icon="i-lucide-list-checks"
          title="No review questions were returned"
          description="Answer review is enabled, but no question details are available for this attempt."
        />

        <div
          v-else-if="review"
          class="space-y-5"
        >
          <div class="grid gap-3 sm:grid-cols-3">
            <div class="rounded-xl bg-success/10 p-4 text-center">
              <p class="text-xs font-bold uppercase tracking-[0.14em] text-success">
                Correct
              </p>
              <p class="mt-2 text-2xl font-black text-highlighted">
                {{ reviewSummary.correct }}
              </p>
            </div>

            <div class="rounded-xl bg-error/10 p-4 text-center">
              <p class="text-xs font-bold uppercase tracking-[0.14em] text-error">
                Incorrect
              </p>
              <p class="mt-2 text-2xl font-black text-highlighted">
                {{ reviewSummary.incorrect }}
              </p>
            </div>

            <div class="rounded-xl bg-warning/10 p-4 text-center">
              <p class="text-xs font-bold uppercase tracking-[0.14em] text-warning">
                Unanswered
              </p>
              <p class="mt-2 text-2xl font-black text-highlighted">
                {{ reviewSummary.unanswered }}
              </p>
            </div>
          </div>

          <article
            v-for="question in review.questions"
            :key="question.id"
            class="rounded-xl border border-default p-4 sm:p-5"
          >
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p class="text-xs font-bold uppercase tracking-[0.14em] text-muted">
                  Question {{ question.orderNumber }}
                </p>

                <h3 class="mt-2 text-lg font-black leading-snug text-highlighted">
                  {{ question.questionText }}
                </h3>
              </div>

              <div class="flex flex-wrap items-center gap-2">
                <UBadge
                  :color="outcomeColor(question.outcome)"
                  variant="soft"
                >
                  {{ outcomeLabel(question.outcome) }}
                </UBadge>

                <UBadge
                  color="neutral"
                  variant="soft"
                >
                  {{
                    question.earnedPoints === null
                      ? '—'
                      : question.earnedPoints
                  }}
                  /
                  {{ question.points }}
                  pts
                </UBadge>
              </div>
            </div>

            <img
              v-if="question.imageUrl"
              :src="question.imageUrl"
              alt="Question illustration"
              class="mt-4 max-h-72 w-full rounded-xl border border-default object-contain"
            >

            <div class="mt-5 space-y-3">
              <div
                v-for="(option, index) in question.options"
                :key="option.id"
                class="flex items-start gap-3 rounded-xl border p-3"
                :class="optionStateClass(option.selected, option.correct)"
              >
                <UIcon
                  :name="optionIcon(option.selected, option.correct)"
                  class="mt-0.5 size-5 shrink-0"
                  :class="
                    option.correct
                      ? 'text-success'
                      : option.selected
                        ? 'text-error'
                        : 'text-muted'
                  "
                />

                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="font-bold text-highlighted">
                      {{ String.fromCharCode(65 + index) }}. {{ option.text }}
                    </span>

                    <UBadge
                      v-if="option.selected"
                      color="neutral"
                      variant="soft"
                      size="xs"
                    >
                      Your answer
                    </UBadge>

                    <UBadge
                      v-if="option.correct"
                      color="success"
                      variant="soft"
                      size="xs"
                    >
                      Correct answer
                    </UBadge>
                  </div>
                </div>
              </div>
            </div>

            <UAlert
              v-if="question.explanation"
              class="mt-5"
              color="info"
              variant="soft"
              title="Answer explanation"
              :description="question.explanation"
            />
          </article>
        </div>
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
