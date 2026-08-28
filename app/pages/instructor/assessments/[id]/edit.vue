<script setup lang="ts">
import type {
  AssessmentWithClassroom,
} from "~/types/assessment";

import type {
  AssessmentQuestion,
  AssessmentQuestionType,
  QuestionEditorInput,
  QuestionOptionInput,
} from "~/types/question";

import {
  assessmentQuestionTypeLabel,
  isChoiceQuestionType,
  isTrueFalseQuestionType,
} from "~/types/question";

definePageMeta({
  layout: "instructor",
});

useSeoMeta({
  title: "Question builder",
});

const route = useRoute();
const toast = useToast();

const assessmentId = computed(
  () =>
    String(
      route.params.id,
    ),
);

const {
  getInstructorAssessment,
  publishAssessment,
  returnAssessmentToDraft,
} = useAssessments();

const {
  listQuestions,
  createQuestion,
  updateQuestion,
  duplicateQuestion,
  deleteQuestion,
  reorderQuestions,
  updateAllQuestionTimerSettings,
  validateForPublish,
} = useQuestions();

const assessment =
  ref<AssessmentWithClassroom | null>(
    null,
  );

const questions =
  ref<AssessmentQuestion[]>([]);

const selectedQuestionId =
  ref<string | null>(null);

const isCreating = ref(true);
const isLoading = ref(true);
const isSaving = ref(false);
const isRunningAction = ref(false);
const isApplyingGeneralTimerSettings = ref(false);
const errorMessage = ref("");
const formError = ref("");

const deleteModalOpen = ref(false);
const duplicateModalOpen = ref(false);
const publishModalOpen = ref(false);
const feedbackModalOpen = ref(false);
const revisionModalOpen = ref(false);

type FeedbackTone =
  | "primary"
  | "success"
  | "warning"
  | "error"
  | "neutral";

const feedback = reactive<{
  title: string;
  description: string;
  icon: string;
  color: FeedbackTone;
}>({
  title: "Notice",
  description: "",
  icon: "i-lucide-info",
  color: "primary",
});

function showFeedback(
  title: string,
  description: string,
  color: FeedbackTone = "primary",
  icon = "i-lucide-info",
): void {
  feedback.title = title;
  feedback.description = description;
  feedback.color = color;
  feedback.icon = icon;
  feedbackModalOpen.value = true;
}

function friendlyError(
  message: string | null | undefined,
  fallback: string,
): string {
  const normalized = String(
    message || "",
  ).toLowerCase();

  if (
    normalized.includes(
      "attempt_question_states",
    )
    || normalized.includes(
      "attempt_answers",
    )
    || normalized.includes(
      "foreign key constraint",
    )
    || normalized.includes(
      "already been included in a student attempt",
    )
    || normalized.includes(
      "already part of a student attempt",
    )
    || normalized.includes(
      "already been used in a student assessment",
    )
    || normalized.includes(
      "editable revision",
    )
  ) {
    return "This assessment already has Student history. Create an editable revision so previous results remain unchanged while you edit and republish the new draft.";
  }

  if (
    normalized.includes(
      "only draft",
    )
    || normalized.includes(
      "not draft",
    )
  ) {
    return "This assessment is no longer editable. Return it to draft from Assessment Settings before changing its questions.";
  }

  if (
    normalized.includes(
      "failed to fetch",
    )
    || normalized.includes(
      "network",
    )
    || normalized.includes(
      "connection",
    )
  ) {
    return "The request could not be completed. Check your internet connection, then try again.";
  }

  if (
    normalized.includes(
      "not found",
    )
  ) {
    return "The selected question or assessment is no longer available. Refresh the page and try again.";
  }

  return fallback;
}

function isHistoryLocked(
  code: string | null | undefined,
  message: string | null | undefined,
): boolean {
  const normalized = String(
    message || "",
  ).toLowerCase();

  return (
    code === "QUESTION_HISTORY_LOCKED"
    || code === "ASSESSMENT_HISTORY_LOCKED"
    || normalized.includes(
      "already been used in a student assessment",
    )
    || normalized.includes(
      "previous student results must remain accurate",
    )
    || normalized.includes(
      "editable revision",
    )
  );
}

function requestEditableRevision(): void {
  feedbackModalOpen.value = false;
  deleteModalOpen.value = false;
  duplicateModalOpen.value = false;
  revisionModalOpen.value = true;
}

async function createEditableRevision(): Promise<void> {
  if (!assessment.value) {
    return;
  }

  isRunningAction.value = true;

  const result =
    await returnAssessmentToDraft(
      assessment.value.id,
    );

  if (
    result.error
    || !result.data
  ) {
    revisionModalOpen.value = false;

    showFeedback(
      "Editable draft was not created",
      friendlyError(
        result.error,
        "SNCBT Assess could not create a safe editable revision. Please try again.",
      ),
      "error",
      "i-lucide-circle-alert",
    );

    isRunningAction.value = false;
    return;
  }

  revisionModalOpen.value = false;

  toast.add({
    title: result.data.createdRevision
      ? "Editable revision created"
      : "Assessment ready to edit",
    description: result.data.message,
    color: "success",
  });

  await navigateTo(
    `/instructor/assessments/${result.data.assessment.id}/edit`,
  );
}

const editor = reactive<{
  questionType: AssessmentQuestionType;
  questionText: string;
  imageUrl: string;
  explanation: string;
  points: number;
  timeLimitEnabled: boolean;
  timeLimitSeconds: number;
  showTimerProgress: boolean;
  options: QuestionOptionInput[];
  acceptedAnswersText: string;
  correctBoolean: boolean | null;
}>({
  questionType:
    "multiple_choice",
  questionText:
    "",
  imageUrl:
    "",
  explanation:
    "",
  points:
    1,
  timeLimitEnabled:
    true,
  timeLimitSeconds:
    30,
  showTimerProgress:
    true,
  options: [
    {
      text: "",
      isCorrect: true,
    },
    {
      text: "",
      isCorrect: false,
    },
  ],
  acceptedAnswersText:
    "",
  correctBoolean:
    null,
});

