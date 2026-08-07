<script setup lang="ts">
import {
  onBeforeRouteLeave,
} from "vue-router";

import type {
  DeliveryQuestionPayload,
  StudentAssessmentDelivery,
} from "~/types/assessment-delivery";

definePageMeta({
  layout:
    "exam",
});

useSeoMeta({
  title:
    "Assessment",
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
  getQuestion,
  saveAnswer,
  submitAttempt,
} = useAssessmentDelivery();

const delivery =
  ref<
    StudentAssessmentDelivery
    | null
  >(
    null,
  );

const questionPayload =
  ref<
    DeliveryQuestionPayload
    | null
  >(
    null,
  );

const currentIndex =
  ref(0);

const selectedOptionIds =
  ref<string[]>(
    [],
  );

const isLoading =
  ref(true);

const isSaving =
  ref(false);

const isSubmitting =
  ref(false);

const errorMessage =
  ref("");

const submitModalOpen =
  ref(false);

const isOnline =
  ref(true);

const pendingSync =
  ref(false);

const lastSyncedAt =
  ref<string | null>(
    null,
  );

const loadedSelectedOptionIds =
  ref<string[]>(
    [],
  );

const allowRouteLeave =
  ref(false);

const timerWarningsShown =
  new Set<number>();

const questionTimeoutTriggered =
  ref(false);

const overallTimeoutTriggered =
  ref(false);

const overallSeconds =
  ref<number | null>(
    null,
  );

const questionSeconds =
  ref<number | null>(
    null,
  );

let timer:
  | ReturnType<
      typeof setInterval
    >
  | null =
    null;

const progress =
  computed(
    () =>
      questionPayload.value
        ? (
            (
              currentIndex.value
              + 1
            )
            / questionPayload.value
              .questionCount
          ) * 100
        : 0,
  );

const isLastQuestion =
  computed(
    () =>
      questionPayload.value
        ? currentIndex.value
          === questionPayload.value
            .questionCount - 1
        : false,
  );

const recoveryKey =
  computed(
    () =>
      questionPayload.value
        ? `sncbt-assessment:${questionPayload.value.attemptId}:${questionPayload.value.question.id}`
        : "",
  );

const estimatedAnsweredCount =
  computed(
    () => {
      const attempt =
        delivery.value?.attempt;

      if (!attempt) {
        return 0;
      }

      let count =
        attempt.answeredCount;

      const serverHadAnswer =
        loadedSelectedOptionIds.value
          .length > 0;

      const currentHasAnswer =
        selectedOptionIds.value
          .length > 0;

      if (
        currentHasAnswer
        && !serverHadAnswer
      ) {
        count += 1;
      } else if (
        !currentHasAnswer
        && serverHadAnswer
      ) {
        count -= 1;
      }

      return Math.max(
        0,
        Math.min(
          attempt.questionCount,
          count,
        ),
      );
    },
  );

const estimatedUnansweredCount =
  computed(
    () =>
      Math.max(
        0,
        (
          questionPayload.value
            ?.questionCount
          || delivery.value
            ?.questionCount
          || 0
        )
        - estimatedAnsweredCount.value,
      ),
  );

const saveStatusLabel =
  computed(
    () => {
      if (!isOnline.value) {
        return "Saved on device";
      }

      if (isSaving.value) {
        return "Saving...";
      }

      if (pendingSync.value) {
        return "Waiting to sync";
      }

      return "Saved";
    },
  );

const saveStatusIcon =
  computed(
    () => {
      if (!isOnline.value) {
        return "i-lucide-cloud-off";
      }

      if (isSaving.value) {
        return "i-lucide-refresh-cw";
      }

      if (pendingSync.value) {
        return "i-lucide-cloud-upload";
      }

      return "i-lucide-cloud-check";
    },
  );

const timeWarning =
  computed(
    () => {
      const seconds =
        overallSeconds.value;

      if (
        seconds === null
        || seconds > 300
        || seconds <= 0
      ) {
        return "";
      }

      if (seconds <= 60) {
        return "Less than 1 minute remains. The assessment will submit automatically when time expires.";
      }

      return "Less than 5 minutes remain. Review your saved answers and submit before time expires.";
    },
  );

function secondsUntil(
  value: string | null,
): number | null {
  if (!value) {
    return null;
  }

  return Math.max(
    0,
    Math.ceil(
      (
        new Date(value)
          .getTime()
        - Date.now()
      ) / 1000,
    ),
  );
}

function formatTime(
  seconds: number | null,
): string {
  if (
    seconds === null
  ) {
    return "—";
  }

  const safe =
    Math.max(
      0,
      seconds,
    );

  const minutes =
    Math.floor(
      safe / 60,
    );

  const remaining =
    safe % 60;

  return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
}

function formatSyncTime(
  value: string | null,
): string {
  if (!value) {
    return "";
  }

  return new Intl
    .DateTimeFormat(
      "en-PH",
      {
        hour:
          "numeric",
        minute:
          "2-digit",
        second:
          "2-digit",
      },
    )
    .format(
      new Date(value),
    );
}

function shouldWarnBeforeLeaving():
  boolean {
  return Boolean(
    delivery.value?.attempt
    && delivery.value.attempt.status
      === "in_progress"
    && !allowRouteLeave.value,
  );
}

function handleBeforeUnload(
  event: BeforeUnloadEvent,
): void {
  if (!shouldWarnBeforeLeaving()) {
    return;
  }

  if (pendingSync.value) {
    saveRecovery();
  }

  event.preventDefault();
  event.returnValue =
    "";
}

function handleVisibilityChange():
  void {
  if (
    document.visibilityState
    === "hidden"
    && pendingSync.value
  ) {
    saveRecovery();
  }
}

function showTimerWarning(
  seconds: number | null,
): void {
  if (
    seconds === null
    || seconds <= 0
  ) {
    return;
  }

  const threshold =
    seconds <= 60
      ? 60
      : seconds <= 300
        ? 300
        : seconds <= 600
          ? 600
          : null;

  if (
    !threshold
    || timerWarningsShown.has(
      threshold,
    )
  ) {
    return;
  }

  timerWarningsShown.add(
    threshold,
  );

  const label =
    threshold === 60
      ? "1 minute"
      : threshold === 300
        ? "5 minutes"
        : "10 minutes";

  toast.add({
    title:
      `${label} remaining`,
    description:
      "The overall assessment timer continues running and the server will submit the attempt when time expires.",
    color:
      threshold === 60
        ? "error"
        : "warning",
  });
}

async function leaveAssessment(
  path: string,
): Promise<void> {
  allowRouteLeave.value =
    true;

  await navigateTo(path);
}

function isSelected(
  optionId: string,
): boolean {
  return selectedOptionIds.value
    .includes(
      optionId,
    );
}

function saveRecovery():
  void {
  if (
    !recoveryKey.value
    || !import.meta.client
  ) {
    return;
  }

  localStorage.setItem(
    recoveryKey.value,
    JSON.stringify({
      selectedOptionIds:
        selectedOptionIds.value,
      savedAt:
        new Date()
          .toISOString(),
    }),
  );
}

function restoreRecovery():
  void {
  if (
    !recoveryKey.value
    || !import.meta.client
  ) {
    return;
  }

  const raw =
    localStorage.getItem(
      recoveryKey.value,
    );

  if (!raw) {
    return;
  }

  try {
    const parsed =
      JSON.parse(raw) as {
        selectedOptionIds?:
          string[];
      };

    if (
      Array.isArray(
        parsed.selectedOptionIds,
      )
    ) {
      selectedOptionIds.value = [
        ...parsed.selectedOptionIds,
      ];

      pendingSync.value =
        true;
    }
  } catch {
    localStorage.removeItem(
      recoveryKey.value,
    );
  }
}

function clearRecovery():
  void {
  if (
    recoveryKey.value
    && import.meta.client
  ) {
    localStorage.removeItem(
      recoveryKey.value,
    );
  }
}

function selectOption(
  optionId: string,
): void {
  if (
    !questionPayload.value
    || questionPayload.value
      .finalized
  ) {
    return;
  }

  if (
    questionPayload.value
      .question.questionType
    === "multiple_choice"
  ) {
    selectedOptionIds.value = [
      optionId,
    ];
  } else if (
    selectedOptionIds.value
      .includes(
        optionId,
      )
  ) {
    selectedOptionIds.value =
      selectedOptionIds.value
        .filter(
          (id) =>
            id !== optionId,
        );
  } else {
    selectedOptionIds.value = [
      ...selectedOptionIds.value,
      optionId,
    ];
  }

  pendingSync.value =
    true;

  saveRecovery();
}

async function loadDelivery():
  Promise<boolean> {
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
      || "Unable to load the assessment attempt.";

    return false;
  }

  delivery.value =
    result.data.delivery;

  const attempt =
    delivery.value.attempt;

  if (!attempt) {
    await leaveAssessment(
      `/student/assessments/${assignmentId.value}/instructions`,
    );

    return false;
  }

  if (
    [
      "submitted",
      "auto_submitted",
    ].includes(
      attempt.status,
    )
  ) {
    await leaveAssessment(
      `/student/assessments/${assignmentId.value}/completed`,
    );

    return false;
  }

  if (
    attempt.status
    !== "in_progress"
  ) {
    await leaveAssessment(
      `/student/assessments/${assignmentId.value}/instructions`,
    );

    return false;
  }

  currentIndex.value =
    Math.min(
      attempt.currentQuestionIndex,
      Math.max(
        delivery.value
          .questionCount - 1,
        0,
      ),
    );

  overallSeconds.value =
    secondsUntil(
      attempt.expiresAt,
    );

  return true;
}

