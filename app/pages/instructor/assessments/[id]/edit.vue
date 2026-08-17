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
  toUserFacingError,
} from "~/utils/user-facing-error";

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
} = useAssessments();

const {
  listQuestions,
  createQuestion,
  updateQuestion,
  duplicateQuestion,
  deleteQuestion,
  reorderQuestions,
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
const errorMessage = ref("");
const formError = ref("");

const deleteModalOpen = ref(false);
const duplicateModalOpen = ref(false);
const publishModalOpen = ref(false);
const feedbackModalOpen = ref(false);

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
      "already been used in a student assessment",
    )
    || normalized.includes(
      "already been included in a student attempt",
    )
    || normalized.includes(
      "already part of a student attempt",
    )
  ) {
    return "This question has already been used in a student assessment. It cannot be changed or deleted because previous student results must remain accurate. Create a new assessment or duplicate this assessment before making major changes.";
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

  return toUserFacingError(
    message,
    fallback,
  );
}

const editor = reactive<{
  questionType: AssessmentQuestionType;
  questionText: string;
  imageUrl: string;
  explanation: string;
  points: number;
  timeLimitSeconds: number;
  options: QuestionOptionInput[];
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
  timeLimitSeconds:
    30,
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

const estimatedMinutes = computed(
  () =>
    Math.ceil(
      questions.value.reduce(
        (
          total,
          question,
        ) =>
          total
          + question.time_limit_seconds,
        0,
      )
      / 60,
    ),
);

const duplicateOptionWarning = computed(() => {
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

  editor.timeLimitSeconds =
    30;

  editor.options =
    emptyOptions();

  formError.value =
    "";
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

  editor.timeLimitSeconds =
    question.time_limit_seconds;

  editor.options =
    question.options.map(
      (option) => ({
        text:
          option.option_text,

        isCorrect:
          option.is_correct,
      }),
    );

  formError.value =
    "";
}

function changeQuestionType(
  value: AssessmentQuestionType,
): void {
  editor.questionType =
    value;

  if (
    value === "multiple_choice"
  ) {
    const firstCorrect =
      editor.options.findIndex(
        (option) =>
          option.isCorrect,
      );

    editor.options.forEach(
      (
        option,
        index,
      ) => {
        option.isCorrect =
          index
          === (
            firstCorrect >= 0
              ? firstCorrect
              : 0
          );
      },
    );
  }
}

function setMultipleChoiceCorrect(
  selectedIndex: number,
): void {
  editor.options.forEach(
    (
      option,
      index,
    ) => {
      option.isCorrect =
        index === selectedIndex;
    },
  );
}

function addOption(): void {
  if (
    editor.options.length >= 5
  ) {
    return;
  }

  editor.options.push({
    text: "",
    isCorrect: false,
  });
}

function removeOption(
  index: number,
): void {
  if (
    editor.options.length <= 2
  ) {
    return;
  }

  editor.options.splice(
    index,
    1,
  );

  if (
    editor.questionType
      === "multiple_choice"
    && !editor.options.some(
      (option) =>
        option.isCorrect,
    )
  ) {
    editor.options[0].isCorrect =
      true;
  }
}

function validateEditor(): string | null {
  if (
    !editor.questionText.trim()
  ) {
    return "Question text is required.";
  }

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

  if (
    Number(
      editor.points,
    ) <= 0
  ) {
    return "Question points must be greater than zero.";
  }

  if (
    Number(
      editor.timeLimitSeconds,
    ) < 5
    || Number(
      editor.timeLimitSeconds,
    ) > 3600
  ) {
    return "Question time must be between 5 and 3600 seconds.";
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
      Number(
        editor.timeLimitSeconds,
      ),

    options:
      editor.options.map(
        (option) => ({
          text:
            option.text.trim(),

          isCorrect:
            option.isCorrect,
        }),
      ),
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

  isSaving.value =
    true;

  formError.value =
    "";

  const payload =
    getEditorPayload();

  let result;

  if (isCreating.value) {
    result =
      await createQuestion(
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

      isSaving.value =
        false;

      return;
    }

    result =
      await updateQuestion(
        assessmentId.value,
        questionId,
        payload,
      );
  }

  if (
    result.error
    || !result.data
  ) {
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

    isSaving.value =
      false;

    return;
  }

  selectedQuestionId.value =
    result.data.question.id;

  duplicateModalOpen.value = false;

  toast.add({
    title:
      isCreating.value
        ? "Question added"
        : "Question updated",

    description:
      result.data.message,

    color:
      "success",
  });

  await loadData(
    true,
  );

  isSaving.value =
    false;
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

  isRunningAction.value =
    true;

  const result =
    await duplicateQuestion(
      selectedQuestion.value.id,
    );

  if (
    result.error
    || !result.data
  ) {
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

    isRunningAction.value =
      false;

    return;
  }

  selectedQuestionId.value =
    result.data.question.id;

  toast.add({
    title:
      "Question duplicated",
    description:
      result.data.message,
    color:
      "success",
  });

  await loadData(
    true,
  );

  isRunningAction.value =
    false;
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

  isRunningAction.value =
    true;

  const result =
    await deleteQuestion(
      selectedQuestion.value.id,
    );

  if (
    result.error
    || !result.data
  ) {
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

    isRunningAction.value =
      false;

    return;
  }

  selectedQuestionId.value =
    null;

  deleteModalOpen.value = false;

  toast.add({
    title:
      "Question deleted",
    description:
      result.data.message,
    color:
      "success",
  });

  await loadData(
    false,
  );

  isRunningAction.value =
    false;
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

  const reordered = [
    ...questions.value,
  ];

  const [
    moved,
  ] = reordered.splice(
    index,
    1,
  );

  reordered.splice(
    targetIndex,
    0,
    moved,
  );

  questions.value =
    reordered;

  const result =
    await reorderQuestions(
      assessmentId.value,
      reordered.map(
        (question) =>
          question.id,
      ),
    );

  if (
    result.error
    || !result.data
  ) {
    showFeedback(
      "Question order was not saved",
      friendlyError(
        result.error,
        "The question could not be moved. The previous order has been restored.",
      ),
      "error",
      "i-lucide-circle-alert",
    );

    await loadData(
      true,
    );

    return;
  }

  await loadData(
    true,
  );
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
        "Review every question and make sure each one has complete answer choices, a correct answer, points, and a time limit.",
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

  await loadData(
    true,
  );

  isRunningAction.value =
    false;
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
        { label: assessment?.title || 'Assessment', to: `/instructor/assessments/${assessmentId}/edit` },
        { label: 'Questions' },
      ]"
      eyebrow="Question builder"
      :title="
        assessment?.title
        || 'Assessment questions'
      "
      description="Create and organize questions, answer choices, points, and time limits before publishing."
    >
      <template #actions>
        <UButton
          v-if="isDraft"
          :to="`/instructor/assessments/${assessmentId}/import`"
          color="neutral"
          variant="outline"
          icon="i-lucide-file-spreadsheet"
        >
          Import Excel
        </UButton>

        <UButton
          v-if="isDraft"
          color="success"
          icon="i-lucide-send"
          :loading="isRunningAction"
          :disabled="
            questions.length === 0
          "
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
      v-if="
        assessment
        && !isDraft
      "
      class="flex items-start gap-3 rounded-xl border border-default bg-elevated/60 p-4"
    >
      <div class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <UIcon
          :name="
            assessment.status === 'published'
              ? 'i-lucide-circle-check'
              : 'i-lucide-archive'
          "
          class="size-5"
        />
      </div>

      <div>
        <p class="font-bold text-highlighted">
          {{
            assessment.status === 'published'
              ? 'This assessment is published'
              : 'This assessment is archived'
          }}
        </p>

        <p class="mt-1 text-sm text-muted">
          Questions are currently view-only. Open Assessment Settings to return the assessment to draft before editing.
        </p>
      </div>
    </div>

    <div
      v-if="isLoading"
      class="grid gap-6 xl:grid-cols-[280px_1fr_310px]"
    >
      <USkeleton class="h-96 rounded-xl" />
      <USkeleton class="h-[620px] rounded-xl" />
      <USkeleton class="h-96 rounded-xl" />
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
          @click="
            loadData(
              false,
            )
          "
        >
          Try Again
        </UButton>
      </template>
    </EmptyPanel>

    <div
      v-else-if="assessment"
      class="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)_310px]"
    >
      <UCard class="h-fit xl:sticky xl:top-24">
        <template #header>
          <div class="flex items-center justify-between gap-3">
            <div>
              <h2 class="font-bold text-highlighted">
                Questions
              </h2>

              <p class="text-xs text-muted">
                {{ questions.length }}
                total
              </p>
            </div>

            <UButton
              icon="i-lucide-plus"
              size="sm"
              :disabled="!isDraft"
              aria-label="Add question"
              @click="startNewQuestion"
            />
          </div>
        </template>

        <div
          v-if="questions.length === 0"
          class="py-6 text-center"
        >
          <UIcon
            name="i-lucide-list-plus"
            class="mx-auto size-7 text-muted"
          />

          <p class="mt-3 text-sm font-semibold text-highlighted">
            No saved questions
          </p>

          <p class="mt-1 text-xs leading-5 text-muted">
            Complete the editor and save your first question.
          </p>
        </div>

        <div
          v-else
          class="space-y-2"
        >
          <div
            v-for="(
              question,
              index
            ) in questions"
            :key="question.id"
            class="rounded-lg border p-2 transition"
            :class="
              selectedQuestionId
                === question.id
                ? 'border-primary bg-primary/5'
                : 'border-default'
            "
          >
            <button
              type="button"
              class="flex w-full items-start gap-3 p-1 text-left"
              @click="
                selectQuestion(
                  question,
                )
              "
            >
              <span
                class="flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-black"
                :class="
                  selectedQuestionId
                    === question.id
                    ? 'bg-primary text-white'
                    : 'bg-elevated text-muted'
                "
              >
                {{ index + 1 }}
              </span>

              <div class="min-w-0 flex-1">
                <p class="line-clamp-2 text-sm font-semibold text-highlighted">
                  {{ question.question_text }}
                </p>

                <p class="mt-1 text-xs text-muted">
                  {{
                    question.question_type
                      === 'multiple_choice'
                      ? 'Multiple Choice'
                      : 'Checkbox'
                  }}
                  ·
                  {{ question.points }}
                  pt
                </p>
              </div>
            </button>

            <div
              v-if="isDraft"
              class="mt-2 flex justify-end gap-1 border-t border-default pt-2"
            >
              <UButton
                color="neutral"
                variant="ghost"
                size="xs"
                icon="i-lucide-arrow-up"
                :disabled="index === 0"
                aria-label="Move question up"
                @click="
                  moveQuestion(
                    index,
                    -1,
                  )
                "
              />

              <UButton
                color="neutral"
                variant="ghost"
                size="xs"
                icon="i-lucide-arrow-down"
                :disabled="
                  index
                  === questions.length - 1
                "
                aria-label="Move question down"
                @click="
                  moveQuestion(
                    index,
                    1,
                  )
                "
              />
            </div>
          </div>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p class="text-xs font-bold uppercase tracking-[0.16em] text-primary">
                {{
                  isCreating
                    ? 'New question'
                    : `Question ${
                        questions.findIndex(
                          (question) =>
                            question.id
                            === selectedQuestionId,
                        ) + 1
                      }`
                }}
              </p>

              <h2 class="mt-1 font-bold text-highlighted">
                {{
                  isCreating
                    ? 'Create question'
                    : 'Edit question'
                }}
              </h2>
            </div>

            <div
              v-if="
                !isCreating
                && isDraft
              "
              class="flex gap-2"
            >
              <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-copy-plus"
                :loading="isRunningAction"
                @click="requestDuplicateSelected"
              >
                Duplicate
              </UButton>

              <UButton
                color="error"
                variant="ghost"
                icon="i-lucide-trash-2"
                :disabled="isRunningAction"
                @click="requestRemoveSelected"
              >
                Delete
              </UButton>
            </div>
          </div>
        </template>

        <fieldset
          class="space-y-6"
          :disabled="!isDraft"
        >
          <UFormField
            label="Question type"
            required
          >
            <USelect
              :model-value="editor.questionType"
              :items="[
                {
                  label: 'Multiple Choice',
                  value: 'multiple_choice',
                },
                {
                  label: 'Checkbox',
                  value: 'checkbox',
                },
              ]"
              value-key="value"
              label-key="label"
              class="w-full"
              @update:model-value="
                changeQuestionType(
                  $event as AssessmentQuestionType,
                )
              "
            />
          </UFormField>

          <UFormField
            label="Question text"
            required
          >
            <UTextarea
              v-model="editor.questionText"
              :rows="5"
              class="w-full"
              placeholder="Write a clear question."
            />
          </UFormField>

          <div>
            <div class="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p class="font-semibold text-highlighted">
                  Answer choices
                </p>

                <p class="mt-1 text-xs text-muted">
                  {{
                    editor.questionType
                      === 'multiple_choice'
                      ? 'Select exactly one correct choice.'
                      : 'Select every correct choice.'
                  }}
                </p>
              </div>

              <UButton
                color="neutral"
                variant="outline"
                size="sm"
                icon="i-lucide-plus"
                :disabled="
                  editor.options.length >= 5
                "
                @click="addOption"
              >
                Add Choice
              </UButton>
            </div>

            <div
              v-if="duplicateOptionWarning"
              class="mb-3 flex items-center gap-2 text-sm text-warning"
            >
              <UIcon
                name="i-lucide-triangle-alert"
                class="size-4 shrink-0"
              />

              <span>
                Each answer choice should use different text.
              </span>
            </div>

            <div class="space-y-3">
              <div
                v-for="(
                  option,
                  index
                ) in editor.options"
                :key="index"
                class="flex items-center gap-3 rounded-xl border border-default p-3 focus-within:border-primary focus-within:ring-3 focus-within:ring-primary/10"
              >
                <input
                  v-if="
                    editor.questionType
                    === 'multiple_choice'
                  "
                  type="radio"
                  :name="`correct-${assessmentId}`"
                  :checked="option.isCorrect"
                  class="size-4 accent-brand-600"
                  @change="
                    setMultipleChoiceCorrect(
                      index,
                    )
                  "
                >

                <input
                  v-else
                  v-model="option.isCorrect"
                  type="checkbox"
                  class="size-4 accent-brand-600"
                >

                <UInput
                  v-model="option.text"
                  variant="none"
                  class="w-full"
                  :placeholder="`Choice ${index + 1}`"
                />

                <UButton
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-x"
                  size="sm"
                  :disabled="
                    editor.options.length <= 2
                  "
                  :aria-label="`Remove choice ${index + 1}`"
                  @click="
                    removeOption(
                      index,
                    )
                  "
                />
              </div>
            </div>
          </div>

          <UFormField
            label="Question image"
            help="Optional. Paste the web address of an image for this question."
          >
            <UInput
              v-model="editor.imageUrl"
              type="url"
              icon="i-lucide-image"
              class="w-full"
              placeholder="https://example.com/question-image.png"
            />
          </UFormField>

          <div
            v-if="editor.imageUrl"
            class="overflow-hidden rounded-xl border border-default bg-elevated p-3"
          >
            <img
              :src="editor.imageUrl"
              alt="Question image preview"
              class="mx-auto max-h-64 rounded-lg object-contain"
            >
          </div>

          <UFormField
            label="Answer explanation"
            help="Optional. Students may see this after submitting when results are released."
          >
            <UTextarea
              v-model="editor.explanation"
              :rows="5"
              class="w-full"
              placeholder="Explain why the selected answer is correct."
            />
          </UFormField>

          <div class="flex justify-end">
            <UButton
              size="lg"
              icon="i-lucide-save"
              :loading="isSaving"
              @click="save"
            >
              {{
                isCreating
                  ? 'Add Question'
                  : 'Save Question'
              }}
            </UButton>
          </div>
        </fieldset>
      </UCard>

      <div class="space-y-6 xl:sticky xl:top-24 xl:h-fit">
        <UCard>
          <template #header>
            <h2 class="font-bold text-highlighted">
              Question settings
            </h2>
          </template>

          <fieldset
            class="space-y-5"
            :disabled="!isDraft"
          >
            <UFormField
              label="Points"
            >
              <UInput
                v-model.number="editor.points"
                type="number"
                min="0.01"
                max="1000"
                step="0.01"
                class="w-full"
              />
            </UFormField>

            <UFormField
              label="Answer time (seconds)"
              help="This timer applies only to this question. When time runs out, the question closes and the student moves to the next question."
            >
              <UInput
                v-model.number="editor.timeLimitSeconds"
                type="number"
                min="5"
                max="3600"
                class="w-full"
              />
            </UFormField>
          </fieldset>
        </UCard>

        <UCard>
          <template #header>
            <h2 class="font-bold text-highlighted">
              Assessment summary
            </h2>
          </template>

          <dl class="space-y-4 text-sm">
            <div class="flex justify-between gap-4">
              <dt class="text-muted">
                Questions
              </dt>

              <dd class="font-bold text-highlighted">
                {{ questions.length }}
              </dd>
            </div>

            <div class="flex justify-between gap-4">
              <dt class="text-muted">
                Total points
              </dt>

              <dd class="font-bold text-highlighted">
                {{ totalPoints }}
              </dd>
            </div>

            <div class="flex justify-between gap-4">
              <dt class="text-muted">
                Total configured question time
              </dt>

              <dd class="font-bold text-highlighted">
                {{ estimatedMinutes }}
                min
              </dd>
            </div>
          </dl>
        </UCard>

        <UCard>
          <div class="flex items-start gap-3">
            <div class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <UIcon
                name="i-lucide-eye"
                class="size-5"
              />
            </div>

            <div>
              <h2 class="font-bold text-highlighted">
                Student view
              </h2>

              <p class="mt-1 text-sm leading-6 text-muted">
                While answering, students see only the question and answer choices. Correct answers and explanations appear only when your result settings allow them.
              </p>
            </div>
          </div>
        </UCard>
      </div>
    </div>

    <ConfirmationModal
      v-model:open="duplicateModalOpen"
      title="Duplicate this question?"
      description="A new copy will be added at the end of the question list. You can edit the copy without changing the original question."
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
      description="The question and its answer choices will be removed. Questions already used in a student assessment cannot be deleted because previous results must remain accurate."
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
      description="Publishing makes the assessment ready to assign to classes. Return it to draft later when you need to make changes."
      confirm-label="Publish Assessment"
      confirm-color="success"
      icon="i-lucide-send"
      :loading="isRunningAction"
      :dismissible="!isRunningAction"
      @confirm="publish"
    />

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
              <UIcon
                :name="feedback.icon"
                class="size-5"
              />
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