const generalTimerSettings = reactive({
  timeLimitEnabled: true,
  timeLimitSeconds: 30,
  showTimerProgress: true,
});

const selectedQuestion = computed(
  () =>
    questions.value.find(
      (question) =>
        question.id
        === selectedQuestionId.value,
    )
    || null,
);

const isDraft = computed(
  () =>
    assessment.value?.status
    === "draft",
);

const isChoiceQuestion = computed(
  () =>
    isChoiceQuestionType(
      editor.questionType,
    ),
);

const isTrueFalseQuestion = computed(
  () =>
    isTrueFalseQuestionType(
      editor.questionType,
    ),
);

const totalPoints = computed(
  () =>
    questions.value.reduce(
      (
        total,
        question,
      ) =>
        total
        + Number(
          question.points,
        ),
      0,
    ),
);

const timedQuestionCount = computed(
  () =>
    questions.value.filter(
      (question) =>
        question.time_limit_seconds
        !== null,
    ).length,
);

const estimatedMinutes = computed(
  () =>
    Math.ceil(
      questions.value.reduce(
        (
          total,
          question,
        ) =>
          total
          + (question.time_limit_seconds ?? 0),
        0,
      )
      / 60,
    ),
);

const customTimerQuestionCount = computed(
  () =>
    questions.value.filter(
      (question) =>
        question.time_limit_seconds
          !== (
            generalTimerSettings.timeLimitEnabled
              ? Number(
                  generalTimerSettings.timeLimitSeconds,
                )
              : null
          )
        || (question.show_timer_progress ?? true)
          !== generalTimerSettings.showTimerProgress,
    ).length,
);

const allQuestionsUseGeneralTimerSettings = computed(
  () =>
    questions.value.length > 0
    && customTimerQuestionCount.value === 0,
);

const duplicateOptionWarning = computed(() => {
  if (!isChoiceQuestion.value) {
    return false;
  }

  const normalized =
    editor.options
      .map(
        (option) =>
          option.text
            .trim()
            .toLowerCase(),
      )
      .filter(Boolean);

  return (
    new Set(
      normalized,
    ).size
    !== normalized.length
  );
});

function syncGeneralTimerSettingsFromAssessment(): void {
  if (!assessment.value) {
    return;
  }

  const configuredSeconds =
    assessment.value
      .default_question_time_limit_seconds;

  generalTimerSettings.timeLimitEnabled =
    configuredSeconds !== null
    && configuredSeconds !== undefined;

  generalTimerSettings.timeLimitSeconds =
    configuredSeconds
    ?? 30;

  generalTimerSettings.showTimerProgress =
    assessment.value
      .default_show_timer_progress
    ?? true;
}

async function applyGeneralTimerSettings(): Promise<void> {
  if (
    !assessment.value
    || !isDraft.value
  ) {
    return;
  }

  if (
    generalTimerSettings.timeLimitEnabled
    && (
      Number(
        generalTimerSettings.timeLimitSeconds,
      ) < 5
      || Number(
        generalTimerSettings.timeLimitSeconds,
      ) > 3600
    )
  ) {
    showFeedback(
      "Check the answer time",
      "Use a value from 5 to 3600 seconds, or turn Answer time off for no per-question limit.",
      "warning",
      "i-lucide-timer-reset",
    );
    return;
  }

  isApplyingGeneralTimerSettings.value = true;

  const timeLimitSeconds =
    generalTimerSettings.timeLimitEnabled
      ? Number(
          generalTimerSettings.timeLimitSeconds,
        )
      : null;

  const result =
    await updateAllQuestionTimerSettings(
      assessment.value.id,
      {
        timeLimitSeconds,
        showTimerProgress:
          generalTimerSettings.showTimerProgress,
      },
    );

  if (
    result.error
    || !result.data
  ) {
    if (
      isHistoryLocked(
        result.code,
        result.error,
      )
    ) {
      isApplyingGeneralTimerSettings.value = false;
      requestEditableRevision();
      return;
    }

    showFeedback(
      "Timer settings were not applied",
      friendlyError(
        result.error,
        "The all-question timer settings could not be applied. Please try again.",
      ),
      "error",
      "i-lucide-circle-alert",
    );

    isApplyingGeneralTimerSettings.value = false;
    return;
  }

  assessment.value = {
    ...assessment.value,
    default_question_time_limit_seconds:
      timeLimitSeconds,
    default_show_timer_progress:
      generalTimerSettings.showTimerProgress,
  };

  questions.value =
    questions.value.map(
      (question) => ({
        ...question,
        time_limit_seconds:
          timeLimitSeconds,
        show_timer_progress:
          generalTimerSettings.showTimerProgress,
      }),
    );

  editor.timeLimitEnabled =
    generalTimerSettings.timeLimitEnabled;

  editor.timeLimitSeconds =
    generalTimerSettings.timeLimitSeconds;

  editor.showTimerProgress =
    generalTimerSettings.showTimerProgress;

  toast.add({
    title: "All-question timer settings applied",
    description: result.data.message,
    color: "success",
  });

  isApplyingGeneralTimerSettings.value = false;
}

function emptyOptions(): QuestionOptionInput[] {
  return [
    {
      text: "",
      isCorrect: true,
    },
    {
      text: "",
      isCorrect: false,
    },
  ];
}

function acceptedAnswersFromEditor(): string[] {
  const normalized =
    editor.acceptedAnswersText
      .split(/\r?\n|\|/g)
      .map(
        (answer) =>
          answer
            .trim()
            .replace(/\s+/g, " "),
      )
      .filter(Boolean);

  return [
    ...new Map(
      normalized.map(
        (answer) => [
          answer.toLowerCase(),
          answer,
        ],
      ),
    ).values(),
  ];
}

