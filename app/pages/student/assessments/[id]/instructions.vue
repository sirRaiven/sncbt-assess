<script setup lang="ts">
import type {
  ExamAccessStatus,
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

const examAccessStatus =
  ref<ExamAccessStatus | null>(null);

const accessReferenceNumber =
  ref("");

const examAccessItems: Array<{
  label: string;
  description: string;
  value: ExamAccessStatus;
  referenceLabel?: string;
  referencePlaceholder?: string;
}> = [
  {
    label: "PERMIT",
    description: "Enter your permit number.",
    value: "permit",
    referenceLabel: "Permit number",
    referencePlaceholder: "Enter your permit number",
  },
  {
    label: "PROMISSORY NOTE",
    description: "Enter your promissory note number.",
    value: "promissory_note",
    referenceLabel: "Promissory note number",
    referencePlaceholder: "Enter your promissory note number",
  },
  {
    label: "FULLY PAID",
    description: "Enter your fully paid receipt number.",
    value: "fully_paid",
    referenceLabel: "Fully paid receipt number",
    referencePlaceholder: "Enter your receipt number",
  },
  {
    label: "TO FOLLOW",
    description: "No reference number yet. This attempt is recorded as To Follow.",
    value: "to_follow",
  },
];

const selectedExamAccessItem =
  computed(
    () =>
      examAccessItems.find(
        (item) =>
          item.value
          === examAccessStatus.value,
      ) ?? null,
  );

const requiresAccessReference =
  computed(
    () =>
      Boolean(
        selectedExamAccessItem.value
          ?.referenceLabel,
      ),
  );

watch(
  examAccessStatus,
  () => {
    accessReferenceNumber.value = "";
  },
);

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
        && integrityPolicy.value
          .focusModeEnabled
        ? " Focus Mode will open before the first question."
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

        return `Start attempt ${nextNumber} of ${attemptPolicy.value.maxAttempts}. Each question has its own timer. Finish before ${closesAt}.${integrityStartNotice.value}`;
      }

      if (canStartAnotherAttempt.value) {
        return `Start another attempt. Each question has its own timer. Finish before ${closesAt}.${integrityStartNotice.value}`;
      }

      return `Each question has its own timer. Finish before ${closesAt}.${integrityStartNotice.value}`;
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

const requiresExamPermit =
  computed(
    () =>
      Boolean(
        delivery.value
          ?.assessmentType
          === "examination"
        && delivery.value
          .requireExamPermit
        && delivery.value.canStart
        && !delivery.value.canResume,
      ),
  );

