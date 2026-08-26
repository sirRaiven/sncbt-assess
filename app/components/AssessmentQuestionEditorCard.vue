<script setup lang="ts">
import type {
  AssessmentQuestionType,
  QuestionOptionInput,
} from "~/types/question";

import {
  isChoiceQuestionType,
  isTrueFalseQuestionType,
} from "~/types/question";

interface QuestionEditorState {
  questionType: AssessmentQuestionType;
  questionText: string;
  imageUrl: string;
  explanation: string;
  points: number;
  timeLimitSeconds: number;
  options: QuestionOptionInput[];
  acceptedAnswersText: string;
  correctBoolean: boolean | null;
}

const props = defineProps<{
  editor: QuestionEditorState;
  questionNumber: number;
  isCreating: boolean;
  isDraft: boolean;
  isSaving: boolean;
  isRunningAction: boolean;
  formError?: string;
}>();

const emit = defineEmits<{
  save: [];
  duplicate: [];
  delete: [];
}>();

// The editor object belongs to the parent question-builder state. Mutating its
// nested fields here keeps the active card responsive without replacing/refetching
// the entire question collection.
const editor = props.editor;

const showExtras = ref(
  Boolean(
    editor.imageUrl
    || editor.explanation,
  ),
);

const isChoiceQuestion = computed(
  () => isChoiceQuestionType(editor.questionType),
);

const isTrueFalseQuestion = computed(
  () => isTrueFalseQuestionType(editor.questionType),
);

const duplicateOptionWarning = computed(() => {
  if (!isChoiceQuestion.value) {
    return false;
  }

  const normalized = editor.options
    .map((option) => option.text.trim().toLowerCase())
    .filter(Boolean);

  return new Set(normalized).size !== normalized.length;
});

const questionTypeItems = [
  {
    label: "Multiple Choice",
    value: "multiple_choice",
    icon: "i-lucide-circle-dot",
  },
  {
    label: "Checkbox",
    value: "checkbox",
    icon: "i-lucide-list-checks",
  },
  {
    label: "Fill in the Blanks",
    value: "fill_blank",
    icon: "i-lucide-text-cursor-input",
  },
  {
    label: "True or False",
    value: "true_false",
    icon: "i-lucide-toggle-left",
  },
  {
    label: "True or False + Correction",
    value: "true_false_correction",
    icon: "i-lucide-message-square-text",
  },
];

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

function changeQuestionType(value: AssessmentQuestionType): void {
  editor.questionType = value;

  if (isChoiceQuestionType(value)) {
    if (editor.options.length < 2) {
      editor.options = emptyOptions();
    }

    editor.acceptedAnswersText = "";
    editor.correctBoolean = null;

    if (value === "multiple_choice") {
      const firstCorrect = editor.options.findIndex(
        (option) => option.isCorrect,
      );

      editor.options.forEach((option, index) => {
        option.isCorrect =
          index === (firstCorrect >= 0 ? firstCorrect : 0);
      });
    }

    return;
  }

  if (value === "fill_blank") {
    editor.correctBoolean = null;
    return;
  }

  if (isTrueFalseQuestionType(value)) {
    editor.correctBoolean = editor.correctBoolean ?? true;

    if (value === "true_false" || editor.correctBoolean === true) {
      editor.acceptedAnswersText = "";
    }
  }
}

function setMultipleChoiceCorrect(selectedIndex: number): void {
  editor.options.forEach((option, index) => {
    option.isCorrect = index === selectedIndex;
  });
}

function addOption(): void {
  if (editor.options.length >= 5) {
    return;
  }

  editor.options.push({
    text: "",
    isCorrect: false,
  });
}

function removeOption(index: number): void {
  if (editor.options.length <= 2) {
    return;
  }

  editor.options.splice(index, 1);

  if (
    editor.questionType === "multiple_choice"
    && !editor.options.some((option) => option.isCorrect)
  ) {
    editor.options[0].isCorrect = true;
  }
}
</script>

