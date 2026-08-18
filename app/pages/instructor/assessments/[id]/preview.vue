<script setup lang="ts">
import type {
  AssessmentWithClassroom,
} from "~/types/assessment";

import type {
  AssessmentQuestion,
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
  title: "Student-view preview",
});

const route = useRoute();

const assessmentId = computed(
  () =>
    String(
      route.params.id,
    ),
);

const {
  getInstructorAssessment,
} = useAssessments();

const {
  listQuestions,
} = useQuestions();

const assessment =
  ref<AssessmentWithClassroom | null>(
    null,
  );

const questions =
  ref<AssessmentQuestion[]>([]);

const currentIndex =
  ref(0);

const selectedOptionIds =
  ref<string[]>([]);

const textResponse =
  ref("");

const booleanResponse =
  ref<boolean | null>(null);

const isLoading =
  ref(true);

const errorMessage =
  ref("");

const currentQuestion = computed(
  () =>
    questions.value[
      currentIndex.value
    ]
    || null,
);

const isChoiceQuestion = computed(
  () =>
    currentQuestion.value
      ? isChoiceQuestionType(
          currentQuestion.value.question_type,
        )
      : false,
);

const isTrueFalseQuestion = computed(
  () =>
    currentQuestion.value
      ? isTrueFalseQuestionType(
          currentQuestion.value.question_type,
        )
      : false,
);

const answerInstruction = computed(() => {
  switch (
    currentQuestion.value?.question_type
  ) {
    case "multiple_choice":
      return "Select one answer.";
    case "checkbox":
      return "Select all answers that apply.";
    case "fill_blank":
      return "Type your answer in the blank.";
    case "true_false":
      return "Choose True or False.";
    case "true_false_correction":
      return "Choose True or False. If you choose False, explain why or provide the correct answer.";
    default:
      return "Answer the question.";
  }
});

const progress = computed(
  () =>
    questions.value.length > 0
      ? (
          (
            currentIndex.value
            + 1
          )
          / questions.value.length
        ) * 100
      : 0,
);

const assignmentLabel = computed(() => {
  const assignedClassrooms =
    assessment.value?.assignedClassrooms
    ?? [];

  if (assignedClassrooms.length === 0) {
    return "Assessment Library";
  }

  if (assignedClassrooms.length === 1) {
    return assignedClassrooms[0].section;
  }

  return `${assignedClassrooms.length} classes`;
});

function isSelected(
  optionId: string,
): boolean {
  return selectedOptionIds.value
    .includes(optionId);
}

function selectOption(
  optionId: string,
): void {
  if (!currentQuestion.value) {
    return;
  }

  if (
    currentQuestion.value
      .question_type
    === "multiple_choice"
  ) {
    selectedOptionIds.value = [
      optionId,
    ];

    return;
  }

  if (
    selectedOptionIds.value
      .includes(optionId)
  ) {
    selectedOptionIds.value =
      selectedOptionIds.value.filter(
        (id) =>
          id !== optionId,
      );
  } else {
    selectedOptionIds.value.push(
      optionId,
    );
  }
}

function move(
  direction: -1 | 1,
): void {
  const target =
    currentIndex.value
    + direction;

  if (
    target < 0
    || target >= questions.value.length
  ) {
    return;
  }

  currentIndex.value =
    target;

  selectedOptionIds.value =
    [];

  textResponse.value =
    "";

  booleanResponse.value =
    null;
}

async function loadData(): Promise<void> {
  isLoading.value =
    true;

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
    errorMessage.value =
      assessmentResult.error
      || "Unable to load the assessment.";

    isLoading.value =
      false;

    return;
  }

  if (
    questionResult.error
    || !questionResult.data
  ) {
    errorMessage.value =
      questionResult.error
      || "Unable to load assessment questions.";

    isLoading.value =
      false;

    return;
  }

  assessment.value =
    assessmentResult.data.assessment;

  questions.value =
    questionResult.data.questions;

  currentIndex.value =
    0;

  selectedOptionIds.value =
    [];

  textResponse.value =
    "";

  booleanResponse.value =
    null;

  isLoading.value =
    false;
}

onMounted(
  loadData,
);
</script>