async function loadQuestion(
  index: number,
): Promise<void> {
  if (
    !delivery.value?.attempt
  ) {
    return;
  }

  isLoading.value =
    true;

  errorMessage.value =
    "";

  const result =
    await getQuestion(
      delivery.value.attempt.id,
      index,
    );

  if (
    result.error
    || !result.data
  ) {
    if (
      result.code
      === "ATTEMPT_CLOSED"
      || result.error
        ?.toLowerCase()
        .includes(
          "deadline",
        )
    ) {
      await leaveAssessment(
        `/student/assessments/${assignmentId.value}/completed`,
      );

      return;
    }

    errorMessage.value =
      result.error
      || "Unable to load the question.";

    isLoading.value =
      false;

    return;
  }

  currentIndex.value =
    index;

  questionPayload.value =
    result.data.payload;

  selectedOptionIds.value = [
    ...result.data.payload
      .selectedOptionIds,
  ];

  loadedSelectedOptionIds.value = [
    ...result.data.payload
      .selectedOptionIds,
  ];

  pendingSync.value =
    false;

  lastSyncedAt.value =
    new Date()
      .toISOString();

  questionSeconds.value =
    secondsUntil(
      result.data.payload
        .deadlineAt,
    );

  questionTimeoutTriggered.value =
    false;

  restoreRecovery();

  isLoading.value =
    false;
}

