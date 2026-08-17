<script setup lang="ts">
import {
  onBeforeRouteLeave,
} from "vue-router";

import type {
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

const requiredSelections =
  computed<number | null>(
    () => {
      const payload =
        questionPayload.value;

      if (!payload) {
        return null;
      }

      if (
        payload.question
          .questionType
        === "multiple_choice"
      ) {
        return 1;
      }

      return (
        selectionLimitByQuestionId
          .value[
            payload.question.id
          ]
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

const selectionRequirementMet =
  computed(
    () => {
      if (
        questionPayload.value
          ?.finalized
      ) {
        return true;
      }

      const required =
        requiredSelections.value;

      if (required === null) {
        return false;
      }

      return (
        selectedAnswerCount.value
        === required
      );
    },
  );

const selectionInstruction =
  computed(
    () => {
      const payload =
        questionPayload.value;

      if (!payload) {
        return "";
      }

      if (
        payload.question
          .questionType
        === "multiple_choice"
      ) {
        return "Select one answer.";
      }

      const required =
        requiredSelections.value;

      if (required === null) {
        return "Loading answer-selection rules...";
      }

      return `Select exactly ${required} ${required === 1 ? "answer" : "answers"}. ${selectedAnswerCount.value} of ${required} selected.`;
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

  if (integrityEventQueue.value.length > 0) {
    persistIntegrityQueue();
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

function isOptionChoiceDisabled(
  optionId: string,
): boolean {
  if (
    !questionPayload.value
    || questionPayload.value
      .finalized
    || questionTimeoutTriggered.value
    || questionSeconds.value === 0
  ) {
    return true;
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
            ? "Your answer that was saved before the deadline has been finalized."
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

  if (!selectionRequirementMet.value) {
    toast.add({
      title: "Complete the required selections",
      description: selectionInstruction.value,
      color: "warning",
    });

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

  if (!selectionRequirementMet.value) {
    toast.add({
      title: "Complete the required selections",
      description: selectionInstruction.value,
      color: "warning",
    });

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

          <UBadge
            v-if="integrityMonitoringActive"
            :color="focusModeExited ? 'warning' : 'info'"
            variant="soft"
          >
            <UIcon
              :name="focusModeExited ? 'i-lucide-shield-alert' : 'i-lucide-shield-check'"
              class="mr-1 size-3.5"
            />
            {{
              focusModeExited
                ? "Focus Mode exited"
                : "Activity monitoring"
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

      <UCard
        v-if="focusGateRequired"
        class="mx-auto max-w-2xl"
      >
        <div class="py-5 text-center">
          <div class="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <UIcon
              name="i-lucide-scan"
              class="size-7"
            />
          </div>

          <h1 class="mt-4 text-2xl font-black text-highlighted">
            Enter Focus Mode
          </h1>

          <p class="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted">
            This assessment uses activity monitoring. Focus Mode helps keep the assessment active and records when you leave fullscreen or switch away from the assessment. These records do not automatically change your score.
          </p>

          <UAlert
            class="mt-5 text-left"
            color="info"
            variant="soft"
            icon="i-lucide-timer-reset"
            title="Your question timer has not started yet"
            description="The first question will be delivered only after you enter Focus Mode."
          />

          <UButton
            class="mt-5"
            size="xl"
            icon="i-lucide-maximize"
            @click="enterFocusModeAndContinue"
          >
            Enter Focus Mode and Begin
          </UButton>
        </div>
      </UCard>

      <div
        v-else-if="isLoading"
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
        <div
          v-if="focusModeExited"
          class="mb-4 flex flex-col gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="flex items-start gap-3">
            <UIcon
              name="i-lucide-shield-alert"
              class="mt-0.5 size-5 shrink-0 text-warning"
            />
            <div>
              <p class="font-bold text-highlighted">
                Focus Mode is not active
              </p>
              <p class="mt-1 text-sm text-muted">
                The fullscreen session was exited and the event was recorded. The question timer continues while Focus Mode is inactive.
              </p>
            </div>
          </div>

          <UButton
            v-if="fullscreenSupported"
            color="warning"
            variant="soft"
            icon="i-lucide-maximize"
            class="shrink-0"
            @click="returnToFocusMode"
          >
            Return to Focus Mode
          </UButton>
        </div>

        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="font-black text-highlighted">
              Question
              {{ currentIndex + 1 }}
              of
              {{ questionPayload.questionCount }}
            </p>

            <p class="mt-1 text-sm text-muted">
              {{ selectionInstruction }}
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
              v-if="
                questionPayload.question.questionType
                === 'checkbox'
                && requiredSelections !== null
              "
              :color="
                selectionRequirementMet
                  ? 'success'
                  : 'primary'
              "
              variant="soft"
            >
              {{ selectedAnswerCount }} / {{ requiredSelections }} selected
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
                This question has its own timer. When time runs out, the question closes and you move to the next question.
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
            This question is closed. You can review it and move to another question.
          </p>

          <p
            v-else-if="
              questionTimeoutSyncPending
              && questionSeconds === 0
            "
            class="mt-2 text-xs font-semibold text-warning"
          >
            Time expired. Saving the question and preparing the next one...
          </p>

          <p
            v-else-if="
              questionTimeoutRetryCount > 0
              && questionSeconds === 0
            "
            class="mt-2 text-xs font-semibold text-warning"
          >
            Time expired. We couldn't confirm the question yet, so SNCBT Assess is retrying automatically. Keep this page open.
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

        <div ref="questionAreaRef">
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
              class="flex min-h-20 items-center gap-4 rounded-xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-55"
              :class="
                isSelected(
                  option.id,
                )
                  ? 'border-primary bg-primary/10 ring-3 ring-primary/10'
                  : 'border-default bg-default hover:border-primary/50 hover:bg-elevated'
              "
              :disabled="
                isOptionChoiceDisabled(
                  option.id,
                )
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
                    !selectionRequirementMet
                    || questionTimeoutTriggered
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
                  !selectionRequirementMet
                  || questionTimeoutTriggered
                  || questionSeconds === 0
                )
              "
              @click="goNext"
            >
              {{ nextActionLabel }}
            </UButton>
          </div>
          </UCard>
        </div>
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
  </div>
</template>