function scrollToGeneralTimerSettings(): void {
  document
    .getElementById(
      "all-question-timer-settings",
    )
    ?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
}

function startNewQuestion(): void {
  selectedQuestionId.value =
    null;

  isCreating.value =
    true;

  editor.questionType =
    "multiple_choice";

  editor.questionText =
    "";

  editor.imageUrl =
    "";

  editor.explanation =
    "";

  editor.points =
    1;

  editor.timeLimitEnabled =
    generalTimerSettings.timeLimitEnabled;

  editor.timeLimitSeconds =
    generalTimerSettings.timeLimitSeconds;

  editor.showTimerProgress =
    generalTimerSettings.showTimerProgress;

  editor.options =
    emptyOptions();

  editor.acceptedAnswersText =
    "";

  editor.correctBoolean =
    null;

  formError.value =
    "";

  nextTick(() => {
    document
      .getElementById("active-question-editor")
      ?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
  });
}

function selectQuestion(
  question: AssessmentQuestion,
): void {
  selectedQuestionId.value =
    question.id;

  isCreating.value =
    false;

  editor.questionType =
    question.question_type;

  editor.questionText =
    question.question_text;

  editor.imageUrl =
    question.image_url
    || "";

  editor.explanation =
    question.explanation
    || "";

  editor.points =
    Number(
      question.points,
    );

  editor.timeLimitEnabled =
    question.time_limit_seconds
    !== null;

  editor.timeLimitSeconds =
    question.time_limit_seconds
    ?? 30;

  editor.showTimerProgress =
    question.show_timer_progress
    ?? true;

  editor.options =
    question.options.length > 0
      ? question.options.map(
          (option) => ({
            text:
              option.option_text,

            isCorrect:
              option.is_correct,
          }),
        )
      : emptyOptions();

  editor.acceptedAnswersText =
    (
      question.accepted_answers
      ?? []
    ).join("\n");

  editor.correctBoolean =
    question.correct_boolean
    ?? null;

  formError.value =
    "";
}





function validateEditor(): string | null {
  if (
    !editor.questionText.trim()
  ) {
    return "Question text is required.";
  }

  if (isChoiceQuestion.value) {
    if (
      editor.options.length < 2
      || editor.options.length > 5
    ) {
      return "Add two to five choices.";
    }

    if (
      editor.options.some(
        (option) =>
          !option.text.trim(),
      )
    ) {
      return "Every choice requires text.";
    }

    if (duplicateOptionWarning.value) {
      return "Each answer choice must use different text.";
    }

    const correctCount =
      editor.options.filter(
        (option) =>
          option.isCorrect,
      ).length;

    if (
      editor.questionType
        === "multiple_choice"
      && correctCount !== 1
    ) {
      return "Multiple Choice requires exactly one correct choice.";
    }

    if (
      editor.questionType
        === "checkbox"
      && correctCount < 1
    ) {
      return "Checkbox requires at least one correct choice.";
    }
  }

  const acceptedAnswers =
    acceptedAnswersFromEditor();

  if (
    editor.questionType
      === "fill_blank"
    && acceptedAnswers.length < 1
  ) {
    return "Fill in the Blanks requires at least one accepted answer.";
  }

  if (
    acceptedAnswers.length > 10
  ) {
    return "Use no more than 10 accepted text answers.";
  }

  if (
    acceptedAnswers.some(
      (answer) =>
        answer.length > 500,
    )
  ) {
    return "Each accepted text answer must not exceed 500 characters.";
  }

  if (
    isTrueFalseQuestion.value
    && editor.correctBoolean
      === null
  ) {
    return "Select whether the statement is True or False.";
  }

  if (
    editor.questionType
      === "true_false_correction"
    && editor.correctBoolean
      === false
    && acceptedAnswers.length < 1
  ) {
    return "When False is the correct answer, add at least one accepted correction or correct answer.";
  }

  if (
    Number(
      editor.points,
    ) <= 0
  ) {
    return "Question points must be greater than zero.";
  }

  if (
    editor.timeLimitEnabled
    && (
      Number(
        editor.timeLimitSeconds,
      ) < 5
      || Number(
        editor.timeLimitSeconds,
      ) > 3600
    )
  ) {
    return "Question time must be between 5 and 3600 seconds, or turn Answer time off for no per-question limit.";
  }

  if (
    editor.imageUrl.trim()
  ) {
    try {
      new URL(
        editor.imageUrl.trim(),
      );
    } catch {
      return "Enter a valid image URL.";
    }
  }

  return null;
}

function getEditorPayload(): QuestionEditorInput {
  const acceptedAnswers =
    acceptedAnswersFromEditor();

  return {
    questionType:
      editor.questionType,

    questionText:
      editor.questionText.trim(),

    imageUrl:
      editor.imageUrl.trim()
      || null,

    explanation:
      editor.explanation.trim()
      || null,

    points:
      Number(
        editor.points,
      ),

    timeLimitSeconds:
      editor.timeLimitEnabled
        ? Number(
            editor.timeLimitSeconds,
          )
        : null,

    showTimerProgress:
      editor.showTimerProgress,

    options:
      isChoiceQuestion.value
        ? editor.options.map(
            (option) => ({
              text:
                option.text.trim(),

              isCorrect:
                option.isCorrect,
            }),
          )
        : [],

    acceptedAnswers:
      editor.questionType
        === "fill_blank"
        || (
          editor.questionType
            === "true_false_correction"
          && editor.correctBoolean
            === false
        )
        ? acceptedAnswers
        : [],

    correctBoolean:
      isTrueFalseQuestion.value
        ? editor.correctBoolean
        : null,
  };
}

