<script setup lang="ts">
import {
  onBeforeRouteLeave,
} from "vue-router";

import type {
  DeliveryAnswerFeedback,
  DeliveryQuestionPayload,
  StudentAssessmentDelivery,
} from "~/types/assessment-delivery";

import type {
  AssessmentIntegrityEventInput,
  AssessmentIntegrityEventType,
  AssessmentIntegrityPolicy,
} from "~/types/assessment-integrity";

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
  getAttemptSelectionPolicy,
  saveAnswer,
  expireQuestion,
  submitAttempt,
} = useAssessmentDelivery();

const {
  getAttemptIntegrityPolicy,
  reportIntegrityEvents,
} = useAssessmentIntegrity();

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

const selectionLimitByQuestionId =
  ref<Record<string, number>>(
    {},
  );

const selectionPolicyAttemptId =
  ref<string | null>(
    null,
  );

const integrityPolicy =
  ref<
    AssessmentIntegrityPolicy
    | null
  >(null);

const focusGateRequired =
  ref(false);

const focusModeExited =
  ref(false);

const visibilitySignalPending =
  ref(false);

const fullscreenWasEntered =
  ref(false);

const focusTransitionGraceUntilMs =
  ref(0);

const integrityEventQueue =
  ref<AssessmentIntegrityEventInput[]>([]);

const integrityFlushInProgress =
  ref(false);

const integrityRetryAtMs =
  ref(0);

const questionAreaRef =
  ref<HTMLElement | null>(null);

const integrityListenersActive =
  ref(false);

const lastIntegrityEventAt =
  new Map<AssessmentIntegrityEventType, number>();

const currentIndex =
  ref(0);

const selectedOptionIds =
  ref<string[]>(
    [],
  );

const textResponse =
  ref("");

const booleanResponse =
  ref<boolean | null>(
    null,
  );

const isLoading =
  ref(true);

const isSaving =
  ref(false);

const isFinalizingAnswer =
  ref(false);

const isSubmitting =
  ref(false);

const errorMessage =
  ref("");

const submitModalOpen =
  ref(false);

const answerFeedback =
  ref<DeliveryAnswerFeedback | null>(
    null,
  );

const feedbackModalOpen =
  ref(false);

const pendingFeedbackAction =
  ref<
    | "next"
    | "previous"
    | "open-submit"
    | "submit"
    | null
  >(null);

const pendingFeedbackSubmitReason =
  ref("student_submitted");

const FEEDBACK_AUTO_ADVANCE_MS =
  2200;

let feedbackAdvanceTimer:
  ReturnType<typeof setTimeout>
  | null =
    null;

let draftSaveTimer:
  ReturnType<typeof setTimeout>
  | null =
    null;

let answerSyncQueue:
  Promise<void> =
    Promise.resolve();

const answerRevision =
  ref(0);

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

const loadedTextResponse =
  ref("");

const loadedBooleanResponse =
  ref<boolean | null>(
    null,
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

let integrityFlushTimer:
  | ReturnType<
      typeof setTimeout
    >
  | null =
    null;

let blurDetectionTimer:
  | ReturnType<
      typeof setTimeout
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

const isChoiceQuestion =
  computed(
    () => {
      const type =
        questionPayload.value
          ?.question.questionType;

      return type === "multiple_choice"
        || type === "checkbox";
    },
  );

const isTrueFalseQuestion =
  computed(
    () => {
      const type =
        questionPayload.value
          ?.question.questionType;

      return type === "true_false"
        || type === "true_false_correction";
    },
  );

const instantFeedbackActive =
  computed(
    () =>
      delivery.value
        ?.resultVisibility
      === "score_and_answers",
  );

const requiredSelections =
  computed<number | null>(
    () => {
      const payload =
        questionPayload.value;

      if (!payload) {
        return null;
      }

      if (
        payload.question.questionType
        === "multiple_choice"
      ) {
        return 1;
      }

      if (
        payload.question.questionType
        !== "checkbox"
      ) {
        return 0;
      }

      return (
        selectionLimitByQuestionId
          .value[payload.question.id]
        ?? null
      );
    },
  );

const selectedAnswerCount =
  computed(
    () =>
      normalizeSelectedOptionIds()
        .length,
  );

function hasCurrentAnswer(): boolean {
  const payload =
    questionPayload.value;

  if (!payload) {
    return false;
  }

  switch (
    payload.question.questionType
  ) {
    case "multiple_choice":
    case "checkbox": {
      const required =
        requiredSelections.value;

      return required !== null
        && selectedAnswerCount.value
          === required;
    }

    case "fill_blank":
      return textResponse.value
        .trim().length > 0;

    case "true_false":
      return booleanResponse.value
        !== null;

    case "true_false_correction":
      return booleanResponse.value
        !== null
        && (
          booleanResponse.value === true
          || textResponse.value
            .trim().length > 0
        );

    default:
      return false;
  }
}

const selectionRequirementMet =
  computed(
    () =>
      questionPayload.value
        ?.finalized
        ? true
        : hasCurrentAnswer(),
  );

const selectionInstruction =
  computed(
    () => {
      const payload =
        questionPayload.value;

      if (!payload) {
        return "";
      }

      switch (
        payload.question.questionType
      ) {
        case "multiple_choice":
          return "Select one answer.";

        case "checkbox": {
          const required =
            requiredSelections.value;

          if (required === null) {
            return "Loading answer-selection rules...";
          }

          return `Select exactly ${required} ${required === 1 ? "answer" : "answers"}. ${selectedAnswerCount.value} of ${required} selected.`;
        }

        case "fill_blank":
          return "Type your answer in the blank.";

        case "true_false":
          return "Choose True or False.";

        case "true_false_correction":
          return booleanResponse.value === false
            ? "You selected False. State why it is false or provide the correct answer."
            : "Choose True or False. If you choose False, you must also provide the correction.";

        default:
          return "Complete the answer.";
      }
    },
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

      if (instantFeedbackActive.value) {
        return "Check Answer";
      }

      return isLastQuestion.value
        ? "Save and Submit"
        : "Save and Continue";
    },
  );

const integrityMonitoringActive =
  computed(
    () =>
      Boolean(
        integrityPolicy.value
          ?.enabled
        && delivery.value
          ?.attempt
          ?.status === "in_progress",
      ),
  );

const fullscreenSupported =
  computed(
    () =>
      Boolean(
        import.meta.client
        && document.fullscreenEnabled
        && document.documentElement
          ?.requestFullscreen,
      ),
  );

const integrityQueueKey =
  computed(
    () =>
      delivery.value?.attempt
        ? `sncbt-integrity:${delivery.value.attempt.id}`
        : "",
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
          .length > 0
        || loadedTextResponse.value
          .trim().length > 0
        || loadedBooleanResponse.value
          !== null;

      const currentHasAnswer =
        hasCurrentAnswer();

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

const questionTransitioning =
  computed(
    () =>
      Boolean(
        questionPayload.value
        && !questionPayload.value
          .finalized
        && questionSeconds.value
          === 0,
      ),
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

      return "The class closing deadline is less than 5 minutes away. Continue answering and submit before the schedule closes.";
    },
  );

function currentIntegrityMetadata():
  AssessmentIntegrityEventInput["metadata"] {
  if (!import.meta.client) {
    return {};
  }

  return {
    visibilityState:
      document.visibilityState,
    fullscreen:
      Boolean(document.fullscreenElement),
    fullscreenSupported:
      Boolean(
        document.fullscreenEnabled
        && document.documentElement
          ?.requestFullscreen,
      ),
    online:
      navigator.onLine,
    viewportWidth:
      window.innerWidth,
    viewportHeight:
      window.innerHeight,
    source:
      "assessment-player",
  };
}