<template>
  <UCard
    class="overflow-hidden border-primary/40 shadow-sm ring-2 ring-primary/10"
    :ui="{
      body: 'p-0 sm:p-0',
    }"
  >
    <div class="h-1.5 bg-primary" />

    <div class="flex justify-center py-2 text-muted" aria-hidden="true">
      <UIcon name="i-lucide-grip-horizontal" class="size-5" />
    </div>

    <fieldset
      class="space-y-5 px-5 pb-5 sm:px-6 sm:pb-6"
      :disabled="!isDraft"
      @keydown.meta.enter.prevent="emit('save')"
      @keydown.ctrl.enter.prevent="emit('save')"
    >
      <div class="grid gap-4 md:grid-cols-[minmax(0,1fr)_260px] md:items-start">
        <div class="min-w-0">
          <div class="mb-1 flex items-center gap-2">
            <span class="text-xs font-bold uppercase tracking-[0.14em] text-primary">
              Question {{ questionNumber }}
            </span>

            <UBadge
              v-if="isCreating"
              color="warning"
              variant="soft"
              size="sm"
            >
              New
            </UBadge>
          </div>

          <UTextarea
            v-model="editor.questionText"
            :rows="2"
            autoresize
            variant="none"
            class="w-full border-b-2 border-default text-lg font-semibold focus-within:border-primary"
            placeholder="Untitled question"
            aria-label="Question text"
          />
        </div>

        <UFormField label="Question type" class="md:pt-0">
          <USelect
            :model-value="editor.questionType"
            :items="questionTypeItems"
            value-key="value"
            label-key="label"
            class="w-full"
            @update:model-value="changeQuestionType($event as AssessmentQuestionType)"
          />
        </UFormField>
      </div>

      <div v-if="isChoiceQuestion" class="space-y-2">
        <p class="sr-only">
          {{
            editor.questionType === 'multiple_choice'
              ? 'Select exactly one correct answer.'
              : 'Select every correct answer.'
          }}
        </p>

        <div
          v-for="(option, index) in editor.options"
          :key="index"
          class="group flex items-center gap-3 rounded-lg px-1 py-1.5"
        >
          <input
            v-if="editor.questionType === 'multiple_choice'"
            type="radio"
            :name="`correct-answer-${questionNumber}`"
            :checked="option.isCorrect"
            class="size-5 shrink-0 accent-brand-600"
            :aria-label="`Mark option ${index + 1} as correct`"
            @change="setMultipleChoiceCorrect(index)"
          >

          <input
            v-else
            v-model="option.isCorrect"
            type="checkbox"
            class="size-5 shrink-0 accent-brand-600"
            :aria-label="`Mark option ${index + 1} as correct`"
          >

          <UInput
            v-model="option.text"
            variant="none"
            class="min-w-0 flex-1 border-b border-default focus-within:border-primary"
            :placeholder="`Option ${index + 1}`"
            :aria-label="`Option ${index + 1}`"
          />

          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-x"
            size="sm"
            :disabled="editor.options.length <= 2"
            :aria-label="`Remove option ${index + 1}`"
            @click="removeOption(index)"
          />
        </div>

        <div class="flex items-center gap-3 pl-1">
          <span
            class="flex size-5 shrink-0 items-center justify-center rounded-full border border-default text-xs text-muted"
            aria-hidden="true"
          >
            +
          </span>

          <UButton
            color="neutral"
            variant="link"
            size="sm"
            class="px-0"
            :disabled="editor.options.length >= 5"
            @click="addOption"
          >
            Add option
          </UButton>

          <span v-if="editor.options.length >= 5" class="text-xs text-muted">
            Maximum 5
          </span>
        </div>

        <p
          v-if="duplicateOptionWarning"
          class="flex items-center gap-2 text-xs font-medium text-warning"
        >
          <UIcon name="i-lucide-triangle-alert" class="size-4" />
          Each answer choice must use different text.
        </p>
      </div>

      <div
        v-else-if="editor.questionType === 'fill_blank'"
        class="rounded-xl bg-elevated/50 p-4"
      >
        <UFormField
          label="Accepted answer(s)"
          help="One accepted answer per line. Matching ignores capitalization and extra spaces."
          required
        >
          <UTextarea
            v-model="editor.acceptedAnswersText"
            :rows="4"
            class="w-full"
            placeholder="Correct answer\nAnother accepted answer"
          />
        </UFormField>
      </div>

      <div
        v-else-if="isTrueFalseQuestion"
        class="space-y-4"
      >
        <div class="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            class="rounded-xl border p-4 text-left transition"
            :class="editor.correctBoolean === true ? 'border-success bg-success/10' : 'border-default hover:border-success/40'"
            @click="editor.correctBoolean = true; editor.acceptedAnswersText = ''"
          >
            <div class="flex items-center gap-3">
              <UIcon name="i-lucide-circle-check" class="size-5 text-success" />
              <span class="font-bold text-highlighted">True</span>
            </div>
          </button>

          <button
            type="button"
            class="rounded-xl border p-4 text-left transition"
            :class="editor.correctBoolean === false ? 'border-error bg-error/10' : 'border-default hover:border-error/40'"
            @click="editor.correctBoolean = false"
          >
            <div class="flex items-center gap-3">
              <UIcon name="i-lucide-circle-x" class="size-5 text-error" />
              <span class="font-bold text-highlighted">False</span>
            </div>
          </button>
        </div>

        <UFormField
          v-if="editor.questionType === 'true_false_correction' && editor.correctBoolean === false"
          label="Accepted correction(s)"
          help="One accepted correction per line."
          required
        >
          <UTextarea
            v-model="editor.acceptedAnswersText"
            :rows="4"
            class="w-full"
            placeholder="Write the correct statement or answer"
          />
        </UFormField>

        <p
          v-else-if="editor.questionType === 'true_false_correction'"
          class="text-xs leading-5 text-muted"
        >
          When True is correct, students choosing False remain incorrect even if they enter a correction.
        </p>
      </div>

      <div v-if="showExtras" class="grid gap-4 border-t border-default pt-4 lg:grid-cols-2">
        <div class="space-y-3">
          <UFormField
            label="Question image"
            help="Optional image URL shown with the question."
          >
            <UInput
              v-model="editor.imageUrl"
              type="url"
              icon="i-lucide-image"
              class="w-full"
              placeholder="https://example.com/image.png"
            />
          </UFormField>

          <div
            v-if="editor.imageUrl"
            class="overflow-hidden rounded-lg border border-default bg-elevated p-2"
          >
            <img
              :src="editor.imageUrl"
              alt="Question image preview"
              class="mx-auto max-h-40 rounded-md object-contain"
            >
          </div>
        </div>

        <UFormField
          label="Answer explanation"
          help="Optional explanation shown only when result settings allow it."
        >
          <UTextarea
            v-model="editor.explanation"
            :rows="5"
            class="w-full"
            placeholder="Explain the correct answer."
          />
        </UFormField>
      </div>

      <UAlert
        v-if="formError"
        color="warning"
        variant="soft"
        title="Complete this question"
        :description="formError"
      />

      <div class="flex flex-col gap-3 border-t border-default pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex flex-wrap items-center gap-1">
          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            :icon="showExtras ? 'i-lucide-chevron-up' : 'i-lucide-image-plus'"
            @click="showExtras = !showExtras"
          >
            {{ showExtras ? 'Hide extras' : 'Image & explanation' }}
          </UButton>

          <template v-if="!isCreating && isDraft">
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              icon="i-lucide-copy-plus"
              :loading="isRunningAction"
              @click="emit('duplicate')"
            >
              Duplicate
            </UButton>

            <UButton
              color="error"
              variant="ghost"
              size="sm"
              icon="i-lucide-trash-2"
              :disabled="isRunningAction"
              @click="emit('delete')"
            >
              Delete
            </UButton>
          </template>
        </div>

        <div class="flex items-center justify-end gap-3">
          <p class="hidden text-xs text-muted sm:block">
            Ctrl/⌘ + Enter to save
          </p>

          <UButton
            icon="i-lucide-save"
            :loading="isSaving"
            :disabled="!isDraft"
            @click="emit('save')"
          >
            {{ isCreating ? 'Add question' : 'Save changes' }}
          </UButton>
        </div>
      </div>
    </fieldset>
  </UCard>
</template>