async function loadData(
  preserveSelection = true,
): Promise<void> {
  isLoading.value =
    true;

  errorMessage.value =
    "";

  const [
    assessmentResult,
    questionResult,
  ] = await Promise.all([
    getInstructorAssessment(
      assessmentId.value,
    ),

    listQuestions(
      assessmentId.value,
    ),
  ]);

  if (
    assessmentResult.error
    || !assessmentResult.data
  ) {
    errorMessage.value = friendlyError(
      assessmentResult.error,
      "The assessment could not be opened. Please try again.",
    );

    showFeedback(
      "Assessment could not be opened",
      errorMessage.value,
      "error",
      "i-lucide-circle-alert",
    );

    isLoading.value =
      false;

    return;
  }

  if (
    questionResult.error
    || !questionResult.data
  ) {
    errorMessage.value = friendlyError(
      questionResult.error,
      "The questions could not be loaded. Please try again.",
    );

    showFeedback(
      "Questions could not be loaded",
      errorMessage.value,
      "error",
      "i-lucide-circle-alert",
    );

    isLoading.value =
      false;

    return;
  }

  assessment.value =
    assessmentResult.data.assessment;

  syncGeneralTimerSettingsFromAssessment();

  questions.value =
    questionResult.data.questions;

  const existingSelection =
    preserveSelection
      ? questions.value.find(
          (question) =>
            question.id
            === selectedQuestionId.value,
        )
      : null;

  if (existingSelection) {
    selectQuestion(
      existingSelection,
    );
  } else if (
    questions.value.length > 0
  ) {
    selectQuestion(
      questions.value[0],
    );
  } else {
    startNewQuestion();
  }

  isLoading.value =
    false;
}

async function save(): Promise<void> {
  if (!isDraft.value) {
    return;
  }

  const validationMessage =
    validateEditor();

  if (validationMessage) {
    formError.value =
      validationMessage;

    showFeedback(
      "Complete the question",
      validationMessage,
      "warning",
      "i-lucide-list-checks",
    );

    return;
  }

  isSaving.value = true;
  formError.value = "";

  const payload = getEditorPayload();
  const wasCreating = isCreating.value;

  let result;

  if (wasCreating) {
    result = await createQuestion(
      assessmentId.value,
      payload,
    );
  } else {
    const questionId =
      selectedQuestionId.value;

    if (!questionId) {
      formError.value =
        "Select a saved question before updating it.";

      showFeedback(
        "Select a question",
        formError.value,
        "warning",
        "i-lucide-mouse-pointer-click",
      );

      isSaving.value = false;
      return;
    }

    result = await updateQuestion(
      assessmentId.value,
      questionId,
      payload,
    );
  }

  if (result.error || !result.data) {
    if (
      isHistoryLocked(
        result.code,
        result.error,
      )
    ) {
      formError.value = "";
      isSaving.value = false;
      requestEditableRevision();
      return;
    }

    formError.value = friendlyError(
      result.error,
      "The question could not be saved. Review the information and try again.",
    );

    showFeedback(
      "Question was not saved",
      formError.value,
      "error",
      "i-lucide-circle-alert",
    );

    isSaving.value = false;
    return;
  }

  const savedQuestion =
    result.data.question;

  if (wasCreating) {
    questions.value = [
      ...questions.value,
      savedQuestion,
    ].sort(
      (first, second) =>
        first.order_number
        - second.order_number,
    );
  } else {
    const questionIndex =
      questions.value.findIndex(
        (question) =>
          question.id
          === savedQuestion.id,
      );

    if (questionIndex >= 0) {
      questions.value.splice(
        questionIndex,
        1,
        savedQuestion,
      );
    }
  }

  // Keep the editor and card list in sync locally. This avoids the old
  // full list refetch that made the question cards visibly reload.
  selectQuestion(savedQuestion);

  duplicateModalOpen.value = false;

  toast.add({
    title: wasCreating
      ? "Question added"
      : "Question saved",
    description: result.data.message,
    color: "success",
  });

  isSaving.value = false;
}

function requestDuplicateSelected(): void {
  if (
    !selectedQuestion.value
    || !isDraft.value
  ) {
    return;
  }

  duplicateModalOpen.value = true;
}

async function duplicateSelected(): Promise<void> {
  if (
    !selectedQuestion.value
    || !isDraft.value
  ) {
    return;
  }

  isRunningAction.value = true;

  const result =
    await duplicateQuestion(
      selectedQuestion.value.id,
    );

  if (
    result.error
    || !result.data
  ) {
    if (
      isHistoryLocked(
        result.code,
        result.error,
      )
    ) {
      isRunningAction.value = false;
      requestEditableRevision();
      return;
    }

    duplicateModalOpen.value = false;

    showFeedback(
      "Question was not duplicated",
      friendlyError(
        result.error,
        "The question could not be copied. Please try again.",
      ),
      "error",
      "i-lucide-circle-alert",
    );

    isRunningAction.value = false;
    return;
  }

  const duplicatedQuestion =
    result.data.question;

  questions.value = [
    ...questions.value,
    duplicatedQuestion,
  ].sort(
    (first, second) =>
      first.order_number
      - second.order_number,
  );

  selectQuestion(
    duplicatedQuestion,
  );

  duplicateModalOpen.value = false;

  toast.add({
    title: "Question duplicated",
    description: result.data.message,
    color: "success",
  });

  isRunningAction.value = false;
}

function requestRemoveSelected(): void {
  if (
    !selectedQuestion.value
    || !isDraft.value
  ) {
    return;
  }

  deleteModalOpen.value = true;
}