function persistIntegrityQueue():
  void {
  if (
    !import.meta.client
    || !integrityQueueKey.value
  ) {
    return;
  }

  if (
    integrityEventQueue.value
      .length === 0
  ) {
    localStorage.removeItem(
      integrityQueueKey.value,
    );
    return;
  }

  localStorage.setItem(
    integrityQueueKey.value,
    JSON.stringify(
      integrityEventQueue.value
        .slice(-100),
    ),
  );
}

function restoreIntegrityQueue():
  void {
  if (
    !import.meta.client
    || !integrityQueueKey.value
  ) {
    return;
  }

  const raw = localStorage.getItem(
    integrityQueueKey.value,
  );

  if (!raw) {
    return;
  }

  try {
    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed)) {
      integrityEventQueue.value = [
        ...parsed,
      ].slice(-100);
    }
  } catch {
    localStorage.removeItem(
      integrityQueueKey.value,
    );
  }
}

function integrityEventIsThrottled(
  eventType: AssessmentIntegrityEventType,
): boolean {
  const now = Date.now();
  const previous =
    lastIntegrityEventAt.get(
      eventType,
    ) ?? 0;
  const threshold =
    eventType === "window_blur"
      ? 1500
      : 800;

  if (
    now - previous
    < threshold
  ) {
    return true;
  }

  lastIntegrityEventAt.set(
    eventType,
    now,
  );
  return false;
}

function scheduleIntegrityFlush():
  void {
  if (
    !integrityMonitoringActive.value
    || !isOnline.value
    || integrityFlushTimer
  ) {
    return;
  }

  const delay =
    Math.max(
      250,
      integrityRetryAtMs.value
      - Date.now(),
    );

  integrityFlushTimer =
    setTimeout(
      () => {
        integrityFlushTimer = null;
        void flushIntegrityEvents();
      },
      delay,
    );
}

async function flushIntegrityEvents():
  Promise<void> {
  const attempt =
    delivery.value?.attempt;

  if (
    !attempt
    || !integrityMonitoringActive.value
    || !isOnline.value
    || integrityFlushInProgress.value
    || Date.now()
      < integrityRetryAtMs.value
    || integrityEventQueue.value
      .length === 0
  ) {
    return;
  }

  integrityFlushInProgress.value =
    true;

  const batch =
    integrityEventQueue.value
      .slice(0, 20);

  try {
    const result =
      await reportIntegrityEvents(
        attempt.id,
        batch,
      );

    if (
      !result.error
      && result.data
    ) {
      integrityRetryAtMs.value =
        0;

      const sentIds =
        new Set(
          batch.map(
            (event) => event.id,
          ),
        );

      integrityEventQueue.value =
        integrityEventQueue.value
          .filter(
            (event) =>
              !sentIds.has(
                event.id,
              ),
          );

      persistIntegrityQueue();
    } else if (
      result.code
      === "ATTEMPT_CLOSED"
    ) {
      integrityEventQueue.value = [];
      integrityRetryAtMs.value = 0;
      persistIntegrityQueue();
    } else {
      integrityRetryAtMs.value =
        Date.now()
        + (
          result.code
          === "INTEGRITY_EVENT_RATE_LIMITED"
            ? 60_000
            : 5_000
        );
    }
  } finally {
    integrityFlushInProgress.value =
      false;

    if (
      integrityEventQueue.value
        .length > 0
      && isOnline.value
    ) {
      scheduleIntegrityFlush();
    }
  }
}

function queueIntegrityEvent(
  eventType: AssessmentIntegrityEventType,
): void {
  if (
    !integrityMonitoringActive.value
    || !import.meta.client
    || integrityEventIsThrottled(
      eventType,
    )
  ) {
    return;
  }

  const event: AssessmentIntegrityEventInput = {
    id:
      crypto.randomUUID(),
    eventType,
    clientOccurredAt:
      new Date()
        .toISOString(),
    questionId:
      questionPayload.value
        ?.question.id
        ?? null,
    questionIndex:
      questionPayload.value
        ? currentIndex.value
        : null,
    metadata:
      currentIntegrityMetadata(),
  };

  integrityEventQueue.value = [
    ...integrityEventQueue.value,
    event,
  ].slice(-100);

  persistIntegrityQueue();
  scheduleIntegrityFlush();
}

async function ensureAttemptIntegrityPolicy(
  attemptId: string,
): Promise<void> {
  const result =
    await getAttemptIntegrityPolicy(
      attemptId,
    );

  if (
    result.error
    || !result.data
  ) {
    // Integrity telemetry must not consume or block question time when the
    // monitoring service is temporarily unavailable.
    integrityPolicy.value = {
      assignmentId:
        assignmentId.value,
      attemptId,
      enabled: false,
      focusModeEnabled: false,
    };
    return;
  }

  integrityPolicy.value =
    result.data;

  restoreIntegrityQueue();

  if (
    integrityPolicy.value.enabled
    && integrityPolicy.value
      .focusModeEnabled
  ) {
    if (fullscreenSupported.value) {
      focusGateRequired.value =
        !document.fullscreenElement;
    } else {
      queueIntegrityEvent(
        "focus_mode_unavailable",
      );
    }
  }
}

function handleWindowBlur():
  void {
  if (
    !integrityMonitoringActive.value
    || blurDetectionTimer
    || Date.now()
      < focusTransitionGraceUntilMs.value
  ) {
    return;
  }

  blurDetectionTimer =
    setTimeout(
      () => {
        blurDetectionTimer = null;

        // A tab/app switch normally changes document visibility too. In that
        // case tab_hidden is the stronger signal, so avoid double counting.
        if (
          document.visibilityState
          === "visible"
        ) {
          queueIntegrityEvent(
            "window_blur",
          );
        }
      },
      350,
    );
}

function handleFullscreenChange():
  void {
  if (
    !integrityMonitoringActive.value
    || !integrityPolicy.value
      ?.focusModeEnabled
    || allowRouteLeave.value
  ) {
    return;
  }

  if (document.fullscreenElement) {
    fullscreenWasEntered.value =
      true;
    focusModeExited.value =
      false;
    focusTransitionGraceUntilMs.value =
      Date.now() + 1500;
    return;
  }

  if (fullscreenWasEntered.value) {
    focusModeExited.value =
      true;
    queueIntegrityEvent(
      "fullscreen_exit",
    );

    toast.add({
      title:
        "Focus Mode exited",
      description:
        "Return to fullscreen to continue in Focus Mode. The focus change was recorded as an integrity signal.",
      color:
        "warning",
    });
  }
}

function handleProtectedInteraction(
  eventType: Extract<
    AssessmentIntegrityEventType,
    | "copy_attempt"
    | "cut_attempt"
    | "paste_attempt"
    | "context_menu_attempt"
  >,
  event: Event,
): void {
  if (
    !integrityMonitoringActive.value
    || !questionAreaRef.value
  ) {
    return;
  }

  const target =
    event.target;

  if (
    !(target instanceof Node)
    || !questionAreaRef.value
      .contains(target)
  ) {
    return;
  }

  event.preventDefault();
  queueIntegrityEvent(
    eventType,
  );

  toast.add({
    title:
      "Action restricted during assessment",
    description:
      "This action is disabled in the question area and has been recorded as an assessment integrity signal.",
    color:
      "warning",
  });
}

function handleCopyAttempt(
  event: Event,
): void {
  handleProtectedInteraction(
    "copy_attempt",
    event,
  );
}

