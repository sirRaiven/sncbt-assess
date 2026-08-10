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
  middleware:
    ["student"],
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

const deadlineWarningsShown =
  new Set<number>();

const questionTimeoutTriggered =
  ref(false);

const questionTimeoutRetryCount =
  ref(0);

const questionTimeoutRetryAtMs =
  ref(0);

const questionTimeoutSyncPending =
  ref(false);

const scheduleDeadlineTriggered =
  ref(false);

const scheduleSeconds =
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

const serverClockEpochMs =
  ref<number | null>(
    null,
  );

const serverClockAnchorMs =
  ref<number | null>(
    null,
  );

const questionTimerProgress =
  computed(
    () => {
      const totalSeconds =
        questionPayload.value
          ?.question
          .timeLimitSeconds;

      if (
        !totalSeconds
        || totalSeconds <= 0
        || questionSeconds.value
          === null
      ) {
        return 0;
      }

      return Math.max(
        0,
        Math.min(
          100,
          (
            questionSeconds.value
            / totalSeconds
          ) * 100,
        ),
      );
    },
  );

const scheduleDeadlineColor =
  computed<
    "neutral"
    | "warning"
    | "error"
  >(
    () => {
      const seconds =
        scheduleSeconds.value;

      if (
        seconds !== null
        && seconds <= 60
      ) {
        return "error";
      }

      if (
        seconds !== null
        && seconds <= 300
      ) {
        return "warning";
      }

      return "neutral";
    },
  );