async function synchronizeAnswer(
  finalize: boolean,
): Promise<boolean> {
  if (
    !delivery.value?.attempt
    || !questionPayload.value
  ) {
    return false;
  }

  if (!isOnline.value) {
    saveRecovery();

    pendingSync.value =
      true;

    toast.add({
      title:
        "Answer saved on this device",
      description:
        "Reconnect before moving to another question or submitting.",
      color:
        "warning",
    });

    return false;
  }

  isSaving.value =
    true;

  const result =
    await saveAnswer(
      delivery.value.attempt.id,
      questionPayload.value
        .question.id,
      selectedOptionIds.value,
      finalize,
    );

  if (
    result.error
    || !result.data
  ) {
    saveRecovery();

    pendingSync.value =
      true;

    toast.add({
      title:
        "Answer could not be synchronized",
      description:
        result.error
        || "The answer remains cached on this device.",
      color:
        "error",
    });

    isSaving.value =
      false;

    return false;
  }

  clearRecovery();

  pendingSync.value =
    false;

  loadedSelectedOptionIds.value = [
    ...selectedOptionIds.value,
  ];

  lastSyncedAt.value =
    new Date()
      .toISOString();

  isSaving.value =
    false;

  if (
    result.data.attemptClosed
  ) {
    await leaveAssessment(
      `/student/assessments/${assignmentId.value}/completed`,
    );

    isSaving.value =
      false;

    return false;
  }

  if (
    delivery.value.attempt
  ) {
    delivery.value.attempt
      .answeredCount =
        result.data
          .answeredCount;
  }

  if (
    result.data.timedOut
  ) {
    toast.add({
      title:
        "Question time expired",
      description:
        "The server finalized this question.",
      color:
        "warning",
    });
  }

  return true;
}