<template>
  <div class="page-stack">
    <PageHeader
      eyebrow="Student-view preview"
      :title="
        assessment?.title
        || 'Assessment'
      "
      description="This preview intentionally hides correct-answer indicators and answer explanations."
    >
      <template #actions>
        <UButton
          v-if="
            assessment?.status
            === 'published'
          "
          :to="`/instructor/sessions/create?assessmentId=${assessmentId}`"
          icon="i-lucide-radio-tower"
        >
          Start Live
        </UButton>

        <UButton
          :to="`/instructor/assessments/${assessmentId}/edit`"
          color="neutral"
          variant="outline"
          icon="i-lucide-pencil"
        >
          Question Builder
        </UButton>

        <UButton
          :to="`/instructor/assessments/${assessmentId}/settings`"
          color="neutral"
          variant="outline"
          icon="i-lucide-settings-2"
        >
          Settings
        </UButton>
      </template>
    </PageHeader>

    <UAlert
      v-if="errorMessage"
      color="error"
      variant="soft"
      title="Preview could not be loaded"
      :description="errorMessage"
    />

    <div
      v-if="isLoading"
      class="mx-auto w-full max-w-5xl space-y-5"
    >
      <USkeleton class="h-20 rounded-xl" />
      <USkeleton class="h-[520px] rounded-xl" />
    </div>

    <EmptyPanel
      v-else-if="
        questions.length === 0
      "
      icon="i-lucide-list-plus"
      title="No questions to preview"
      description="Add at least one question using the manual question builder."
    >
      <template #actions>
        <UButton
          :to="`/instructor/assessments/${assessmentId}/edit`"
          icon="i-lucide-plus"
        >
          Add Question
        </UButton>
      </template>
    </EmptyPanel>

    <div
      v-else-if="
        assessment
        && currentQuestion
      "
      class="mx-auto w-full max-w-5xl"
    >
      <div class="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.16em] text-primary">
            {{ assessment.subject_code }}
            ·
            {{ assignmentLabel }}
          </p>

          <p class="mt-1 text-sm text-muted">
            Question
            {{ currentIndex + 1 }}
            of
            {{ questions.length }}
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <UBadge
            color="info"
            variant="soft"
          >
            {{
              assessmentQuestionTypeLabel(
                currentQuestion.question_type,
              )
            }}
          </UBadge>

          <UBadge
            color="warning"
            variant="soft"
            icon="i-lucide-clock-3"
          >
            {{ currentQuestion.time_limit_seconds }}
            seconds
          </UBadge>

          <UBadge
            color="neutral"
            variant="soft"
          >
            {{ currentQuestion.points }}
            pt
          </UBadge>
        </div>
      </div>

      <UProgress
        :model-value="progress"
        class="mb-6"
      />

      <UCard>
        <img
          v-if="currentQuestion.image_url"
          :src="currentQuestion.image_url"
          alt="Question illustration"
          class="mx-auto mb-7 max-h-72 rounded-xl object-contain"
        >

        <h1 class="text-2xl font-black leading-tight text-highlighted sm:text-3xl">
          {{ currentQuestion.question_text }}
        </h1>

        <p class="mt-3 text-sm text-muted">
          {{ answerInstruction }}
        </p>

        <div
          v-if="isChoiceQuestion"
          class="mt-8 grid gap-3 sm:grid-cols-2"
        >
          <button
            v-for="(option, index) in currentQuestion.options"
            :key="option.id"
            type="button"
            class="rounded-xl border p-5 text-left transition"
            :class="
              isSelected(option.id)
                ? 'border-primary bg-primary/5 ring-3 ring-primary/10'
                : 'border-default hover:border-primary/40 hover:bg-primary/5'
            "
            @click="selectOption(option.id)"
          >
            <div class="flex items-center gap-3">
              <span
                class="flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-black"
                :class="
                  isSelected(option.id)
                    ? 'bg-primary text-white'
                    : 'bg-elevated text-muted'
                "
              >
                {{ String.fromCharCode(65 + index) }}
              </span>

              <span class="font-semibold text-highlighted">
                {{ option.option_text }}
              </span>
            </div>
          </button>
        </div>

        <div
          v-else-if="currentQuestion.question_type === 'fill_blank'"
          class="mt-8 max-w-2xl"
        >
          <UFormField label="Your answer">
            <UInput
              v-model="textResponse"
              size="xl"
              class="w-full"
              placeholder="Type your answer"
            />
          </UFormField>
        </div>

        <div
          v-else-if="isTrueFalseQuestion"
          class="mt-8 space-y-5"
        >
          <div class="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              class="rounded-xl border p-5 text-left transition"
              :class="booleanResponse === true ? 'border-primary bg-primary/5 ring-3 ring-primary/10' : 'border-default hover:border-primary/40'"
              @click="booleanResponse = true; textResponse = ''"
            >
              <div class="flex items-center gap-3">
                <UIcon name="i-lucide-circle-check" class="size-5 text-success" />
                <span class="font-bold text-highlighted">True</span>
              </div>
            </button>

            <button
              type="button"
              class="rounded-xl border p-5 text-left transition"
              :class="booleanResponse === false ? 'border-primary bg-primary/5 ring-3 ring-primary/10' : 'border-default hover:border-primary/40'"
              @click="booleanResponse = false"
            >
              <div class="flex items-center gap-3">
                <UIcon name="i-lucide-circle-x" class="size-5 text-error" />
                <span class="font-bold text-highlighted">False</span>
              </div>
            </button>
          </div>

          <UFormField
            v-if="currentQuestion.question_type === 'true_false_correction' && booleanResponse === false"
            label="Why is it false?"
            help="State the correction or correct answer."
          >
            <UTextarea
              v-model="textResponse"
              :rows="4"
              class="w-full"
              placeholder="Explain why the statement is false or write the correct answer"
            />
          </UFormField>
        </div>

        <div class="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <UButton
            color="neutral"
            variant="outline"
            icon="i-lucide-arrow-left"
            :disabled="
              currentIndex === 0
            "
            @click="
              move(-1)
            "
          >
            Previous
          </UButton>

          <UButton
            trailing-icon="i-lucide-arrow-right"
            :disabled="
              currentIndex
              === questions.length - 1
            "
            @click="
              move(1)
            "
          >
            Next Question
          </UButton>
        </div>
      </UCard>

      <UAlert
        class="mt-6"
        color="info"
        variant="soft"
        title="Preview only"
        description="Answers in this preview are local only and are not submitted or graded."
      />
    </div>
  </div>
</template>