const examAccessReady =
  computed(
    () => {
      if (!requiresExamPermit.value) {
        return true;
      }

      if (!examAccessStatus.value) {
        return false;
      }

      if (requiresAccessReference.value) {
        return accessReferenceNumber.value
          .trim()
          .length > 0;
      }

      return true;
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
  if (!examAccessReady.value) {
    toast.add({
      title:
        "Exam access details required",
      description:
        !examAccessStatus.value
          ? "Choose your exam access status before starting."
          : requiresAccessReference.value
            ? `Enter your ${selectedExamAccessItem.value?.referenceLabel?.toLowerCase() ?? "reference number"} before starting.`
            : "Complete the exam access declaration before starting.",
      color:
        "warning",
    });

    return;
  }

  isStarting.value =
    true;

  const result =
    await beginAttempt(
      assignmentId.value,
      requiresExamPermit.value
        && examAccessStatus.value
        ? {
            status:
              examAccessStatus.value,
            referenceNumber:
              requiresAccessReference.value
                ? accessReferenceNumber.value.trim()
                : null,
          }
        : undefined,
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
      <UCard
        class="overflow-hidden"
        :ui="{
          body: 'p-0 sm:p-0',
        }"
      >
        <div
          class="border-b border-default bg-gradient-to-br from-primary/12 via-primary/5 to-transparent p-5 sm:p-6"
        >
          <div
            class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
          >
            <div class="min-w-0">
              <div class="flex items-center gap-3">
                <div
                  class="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary"
                >
                  <UIcon
                    name="i-lucide-clipboard-check"
                    class="size-5"
                  />
                </div>

                <div>
                  <h2 class="text-lg font-black text-highlighted">
                    Ready to start?
                  </h2>

                  <p class="mt-0.5 text-sm text-muted">
                    Check the important details below before you begin.
                  </p>
                </div>
              </div>
            </div>

            <div
              class="inline-flex shrink-0 items-center gap-2 rounded-xl border border-default bg-default/70 px-3 py-2 text-sm"
            >
              <UIcon
                name="i-lucide-calendar-clock"
                class="size-4 text-primary"
              />

              <span class="text-muted">
                Closes
              </span>

              <span class="font-bold text-highlighted">
                {{ formatDate(delivery.endsAt) }}
              </span>
            </div>
          </div>

          <div
            class="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4"
          >
            <div class="rounded-xl bg-default/70 px-4 py-3">
              <p class="text-xs font-medium text-muted">
                Questions
              </p>

              <p class="mt-1 text-xl font-black text-highlighted">
                {{ delivery.questionCount }}
              </p>
            </div>

            <div class="rounded-xl bg-default/70 px-4 py-3">
              <p class="text-xs font-medium text-muted">
                Points
              </p>

              <p class="mt-1 text-xl font-black text-highlighted">
                {{ delivery.totalPoints }}
              </p>
            </div>

            <div class="rounded-xl bg-default/70 px-4 py-3">
              <p class="text-xs font-medium text-muted">
                Backtracking
              </p>

              <p class="mt-1 text-sm font-black text-highlighted">
                {{
                  delivery.allowBacktracking
                    ? "Allowed"
                    : "Not allowed"
                }}
              </p>
            </div>

            <div class="rounded-xl bg-default/70 px-4 py-3">
              <p class="text-xs font-medium text-muted">
                Timing
              </p>

              <p class="mt-1 text-sm font-black text-highlighted">
                Per question
              </p>
            </div>
          </div>
        </div>

        <div class="p-5 sm:p-6">
          <section>
            <div class="flex items-center gap-2">
              <UIcon
                name="i-lucide-list-checks"
                class="size-5 text-primary"
              />

              <h3 class="font-black text-highlighted">
                What you need to know
              </h3>
            </div>

            <div class="mt-4 grid gap-3 md:grid-cols-2">
              <div
                class="flex items-start gap-3 rounded-xl border border-default/70 bg-elevated/35 p-4"
              >
                <div
                  class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-warning/10 text-warning"
                >
                  <UIcon
                    name="i-lucide-timer"
                    class="size-4"
                  />
                </div>

                <div>
                  <p class="text-sm font-bold text-highlighted">
                    Watch the timer
                  </p>

                  <p class="mt-1 text-sm leading-5 text-muted">
                    When a question reaches 0, it closes and you move to the next one.
                  </p>
                </div>
              </div>

              <div
                class="flex items-start gap-3 rounded-xl border border-default/70 bg-elevated/35 p-4"
              >
                <div
                  class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
                >
                  <UIcon
                    :name="
                      delivery.allowBacktracking
                        ? 'i-lucide-undo-2'
                        : 'i-lucide-lock'
                    "
                    class="size-4"
                  />
                </div>

                <div>
                  <p class="text-sm font-bold text-highlighted">
                    {{
                      delivery.allowBacktracking
                        ? "You can go back"
                        : "Answers move forward"
                    }}
                  </p>

                  <p class="mt-1 text-sm leading-5 text-muted">
                    {{
                      delivery.allowBacktracking
                        ? "Previous questions can be revisited while the assessment allows it."
                        : "Once you move on from a question, you cannot return to change it."
                    }}
                  </p>
                </div>
              </div>

              <div
                v-if="delivery.scoringMode === 'speed_bonus'"
                class="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4"
              >
                <div
                  class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary"
                >
                  <UIcon
                    name="i-lucide-zap"
                    class="size-4"
                  />
                </div>

                <div>
                  <p class="text-sm font-bold text-highlighted">
                    Speed bonus
                  </p>

                  <p class="mt-1 text-sm leading-5 text-muted">
                    Correct answers can earn extra points when answered quickly.
                  </p>
                </div>
              </div>

              <div
                v-if="integrityPolicy?.enabled"
                class="flex items-start gap-3 rounded-xl border border-info/20 bg-info/5 p-4"
              >
                <div
                  class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-info/12 text-info"
                >
                  <UIcon
                    name="i-lucide-shield-check"
                    class="size-4"
                  />
                </div>

                <div>
                  <p class="text-sm font-bold text-highlighted">
                    Stay focused
                  </p>

                  <p class="mt-1 text-sm leading-5 text-muted">
                    {{
                      integrityPolicy.focusModeEnabled
                        ? "Focus Mode will open before the first question. Stay on the assessment while answering."
                        : "Stay on the assessment page while answering."
                    }}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section
            v-if="delivery.instructions"
            class="mt-6 rounded-xl border border-default p-4 sm:p-5"
          >
            <div class="flex items-center gap-2">
              <UIcon
                name="i-lucide-message-square-text"
                class="size-4 text-primary"
              />

              <h3 class="font-black text-highlighted">
                Instructor note
              </h3>
            </div>

            <p class="mt-3 whitespace-pre-line text-sm leading-6 text-muted">
              {{ delivery.instructions }}
            </p>
          </section>

          <div
            v-if="
              attemptPolicy
              && attemptPolicy.maxAttempts > 1
            "
            class="mt-5 flex flex-col gap-3 rounded-xl border border-default bg-elevated/30 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p class="text-sm font-bold text-highlighted">
                Attempts
              </p>

              <p class="mt-1 text-sm text-muted">
                {{ attemptPolicy.attemptsUsed }} of {{ attemptPolicy.maxAttempts }} used
                · {{ attemptPolicy.attemptsRemaining }} remaining
                · {{ scorePolicyLabel(attemptPolicy.scorePolicy) }}
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
                  ? "Available"
                  : "Limit reached"
              }}
            </UBadge>
          </div>

          <UAlert
            v-if="
              delivery.status
              === 'upcoming'
            "
            class="mt-5"
            color="info"
            variant="soft"
            icon="i-lucide-calendar-clock"
            title="Not open yet"
            :description="`You can begin on ${formatDate(delivery.startsAt)}.`"
          />

          <UAlert
            v-else-if="
              delivery.status
              === 'closed'
              && !delivery.canViewResult
            "
            class="mt-5"
            color="warning"
            variant="soft"
            icon="i-lucide-lock"
            title="Assessment closed"
            description="The assessment period has ended."
          />

          <div class="mt-6 space-y-3 border-t border-default pt-5">
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
      :confirm-disabled="!examAccessReady"
      @confirm="startAttempt"
    >
      <div
        v-if="requiresExamPermit"
        class="mt-4 space-y-4 rounded-xl border border-default bg-elevated/35 p-4"
      >
        <div>
          <p class="text-sm font-bold text-highlighted">
            Exam access
          </p>

          <p class="mt-1 text-sm leading-5 text-muted">
            Select the status that applies to you. This is recorded with your attempt.
          </p>
        </div>

        <fieldset>
          <legend class="text-sm font-semibold text-highlighted">
            Exam access status
            <span class="text-error">*</span>
          </legend>

          <div
            class="mt-2 grid gap-2 sm:grid-cols-2"
            role="radiogroup"
            aria-label="Exam access status"
          >
            <label
              v-for="item in examAccessItems"
              :key="item.value"
              class="cursor-pointer rounded-xl border p-3 transition-colors focus-within:ring-2 focus-within:ring-primary/50"
              :class="
                examAccessStatus === item.value
                  ? 'border-primary bg-primary/8'
                  : 'border-default bg-default/40 hover:bg-elevated/70'
              "
            >
              <input
                v-model="examAccessStatus"
                class="sr-only"
                type="radio"
                name="exam-access-status"
                :value="item.value"
              >

              <span class="flex items-start gap-2">
                <span
                  class="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border"
                  :class="
                    examAccessStatus === item.value
                      ? 'border-primary bg-primary text-white'
                      : 'border-default'
                  "
                  aria-hidden="true"
                >
                  <span
                    v-if="examAccessStatus === item.value"
                    class="size-1.5 rounded-full bg-white"
                  />
                </span>

                <span class="min-w-0">
                  <span class="block text-xs font-black tracking-wide text-highlighted">
                    {{ item.label }}
                  </span>

                  <span class="mt-0.5 block text-xs leading-4 text-muted">
                    {{ item.description }}
                  </span>
                </span>
              </span>
            </label>
          </div>
        </fieldset>

        <UFormField
          v-if="requiresAccessReference"
          :label="selectedExamAccessItem?.referenceLabel"
          required
        >
          <UInput
            v-model="accessReferenceNumber"
            maxlength="100"
            autocomplete="off"
            :placeholder="selectedExamAccessItem?.referencePlaceholder"
            class="w-full"
          />
        </UFormField>

        <div
          v-else-if="examAccessStatus === 'to_follow'"
          class="rounded-lg border border-warning/25 bg-warning/8 px-3 py-2 text-xs leading-5 text-muted"
        >
          <span class="font-semibold text-highlighted">To Follow</span> is recorded for this attempt. You can continue without a reference number.
        </div>
      </div>
    </ConfirmationModal>
  </div>
</template>
