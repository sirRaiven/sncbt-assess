<script setup lang="ts">
import type {
  StudentAssessmentDelivery,
} from "~/types/assessment-delivery";

import type {
  AssessmentIntegrityPolicy,
} from "~/types/assessment-integrity";

definePageMeta({
  layout:
    "student",
  middleware:
    ["student"],
});

useSeoMeta({
  title:
    "Assessment Instructions",
});

const route =
  useRoute();

const toast =
  useToast();

const assignmentId =
  computed(
    () =>
      String(
        route.params.id,
      ),
  );

const {
  getStudentDelivery,
  beginAttempt,
} = useAssessmentDelivery();

const {
  getAssignmentIntegrityPolicy,
} = useAssessmentIntegrity();

const delivery =
  ref<
    StudentAssessmentDelivery
    | null
  >(
    null,
  );

const integrityPolicy =
  ref<
    AssessmentIntegrityPolicy
    | null
  >(null);

const isLoading =
  ref(true);

const isStarting =
  ref(false);

const errorMessage =
  ref("");

const startModalOpen =
  ref(false);

const completedStatuses = [
  "submitted",
  "auto_submitted",
] as const;

const completedAttempt =
  computed(
    () =>
      Boolean(
        delivery.value?.attempt
        && completedStatuses
          .includes(
            delivery.value.attempt.status as typeof completedStatuses[number],
          ),
      ),
  );

const attemptPolicy =
  computed(
    () =>
      delivery.value?.attemptPolicy
      || null,
  );

const canStartAnotherAttempt =
  computed(
    () =>
      Boolean(
        delivery.value?.canStart
        && completedAttempt.value,
      ),
  );

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

const integrityStartNotice =
  computed(
    () =>
      integrityPolicy.value
        ?.enabled
        ? integrityPolicy.value
            .focusModeEnabled
          ? " Focus monitoring is active. If your browser supports fullscreen, you will enter Focus Mode before the first question timer starts."
          : " Assessment activity monitoring is active during this attempt."
        : "",
  );

const startConfirmationDescription =
  computed(
    () => {
      const closesAt =
        delivery.value
          ? formatDate(
              delivery.value.endsAt,
            )
          : "the scheduled closing time";

      if (
        canStartAnotherAttempt.value
        && attemptPolicy.value
      ) {
        const nextNumber =
          attemptPolicy.value.nextAttemptNumber
          || attemptPolicy.value.attemptsUsed + 1;

        return `This will start attempt ${nextNumber} of ${attemptPolicy.value.maxAttempts}. The first question timer starts when the question is delivered. The class closes at ${closesAt}.${integrityStartNotice.value}`;
      }

      if (canStartAnotherAttempt.value) {
        return `This will start another assessment attempt. Each question has its own answer timer, and the class closes at ${closesAt}.${integrityStartNotice.value}`;
      }

      return `The first question timer starts when the question is delivered. Each question has its own answer time, and the class closes at ${closesAt}.${integrityStartNotice.value}`;
    },
  );