async function removeSelected(): Promise<void> {
  if (
    !selectedQuestion.value
    || !isDraft.value
  ) {
    return;
  }

  const removedQuestionId =
    selectedQuestion.value.id;

  const removedIndex =
    questions.value.findIndex(
      (question) =>
        question.id
        === removedQuestionId,
    );

  isRunningAction.value = true;

  const result =
    await deleteQuestion(
      removedQuestionId,
    );

  if (
    result.error
    || !result.data
  ) {
    if (
      isHistoryLocked(
        result.code,
        result.error,
      )
    ) {
      isRunningAction.value = false;
      requestEditableRevision();
      return;
    }

    deleteModalOpen.value = false;

    showFeedback(
      "Question was not deleted",
      friendlyError(
        result.error,
        "The question could not be deleted. Please try again.",
      ),
      "error",
      "i-lucide-circle-alert",
    );

    isRunningAction.value = false;
    return;
  }

  questions.value =
    questions.value.filter(
      (question) =>
        question.id
        !== removedQuestionId,
    );

  deleteModalOpen.value = false;

  const nextQuestion =
    questions.value[
      Math.min(
        Math.max(removedIndex, 0),
        questions.value.length - 1,
      )
    ];

  if (nextQuestion) {
    selectQuestion(nextQuestion);
  } else {
    startNewQuestion();
  }

  toast.add({
    title: "Question deleted",
    description: result.data.message,
    color: "success",
  });

  isRunningAction.value = false;
}

async function moveQuestion(
  index: number,
  direction: -1 | 1,
): Promise<void> {
  if (!isDraft.value) {
    return;
  }

  const targetIndex =
    index + direction;

  if (
    targetIndex < 0
    || targetIndex
      >= questions.value.length
  ) {
    return;
  }

  const previousOrder = [
    ...questions.value,
  ];

  const reordered = [
    ...questions.value,
  ];

  const [moved] = reordered.splice(
    index,
    1,
  );

  reordered.splice(
    targetIndex,
    0,
    moved,
  );

  questions.value =
    reordered.map(
      (question, questionIndex) => ({
        ...question,
        order_number:
          questionIndex + 1,
      }),
    );

  const result =
    await reorderQuestions(
      assessmentId.value,
      questions.value.map(
        (question) =>
          question.id,
      ),
    );

  if (
    result.error
    || !result.data
  ) {
    questions.value =
      previousOrder;

    if (
      isHistoryLocked(
        result.code,
        result.error,
      )
    ) {
      requestEditableRevision();
      return;
    }

    showFeedback(
      "Question order was not saved",
      friendlyError(
        result.error,
        "The question could not be moved. The previous order has been restored.",
      ),
      "error",
      "i-lucide-circle-alert",
    );
  }
}

function requestPublish(): void {
  if (
    !assessment.value
    || !isDraft.value
  ) {
    return;
  }

  publishModalOpen.value = true;
}

async function publish(): Promise<void> {
  if (
    !assessment.value
    || !isDraft.value
  ) {
    return;
  }

  isRunningAction.value =
    true;

  const validation =
    await validateForPublish(
      assessment.value.id,
    );

  if (
    validation.error
    || !validation.data
  ) {
    publishModalOpen.value = false;

    showFeedback(
      "Assessment is not ready",
      friendlyError(
        validation.error,
        "Review every question and make sure each one has a complete answer configuration, points, and a time limit.",
      ),
      "warning",
      "i-lucide-list-checks",
    );

    isRunningAction.value =
      false;

    return;
  }

  const result =
    await publishAssessment(
      assessment.value.id,
    );

  if (
    result.error
    || !result.data
  ) {
    publishModalOpen.value = false;

    showFeedback(
      "Assessment was not published",
      friendlyError(
        result.error,
        "The assessment could not be published. Please review the questions and try again.",
      ),
      "error",
      "i-lucide-circle-alert",
    );

    isRunningAction.value =
      false;

    return;
  }

  publishModalOpen.value = false;

  toast.add({
    title:
      "Assessment published",
    description:
      result.data.message,
    color:
      "success",
  });

  assessment.value = {
    ...assessment.value,
    ...result.data.assessment,
  };

  isRunningAction.value =
    false;
}

async function handleQuestionsImported(): Promise<void> {
  const result =
    await listQuestions(
      assessmentId.value,
    );

  if (result.error || !result.data) {
    showFeedback(
      "Imported questions need a refresh",
      friendlyError(
        result.error,
        "The questions were imported, but the updated list could not be refreshed. Reload the page to see the new questions.",
      ),
      "warning",
      "i-lucide-refresh-cw",
    );
    return;
  }

  questions.value =
    result.data.questions;

  const existingSelection =
    questions.value.find(
      (question) =>
        question.id
        === selectedQuestionId.value,
    );

  if (existingSelection) {
    selectQuestion(existingSelection);
  } else if (questions.value.length > 0) {
    selectQuestion(
      questions.value[questions.value.length - 1],
    );
  } else {
    startNewQuestion();
  }
}

onMounted(
  () =>
    loadData(
      false,
    ),
);
</script>