function handleCutAttempt(
  event: Event,
): void {
  handleProtectedInteraction(
    "cut_attempt",
    event,
  );
}

function handlePasteAttempt(
  event: Event,
): void {
  handleProtectedInteraction(
    "paste_attempt",
    event,
  );
}

function handleContextMenuAttempt(
  event: Event,
): void {
  handleProtectedInteraction(
    "context_menu_attempt",
    event,
  );
}

function activateIntegrityListeners():
  void {
  if (
    !import.meta.client
    || !integrityMonitoringActive.value
    || integrityListenersActive.value
  ) {
    return;
  }

  window.addEventListener(
    "blur",
    handleWindowBlur,
  );
  document.addEventListener(
    "fullscreenchange",
    handleFullscreenChange,
  );
  document.addEventListener(
    "copy",
    handleCopyAttempt,
  );
  document.addEventListener(
    "cut",
    handleCutAttempt,
  );
  document.addEventListener(
    "paste",
    handlePasteAttempt,
  );
  document.addEventListener(
    "contextmenu",
    handleContextMenuAttempt,
  );

  integrityListenersActive.value =
    true;
}

async function enterFocusModeAndContinue():
  Promise<void> {
  if (
    !delivery.value?.attempt
  ) {
    return;
  }

  if (
    fullscreenSupported.value
    && !document.fullscreenElement
  ) {
    focusTransitionGraceUntilMs.value =
      Date.now() + 1500;

    try {
      await document.documentElement
        .requestFullscreen();

      fullscreenWasEntered.value =
        true;
      queueIntegrityEvent(
        "focus_mode_started",
      );
    } catch {
      queueIntegrityEvent(
        "focus_mode_unavailable",
      );

      toast.add({
        title:
          "Fullscreen could not be started",
        description:
          "The assessment will continue with browser focus monitoring. Keep this assessment page active.",
        color:
          "warning",
      });
    }
  }

  focusGateRequired.value =
    false;
  focusModeExited.value =
    false;

  activateIntegrityListeners();

  await loadQuestion(
    currentIndex.value,
    true,
  );
  startTimer();
}

async function returnToFocusMode():
  Promise<void> {
  if (
    !fullscreenSupported.value
  ) {
    return;
  }

  focusTransitionGraceUntilMs.value =
    Date.now() + 1500;

  try {
    await document.documentElement
      .requestFullscreen();
    fullscreenWasEntered.value =
      true;
    focusModeExited.value =
      false;
    queueIntegrityEvent(
      "focus_mode_started",
    );
  } catch {
    toast.add({
      title:
        "Unable to return to fullscreen",
      description:
        "Use your browser's fullscreen controls and keep the assessment page active.",
      color:
        "warning",
    });
  }
}

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

  if (integrityEventQueue.value.length > 0) {
    persistIntegrityQueue();
  }

  event.preventDefault();
  event.returnValue =
    "";
}

function retryExpiredQuestionNow():
  void {
  if (
    !isOnline.value
    || isSubmitting.value
    || !questionPayload.value
    || questionPayload.value.finalized
    || questionSeconds.value !== 0
    || questionTimeoutTriggered.value
  ) {
    return;
  }

  // Browsers can throttle timers/network work while a tab or
  // mobile browser is backgrounded. Force an immediate recovery
  // pass when the assessment becomes active again instead of
  // waiting for the next retry window.
  questionTimeoutRetryAtMs.value =
    0;

  void handleQuestionTimeout();
}

function handleWindowFocus():
  void {
  retryExpiredQuestionNow();
}