async function goNext():
  Promise<void> {
  if (!questionPayload.value) {
    return;
  }

  if (
    questionPayload.value.finalized
  ) {
    if (
      isLastQuestion.value
    ) {
      submitModalOpen.value =
        true;
    } else {
      await loadQuestion(
        currentIndex.value + 1,
      );
    }

    return;
  }

  const saved =
    await synchronizeAnswer(
      !questionPayload.value
        .allowBacktracking,
    );

  if (!saved) {
    if (isOnline.value) {
      questionTimeoutTriggered.value =
        false;
    }

    return;
  }

  if (
    isLastQuestion.value
  ) {
    submitModalOpen.value =
      true;

    return;
  }

  await loadQuestion(
    currentIndex.value + 1,
  );
}

async function goPrevious():
  Promise<void> {
  if (
    !questionPayload.value
      ?.allowBacktracking
    || currentIndex.value <= 0
  ) {
    return;
  }

  const saved =
    await synchronizeAnswer(
      false,
    );

  if (!saved) {
    return;
  }

  await loadQuestion(
    currentIndex.value - 1,
  );
}

async function submit(
  auto: boolean,
  reason: string,
): Promise<void> {
  if (
    !delivery.value?.attempt
    || isSubmitting.value
  ) {
    return;
  }

  isSubmitting.value =
    true;

  if (
    !auto
    && questionPayload.value
    && !questionPayload.value
      .finalized
  ) {
    const saved =
      await synchronizeAnswer(
        !questionPayload.value
          .allowBacktracking,
      );

    if (!saved) {
      isSubmitting.value =
        false;

      return;
    }
  }

  const result =
    await submitAttempt(
      delivery.value.attempt.id,
      auto,
      reason,
    );

  if (
    result.error
    || !result.data
  ) {
    toast.add({
      title:
        "Assessment could not be submitted",
      description:
        result.error
        || "The server did not accept the submission.",
      color:
        "error",
    });

    isSubmitting.value =
      false;

    return;
  }

  submitModalOpen.value =
    false;

  await leaveAssessment(
    `/student/assessments/${assignmentId.value}/completed`,
  );
}

async function handleQuestionTimeout():
  Promise<void> {
  if (
    !questionPayload.value
    || isSaving.value
    || isSubmitting.value
    || questionTimeoutTriggered.value
  ) {
    return;
  }

  questionTimeoutTriggered.value =
    true;

  const saved =
    await synchronizeAnswer(
      true,
    );

  if (!saved) {
    return;
  }

  if (
    isLastQuestion.value
  ) {
    await submit(
      true,
      "last_question_timer_expired",
    );
  } else {
    await loadQuestion(
      currentIndex.value + 1,
    );
  }
}

function startTimer():
  void {
  if (timer) {
    clearInterval(timer);
  }

  timer =
    setInterval(
      () => {
        if (
          delivery.value
            ?.attempt
            ?.expiresAt
        ) {
          overallSeconds.value =
            secondsUntil(
              delivery.value
                .attempt.expiresAt,
            );

          showTimerWarning(
            overallSeconds.value,
          );

          if (
            overallSeconds.value
            === 0
            && !isSubmitting.value
            && !overallTimeoutTriggered.value
          ) {
            overallTimeoutTriggered.value =
              true;

            void submit(
              true,
              "overall_timer_expired",
            );

            return;
          }
        }

        if (
          questionPayload.value
            ?.deadlineAt
        ) {
          questionSeconds.value =
            secondsUntil(
              questionPayload.value
                .deadlineAt,
            );

          if (
            questionSeconds.value
            === 0
            && !questionTimeoutTriggered.value
          ) {
            void handleQuestionTimeout();
          }
        }
      },
      1000,
    );
}

async function handleOnline():
  Promise<void> {
  isOnline.value =
    true;

  if (
    overallSeconds.value
    === 0
  ) {
    overallTimeoutTriggered.value =
      false;

    await submit(
      true,
      "overall_timer_expired_after_reconnect",
    );

    return;
  }

  if (
    questionSeconds.value
    === 0
  ) {
    questionTimeoutTriggered.value =
      false;

    await handleQuestionTimeout();

    return;
  }

  if (
    pendingSync.value
  ) {
    await synchronizeAnswer(
      false,
    );
  }
}

function handleOffline():
  void {
  isOnline.value =
    false;

  if (pendingSync.value) {
    saveRecovery();
  }
}

