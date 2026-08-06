<script setup lang="ts">
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
      && parsed
        .selectedOptionIds
        .length > 0
    ) {
      selectedOptionIds.value =
        parsed.selectedOptionIds;

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
    await navigateTo(
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
    await navigateTo(
      `/student/assessments/${assignmentId.value}/completed`,
    );

    return false;
  }

  if (
    attempt.status
    !== "in_progress"
  ) {
    await navigateTo(
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
      await navigateTo(
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

  pendingSync.value =
    false;

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

  isSaving.value =
    false;

  if (
    result.data.attemptClosed
  ) {
    await navigateTo(
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
    questionPayload.value
      ?.allowBacktracking
    && !auto
  ) {
    const saved =
      await synchronizeAnswer(
        false,
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

  await navigateTo(
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

  saveRecovery();
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
  },
);
</script>

<template>
  <div class="min-h-screen bg-default">
    <header class="sticky top-0 z-30 border-b border-default bg-default/95 backdrop-blur">
      <div class="flex min-h-16 items-center gap-3 px-4">
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

        <UButton
          color="error"
          variant="soft"
          icon="i-lucide-send"
          :loading="isSubmitting"
          @click="
            submitModalOpen = true
          "
        >
          Submit
        </UButton>
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

          <div class="flex gap-2">
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
              v-if="pendingSync"
              color="warning"
              variant="soft"
            >
              Waiting to sync
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
      description="Your saved answers will be graded immediately. You cannot change them after final submission."
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
    />
  </div>
</template>