function handleVisibilityChange():
  void {
  if (
    document.visibilityState
    === "hidden"
  ) {
    if (pendingSync.value) {
      saveRecovery();
    }

    if (integrityMonitoringActive.value) {
      visibilitySignalPending.value =
        true;
      queueIntegrityEvent(
        "tab_hidden",
      );
    }

    return;
  }

  if (
    visibilitySignalPending.value
    && integrityMonitoringActive.value
  ) {
    visibilitySignalPending.value =
      false;

    toast.add({
      title:
        "Focus change recorded",
      description:
        "The assessment tab became inactive. Stay on this assessment page while your attempt is in progress.",
      color:
        "warning",
    });

    scheduleIntegrityFlush();
  }

  retryExpiredQuestionNow();
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
      "This is the class closing deadline. Any active attempt is submitted when the scheduled closing time is reached.",
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

  if (
    import.meta.client
    && document.fullscreenElement
  ) {
    await document.exitFullscreen()
      .catch(() => undefined);
  }

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

  sessionStorage.setItem(
    recoveryKey.value,
    JSON.stringify({
      selectedOptionIds:
        selectedOptionIds.value,
      textResponse:
        textResponse.value,
      booleanResponse:
        booleanResponse.value,
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
    sessionStorage.getItem(
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
        textResponse?:
          string;
        booleanResponse?:
          boolean | null;
      };

    let recovered =
      false;

    if (
      Array.isArray(
        parsed.selectedOptionIds,
      )
    ) {
      selectedOptionIds.value = [
        ...parsed.selectedOptionIds,
      ];
      recovered = true;
    }

    if (
      typeof parsed.textResponse
        === "string"
    ) {
      textResponse.value =
        parsed.textResponse;
      recovered = true;
    }

    if (
      typeof parsed.booleanResponse
        === "boolean"
      || parsed.booleanResponse
        === null
    ) {
      booleanResponse.value =
        parsed.booleanResponse
        ?? null;
      recovered = true;
    }

    if (recovered) {
      pendingSync.value =
        true;
    }
  } catch {
    sessionStorage.removeItem(
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
    sessionStorage.removeItem(
      recoveryKey.value,
    );
  }
}

function isOptionChoiceDisabled(
  optionId: string,
): boolean {
  if (
    !questionPayload.value
    || questionPayload.value
      .finalized
    || isFinalizingAnswer.value
    || questionTimeoutTriggered.value
    || questionSeconds.value === 0
  ) {
    return true;
  }

  // A multiple-choice question requires exactly one selection, but that
  // selection is still a draft until Check Answer is clicked. Do not disable
  // the other choices after the first click; selecting another option replaces
  // the current draft selection.
  if (
    questionPayload.value
      .question.questionType
    === "multiple_choice"
  ) {
    return false;
  }

  if (isSelected(optionId)) {
    return false;
  }

  const required =
    requiredSelections.value;

  if (required === null) {
    return true;
  }

  return (
    selectedAnswerCount.value
    >= required
  );
}

function clearDraftSaveTimer():
  void {
  if (!draftSaveTimer) {
    return;
  }

  clearTimeout(
    draftSaveTimer,
  );

  draftSaveTimer =
    null;
}

function enqueueAnswerSync(
  finalize: boolean,
  options?: {
    silentError?: boolean;
    recoverFinalized?: boolean;
    commitForFeedback?: boolean;
  },
): Promise<boolean> {
  const operation =
    answerSyncQueue.then(
      () =>
        synchronizeAnswer(
          finalize,
          options,
        ),
    );

  answerSyncQueue =
    operation.then(
      () => undefined,
      () => undefined,
    );

  return operation;
}

function scheduleDraftAnswerSync(
  delayMs = 350,
): void {
  clearDraftSaveTimer();

  if (
    !questionPayload.value
    || questionPayload.value
      .finalized
    || isFinalizingAnswer.value
    || questionTimeoutTriggered.value
    || questionSeconds.value === 0
    || !pendingSync.value
  ) {
    return;
  }

  draftSaveTimer =
    setTimeout(
      () => {
        draftSaveTimer =
          null;

        void enqueueAnswerSync(
          false,
          {
            silentError:
              true,
            recoverFinalized:
              true,
            commitForFeedback:
              false,
          },
        );
      },
      delayMs,
    );
}

function markAnswerChanged(): void {
  if (
    !questionPayload.value
    || questionPayload.value
      .finalized
    || isFinalizingAnswer.value
    || questionTimeoutTriggered.value
    || questionSeconds.value === 0
  ) {
    return;
  }

  answerRevision.value +=
    1;

  pendingSync.value =
    true;

  saveRecovery();
  scheduleDraftAnswerSync();
}

function selectBoolean(
  value: boolean,
): void {
  if (
    !questionPayload.value
    || questionPayload.value
      .finalized
    || isFinalizingAnswer.value
    || questionTimeoutTriggered.value
    || questionSeconds.value === 0
  ) {
    return;
  }

  booleanResponse.value =
    value;

  if (value) {
    textResponse.value =
      "";
  }

  markAnswerChanged();
  scheduleDraftAnswerSync(
    0,
  );
}

function selectOption(
  optionId: string,
): void {
  if (
    !questionPayload.value
    || questionPayload.value
      .finalized
    || isFinalizingAnswer.value
    || questionTimeoutTriggered.value
    || questionSeconds.value === 0
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
    const required =
      requiredSelections.value;

    if (
      required === null
      || selectedAnswerCount.value
        >= required
    ) {
      return;
    }

    selectedOptionIds.value = [
      ...selectedOptionIds.value,
      optionId,
    ];
  }

  markAnswerChanged();
  scheduleDraftAnswerSync(
    0,
  );
}

function normalizeSelectedOptionIds():
  string[] {
  if (!questionPayload.value) {
    return [];
  }

  if (!isChoiceQuestion.value) {
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
  clearDraftSaveTimer();

  answerRevision.value =
    0;

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

  textResponse.value =
    payload.textResponse
    ?? "";

  loadedTextResponse.value =
    payload.textResponse
    ?? "";

  booleanResponse.value =
    payload.booleanResponse
    ?? null;

  loadedBooleanResponse.value =
    payload.booleanResponse
    ?? null;

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

    if (
      pendingSync.value
      && isOnline.value
    ) {
      scheduleDraftAnswerSync(
        0,
      );
    }
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

async function reconcileUncertainAnswerSave():
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

  // A finalized server response always wins over stale browser state.
  if (payload.finalized) {
    applyQuestionPayload(
      payload,
      false,
    );

    return true;
  }

  const localOptionIds = [
    ...normalizeSelectedOptionIds(),
  ].sort();

  const serverOptionIds = [
    ...payload.selectedOptionIds,
  ].sort();

  const sameOptions =
    localOptionIds.length
      === serverOptionIds.length
    && localOptionIds.every(
      (optionId, index) =>
        optionId
          === serverOptionIds[index],
    );

  const sameText =
    (
      textResponse.value
        .trim()
    )
      === (
        payload.textResponse
          ?.trim()
        ?? ""
      );

  const sameBoolean =
    booleanResponse.value
      === (
        payload.booleanResponse
        ?? null
      );

  if (
    !sameOptions
    || !sameText
    || !sameBoolean
  ) {
    return false;
  }

  // The request response was uncertain, but the canonical server
  // state already contains exactly the answer currently in the UI.
  applyQuestionPayload(
    payload,
    false,
  );

  return true;
}

async function ensureAttemptSelectionPolicy(
  attemptId: string,
): Promise<boolean> {
  if (
    selectionPolicyAttemptId.value
      === attemptId
    && Object.keys(
      selectionLimitByQuestionId.value,
    ).length > 0
  ) {
    return true;
  }

  const result =
    await getAttemptSelectionPolicy(
      attemptId,
    );

  if (
    result.error
    || !result.data
  ) {
    errorMessage.value =
      result.error
      || "Unable to load the answer-selection rules.";

    return false;
  }

  selectionLimitByQuestionId.value =
    Object.fromEntries(
      result.data.questions.map(
        (item) => [
          item.questionId,
          item.requiredSelections,
        ],
      ),
    );

  selectionPolicyAttemptId.value =
    attemptId;

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

  const policyReady =
    await ensureAttemptSelectionPolicy(
      attempt.id,
    );

  if (!policyReady) {
    return false;
  }

  await ensureAttemptIntegrityPolicy(
    attempt.id,
  );

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
    commitForFeedback?: boolean;
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

  // Once the client clock reaches the authoritative question deadline,
  // no queued draft autosave should start another request. The timeout
  // transition owns reconciliation from this point and will send the
  // latest local response through expire-question after any request
  // already in flight has settled.
  if (
    !finalize
    && questionSeconds.value === 0
    && !questionPayload.value
      .finalized
  ) {
    saveRecovery();

    pendingSync.value =
      true;

    return false;
  }

  const syncRevision =
    answerRevision.value;

  const normalizedOptionIds =
    normalizeSelectedOptionIds();

  const normalizedTextResponse =
    textResponse.value
      .trim()
    || null;

  const normalizedBooleanResponse =
    booleanResponse.value;

  selectedOptionIds.value = [
    ...normalizedOptionIds,
  ];

  isSaving.value =
    true;

  if (finalize) {
    isFinalizingAnswer.value =
      true;
  }

  try {
    const result =
      await saveAnswer(
        delivery.value.attempt.id,
        questionPayload.value
          .question.id,
        {
          selectedOptionIds:
            normalizedOptionIds,
          textResponse:
            normalizedTextResponse,
          booleanResponse:
            normalizedBooleanResponse,
        },
        finalize,
        Boolean(
          options
            ?.commitForFeedback,
        ),
      );

    if (
      result.error
      || !result.data
    ) {
      const lowerError =
        result.error
          ?.toLowerCase()
        || "";

      const questionExpiryOwnsRecovery =
        !finalize
        && questionSeconds.value === 0
        && !questionPayload.value
          .finalized;

      const mayHaveReachedServer =
        !questionExpiryOwnsRecovery
        && options?.recoverFinalized
          !== false
        && (
          result.code
            === "ANSWER_SAVE_FAILED"
          || result.code
            === "REQUEST_TIMEOUT"
          || lowerError.includes(
            "already final",
          )
          || lowerError.includes(
            "already finalized",
          )
          || lowerError.includes(
            "response is already final",
          )
        );

      if (mayHaveReachedServer) {
        const recovered =
          await reconcileUncertainAnswerSave();

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

      if (
        !options?.silentError
        && !questionExpiryOwnsRecovery
      ) {
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

    const localAnswerChangedWhileSaving =
      answerRevision.value
      !== syncRevision;

    if (
      result.data.attemptClosed
    ) {
      clearRecovery();

      pendingSync.value =
        false;
      await leaveAssessment(
        `/student/assessments/${assignmentId.value}/completed`,
      );

      return false;
    }

    if (
      result.data.alreadyFinalized
    ) {
      // The original save can race a server deadline or a previous
      // finalization request. Never overwrite that canonical state
      // with the browser's stale local answer. Reload the finalized
      // question and continue normally instead of showing a sync error.
      const refreshed =
        await reconcileUncertainAnswerSave();

      if (!refreshed) {
        saveRecovery();

        pendingSync.value =
          true;

        if (!options?.silentError) {
          toast.add({
            title:
              "Checking saved answer",
            description:
              "SNCBT Assess is confirming the latest answer state. Your response remains on this device.",
            color:
              "warning",
          });
        }

        return false;
      }

      clearRecovery();

      pendingSync.value =
        false;

      lastSyncedAt.value =
        new Date()
          .toISOString();

      return true;
    }

    answerFeedback.value =
      result.data.feedback
        ?.available
        ? result.data.feedback
        : null;

    feedbackModalOpen.value =
      Boolean(
        answerFeedback.value,
      );

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
        textResponse.value =
          loadedTextResponse.value;
        booleanResponse.value =
          loadedBooleanResponse.value;
      }

      toast.add({
        title:
          "Question time expired",
        description:
          hasCurrentAnswer()
            ? "Your answer that was saved before the deadline has been finalized."
            : "No answer was saved before the question deadline. This question is recorded as unanswered due to timeout.",
        color:
          "warning",
      });
    } else {
      loadedSelectedOptionIds.value = [
        ...normalizedOptionIds,
      ];
      loadedTextResponse.value =
        normalizedTextResponse
        ?? "";
      loadedBooleanResponse.value =
        normalizedBooleanResponse;

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

    if (
      result.data.finalized
      || result.data.timedOut
      || !localAnswerChangedWhileSaving
    ) {
      clearRecovery();

      pendingSync.value =
        false;
    } else {
      pendingSync.value =
        true;

      saveRecovery();
    }

    lastSyncedAt.value =
      new Date()
        .toISOString();

    return true;
  } finally {
    isSaving.value =
      false;

    if (finalize) {
      isFinalizingAnswer.value =
        false;
    }
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

  if (!selectionRequirementMet.value) {
    toast.add({
      title: "Complete the answer",
      description: selectionInstruction.value,
      color: "warning",
    });

    return;
  }

  clearDraftSaveTimer();

  const shouldFinalizeAnswer =
    instantFeedbackActive.value
    || !questionPayload.value
      .allowBacktracking;

  const saved =
    await enqueueAnswerSync(
      shouldFinalizeAnswer,
      {
        commitForFeedback:
          instantFeedbackActive.value
          && shouldFinalizeAnswer,
      },
    );

  if (!saved) {
    if (isOnline.value) {
      questionTimeoutTriggered.value =
        false;
    }

    return;
  }

  if (feedbackModalOpen.value) {
    pendingFeedbackAction.value =
      isLastQuestion.value
        ? "open-submit"
        : "next";

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

  if (!selectionRequirementMet.value) {
    toast.add({
      title: "Complete the answer",
      description: selectionInstruction.value,
      color: "warning",
    });

    return;
  }

  clearDraftSaveTimer();

  const saved =
    await enqueueAnswerSync(
      false,
      {
        commitForFeedback:
          false,
      },
    );

  if (!saved) {
    return;
  }

  if (feedbackModalOpen.value) {
    pendingFeedbackAction.value =
      "previous";

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
    clearDraftSaveTimer();

    const saved =
      await enqueueAnswerSync(
        !questionPayload.value
          .allowBacktracking,
        {
          commitForFeedback:
            false,
        },
      );

    if (!saved) {
      isSubmitting.value =
        false;

      return;
    }

    if (feedbackModalOpen.value) {
      pendingFeedbackAction.value =
        "submit";

      pendingFeedbackSubmitReason.value =
        reason;

      isSubmitting.value =
        false;

      return;
    }
  }

  if (
    integrityEventQueue.value.length > 0
    && isOnline.value
  ) {
    await Promise.race([
      flushIntegrityEvents(),
      new Promise<void>((resolve) => {
        setTimeout(resolve, 600);
      }),
    ]);
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
            "The class schedule is still open. The deadline has been synchronized and you can continue answering.",
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
        || "We couldn't submit your assessment right now. Please try again.",
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

function clearFeedbackAdvanceTimer():
  void {
  if (!feedbackAdvanceTimer) {
    return;
  }

  clearTimeout(
    feedbackAdvanceTimer,
  );

  feedbackAdvanceTimer =
    null;
}

function scheduleFeedbackAdvance():
  void {
  clearFeedbackAdvanceTimer();

  if (
    !feedbackModalOpen.value
    || !pendingFeedbackAction.value
  ) {
    return;
  }

  feedbackAdvanceTimer =
    setTimeout(
      () => {
        feedbackAdvanceTimer =
          null;

        void continueAfterFeedback();
      },
      FEEDBACK_AUTO_ADVANCE_MS,
    );
}

watch(
  [
    feedbackModalOpen,
    pendingFeedbackAction,
  ],
  (
    [
      open,
      action,
    ],
  ) => {
    if (
      open
      && action
    ) {
      scheduleFeedbackAdvance();

      return;
    }

    clearFeedbackAdvanceTimer();
  },
);

async function continueAfterFeedback():
  Promise<void> {
  clearFeedbackAdvanceTimer();
  const action =
    pendingFeedbackAction.value;

  const submitReason =
    pendingFeedbackSubmitReason.value;

  feedbackModalOpen.value =
    false;

  answerFeedback.value =
    null;

  pendingFeedbackAction.value =
    null;

  if (action === "next") {
    await loadQuestion(
      currentIndex.value + 1,
    );

    return;
  }

  if (action === "previous") {
    await loadQuestion(
      currentIndex.value - 1,
    );

    return;
  }

  if (action === "open-submit") {
    submitModalOpen.value =
      true;

    return;
  }

  if (action === "submit") {
    await submit(
      false,
      submitReason,
    );
  }
}

type QuestionTimeoutReconciliation =
  | "advanced"
  | "finalized"
  | "closed"
  | "open"
  | "unresolved";

async function reconcileExpiredQuestion():
  Promise<QuestionTimeoutReconciliation> {
  if (
    !delivery.value?.attempt
    || !questionPayload.value
  ) {
    return "unresolved";
  }

  const expiredIndex =
    currentIndex.value;

  const requestedIndex =
    isLastQuestion.value
      ? expiredIndex
      : expiredIndex + 1;

  // After a timeout, ask for the next index first. The server-side
  // preparation RPC is authoritative and must reconcile the expired
  // current question before it can deliver the next one. This avoids
  // leaving the UI parked on the expired card just to confirm a state
  // the server already knows how to advance during a browser reload.
  let result =
    await getQuestion(
      delivery.value.attempt.id,
      requestedIndex,
    );

  if (
    result.code === "ATTEMPT_CLOSED"
    || result.error
      ?.toLowerCase()
      .includes("deadline")
  ) {
    await leaveAssessment(
      `/student/assessments/${assignmentId.value}/completed`,
    );

    return "closed";
  }

  if (
    (result.error || !result.data)
    && requestedIndex !== expiredIndex
  ) {
    // A very tight deadline race can reject N+1 before N is observed
    // as finalized. Prepare N once, then let the next retry request N+1.
    result =
      await getQuestion(
        delivery.value.attempt.id,
        expiredIndex,
      );
  }

  if (
    result.error
    || !result.data
  ) {
    return "unresolved";
  }

  const payload =
    result.data.payload;

  syncServerClock(
    payload.serverNow,
  );

  if (
    payload.questionIndex
      > expiredIndex
  ) {
    clearRecovery();

    applyQuestionPayload(
      payload,
      false,
    );

    await nextTick();

    questionAreaRef.value
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });

    return "advanced";
  }

  if (payload.finalized) {
    clearRecovery();

    applyQuestionPayload(
      payload,
      false,
    );

    return "finalized";
  }

  const serverRemainingSeconds =
    secondsUntil(
      payload.deadlineAt,
    );

  if (
    serverRemainingSeconds !== null
    && serverRemainingSeconds > 0
  ) {
    applyQuestionPayload(
      payload,
      false,
    );

    return "open";
  }

  return "unresolved";
}

async function continueAfterQuestionTimeout():
  Promise<void> {
  questionTimeoutRetryCount.value =
    0;

  questionTimeoutRetryAtMs.value =
    0;

  if (isLastQuestion.value) {
    await submit(
      true,
      "last_question_timer_expired",
    );

    return;
  }

  await loadQuestion(
    currentIndex.value + 1,
    true,
  );
}

async function handleQuestionTimeout():
  Promise<void> {
  clearDraftSaveTimer();

  if (
    !delivery.value?.attempt
    || !questionPayload.value
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

  const expiredAttemptId =
    delivery.value.attempt.id;

  const expiredQuestionId =
    questionPayload.value
      .question.id;

  const expiredIndex =
    currentIndex.value;

  questionTimeoutTriggered.value =
    true;

  questionTimeoutSyncPending.value =
    true;

  pendingSync.value =
    true;

  saveRecovery();

  // A timer can expire while a draft autosave is already using the same
  // attempt/question row. Do not race a second request against it.
  //
  // Any queued draft that has not started yet will see questionSeconds=0
  // inside synchronizeAnswer() and exit without making another network
  // request. Once the queue settles, expire-question becomes the single
  // authoritative transition for the timed-out question.
  const pendingAnswerWork =
    answerSyncQueue;

  await pendingAnswerWork.catch(
    () => undefined,
  );

  if (
    !delivery.value?.attempt
    || !questionPayload.value
    || isSubmitting.value
    || allowRouteLeave.value
    || delivery.value.attempt.id
      !== expiredAttemptId
    || questionPayload.value
      .question.id
      !== expiredQuestionId
    || currentIndex.value
      !== expiredIndex
  ) {
    questionTimeoutSyncPending.value =
      false;

    questionTimeoutTriggered.value =
      false;

    return;
  }

  // The in-flight save may already have finalized this question.
  if (questionPayload.value.finalized) {
    questionTimeoutSyncPending.value =
      false;

    questionTimeoutTriggered.value =
      false;

    clearRecovery();

    pendingSync.value =
      false;

    await continueAfterQuestionTimeout();

    return;
  }

  // A reconciliation performed by the preceding save may reveal that the
  // question still has time left after clock correction.
  if (
    questionSeconds.value !== null
    && questionSeconds.value > 0
  ) {
    questionTimeoutSyncPending.value =
      false;

    questionTimeoutTriggered.value =
      false;

    return;
  }

  const normalizedOptionIds =
    normalizeSelectedOptionIds();

  selectedOptionIds.value = [
    ...normalizedOptionIds,
  ];

  const result =
    await expireQuestion(
      expiredAttemptId,
      expiredQuestionId,
      expiredIndex,
      {
        selectedOptionIds:
          normalizedOptionIds,
        textResponse:
          textResponse.value
            .trim()
          || null,
        booleanResponse:
          booleanResponse.value,
      },
    );

  questionTimeoutSyncPending.value =
    false;

  if (
    !result.error
    && result.data
  ) {
    clearRecovery();

    pendingSync.value =
      false;

    lastSyncedAt.value =
      new Date()
        .toISOString();

    delivery.value.attempt
      .answeredCount =
        result.data
          .answeredCount;

    if (
      result.data.attemptClosed
    ) {
      await leaveAssessment(
        `/student/assessments/${assignmentId.value}/completed`,
      );

      return;
    }

    if (result.data.payload) {
      const payload =
        result.data.payload;

      if (
        payload.questionIndex
          > expiredIndex
      ) {
        applyQuestionPayload(
          payload,
          false,
        );

        await nextTick();

        questionAreaRef.value
          ?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });

        return;
      }

      if (payload.finalized) {
        applyQuestionPayload(
          payload,
          false,
        );

        await continueAfterQuestionTimeout();

        return;
      }

      const remaining =
        secondsUntil(
          payload.deadlineAt,
        );

      if (
        remaining !== null
        && remaining > 0
      ) {
        applyQuestionPayload(
          payload,
          false,
        );

        return;
      }
    }

    if (isLastQuestion.value) {
      await submit(
        true,
        "last_question_timer_expired",
      );

      return;
    }
  }

  // A browser timeout does not prove that the Edge Function / database
  // stopped processing. Read the canonical state instead of blindly
  // resending the answer or leaving the Student parked at 00:00.
  const reconciliation =
    await reconcileExpiredQuestion();

  if (
    reconciliation === "closed"
    || reconciliation === "advanced"
  ) {
    return;
  }

  if (
    reconciliation === "finalized"
  ) {
    await continueAfterQuestionTimeout();

    return;
  }

  if (
    reconciliation === "open"
  ) {
    return;
  }

  pendingSync.value =
    true;

  if (!isOnline.value) {
    questionTimeoutTriggered.value =
      false;

    return;
  }

  questionTimeoutRetryCount.value +=
    1;

  const retryDelay =
    Math.min(
      8000,
      1500
        * Math.max(
          1,
          questionTimeoutRetryCount.value,
        ),
    );

  questionTimeoutRetryAtMs.value =
    currentServerTimeMs()
    + retryDelay;

  // Release the latch. The timer, focus/visibility recovery, online event,
  // and explicit Retry button can safely try again without overlapping
  // the request that just completed.
  questionTimeoutTriggered.value =
    false;
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

  scheduleIntegrityFlush();

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
    clearDraftSaveTimer();

    await enqueueAnswerSync(
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

  if (integrityEventQueue.value.length > 0) {
    persistIntegrityQueue();
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
      "focus",
      handleWindowFocus,
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
      activateIntegrityListeners();

      if (focusGateRequired.value) {
        isLoading.value =
          false;
        return;
      }

      await loadQuestion(
        currentIndex.value,
        true,
      );

      startTimer();
      scheduleIntegrityFlush();
    } else {
      isLoading.value =
        false;
    }
  },
);

onBeforeUnmount(
  () => {
    clearFeedbackAdvanceTimer();
    clearDraftSaveTimer();

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
      "focus",
      handleWindowFocus,
    );

    window.removeEventListener(
      "beforeunload",
      handleBeforeUnload,
    );

    document.removeEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    if (integrityFlushTimer) {
      clearTimeout(
        integrityFlushTimer,
      );
    }

    if (blurDetectionTimer) {
      clearTimeout(
        blurDetectionTimer,
      );
    }

    if (integrityListenersActive.value) {
      window.removeEventListener(
        "blur",
        handleWindowBlur,
      );
      document.removeEventListener(
        "fullscreenchange",
        handleFullscreenChange,
      );
      document.removeEventListener(
        "copy",
        handleCopyAttempt,
      );
      document.removeEventListener(
        "cut",
        handleCutAttempt,
      );
      document.removeEventListener(
        "paste",
        handlePasteAttempt,
      );
      document.removeEventListener(
        "contextmenu",
        handleContextMenuAttempt,
      );
    }

    persistIntegrityQueue();
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

    if (integrityEventQueue.value.length > 0) {
      persistIntegrityQueue();
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
      <div class="mx-auto max-w-5xl px-4 py-3 sm:px-6">
        <div class="flex items-start gap-3">
          <div class="min-w-0 flex-1">
            <p class="line-clamp-1 text-sm font-black text-highlighted sm:text-base">
              {{ delivery?.title || "Assessment" }}
            </p>

            <p class="mt-0.5 line-clamp-1 text-xs text-muted">
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
            size="sm"
            :loading="isSubmitting"
            aria-label="Submit assessment"
            @click="submitModalOpen = true"
          >
            <span class="hidden sm:inline">
              Submit
            </span>
          </UButton>
        </div>

        <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
          <span
            class="inline-flex items-center gap-1.5 font-medium"
            :class="scheduleDeadlineColor === 'error' ? 'text-error' : scheduleDeadlineColor === 'warning' ? 'text-warning' : 'text-muted'"
          >
            <UIcon name="i-lucide-clock-3" class="size-3.5" />
            Closes in {{ formatTime(scheduleSeconds) }}
          </span>

          <span
            v-if="!isOnline"
            class="inline-flex items-center gap-1.5 font-semibold text-warning"
          >
            <UIcon name="i-lucide-wifi-off" class="size-3.5" />
            Offline
          </span>

          <span
            v-else-if="isSaving || questionTimeoutSyncPending || questionTimeoutRetryCount > 0"
            class="inline-flex items-center gap-1.5 font-semibold text-warning"
          >
            <UIcon name="i-lucide-loader-circle" class="size-3.5 animate-spin" />
            {{ questionTransitioning ? "Moving to next question" : "Saving answer" }}
          </span>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-5xl px-4 py-4 sm:px-6 sm:py-6">
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
        :color="scheduleSeconds !== null && scheduleSeconds <= 60 ? 'error' : 'warning'"
        variant="soft"
        title="Assessment closing soon"
        :description="deadlineWarning"
      />

      <UCard
        v-if="focusGateRequired"
        class="mx-auto max-w-2xl"
      >
        <div class="py-4 text-center sm:py-6">
          <div class="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <UIcon name="i-lucide-scan" class="size-6" />
          </div>

          <h1 class="mt-4 text-xl font-black text-highlighted sm:text-2xl">
            Enter Focus Mode
          </h1>

          <p class="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted">
            Focus Mode keeps the assessment fullscreen while activity monitoring is enabled. Leaving the assessment may be recorded for review, but does not automatically change your score.
          </p>

          <UButton
            class="mt-5"
            size="lg"
            icon="i-lucide-maximize"
            @click="enterFocusModeAndContinue"
          >
            Enter Focus Mode and Begin
          </UButton>
        </div>
      </UCard>

      <div
        v-else-if="isLoading"
        class="mx-auto max-w-4xl space-y-4"
      >
        <USkeleton class="h-10 rounded-xl" />
        <USkeleton class="h-[30rem] rounded-xl" />
      </div>

      <template v-else-if="questionPayload">
        <div
          v-if="focusModeExited"
          class="mx-auto mb-4 flex max-w-4xl items-center justify-between gap-3 rounded-xl border border-warning/30 bg-warning/8 px-3 py-2.5"
        >
          <div class="flex min-w-0 items-center gap-2">
            <UIcon
              name="i-lucide-shield-alert"
              class="size-4 shrink-0 text-warning"
            />
            <p class="truncate text-sm font-semibold text-highlighted">
              Focus Mode exited. Assessment timing continues.
            </p>
          </div>

          <UButton
            v-if="fullscreenSupported"
            color="warning"
            variant="soft"
            size="xs"
            icon="i-lucide-maximize"
            class="shrink-0"
            @click="returnToFocusMode"
          >
            Return
          </UButton>
        </div>

        <section class="mx-auto max-w-4xl">
          <div class="mb-3 flex items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <p class="text-sm font-black text-highlighted sm:text-base">
                  Question {{ currentIndex + 1 }} of {{ questionPayload.questionCount }}
                </p>

                <span class="text-xs font-semibold text-muted">
                  · {{ questionPayload.question.points }} {{ questionPayload.question.points === 1 ? "point" : "points" }}
                </span>

                <span
                  v-if="questionPayload.question.questionType === 'checkbox' && requiredSelections !== null"
                  class="text-xs font-semibold"
                  :class="selectionRequirementMet ? 'text-success' : 'text-primary'"
                >
                  · {{ selectedAnswerCount }}/{{ requiredSelections }} selected
                </span>
              </div>

              <p class="mt-1 text-sm text-muted">
                {{ selectionInstruction }}
              </p>
            </div>
          </div>

          <div
            v-if="questionPayload.deadlineAt"
            class="mb-4 rounded-xl border border-default bg-elevated/40 px-3 py-3 sm:px-4"
          >
            <div class="flex items-center justify-between gap-4">
              <div class="flex items-center gap-2">
                <div class="flex size-8 items-center justify-center rounded-lg bg-default text-muted">
                  <UIcon name="i-lucide-timer" class="size-4" />
                </div>
                <div>
                  <p class="text-xs font-semibold text-muted">
                    Question time
                  </p>
                  <p
                    v-if="questionTransitioning"
                    class="text-sm font-bold text-warning"
                  >
                    Time's up · moving on
                  </p>
                </div>
              </div>

              <span
                class="shrink-0 font-mono text-xl font-black tabular-nums"
                :class="{
                  'text-error': questionTimerProgress <= 20,
                  'text-warning': questionTimerProgress > 20 && questionTimerProgress <= 50,
                }"
              >
                {{ formatTime(questionSeconds) }}
              </span>
            </div>

            <UProgress
              v-if="questionPayload.question.showTimerProgress"
              class="mt-3"
              :model-value="questionTimerProgress"
              :max="100"
              :color="questionTimerColor"
              size="sm"
            />

            <div
              v-if="questionTransitioning"
              class="mt-2 flex items-center gap-2 text-xs font-semibold text-muted"
            >
              <UIcon
                v-if="isOnline"
                name="i-lucide-loader-circle"
                class="size-3.5 animate-spin text-warning"
              />
              <UIcon
                v-else
                name="i-lucide-wifi-off"
                class="size-3.5 text-warning"
              />
              <span>
                {{
                  !isOnline
                    ? "Connection lost. We'll continue automatically when you're back online."
                    : questionTimeoutRetryCount >= 1
                      ? "This is taking longer than expected. Your latest response is cached while SNCBT Assess checks the server."
                      : "Closing this question and opening the next one…"
                }}
              </span>
            </div>
          </div>

          <div ref="questionAreaRef">
            <UCard>
              <h1 class="text-xl font-black leading-tight text-highlighted sm:text-2xl lg:text-3xl">
                {{ questionPayload.question.questionText }}
              </h1>

              <img
                v-if="questionPayload.question.imageUrl"
                :src="questionPayload.question.imageUrl"
                alt="Question illustration"
                class="mt-5 max-h-80 w-full rounded-xl border border-default object-contain"
              >

              <div
                v-if="questionTransitioning"
                class="mt-7 flex min-h-44 flex-col items-center justify-center rounded-xl bg-elevated/55 px-5 text-center"
                aria-live="polite"
              >
                <div class="flex size-11 items-center justify-center rounded-full bg-warning/10 text-warning">
                  <UIcon name="i-lucide-arrow-right" class="size-5" />
                </div>
                <p class="mt-3 font-black text-highlighted">
                  Time's up
                </p>
                <p class="mt-1 max-w-sm text-sm text-muted">
                  {{
                    !isOnline
                      ? "Your latest response is cached on this device. SNCBT Assess will continue when the connection returns."
                      : questionTimeoutRetryCount >= 1
                        ? "Your latest response is cached on this device. SNCBT Assess is confirming the server state before continuing."
                        : "This question is closed. SNCBT Assess is moving you to the next question automatically."
                  }}
                </p>

                <UIcon
                  v-if="isOnline && questionTimeoutRetryCount < 1"
                  name="i-lucide-loader-circle"
                  class="mt-4 size-5 animate-spin text-primary"
                />

                <UButton
                  v-if="isOnline && questionTimeoutRetryCount >= 1"
                  class="mt-4"
                  color="neutral"
                  variant="outline"
                  icon="i-lucide-refresh-cw"
                  :loading="questionTimeoutSyncPending || questionTimeoutTriggered"
                  :disabled="isSubmitting || questionTimeoutSyncPending || questionTimeoutTriggered"
                  @click="retryExpiredQuestionNow"
                >
                  Retry now
                </UButton>
              </div>

              <template v-else>
                <div
                  v-if="isChoiceQuestion"
                  class="mt-7 grid gap-3 md:grid-cols-2"
                >
                  <button
                    v-for="(option, index) in questionPayload.question.options"
                    :key="option.id"
                    type="button"
                    class="flex min-h-18 items-center gap-3 rounded-xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-55"
                    :class="isSelected(option.id) ? 'border-primary bg-primary/10 ring-2 ring-primary/10' : 'border-default bg-default hover:border-primary/50 hover:bg-elevated'"
                    :disabled="isOptionChoiceDisabled(option.id)"
                    @click="selectOption(option.id)"
                  >
                    <span
                      class="flex size-9 shrink-0 items-center justify-center rounded-full font-black"
                      :class="isSelected(option.id) ? 'bg-primary text-white' : 'bg-elevated text-muted'"
                    >
                      {{ String.fromCharCode(65 + index) }}
                    </span>

                    <span class="font-bold text-highlighted">
                      {{ option.text }}
                    </span>
                  </button>
                </div>

                <div
                  v-else-if="questionPayload.question.questionType === 'fill_blank'"
                  class="mt-7 max-w-3xl"
                >
                  <UFormField label="Your answer">
                    <UInput
                      v-model="textResponse"
                      size="xl"
                      class="w-full"
                      placeholder="Type your answer"
                      :maxlength="1000"
                      :disabled="questionPayload.finalized || isFinalizingAnswer || questionTimeoutTriggered || questionSeconds === 0"
                      @update:model-value="markAnswerChanged"
                    />
                  </UFormField>
                </div>

                <div
                  v-else-if="isTrueFalseQuestion"
                  class="mt-7 space-y-5"
                >
                  <div class="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      class="flex min-h-18 items-center gap-3 rounded-xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-55"
                      :class="booleanResponse === true ? 'border-primary bg-primary/10 ring-2 ring-primary/10' : 'border-default bg-default hover:border-primary/50 hover:bg-elevated'"
                      :disabled="questionPayload.finalized || isFinalizingAnswer || questionTimeoutTriggered || questionSeconds === 0"
                      @click="selectBoolean(true)"
                    >
                      <UIcon name="i-lucide-circle-check" class="size-6 shrink-0 text-success" />
                      <span class="font-bold text-highlighted">True</span>
                    </button>

                    <button
                      type="button"
                      class="flex min-h-18 items-center gap-3 rounded-xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-55"
                      :class="booleanResponse === false ? 'border-primary bg-primary/10 ring-2 ring-primary/10' : 'border-default bg-default hover:border-primary/50 hover:bg-elevated'"
                      :disabled="questionPayload.finalized || isFinalizingAnswer || questionTimeoutTriggered || questionSeconds === 0"
                      @click="selectBoolean(false)"
                    >
                      <UIcon name="i-lucide-circle-x" class="size-6 shrink-0 text-error" />
                      <span class="font-bold text-highlighted">False</span>
                    </button>
                  </div>

                  <UFormField
                    v-if="questionPayload.question.questionType === 'true_false_correction' && booleanResponse === false"
                    label="Correction"
                    help="Write the correct statement or answer."
                    required
                  >
                    <UTextarea
                      v-model="textResponse"
                      :rows="4"
                      class="w-full"
                      placeholder="Write the correction"
                      :maxlength="1000"
                      :disabled="questionPayload.finalized || isFinalizingAnswer || questionTimeoutTriggered || questionSeconds === 0"
                      @update:model-value="markAnswerChanged"
                    />
                  </UFormField>
                </div>

                <div class="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                  <UButton
                    color="neutral"
                    variant="outline"
                    icon="i-lucide-arrow-left"
                    class="sm:w-auto"
                    :disabled="!questionPayload.canGoPrevious || isSaving || isFinalizingAnswer || (!questionPayload.finalized && (!selectionRequirementMet || questionTimeoutTriggered || questionSeconds === 0))"
                    @click="goPrevious"
                  >
                    Previous
                  </UButton>

                  <UButton
                    :icon="isLastQuestion ? 'i-lucide-send' : 'i-lucide-arrow-right'"
                    :loading="isSaving"
                    class="justify-center sm:w-auto"
                    :disabled="isFinalizingAnswer || (!questionPayload.finalized && (!selectionRequirementMet || questionTimeoutTriggered || questionSeconds === 0))"
                    @click="goNext"
                  >
                    {{ nextActionLabel }}
                  </UButton>
                </div>
              </template>
            </UCard>
          </div>
        </section>
      </template>
    </main>

    <ConfirmationModal
      v-model:open="
        submitModalOpen
      "
      title="Submit this assessment?"
      description="Review your progress before final submission. Your answers cannot be changed after the submission is confirmed."
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

    <UModal
      v-model:open="feedbackModalOpen"
      :dismissible="false"
      :ui="{
        content:
          'sm:max-w-sm overflow-hidden',
      }"
    >
      <template #content>
        <div
          v-if="answerFeedback"
          class="relative overflow-hidden px-6 py-8 text-center sm:px-8 sm:py-9"
        >
          <div
            class="pointer-events-none absolute inset-0"
            :class="
              answerFeedback.isCorrect
                ? 'bg-gradient-to-br from-success/14 via-transparent to-success/5'
                : 'bg-gradient-to-br from-error/14 via-transparent to-error/5'
            "
            aria-hidden="true"
          />

          <div class="relative">
            <div
              class="mx-auto flex size-20 items-center justify-center rounded-full ring-8 animate-pulse"
              :class="
                answerFeedback.isCorrect
                  ? 'bg-success/15 text-success ring-success/5'
                  : 'bg-error/15 text-error ring-error/5'
              "
            >
              <UIcon
                :name="
                  answerFeedback.isCorrect
                    ? 'i-lucide-check'
                    : 'i-lucide-x'
                "
                class="size-11 stroke-[3]"
              />
            </div>

            <h2
              class="mt-5 text-3xl font-black tracking-tight"
              :class="
                answerFeedback.isCorrect
                  ? 'text-success'
                  : 'text-error'
              "
            >
              {{
                answerFeedback.isCorrect
                  ? "Correct!"
                  : "Incorrect"
              }}
            </h2>

            <UBadge
              v-if="answerFeedback.speedBonus > 0"
              class="mt-4"
              color="primary"
              variant="soft"
              size="lg"
              icon="i-lucide-zap"
            >
              +{{ answerFeedback.speedBonus }} speed bonus
            </UBadge>

            <div
              class="mx-auto mt-6 h-1.5 max-w-36 overflow-hidden rounded-full bg-elevated"
              aria-hidden="true"
            >
              <div
                class="h-full w-full origin-left rounded-full animate-[feedback-shrink_2.2s_linear_forwards]"
                :class="
                  answerFeedback.isCorrect
                    ? 'bg-success'
                    : 'bg-error'
                "
              />
            </div>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<style>
@keyframes feedback-shrink {
  from {
    transform: scaleX(1);
  }

  to {
    transform: scaleX(0);
  }
}
</style>