onMounted(
  async () => {
    isOnline.value =
      navigator.onLine;

    window.addEventListener(
      "online",
      handleOnline,
    );

    window.addEventListener(
      "offline",
      handleOffline,
    );

    window.addEventListener(
      "beforeunload",
      handleBeforeUnload,
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    const ready =
      await loadDelivery();

    if (ready) {
      await loadQuestion(
        currentIndex.value,
      );

      startTimer();
    }
  },
);

onBeforeUnmount(
  () => {
    if (timer) {
      clearInterval(timer);
    }

    window.removeEventListener(
      "online",
      handleOnline,
    );

    window.removeEventListener(
      "offline",
      handleOffline,
    );

    window.removeEventListener(
      "beforeunload",
      handleBeforeUnload,
    );

    document.removeEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );
  },
);

onBeforeRouteLeave(
  () => {
    if (
      !shouldWarnBeforeLeaving()
    ) {
      return true;
    }

    if (pendingSync.value) {
      saveRecovery();
    }

    return window.confirm(
      "Your assessment is still in progress. Leaving this page will not pause the timer. Do you want to leave?",
    );
  },
);
</script>

<template>
  <div class="min-h-screen bg-default">
    <header class="sticky top-0 z-30 border-b border-default bg-default/95 backdrop-blur">
      <div class="px-4 py-3">
        <div class="flex items-start gap-3">
          <div class="min-w-0 flex-1">
            <p class="truncate font-black text-highlighted">
              {{
                delivery?.title
                || "Assessment"
              }}
            </p>

            <p class="truncate text-xs text-muted">
              {{
                delivery
                  ? `${delivery.subjectCode} · ${delivery.classroom.section}`
                  : ""
              }}
            </p>
          </div>

          <UButton
            color="error"
            variant="soft"
            icon="i-lucide-send"
            :loading="isSubmitting"
            @click="
              submitModalOpen = true
            "
          >
            <span class="hidden sm:inline">
              Submit
            </span>
          </UButton>
        </div>

        <div class="mt-3 flex flex-wrap items-center gap-2">
          <UBadge
            :color="
              isOnline
                ? 'success'
                : 'warning'
            "
            variant="soft"
          >
            {{
              isOnline
                ? "Online"
                : "Offline"
            }}
          </UBadge>

          <UBadge
            :color="
              !isOnline
              || pendingSync
                ? 'warning'
                : isSaving
                  ? 'info'
                  : 'success'
            "
            variant="soft"
          >
            <UIcon
              :name="saveStatusIcon"
              class="mr-1 size-3.5"
              :class="{
                'animate-spin':
                  isSaving,
              }"
            />
            {{ saveStatusLabel }}
            <span
              v-if="
                lastSyncedAt
                && !pendingSync
                && !isSaving
                && isOnline
              "
              class="ml-1 hidden sm:inline"
            >
              · {{ formatSyncTime(lastSyncedAt) }}
            </span>
          </UBadge>

          <UBadge
            color="error"
            variant="soft"
            class="font-mono"
          >
            Overall
            {{
              formatTime(
                overallSeconds,
              )
            }}
          </UBadge>

          <UBadge
            color="warning"
            variant="soft"
            class="font-mono"
          >
            Question
            {{
              formatTime(
                questionSeconds,
              )
            }}
          </UBadge>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-7xl p-4 lg:p-6">
      <UAlert
        v-if="errorMessage"
        class="mb-4"
        color="error"
        variant="soft"
        title="Question could not be loaded"
        :description="errorMessage"
      />

      <UAlert
        v-if="timeWarning"
        class="mb-4"
        :color="
          overallSeconds !== null
          && overallSeconds <= 60
            ? 'error'
            : 'warning'
        "
        variant="soft"
        title="Assessment time is running low"
        :description="timeWarning"
      />

      <div
        v-if="isLoading"
        class="space-y-4"
      >
        <USkeleton class="h-12 rounded-xl" />
        <USkeleton class="h-[34rem] rounded-xl" />
      </div>

      <template
        v-else-if="
          questionPayload
        "
      >
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="font-black text-highlighted">
              Question
              {{ currentIndex + 1 }}
              of
              {{ questionPayload.questionCount }}
            </p>

            <p class="mt-1 text-sm text-muted">
              {{
                questionPayload.question.questionType
                === "multiple_choice"
                  ? "Select one answer."
                  : "Select all correct answers."
              }}
            </p>
          </div>

          <div class="flex flex-wrap gap-2">
            <UBadge
              color="neutral"
              variant="soft"
            >
              {{ questionPayload.question.points }}
              point{{
                questionPayload.question.points === 1
                  ? ""
                  : "s"
              }}
            </UBadge>

            <UBadge
              :color="
                !isOnline
                || pendingSync
                  ? 'warning'
                  : isSaving
                    ? 'info'
                    : 'success'
              "
              variant="soft"
            >
              <UIcon
                :name="saveStatusIcon"
                class="mr-1 size-3.5"
                :class="{
                  'animate-spin':
                    isSaving,
                }"
              />
              {{ saveStatusLabel }}
            </UBadge>
          </div>
        </div>

        <UProgress
          class="mb-6"
          :model-value="progress"
        />

        <UCard>
          <h1 class="text-2xl font-black leading-tight text-highlighted lg:text-3xl">
            {{ questionPayload.question.questionText }}
          </h1>

          <img
            v-if="questionPayload.question.imageUrl"
            :src="questionPayload.question.imageUrl"
            alt="Question illustration"
            class="mt-6 max-h-80 w-full rounded-xl border border-default object-contain"
          >

          <div class="mt-8 grid gap-4 md:grid-cols-2">
            <button
              v-for="(
                option,
                index
              ) in questionPayload.question.options"
              :key="option.id"
              type="button"
              class="flex min-h-20 items-center gap-4 rounded-xl border p-4 text-left transition"
              :class="
                isSelected(
                  option.id,
                )
                  ? 'border-primary bg-primary/10 ring-3 ring-primary/10'
                  : 'border-default bg-default hover:border-primary/50 hover:bg-elevated'
              "
              :disabled="
                questionPayload.finalized
              "
              @click="
                selectOption(
                  option.id,
                )
              "
            >
              <span
                class="flex size-9 shrink-0 items-center justify-center rounded-lg font-black"
                :class="
                  isSelected(
                    option.id,
                  )
                    ? 'bg-primary text-white'
                    : 'bg-elevated text-muted'
                "
              >
                {{
                  String.fromCharCode(
                    65 + index,
                  )
                }}
              </span>

              <span class="font-bold text-highlighted">
                {{ option.text }}
              </span>
            </button>
          </div>

          <div class="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <UButton
              color="neutral"
              variant="outline"
              icon="i-lucide-arrow-left"
              :disabled="
                !questionPayload.canGoPrevious
                || isSaving
              "
              @click="goPrevious"
            >
              Previous
            </UButton>

            <UButton
              :icon="
                isLastQuestion
                  ? 'i-lucide-send'
                  : 'i-lucide-arrow-right'
              "
              :loading="isSaving"
              @click="goNext"
            >
              {{
                isLastQuestion
                  ? "Save and Submit"
                  : "Save and Continue"
              }}
            </UButton>
          </div>
        </UCard>
      </template>
    </main>

    <ConfirmationModal
      v-model:open="
        submitModalOpen
      "
      title="Submit this assessment?"
      description="Review your progress before final submission. Your answers cannot be changed after the server accepts the submission."
      confirm-label="Submit Assessment"
      confirm-color="error"
      icon="i-lucide-send"
      :loading="isSubmitting"
      @confirm="
        submit(
          false,
          'student_submitted',
        )
      "
    >
      <div class="mt-4 grid grid-cols-2 gap-3">
        <div class="rounded-lg bg-elevated p-3 text-center">
          <p class="text-xs text-muted">
            Answered
          </p>

          <p class="mt-1 text-lg font-black text-highlighted">
            {{ estimatedAnsweredCount }}
          </p>
        </div>

        <div class="rounded-lg bg-elevated p-3 text-center">
          <p class="text-xs text-muted">
            Unanswered
          </p>

          <p class="mt-1 text-lg font-black text-highlighted">
            {{ estimatedUnansweredCount }}
          </p>
        </div>
      </div>

      <UAlert
        v-if="pendingSync || !isOnline"
        class="mt-3"
        color="warning"
        variant="soft"
        title="Unsynchronized answer"
        description="Reconnect and allow the current answer to synchronize before submitting."
      />
    </ConfirmationModal>
  </div>
</template>