function formatDate(
  value: string,
): string {
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

const actionLabel =
  computed(
    () => {
      if (
        delivery.value
          ?.canResume
      ) {
        return "Continue Assessment";
      }

      if (
        canStartAnotherAttempt.value
      ) {
        return "Start Another Attempt";
      }

      if (
        delivery.value
          ?.canViewResult
      ) {
        return "View Result";
      }

      if (
        delivery.value
          ?.canStart
      ) {
        return "Begin Assessment";
      }

      if (
        delivery.value
          ?.attempt
        && [
          "submitted",
          "auto_submitted",
        ].includes(
          delivery.value
            .attempt.status,
        )
      ) {
        return "Submission Recorded";
      }

      if (
        delivery.value
          ?.status
        === "upcoming"
      ) {
        return "Assessment Not Open Yet";
      }

      return "Assessment Closed";
    },
  );

const canProceed =
  computed(
    () =>
      Boolean(
        delivery.value
        && (
          delivery.value.canStart
          || delivery.value.canResume
          || delivery.value.canViewResult
        ),
      ),
  );

async function loadIntegrityPolicy():
  Promise<void> {
  const result =
    await getAssignmentIntegrityPolicy(
      assignmentId.value,
    );

  if (
    !result.error
    && result.data
  ) {
    integrityPolicy.value =
      result.data;
  }
}

async function loadDelivery():
  Promise<void> {
  isLoading.value =
    true;

  errorMessage.value =
    "";

  const result =
    await getStudentDelivery(
      assignmentId.value,
    );

  if (
    result.error
    || !result.data
  ) {
    errorMessage.value =
      result.error
      || "Unable to load the assessment instructions.";

    isLoading.value =
      false;

    return;
  }

  delivery.value =
    result.data.delivery;

  await loadIntegrityPolicy();

  isLoading.value =
    false;
}

function requestProceed(): void {
  if (!delivery.value) {
    return;
  }

  if (
    delivery.value.canResume
  ) {
    void navigateTo(
      `/student/assessments/${assignmentId.value}/play`,
    );

    return;
  }

  if (
    delivery.value.canStart
  ) {
    startModalOpen.value =
      true;

    return;
  }

  if (
    delivery.value.canViewResult
  ) {
    void navigateTo(
      `/student/results/${assignmentId.value}`,
    );
  }
}

async function startAttempt():
  Promise<void> {
  isStarting.value =
    true;

  const result =
    await beginAttempt(
      assignmentId.value,
    );

  if (
    result.error
    || !result.data
  ) {
    toast.add({
      title:
        "Assessment could not be started",
      description:
        result.error
        || "The assessment attempt could not be created.",
      color:
        "error",
    });

    isStarting.value =
      false;

    return;
  }

  startModalOpen.value =
    false;

  await navigateTo(
    `/student/assessments/${assignmentId.value}/play`,
  );
}

onMounted(
  loadDelivery,
);
</script>

<template>
  <div class="page-stack">
    <PageHeader
      :breadcrumbs="[
        { label: 'Overview', to: '/student/dashboard', icon: 'i-lucide-layout-dashboard' },
        { label: 'Assessments', to: '/student/assessments' },
        { label: delivery?.title || 'Assessment' },
      ]"
      eyebrow="Before you begin"
      :title="
        delivery?.title
        || 'Assessment'
      "
      :description="
        delivery
          ? `${delivery.subjectCode} · ${delivery.classroom.section}`
          : 'Loading assessment'
      "
    />

    <UAlert
      v-if="errorMessage"
      color="error"
      variant="soft"
      title="Assessment could not be loaded"
      :description="errorMessage"
    />

    <div
      v-if="isLoading"
      class="space-y-4"
    >
      <USkeleton class="h-48 rounded-xl" />
      <USkeleton class="h-80 rounded-xl" />
    </div>

    <template
      v-else-if="delivery"
    >
      <UCard>
        <template #header>
          <h2 class="font-black text-highlighted">
            Before you begin
          </h2>
        </template>

        <div
          class="grid gap-4 sm:grid-cols-2"
          :class="
            attemptPolicy
              ? 'xl:grid-cols-5'
              : 'xl:grid-cols-4'
          "
        >
          <div class="rounded-xl bg-elevated p-4 text-center">
            <p class="text-xs text-muted">
              Questions
            </p>

            <p class="mt-2 text-2xl font-black text-highlighted">
              {{ delivery.questionCount }}
            </p>
          </div>

          <div class="rounded-xl bg-elevated p-4 text-center">
            <p class="text-xs text-muted">
              Total points
            </p>

            <p class="mt-2 text-2xl font-black text-highlighted">
              {{ delivery.totalPoints }}
            </p>
          </div>

          <div class="rounded-xl bg-elevated p-4 text-center">
            <p class="text-xs text-muted">
              Question timing
            </p>

            <p class="mt-2 text-sm font-black text-highlighted">
              Timed individually
            </p>
          </div>

          <div class="rounded-xl bg-elevated p-4 text-center">
            <p class="text-xs text-muted">
              Backtracking
            </p>

            <p class="mt-2 text-sm font-black text-highlighted">
              {{
                delivery.allowBacktracking
                  ? "Allowed"
                  : "Disabled"
              }}
            </p>
          </div>

          <div
            v-if="attemptPolicy"
            class="rounded-xl bg-elevated p-4 text-center"
          >
            <p class="text-xs text-muted">
              Attempts
            </p>

            <p class="mt-2 text-sm font-black text-highlighted">
              {{ attemptPolicy.attemptsUsed }}
              of
              {{ attemptPolicy.maxAttempts }}
              used
            </p>

            <p class="mt-1 text-xs text-muted">
              {{ attemptPolicy.attemptsRemaining }} remaining
            </p>
          </div>
        </div>

        <UAlert
          class="mt-6"
          color="warning"
          variant="soft"
          icon="i-lucide-hourglass"
          title="Question timeout rule"
          description="If a question's answer time reaches zero, that question closes and the assessment moves to the next one. An unsaved answer is recorded as timed out. Each new question receives its own configured time until the class deadline is reached."
        />

        <UAlert
          v-if="integrityPolicy?.enabled"
          class="mt-4"
          color="info"
          variant="soft"
          icon="i-lucide-shield-check"
          title="Assessment activity monitoring is active"
          :description="
            integrityPolicy.focusModeEnabled
              ? 'SNCBT Assess records focus-related signals while this attempt is active, including leaving the assessment tab, exiting fullscreen Focus Mode, or attempting to copy, paste, cut, or open the context menu in the question area. These signals are visible to your instructor but do not automatically determine misconduct or change your score.'
              : 'SNCBT Assess records focus-related browser signals while this attempt is active. These signals are visible to your instructor but do not automatically determine misconduct or change your score.'
          "
        />

        <div class="mt-6 grid gap-4 md:grid-cols-2">
          <div class="rounded-xl border border-default p-4">
            <p class="text-xs font-bold uppercase tracking-[0.14em] text-muted">
              Opens
            </p>

            <p class="mt-2 font-bold text-highlighted">
              {{
                formatDate(
                  delivery.startsAt,
                )
              }}
            </p>
          </div>

          <div class="rounded-xl border border-default p-4">
            <p class="text-xs font-bold uppercase tracking-[0.14em] text-muted">
              Closes
            </p>

            <p class="mt-2 font-bold text-highlighted">
              {{
                formatDate(
                  delivery.endsAt,
                )
              }}
            </p>
          </div>
        </div>

        <div class="mt-6 border-t border-default pt-6">
          <h3 class="font-black text-highlighted">
            Instructor instructions
          </h3>

          <p class="mt-3 whitespace-pre-line text-sm leading-7 text-muted">
            {{
              delivery.instructions
              || "Read each question carefully. Save your answer before continuing and submit only when you are ready."
            }}
          </p>
        </div>

        <div class="mt-6 space-y-3 border-t border-default pt-6">
          <div class="flex items-start gap-3">
            <UIcon
              name="i-lucide-circle-check"
              class="mt-0.5 size-5 text-success"
            />

            <p class="text-sm text-muted">
              SNCBT Assess keeps track of each question timer, the class deadline, and your saved progress. Answers cannot be changed after submission.
            </p>
          </div>

          <div class="flex items-start gap-3">
            <UIcon
              name="i-lucide-circle-check"
              class="mt-0.5 size-5 text-success"
            />

            <p class="text-sm text-muted">
              Correct answers are not sent to your browser while the assessment is active.
            </p>
          </div>

          <div class="flex items-start gap-3">
            <UIcon
              name="i-lucide-circle-check"
              class="mt-0.5 size-5 text-success"
            />

            <p class="text-sm text-muted">
              Closing or refreshing the browser does not create another attempt. Use Continue Assessment to resume.
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
                {{ attemptPolicy.attemptsRemaining }} attempt{{ attemptPolicy.attemptsRemaining === 1 ? '' : 's' }} remaining · {{ scorePolicyLabel(attemptPolicy.scorePolicy) }}
              </p>
            </div>

            <UBadge
              :color="
                attemptPolicy.attemptsRemaining > 0
                  ? 'success'
                  : 'neutral'
              "
              variant="soft"
            >
              {{
                attemptPolicy.attemptsRemaining > 0
                  ? 'Attempts available'
                  : 'Attempt limit reached'
              }}
            </UBadge>
          </div>
        </div>

        <UAlert
          v-if="
            delivery.status
            === 'upcoming'
          "
          class="mt-6"
          color="info"
          variant="soft"
          title="This assessment is upcoming"
          :description="`You can begin on ${formatDate(delivery.startsAt)}.`"
        />

        <UAlert
          v-else-if="
            delivery.status
            === 'closed'
            && !delivery.canViewResult
          "
          class="mt-6"
          color="warning"
          variant="soft"
          title="This assessment is closed"
          description="The class availability period has ended."
        />

        <div class="mt-6 space-y-3">
          <UButton
            v-if="
              canStartAnotherAttempt
              && delivery.canViewResult
            "
            :to="`/student/results/${assignmentId}`"
            block
            color="neutral"
            variant="outline"
            icon="i-lucide-chart-column"
          >
            View Latest Result
          </UButton>

          <UButton
            block
            size="xl"
            :disabled="!canProceed"
            :icon="
              delivery.canStart
              || delivery.canResume
                ? 'i-lucide-play'
                : delivery.canViewResult
                  ? 'i-lucide-chart-column'
                  : 'i-lucide-eye'
            "
            @click="requestProceed"
          >
            {{ actionLabel }}
          </UButton>
        </div>
      </UCard>
    </template>

    <ConfirmationModal
      v-model:open="
        startModalOpen
      "
      title="Begin this assessment?"
      :description="startConfirmationDescription"
      :confirm-label="
        canStartAnotherAttempt
          ? 'Start Another Attempt'
          : 'Begin Assessment'
      "
      icon="i-lucide-play"
      :loading="isStarting"
      @confirm="startAttempt"
    />
  </div>
</template>