const questionTimerColor =
  computed<
    "primary"
    | "warning"
    | "error"
  >(
    () => {
      const remaining =
        questionTimerProgress.value;

      if (remaining <= 20) {
        return "error";
      }

      if (remaining <= 50) {
        return "warning";
      }

      return "primary";
    },
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

const nextActionLabel =
  computed(
    () => {
      if (
        questionPayload.value
          ?.finalized
      ) {
        return isLastQuestion.value
          ? "Submit Assessment"
          : "Next Question";
      }

      return isLastQuestion.value
        ? "Save and Submit"
        : "Save and Continue";
    },
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

const deadlineWarning =
  computed(
    () => {
      const seconds =
        scheduleSeconds.value;

      if (
        seconds === null
        || seconds > 300
        || seconds <= 0
      ) {
        return "";
      }

      if (seconds <= 60) {
        return "The class closes in less than 1 minute. Any active attempt will be submitted when the scheduled closing time is reached.";
      }

      return "The class closing deadline is less than 5 minutes away. Continue answering each timed question and submit before the schedule closes.";
    },
  );

function syncServerClock(
  serverNow: string | null,
): void {
  if (!serverNow) {
    return;
  }

  const parsed =
    Date.parse(serverNow);

  if (!Number.isFinite(parsed)) {
    return;
  }

  serverClockEpochMs.value =
    parsed;

  serverClockAnchorMs.value =
    import.meta.client
    && typeof performance
      !== "undefined"
      ? performance.now()
      : null;
}

function currentServerTimeMs():
  number {
  if (
    serverClockEpochMs.value
      === null
  ) {
    return Date.now();
  }

  if (
    import.meta.client
    && serverClockAnchorMs.value
      !== null
    && typeof performance
      !== "undefined"
  ) {
    return (
      serverClockEpochMs.value
      + performance.now()
      - serverClockAnchorMs.value
    );
  }

  return serverClockEpochMs.value;
}

function secondsUntil(
  value: string | null,
): number | null {
  if (!value) {
    return null;
  }

  const deadlineMs =
    Date.parse(value);

  if (!Number.isFinite(deadlineMs)) {
    return null;
  }

  return Math.max(
    0,
    Math.ceil(
      (
        deadlineMs
        - currentServerTimeMs()
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

function showDeadlineWarning(
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
    || deadlineWarningsShown.has(
      threshold,
    )
  ) {
    return;
  }

  deadlineWarningsShown.add(
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
      "This is the shared class closing deadline. The server will submit any active attempt when the scheduled closing time is reached.",
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

function normalizeSelectedOptionIds():
  string[] {
  if (!questionPayload.value) {
    return [];
  }

  const validOptionIds =
    new Set(
      questionPayload.value
        .question.options
        .map(
          (option) =>
            option.id,
        ),
    );

  const normalized = [
    ...new Set(
      selectedOptionIds.value
        .filter(
          (optionId) =>
            validOptionIds.has(
              optionId,
            ),
        ),
    ),
  ];

  if (
    questionPayload.value
      .question.questionType
    === "multiple_choice"
  ) {
    return normalized.slice(
      0,
      1,
    );
  }

  return normalized;
}

function applyQuestionPayload(
  payload: DeliveryQuestionPayload,
  restoreLocalRecovery = true,
): void {
  syncServerClock(
    payload.serverNow,
  );

  currentIndex.value =
    payload.questionIndex;

  questionPayload.value =
    payload;

  selectedOptionIds.value = [
    ...payload.selectedOptionIds,
  ];

  loadedSelectedOptionIds.value = [
    ...payload.selectedOptionIds,
  ];

  pendingSync.value =
    false;

  lastSyncedAt.value =
    new Date()
      .toISOString();

  questionSeconds.value =
    secondsUntil(
      payload.deadlineAt,
    );

  questionTimeoutTriggered.value =
    false;

  questionTimeoutRetryCount.value =
    0;

  questionTimeoutRetryAtMs.value =
    0;

  questionTimeoutSyncPending.value =
    false;

  if (payload.finalized) {
    clearRecovery();
  } else if (restoreLocalRecovery) {
    restoreRecovery();
  }
}

async function refreshFinalizedQuestionState():
  Promise<boolean> {
  if (
    !delivery.value?.attempt
    || !questionPayload.value
  ) {
    return false;
  }

  const result =
    await getQuestion(
      delivery.value.attempt.id,
      currentIndex.value,
    );

  if (
    result.error
    || !result.data
  ) {
    return false;
  }

  const payload =
    result.data.payload;

  syncServerClock(
    payload.serverNow,
  );

  if (!payload.finalized) {
    return false;
  }

  applyQuestionPayload(
    payload,
    false,
  );

  return true;
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

  syncServerClock(
    result.data.serverNow,
  );

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

  scheduleSeconds.value =
    secondsUntil(
      delivery.value.endsAt,
    );

  return true;
}

async function loadQuestion(
  index: number,
  autoAdvanceFinalized = false,
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

  const payload =
    result.data.payload;

  applyQuestionPayload(
    payload,
  );

  if (
    autoAdvanceFinalized
    && payload.finalized
    && payload.questionIndex
      < payload.questionCount - 1
  ) {
    await loadQuestion(
      payload.questionIndex + 1,
      true,
    );

    return;
  }

  isLoading.value =
    false;
}

async function synchronizeAnswer(
  finalize: boolean,
  options?: {
    silentError?: boolean;
    recoverFinalized?: boolean;
  },
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

    if (!options?.silentError) {
      toast.add({
        title:
          "Answer saved on this device",
        description:
          "Reconnect before moving to another question or submitting.",
        color:
          "warning",
      });
    }

    return false;
  }

  const normalizedOptionIds =
    normalizeSelectedOptionIds();

  selectedOptionIds.value = [
    ...normalizedOptionIds,
  ];

  isSaving.value =
    true;

  try {
    const result =
      await saveAnswer(
        delivery.value.attempt.id,
        questionPayload.value
          .question.id,
        normalizedOptionIds,
        finalize,
      );

    if (
      result.error
      || !result.data
    ) {
      const lowerError =
        result.error
          ?.toLowerCase()
        || "";

      const mayAlreadyBeFinal =
        options?.recoverFinalized
          !== false
        && (
          lowerError.includes(
            "already final",
          )
          || lowerError.includes(
            "already finalized",
          )
          || lowerError.includes(
            "response is already final",
          )
        );

      if (mayAlreadyBeFinal) {
        const recovered =
          await refreshFinalizedQuestionState();

        if (recovered) {
          clearRecovery();

          pendingSync.value =
            false;

          lastSyncedAt.value =
            new Date()
              .toISOString();

          return true;
        }
      }

      saveRecovery();

      pendingSync.value =
        true;

      if (!options?.silentError) {
        toast.add({
          title:
            "Answer could not be synchronized",
          description:
            result.error
            || "The answer remains cached on this device.",
          color:
            "error",
        });
      }

      return false;
    }

    clearRecovery();

    pendingSync.value =
      false;

    if (
      result.data.attemptClosed
    ) {
      await leaveAssessment(
        `/student/assessments/${assignmentId.value}/completed`,
      );

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
      // The server is authoritative after expiry. Reload the
      // finalized question so a response that succeeded during a
      // network race is not overwritten by stale browser state.
      const refreshed =
        await refreshFinalizedQuestionState();

      if (!refreshed) {
        selectedOptionIds.value = [
          ...loadedSelectedOptionIds.value,
        ];
      }

      toast.add({
        title:
          "Question time expired",
        description:
          selectedOptionIds.value.length > 0
            ? "The server finalized the answer that was already saved before the question deadline."
            : "No answer was saved before the question deadline. This question is recorded as unanswered due to timeout.",
        color:
          "warning",
      });
    } else {
      loadedSelectedOptionIds.value = [
        ...normalizedOptionIds,
      ];

      if (
        result.data.finalized
        && questionPayload.value
      ) {
        questionPayload.value = {
          ...questionPayload.value,
          finalized:
            true,
        };
      }
    }

    lastSyncedAt.value =
      new Date()
        .toISOString();

    return true;
  } finally {
    isSaving.value =
      false;
  }
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

  // Finalized questions are read-only. Navigation must never try
  // to save them again, especially after their timer expired.
  if (
    questionPayload.value
      .finalized
  ) {
    await loadQuestion(
      currentIndex.value - 1,
    );

    return;
  }

  if (
    questionSeconds.value
      === 0
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
    if (
      auto
      && result.code
        === "TIMER_NOT_EXPIRED"
    ) {
      scheduleDeadlineTriggered.value =
        false;

      questionTimeoutTriggered.value =
        false;

      const stillOpen =
        await loadDelivery();

      if (stillOpen) {
        toast.add({
          title:
            "Timer synchronized",
          description:
            "The server confirmed that the class schedule is still open. The deadline has been synchronized and you can continue answering.",
          color:
            "info",
        });
      }

      isSubmitting.value =
        false;

      return;
    }

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
    || questionPayload.value.finalized
    || questionTimeoutTriggered.value
  ) {
    return;
  }

  if (
    currentServerTimeMs()
      < questionTimeoutRetryAtMs.value
  ) {
    return;
  }

  questionTimeoutTriggered.value =
    true;

  questionTimeoutSyncPending.value =
    true;

  const saved =
    await synchronizeAnswer(
      true,
      {
        silentError:
          questionTimeoutRetryCount.value
            > 0,
      },
    );

  questionTimeoutSyncPending.value =
    false;

  if (!saved) {
    if (
      !isOnline.value
    ) {
      questionTimeoutTriggered.value =
        false;

      return;
    }

    questionTimeoutRetryCount.value +=
      1;

    questionTimeoutRetryAtMs.value =
      currentServerTimeMs()
      + 3000;

    // Release the timeout latch so the interval can retry. The
    // server/database operation is idempotent after the matching
    // SQL hotfix, so an uncertain network response cannot strand
    // the student at 00:00.
    questionTimeoutTriggered.value =
      false;

    return;
  }

  questionTimeoutRetryCount.value =
    0;

  questionTimeoutRetryAtMs.value =
    0;

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
            ?.endsAt
        ) {
          scheduleSeconds.value =
            secondsUntil(
              delivery.value.endsAt,
            );

          showDeadlineWarning(
            scheduleSeconds.value,
          );

          if (
            scheduleSeconds.value
            === 0
            && !isSubmitting.value
            && !scheduleDeadlineTriggered.value
          ) {
            scheduleDeadlineTriggered.value =
              true;

            void submit(
              true,
              "schedule_deadline_expired",
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
            && !questionPayload.value.finalized
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
    scheduleSeconds.value
    === 0
  ) {
    scheduleDeadlineTriggered.value =
      false;

    await submit(
      true,
      "schedule_deadline_expired_after_reconnect",
    );

    return;
  }

  if (
    questionSeconds.value
    === 0
    && questionPayload.value
    && !questionPayload.value.finalized
  ) {
    questionTimeoutTriggered.value =
      false;

    questionTimeoutRetryAtMs.value =
      0;

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
        true,
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
            :color="scheduleDeadlineColor"
            variant="soft"
            class="font-mono"
          >
            Closes in
            {{
              formatTime(
                scheduleSeconds,
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
        v-if="deadlineWarning"
        class="mb-4"
        :color="
          scheduleSeconds !== null
          && scheduleSeconds <= 60
            ? 'error'
            : 'warning'
        "
        variant="soft"
        title="Class closing deadline is approaching"
        :description="deadlineWarning"
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

        <div class="mb-6 rounded-xl border border-default bg-elevated/50 p-4">
          <div class="mb-2 flex items-center justify-between gap-3">
            <div>
              <p class="text-sm font-bold text-highlighted">
                Answer time
              </p>
              <p class="text-xs text-muted">
                This question has its own timer. At zero, the server finalizes it and automatically moves you forward.
              </p>
            </div>

            <span
              class="shrink-0 font-mono text-lg font-black"
              :class="{
                'text-error':
                  questionTimerProgress <= 20,
                'text-warning':
                  questionTimerProgress > 20
                  && questionTimerProgress <= 50,
              }"
            >
              {{ formatTime(questionSeconds) }}
            </span>
          </div>

          <UProgress
            :model-value="questionTimerProgress"
            :max="100"
            :color="questionTimerColor"
            size="md"
          />

          <p
            v-if="questionPayload.finalized"
            class="mt-2 text-xs font-semibold text-muted"
          >
            This question is finalized. You can review it and move to another question.
          </p>

          <p
            v-else-if="
              questionTimeoutSyncPending
              && questionSeconds === 0
            "
            class="mt-2 text-xs font-semibold text-warning"
          >
            Time expired. Contacting the server to finalize this question...
          </p>

          <p
            v-else-if="
              questionTimeoutRetryCount > 0
              && questionSeconds === 0
            "
            class="mt-2 text-xs font-semibold text-warning"
          >
            Time expired. The server did not respond; retrying automatically. Keep this page open.
          </p>

          <p
            v-else-if="
              questionTimeoutTriggered
              && questionSeconds === 0
            "
            class="mt-2 text-xs font-semibold text-warning"
          >
            Time expired. Finalizing this question and preparing the next one...
          </p>
        </div>

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
                || questionTimeoutTriggered
                || questionSeconds === 0
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
                || (
                  !questionPayload.finalized
                  && (
                    questionTimeoutTriggered
                    || questionSeconds === 0
                  )
                )
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
              :disabled="
                !questionPayload.finalized
                && (
                  questionTimeoutTriggered
                  || questionSeconds === 0
                )
              "
              @click="goNext"
            >
              {{ nextActionLabel }}
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
