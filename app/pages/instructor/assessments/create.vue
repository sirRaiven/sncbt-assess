<script setup lang="ts">
import type {
  FormSubmitEvent,
} from "@nuxt/ui";

import {
  z,
} from "zod";


definePageMeta({
  layout: "instructor",
});

useSeoMeta({
  title: "Create assessment",
});

const toast = useToast();

const {
  createAssessment,
} = useAssessments();
const isSubmitting = ref(false);
const errorMessage = ref("");

const schema = z.object({
  title: z
    .string()
    .trim()
    .min(
      3,
      "Assessment title is required.",
    )
    .max(200),

  subjectName: z
    .string()
    .trim()
    .min(
      2,
      "Subject name is required.",
    )
    .max(150),

  subjectCode: z
    .string()
    .trim()
    .min(
      2,
      "Subject code is required.",
    )
    .max(30),

  instructions: z
    .string()
    .trim()
    .max(5000),

  assessmentType: z.enum([
    "quiz",
    "examination",
    "activity",
    "practice",
  ]),

  scoringMode: z.enum([
    "standard",
    "speed_bonus",
  ]),

  randomizeQuestions:
    z.boolean(),

  randomizeOptions:
    z.boolean(),

  resultVisibility: z.enum([
    "hidden",
    "score_only",
    "score_and_answers",
  ]),

  leaderboardEnabled:
    z.boolean(),

  allowBacktracking:
    z.boolean(),

  overallTimeLimitMinutes: z
    .number()
    .int()
    .min(1)
    .max(360)
    .nullable(),
});

type CreateAssessmentSchema =
  z.output<typeof schema>;

const state = reactive<CreateAssessmentSchema>({
  title: "",
  subjectName: "",
  subjectCode: "",
  instructions: "",
  assessmentType: "quiz",
  scoringMode: "standard",
  randomizeQuestions: false,
  randomizeOptions: false,
  resultVisibility: "score_only",
  leaderboardEnabled: false,
  allowBacktracking: true,
  overallTimeLimitMinutes: null,
});

async function submit(
  event: FormSubmitEvent<CreateAssessmentSchema>,
): Promise<void> {
  isSubmitting.value = true;
  errorMessage.value = "";

  const result =
    await createAssessment({
      classroomIds: [],
      title:
        event.data.title,
      subjectName:
        event.data.subjectName,
      subjectCode:
        event.data.subjectCode,
      instructions:
        event.data.instructions
        || null,
      assessmentType:
        event.data.assessmentType,
      scoringMode:
        event.data.scoringMode,
      randomizeQuestions:
        event.data.randomizeQuestions,
      randomizeOptions:
        event.data.randomizeOptions,
      resultVisibility:
        event.data.resultVisibility,
      leaderboardEnabled:
        event.data.leaderboardEnabled,
      allowBacktracking:
        event.data.allowBacktracking,
      overallTimeLimitMinutes:
        event.data.overallTimeLimitMinutes,
    });

  if (
    result.error
    || !result.data
  ) {
    errorMessage.value =
      result.error
      || "Unable to create the assessment.";

    isSubmitting.value = false;
    return;
  }

  toast.add({
    title:
      "Assessment created",
    description:
      result.data.message,
    color:
      "success",
  });

  await navigateTo(
    `/instructor/assessments/${result.data.assessment.id}/settings`,
  );
}

</script>