<template>
  <div class="page-stack">
    <PageHeader
      :breadcrumbs="[
        { label: 'Overview', to: '/instructor/dashboard', icon: 'i-lucide-layout-dashboard' },
        { label: 'Assessments', to: '/instructor/assessments' },
        { label: assessment?.title || 'Assessment' },
        { label: 'Questions' },
      ]"
      eyebrow="Questions"
      :title="assessment?.title || 'Assessment questions'"
      description="Build, organize, and import questions in one continuous workspace."
    >
      <template #actions>
        <UButton
          :to="`/instructor/assessments/${assessmentId}/settings`"
          color="neutral"
          variant="outline"
          icon="i-lucide-settings-2"
        >
          Settings
        </UButton>

        <UButton
          :to="`/instructor/assessments/${assessmentId}/preview`"
          color="neutral"
          variant="outline"
          icon="i-lucide-eye"
        >
          Preview
        </UButton>

        <UButton
          v-if="isDraft"
          color="success"
          icon="i-lucide-send"
          :loading="isRunningAction"
          :disabled="questions.length === 0"
          @click="requestPublish"
        >
          Publish Assessment
        </UButton>
      </template>
    </PageHeader>

    <AssessmentWorkspaceNavigation
      :assessment-id="assessmentId"
      active="questions"
    />

    <div
      v-if="assessment && !isDraft"
      class="flex items-start gap-3 rounded-xl border border-default bg-elevated/60 p-4"
    >
      <div class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <UIcon
          :name="assessment.status === 'published' ? 'i-lucide-circle-check' : 'i-lucide-archive'"
          class="size-5"
        />
      </div>

      <div>
        <p class="font-bold text-highlighted">
          {{ assessment.status === 'published' ? 'Published assessment' : 'Archived assessment' }}
        </p>
        <p class="mt-1 text-sm text-muted">
          Questions are view-only. Return the assessment to draft from Settings before editing.
        </p>
      </div>
    </div>

    <div
      v-if="isLoading"
      class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]"
    >
      <div class="space-y-4">
        <USkeleton class="h-[520px] rounded-xl" />
        <USkeleton class="h-32 rounded-xl" />
      </div>
      <div class="space-y-4">
        <USkeleton class="h-64 rounded-xl" />
        <USkeleton class="h-64 rounded-xl" />
      </div>
    </div>

    <EmptyPanel
      v-else-if="errorMessage"
      icon="i-lucide-circle-alert"
      title="Question builder unavailable"
      description="The assessment could not be opened. Try loading the page again."
    >
      <template #actions>
        <UButton
          icon="i-lucide-refresh-cw"
          @click="loadData(false)"
        >
          Try Again
        </UButton>
      </template>
    </EmptyPanel>

    <div
      v-else-if="assessment"
      class="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]"
    >
      <main class="min-w-0 space-y-4">
        <div class="flex flex-col gap-3 rounded-xl border border-default bg-default/80 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div class="flex items-center gap-2">
              <h2 class="font-black text-highlighted">
                Questions
              </h2>
              <UBadge color="neutral" variant="soft">
                {{ questions.length }}
              </UBadge>
            </div>
            <p class="mt-1 text-sm text-muted">
              Select any card to edit it. Changes update without reloading the question list.
            </p>
          </div>

          <div
            v-if="isDraft"
            class="flex flex-wrap items-center gap-2"
          >
            <UButton
              color="neutral"
              variant="soft"
              icon="i-lucide-timer-reset"
              @click="scrollToGeneralTimerSettings"
            >
              Timer setup
            </UButton>

            <UButton
              icon="i-lucide-plus"
              @click="startNewQuestion"
            >
              Add question
            </UButton>
          </div>
        </div>

        <template
          v-for="(question, index) in questions"
          :key="question.id"
        >
          <div
            v-if="!isCreating && selectedQuestionId === question.id"
            id="active-question-editor"
          >
            <AssessmentQuestionEditorCard
              :key="question.id"
              :editor="editor"
              :question-number="index + 1"
              :is-creating="false"
              :is-draft="isDraft"
              :is-saving="isSaving"
              :is-running-action="isRunningAction"
              :form-error="formError"
              @save="save"
              @duplicate="requestDuplicateSelected"
              @delete="requestRemoveSelected"
            />
          </div>

          <UCard
            v-else
            class="transition hover:border-primary/45 hover:shadow-sm"
            :ui="{
              body: 'p-0 sm:p-0',
            }"
          >
            <button
              type="button"
              class="flex w-full items-start gap-4 px-5 py-5 text-left sm:px-6"
              :aria-label="`Edit question ${index + 1}: ${question.question_text}`"
              @click="selectQuestion(question)"
            >
              <span class="flex size-9 shrink-0 items-center justify-center rounded-full bg-elevated text-sm font-black text-muted">
                {{ index + 1 }}
              </span>

              <div class="min-w-0 flex-1">
                <p class="line-clamp-2 font-semibold leading-6 text-highlighted">
                  {{ question.question_text }}
                </p>
                <div class="mt-2 flex flex-wrap items-center gap-2">
                  <UBadge color="neutral" variant="soft" size="sm">
                    {{ assessmentQuestionTypeLabel(question.question_type) }}
                  </UBadge>
                  <span class="text-xs text-muted">
                    {{ question.points }} pt{{ Number(question.points) === 1 ? '' : 's' }}
                  </span>
                  <span class="text-xs text-muted">·</span>
                  <span class="text-xs text-muted">
                    {{
                      question.time_limit_seconds === null
                        ? "No time limit"
                        : `${question.time_limit_seconds} sec`
                    }}
                  </span>
                  <template
                    v-if="question.time_limit_seconds !== null && !question.show_timer_progress"
                  >
                    <span class="text-xs text-muted">·</span>
                    <span class="text-xs text-muted">
                      Progress hidden
                    </span>
                  </template>
                </div>
              </div>

              <UIcon
                name="i-lucide-pencil"
                class="mt-1 size-4 shrink-0 text-muted"
              />
            </button>

            <div
              v-if="isDraft"
              class="flex justify-end gap-1 border-t border-default px-4 py-2"
            >
              <UButton
                color="neutral"
                variant="ghost"
                size="xs"
                icon="i-lucide-arrow-up"
                :disabled="index === 0"
                :aria-label="`Move question ${index + 1} up`"
                @click="moveQuestion(index, -1)"
              />
              <UButton
                color="neutral"
                variant="ghost"
                size="xs"
                icon="i-lucide-arrow-down"
                :disabled="index === questions.length - 1"
                :aria-label="`Move question ${index + 1} down`"
                @click="moveQuestion(index, 1)"
              />
            </div>
          </UCard>
        </template>

        <div
          v-if="isCreating"
          id="active-question-editor"
        >
          <AssessmentQuestionEditorCard
            key="new-question"
            :editor="editor"
            :question-number="questions.length + 1"
            :is-creating="true"
            :is-draft="isDraft"
            :is-saving="isSaving"
            :is-running-action="isRunningAction"
            :form-error="formError"
            @save="save"
          />
        </div>

        <button
          v-if="isDraft && !isCreating"
          type="button"
          class="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-default px-5 py-5 text-sm font-semibold text-muted transition hover:border-primary hover:bg-primary/5 hover:text-primary"
          @click="startNewQuestion"
        >
          <UIcon name="i-lucide-plus-circle" class="size-5" />
          Add another question
        </button>
      </main>

      <aside class="space-y-4 xl:sticky xl:top-24 xl:h-fit">
        <UCard id="all-question-timer-settings">
          <template #header>
            <div class="flex items-center justify-between gap-3">
              <div class="flex min-w-0 items-center gap-3">
                <span class="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <UIcon name="i-lucide-timer-reset" class="size-4" />
                </span>
                <div class="min-w-0">
                  <h2 class="font-bold text-highlighted">
                    Timer defaults
                  </h2>
                  <p class="text-xs text-muted">
                    Apply one setup to the whole assessment.
                  </p>
                </div>
              </div>

              <UBadge color="primary" variant="soft" size="sm">
                All questions
              </UBadge>
            </div>
          </template>

          <fieldset
            class="space-y-3"
            :disabled="!isDraft || isApplyingGeneralTimerSettings"
          >
            <div class="overflow-hidden rounded-xl border border-default divide-y divide-default">
              <div class="p-3.5">
                <div class="flex items-center justify-between gap-4">
                  <div class="min-w-0">
                    <p class="font-semibold text-highlighted">
                      Answer time
                    </p>
                    <p class="text-xs text-muted">
                      Per-question time limit.
                    </p>
                  </div>

                  <USwitch
                    v-model="generalTimerSettings.timeLimitEnabled"
                    aria-label="Use an answer time for all questions"
                  />
                </div>

                <UFormField
                  v-if="generalTimerSettings.timeLimitEnabled"
                  label="Duration"
                  class="mt-3"
                >
                  <UInput
                    v-model.number="generalTimerSettings.timeLimitSeconds"
                    type="number"
                    min="5"
                    max="3600"
                    icon="i-lucide-timer"
                    class="w-full"
                  >
                    <template #trailing>
                      <span class="text-xs text-muted">sec</span>
                    </template>
                  </UInput>
                </UFormField>

                <div
                  v-else
                  class="mt-3 flex items-center gap-2 text-xs font-medium text-muted"
                >
                  <UIcon name="i-lucide-infinity" class="size-4 shrink-0" />
                  No time limit
                </div>
              </div>

              <div
                class="flex items-center justify-between gap-4 p-3.5 transition"
                :class="!generalTimerSettings.timeLimitEnabled ? 'opacity-55' : ''"
              >
                <div class="min-w-0">
                  <p class="font-semibold text-highlighted">
                    Timer progress
                  </p>
                  <p class="text-xs text-muted">
                    Show the progress bar to students.
                  </p>
                </div>

                <USwitch
                  v-model="generalTimerSettings.showTimerProgress"
                  :disabled="!generalTimerSettings.timeLimitEnabled"
                  aria-label="Show timer progress for all questions"
                />
              </div>
            </div>

            <div class="flex items-center justify-between gap-3 pt-1">
              <UBadge
                v-if="questions.length === 0"
                color="neutral"
                variant="soft"
                size="sm"
              >
                Default ready
              </UBadge>
              <UBadge
                v-else-if="allQuestionsUseGeneralTimerSettings"
                color="success"
                variant="soft"
                size="sm"
              >
                All questions match
              </UBadge>
              <UBadge
                v-else
                color="warning"
                variant="soft"
                size="sm"
              >
                {{ customTimerQuestionCount }} {{ customTimerQuestionCount === 1 ? "override" : "overrides" }}
              </UBadge>

              <UButton
                size="sm"
                icon="i-lucide-check-check"
                :loading="isApplyingGeneralTimerSettings"
                :disabled="!isDraft"
                @click="applyGeneralTimerSettings"
              >
                Apply to all
              </UButton>
            </div>
          </fieldset>
        </UCard>

        <AssessmentExcelImportPanel
          :assessment-id="assessmentId"
          :disabled="!isDraft"
          @imported="handleQuestionsImported"
          @history-locked="requestEditableRevision"
        />

        <UCard>
          <template #header>
            <div class="flex items-center justify-between gap-3">
              <div>
                <h2 class="font-bold text-highlighted">
                  Question settings
                </h2>
                <p class="text-xs text-muted">
                  Current question only.
                </p>
              </div>

              <UBadge color="primary" variant="soft" size="sm">
                Q{{
                  isCreating
                    ? questions.length + 1
                    : Math.max(
                        questions.findIndex(
                          (question) => question.id === selectedQuestionId,
                        ) + 1,
                        1,
                      )
                }}
              </UBadge>
            </div>
          </template>

          <fieldset
            class="space-y-3"
            :disabled="!isDraft"
          >
            <UFormField label="Points">
              <UInput
                v-model.number="editor.points"
                type="number"
                min="0.01"
                max="1000"
                step="0.01"
                icon="i-lucide-star"
                class="w-full"
              />
            </UFormField>

            <div class="overflow-hidden rounded-xl border border-default divide-y divide-default">
              <div class="p-3.5">
                <div class="flex items-center justify-between gap-4">
                  <div class="min-w-0">
                    <p class="font-semibold text-highlighted">
                      Answer time
                    </p>
                    <p class="text-xs text-muted">
                      No limit when turned off.
                    </p>
                  </div>

                  <USwitch
                    v-model="editor.timeLimitEnabled"
                    aria-label="Use a time limit for this question"
                  />
                </div>

                <UFormField
                  v-if="editor.timeLimitEnabled"
                  label="Duration"
                  class="mt-3"
                >
                  <UInput
                    v-model.number="editor.timeLimitSeconds"
                    type="number"
                    min="5"
                    max="3600"
                    icon="i-lucide-timer"
                    class="w-full"
                  >
                    <template #trailing>
                      <span class="text-xs text-muted">sec</span>
                    </template>
                  </UInput>
                </UFormField>

                <div
                  v-else
                  class="mt-3 flex items-center gap-2 text-xs font-medium text-muted"
                >
                  <UIcon name="i-lucide-infinity" class="size-4 shrink-0" />
                  No time limit
                </div>
              </div>

              <div
                class="flex items-center justify-between gap-4 p-3.5 transition"
                :class="!editor.timeLimitEnabled ? 'opacity-55' : ''"
              >
                <div class="min-w-0">
                  <p class="font-semibold text-highlighted">
                    Timer progress
                  </p>
                  <p class="text-xs text-muted">
                    Show the progress bar.
                  </p>
                </div>

                <USwitch
                  v-model="editor.showTimerProgress"
                  :disabled="!editor.timeLimitEnabled"
                  aria-label="Show timer progress bar to students"
                />
              </div>
            </div>
          </fieldset>
        </UCard>

        <UCard>
          <template #header>
            <h2 class="font-bold text-highlighted">
              Assessment summary
            </h2>
          </template>

          <dl class="space-y-3 text-sm">
            <div class="flex items-center justify-between gap-4">
              <dt class="flex items-center gap-2 text-muted">
                <UIcon name="i-lucide-list-checks" class="size-4" />
                Questions
              </dt>
              <dd class="font-bold text-highlighted">{{ questions.length }}</dd>
            </div>
            <div class="flex items-center justify-between gap-4">
              <dt class="flex items-center gap-2 text-muted">
                <UIcon name="i-lucide-star" class="size-4" />
                Total points
              </dt>
              <dd class="font-bold text-highlighted">{{ totalPoints }}</dd>
            </div>
            <div class="flex items-center justify-between gap-4">
              <dt class="flex items-center gap-2 text-muted">
                <UIcon name="i-lucide-clock-3" class="size-4" />
                Timed question time
              </dt>
              <dd class="font-bold text-highlighted">
                {{ timedQuestionCount > 0 ? `${estimatedMinutes} min` : "No timers" }}
              </dd>
            </div>
          </dl>
        </UCard>
      </aside>
    </div>

    <ConfirmationModal
      v-model:open="duplicateModalOpen"
      title="Duplicate this question?"
      description="A copy will be added to the assessment and opened immediately for editing."
      confirm-label="Duplicate Question"
      confirm-color="primary"
      icon="i-lucide-copy-plus"
      :loading="isRunningAction"
      :dismissible="!isRunningAction"
      @confirm="duplicateSelected"
    />

    <ConfirmationModal
      v-model:open="deleteModalOpen"
      title="Delete this question?"
      description="Questions already used in a student attempt remain protected so previous results stay accurate."
      confirm-label="Delete Question"
      confirm-color="error"
      icon="i-lucide-trash-2"
      :loading="isRunningAction"
      :dismissible="!isRunningAction"
      @confirm="removeSelected"
    />

    <ConfirmationModal
      v-model:open="publishModalOpen"
      title="Publish this assessment?"
      description="Publishing makes the assessment ready to schedule for classes. You can return it to draft later when changes are needed."
      confirm-label="Publish Assessment"
      confirm-color="success"
      icon="i-lucide-send"
      :loading="isRunningAction"
      :dismissible="!isRunningAction"
      @confirm="publish"
    />

    <UModal
      v-model:open="revisionModalOpen"
      :dismissible="!isRunningAction"
      :ui="{
        content: 'sm:max-w-xl',
      }"
    >
      <template #content>
        <div class="p-6">
          <div class="flex items-start gap-4">
            <div class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-warning/10 text-warning">
              <UIcon name="i-lucide-history" class="size-5" />
            </div>

            <div class="min-w-0 flex-1">
              <h2 class="text-lg font-black text-highlighted">
                Create an editable revision?
              </h2>
              <p class="mt-2 text-sm leading-6 text-muted">
                This assessment has already been used by students. Changing or deleting its original questions would change historical results. Preserve that used version and continue in a new editable draft instead.
              </p>

              <div class="mt-4 rounded-xl border border-default bg-elevated/50 p-4 text-sm">
                <p class="font-semibold text-highlighted">What happens next</p>
                <ul class="mt-2 space-y-1.5 text-muted">
                  <li>• Previous Student attempts and results remain unchanged.</li>
                  <li>• The historical assessment version moves to Archive.</li>
                  <li>• A new draft opens with the same title and questions.</li>
                  <li>• You can edit, delete, add, reorder, import, and republish normally.</li>
                </ul>
              </div>
            </div>
          </div>

          <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <UButton
              color="neutral"
              variant="outline"
              :disabled="isRunningAction"
              @click="revisionModalOpen = false"
            >
              Cancel
            </UButton>

            <UButton
              icon="i-lucide-copy-check"
              :loading="isRunningAction"
              @click="createEditableRevision"
            >
              Create Editable Draft
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <UModal
      v-model:open="feedbackModalOpen"
      :dismissible="true"
      :ui="{
        content: 'sm:max-w-lg',
      }"
    >
      <template #content>
        <div class="p-6">
          <div class="flex items-start gap-4">
            <div
              class="flex size-11 shrink-0 items-center justify-center rounded-xl"
              :class="{
                'bg-error/10 text-error': feedback.color === 'error',
                'bg-warning/10 text-warning': feedback.color === 'warning',
                'bg-success/10 text-success': feedback.color === 'success',
                'bg-primary/10 text-primary': feedback.color === 'primary',
                'bg-elevated text-muted': feedback.color === 'neutral',
              }"
            >
              <UIcon :name="feedback.icon" class="size-5" />
            </div>

            <div class="min-w-0 flex-1">
              <h2 class="text-lg font-black text-highlighted">
                {{ feedback.title }}
              </h2>
              <p class="mt-2 text-sm leading-6 text-muted">
                {{ feedback.description }}
              </p>
            </div>
          </div>

          <div class="mt-6 flex justify-end">
            <UButton
              color="neutral"
              variant="outline"
              @click="feedbackModalOpen = false"
            >
              Close
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