<template>
  <div class="page-stack">
    <PageHeader
      eyebrow="New reusable assessment"
      title="Create an assessment"
      description="Create a reusable assessment in your library. Add questions, publish it, then schedule automatic class access."
    />

    <UAlert
      v-if="errorMessage"
      color="error"
      variant="soft"
      title="Assessment could not be created"
      :description="errorMessage"
    />

    <UForm
      :schema="schema"
      :state="state"
      class="grid gap-6 xl:grid-cols-[1fr_370px]"
      @submit="submit"
    >
      <div class="space-y-6">
        <UCard>
          <template #header>
            <div>
              <h2 class="font-bold text-highlighted">
                Assessment information
              </h2>

              <p class="mt-1 text-sm text-muted">
                These details describe the reusable assessment, not a specific class delivery.
              </p>
            </div>
          </template>

          <div class="space-y-5">
            <UFormField
              label="Assessment title"
              name="title"
              required
            >
              <UInput
                v-model="state.title"
                placeholder="Mobile Development Prelim Examination"
                class="w-full"
              />
            </UFormField>

            <div class="grid gap-5 sm:grid-cols-2">
              <UFormField
                label="Subject name"
                name="subjectName"
                required
              >
                <UInput
                  v-model="state.subjectName"
                  placeholder="Introduction to Mobile Development"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                label="Subject code"
                name="subjectCode"
                required
              >
                <UInput
                  v-model="state.subjectCode"
                  placeholder="IT216"
                  class="w-full"
                />
              </UFormField>
            </div>

            <UFormField
              label="Assessment type"
              name="assessmentType"
              required
            >
              <USelect
                v-model="state.assessmentType"
                :items="[
                  {
                    label: 'Quiz',
                    value: 'quiz',
                  },
                  {
                    label: 'Examination',
                    value: 'examination',
                  },
                  {
                    label: 'Activity',
                    value: 'activity',
                  },
                  {
                    label: 'Practice',
                    value: 'practice',
                  },
                ]"
                value-key="value"
                label-key="label"
                class="w-full"
              />
            </UFormField>

            <UFormField
              label="Instructions"
              name="instructions"
              help="Students will read these instructions before taking the assessment."
            >
              <UTextarea
                v-model="state.instructions"
                :rows="7"
                class="w-full"
                placeholder="Write clear assessment instructions."
              />
            </UFormField>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <div>
              <h2 class="font-bold text-highlighted">
                Delivery workflow
              </h2>

              <p class="mt-1 text-sm text-muted">
                Class scheduling is completed after the questions are ready and the assessment is published.
              </p>
            </div>
          </template>

          <div class="grid gap-4 sm:grid-cols-3">
            <div class="rounded-xl border border-default bg-elevated p-4">
              <UIcon
                name="i-lucide-file-plus-2"
                class="size-5 text-primary"
              />

              <p class="mt-3 font-bold text-highlighted">
                1. Create draft
              </p>

              <p class="mt-1 text-sm leading-6 text-muted">
                Save the assessment in your private library.
              </p>
            </div>

            <div class="rounded-xl border border-default bg-elevated p-4">
              <UIcon
                name="i-lucide-list-checks"
                class="size-5 text-primary"
              />

              <p class="mt-3 font-bold text-highlighted">
                2. Add and publish
              </p>

              <p class="mt-1 text-sm leading-6 text-muted">
                Complete the questions and publish the reusable assessment.
              </p>
            </div>

            <div class="rounded-xl border border-default bg-elevated p-4">
              <UIcon
                name="i-lucide-calendar-clock"
                class="size-5 text-primary"
              />

              <p class="mt-3 font-bold text-highlighted">
                3. Schedule classes
              </p>

              <p class="mt-1 text-sm leading-6 text-muted">
                Set a start and closing date for one or more classes.
              </p>
            </div>
          </div>
        </UCard>
      </div>

      <div class="space-y-6">
        <UCard>
          <template #header>
            <h2 class="font-bold text-highlighted">
              Assessment settings
            </h2>
          </template>

          <div class="space-y-5">
            <UFormField
              label="Scoring mode"
              name="scoringMode"
            >
              <USelect
                v-model="state.scoringMode"
                :items="[
                  {
                    label: 'Standard scoring',
                    value: 'standard',
                  },
                  {
                    label: 'Speed bonus',
                    value: 'speed_bonus',
                  },
                ]"
                value-key="value"
                label-key="label"
                class="w-full"
              />
            </UFormField>

            <UFormField
              label="Result visibility"
              name="resultVisibility"
            >
              <USelect
                v-model="state.resultVisibility"
                :items="[
                  {
                    label: 'Hide result',
                    value: 'hidden',
                  },
                  {
                    label: 'Show score only',
                    value: 'score_only',
                  },
                  {
                    label: 'Show score and answer review',
                    value: 'score_and_answers',
                  },
                ]"
                value-key="value"
                label-key="label"
                class="w-full"
              />
            </UFormField>

            <UFormField
              label="Overall time limit in minutes"
              name="overallTimeLimitMinutes"
              help="Leave empty when each question will use its own timer."
            >
              <UInput
                v-model.number="state.overallTimeLimitMinutes"
                type="number"
                min="1"
                max="360"
                class="w-full"
              />
            </UFormField>

            <USeparator />

            <div class="space-y-4">
              <div class="flex items-start justify-between gap-5">
                <div>
                  <p class="font-semibold text-highlighted">
                    Randomize questions
                  </p>
                  <p class="mt-1 text-sm text-muted">
                    Present questions in a different order.
                  </p>
                </div>

                <USwitch
                  v-model="state.randomizeQuestions"
                />
              </div>

              <div class="flex items-start justify-between gap-5">
                <div>
                  <p class="font-semibold text-highlighted">
                    Randomize answer choices
                  </p>
                  <p class="mt-1 text-sm text-muted">
                    Shuffle choices for each student.
                  </p>
                </div>

                <USwitch
                  v-model="state.randomizeOptions"
                />
              </div>

              <div class="flex items-start justify-between gap-5">
                <div>
                  <p class="font-semibold text-highlighted">
                    Allow backtracking
                  </p>
                  <p class="mt-1 text-sm text-muted">
                    Students may return to earlier questions.
                  </p>
                </div>

                <USwitch
                  v-model="state.allowBacktracking"
                />
              </div>

              <div class="flex items-start justify-between gap-5">
                <div>
                  <p class="font-semibold text-highlighted">
                    Leaderboard available
                  </p>
                  <p class="mt-1 text-sm text-muted">
                    A host may enable ranking in a future session.
                  </p>
                </div>

                <USwitch
                  v-model="state.leaderboardEnabled"
                />
              </div>
            </div>
          </div>
        </UCard>

        <UButton
          type="submit"
          block
          size="lg"
          :loading="isSubmitting"
        >
          Create Draft
        </UButton>

        <UButton
          to="/instructor/assessments"
          block
          color="neutral"
          variant="outline"
          size="lg"
        >
          Cancel
        </UButton>
      </div>
    </UForm>
  </div>
</template>
