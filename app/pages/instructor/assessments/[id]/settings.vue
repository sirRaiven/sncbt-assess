<script setup lang="ts">
import type {
  FormSubmitEvent,
} from "@nuxt/ui";

import {
  z,
} from "zod";

import type {
  AssessmentWithClassroom,
} from "~/types/assessment";

definePageMeta({
  layout: "instructor",
});

useSeoMeta({
  title: "Assessment settings",
});

const route = useRoute();
const toast = useToast();

const assessmentId = computed(
  () => String(route.params.id),
);

const {
  getInstructorAssessment,
  updateAssessment,
  publishAssessment,
  returnAssessmentToDraft,
  archiveAssessment,
  restoreAssessment,
  duplicateAssessment,
} = useAssessments();

const assessment =
  ref<AssessmentWithClassroom | null>(null);

const isLoading = ref(true);
const isSaving = ref(false);
const isRunningAction = ref(false);
const errorMessage = ref("");

const schema = z.object({
  title: z
    .string()
    .trim()
    .min(3)
    .max(200),

  subjectName: z
    .string()
    .trim()
    .min(2)
    .max(150),

  subjectCode: z
    .string()
    .trim()
    .min(2)
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

type SettingsSchema =
  z.output<typeof schema>;

const state = reactive<SettingsSchema>({
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

const isDraft = computed(
  () => assessment.value?.status === "draft",
);

const publishReady = computed(
  () => Boolean(
    assessment.value
    && assessment.value.question_count > 0
    && Number(
      assessment.value.total_points,
    ) > 0,
  ),
);

function fillState(
  value: AssessmentWithClassroom,
): void {
  state.title =
    value.title;
  state.subjectName =
    value.subject_name;
  state.subjectCode =
    value.subject_code;
  state.instructions =
    value.instructions
    || "";
  state.assessmentType =
    value.assessment_type;
  state.scoringMode =
    value.scoring_mode;
  state.randomizeQuestions =
    value.randomize_questions;
  state.randomizeOptions =
    value.randomize_options;
  state.resultVisibility =
    value.result_visibility;
  state.leaderboardEnabled =
    value.leaderboard_enabled;
  state.allowBacktracking =
    value.allow_backtracking;
  state.overallTimeLimitMinutes =
    value.overall_time_limit_seconds
      ? Math.round(
          value.overall_time_limit_seconds
          / 60,
        )
      : null;
}

async function loadData(): Promise<void> {
  isLoading.value = true;
  errorMessage.value = "";

  const result =
    await getInstructorAssessment(
      assessmentId.value,
    );

  if (
    result.error
    || !result.data
  ) {
    errorMessage.value =
      result.error
      || "Unable to load the assessment.";

    isLoading.value = false;
    return;
  }

  assessment.value =
    result.data.assessment;

  fillState(
    assessment.value,
  );

  isLoading.value = false;
}

async function save(
  event: FormSubmitEvent<SettingsSchema>,
): Promise<void> {
  if (!assessment.value) {
    return;
  }

  isSaving.value = true;
  errorMessage.value = "";

  const result =
    await updateAssessment(
      assessment.value.id,
      {
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
      },
    );

  if (
    result.error
    || !result.data
  ) {
    errorMessage.value =
      result.error
      || "Unable to update the assessment.";

    isSaving.value = false;
    return;
  }

  toast.add({
    title:
      "Assessment saved",
    description:
      result.data.message,
    color:
      "success",
  });

  await loadData();
  isSaving.value = false;
}

async function runAction(
  action:
    | "publish"
    | "draft"
    | "archive"
    | "restore"
    | "duplicate",
): Promise<void> {
  if (!assessment.value) {
    return;
  }

  isRunningAction.value = true;

  let result;

  if (action === "publish") {
    result =
      await publishAssessment(
        assessment.value.id,
      );
  } else if (action === "draft") {
    result =
      await returnAssessmentToDraft(
        assessment.value.id,
      );
  } else if (action === "archive") {
    result =
      await archiveAssessment(
        assessment.value.id,
      );
  } else if (action === "restore") {
    result =
      await restoreAssessment(
        assessment.value.id,
      );
  } else {
    result =
      await duplicateAssessment(
        assessment.value.id,
      );
  }

  if (
    result.error
    || !result.data
  ) {
    toast.add({
      title:
        "Assessment action failed",
      description:
        result.error
        || "The action could not be completed.",
      color:
        "error",
    });

    isRunningAction.value = false;
    return;
  }

  toast.add({
    title:
      "Assessment updated",
    description:
      result.data.message,
    color:
      "success",
  });

  if (action === "duplicate") {
    await navigateTo(
      `/instructor/assessments/${result.data.assessment.id}/settings`,
    );

    return;
  }

  await loadData();
  isRunningAction.value = false;
}

onMounted(
  loadData,
);
</script>

<template>
  <div class="page-stack">
    <PortalBackButton
      :fallback-to="`/instructor/assessments/${assessmentId}/edit`"
    />
    <PageHeader
      eyebrow="Assessment settings"
      :title="assessment?.title || 'Assessment'"
      description="Manage reusable assessment content, behavior, publication, and class availability."
    >
      <template #actions>
        <UButton
          :to="`/instructor/assessments/${assessmentId}/edit`"
          icon="i-lucide-list-plus"
        >
          Question Builder
        </UButton>

        <UButton
          :to="`/instructor/assessments/${assessmentId}/assign`"
          color="neutral"
          variant="outline"
          icon="i-lucide-users-round"
        >
          Assign Classes
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
          color="neutral"
          variant="outline"
          icon="i-lucide-copy-plus"
          :loading="isRunningAction"
          @click="runAction('duplicate')"
        >
          Duplicate
        </UButton>
      </template>
    </PageHeader>

    <UAlert
      v-if="errorMessage"
      color="error"
      variant="soft"
      title="Assessment settings error"
      :description="errorMessage"
    />

    <div
      v-if="isLoading"
      class="space-y-5"
    >
      <USkeleton class="h-32 rounded-xl" />
      <USkeleton class="h-96 rounded-xl" />
    </div>

    <template v-else-if="assessment">
      <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Status"
          :value="
            assessment.status.charAt(0).toUpperCase()
            + assessment.status.slice(1)
          "
          icon="i-lucide-file-check-2"
          tone="primary"
        />

        <StatCard
          label="Questions"
          :value="String(assessment.question_count)"
          icon="i-lucide-list-checks"
          tone="info"
        />

        <StatCard
          label="Total points"
          :value="String(assessment.total_points)"
          icon="i-lucide-award"
          tone="success"
        />

        <StatCard
          label="Assigned classes"
          :value="String(assessment.assignedClassrooms.length)"
          icon="i-lucide-users-round"
          tone="neutral"
        />
      </section>

      <UAlert
        v-if="assessment.status === 'published'"
        color="success"
        variant="soft"
        title="Published assessment"
        description="The assessment content is locked. Class assignments may still be changed from Assign Classes."
      />

      <UAlert
        v-if="assessment.status === 'archived'"
        color="warning"
        variant="soft"
        title="Archived assessment"
        description="Restore this assessment before editing content or class availability."
      />

      <UAlert
        v-if="assessment.status === 'draft' && !publishReady"
        color="info"
        variant="soft"
        title="Add valid questions before publishing"
        description="Open the Question Builder and save at least one complete Multiple Choice or Checkbox question."
      />

      <UAlert
        v-if="assessment.assignedClassrooms.length === 0"
        color="neutral"
        variant="soft"
        title="Saved in My Assessment Library"
        description="This assessment is not currently available to a class. You may publish it first and assign it later."
      >
        <template #actions>
          <UButton
            :to="`/instructor/assessments/${assessmentId}/assign`"
            color="neutral"
            variant="soft"
            icon="i-lucide-users-round"
          >
            Assign Classes
          </UButton>
        </template>
      </UAlert>

      <UForm
        :schema="schema"
        :state="state"
        class="grid gap-6 xl:grid-cols-[1fr_370px]"
        @submit="save"
      >
        <UCard>
          <template #header>
            <h2 class="font-bold text-highlighted">
              Academic information
            </h2>
          </template>

          <fieldset
            class="space-y-5"
            :disabled="!isDraft"
          >
            <UFormField
              label="Assessment title"
              name="title"
              required
            >
              <UInput
                v-model="state.title"
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
                  class="w-full"
                />
              </UFormField>
            </div>

            <UFormField
              label="Assessment type"
              name="assessmentType"
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
            >
              <UTextarea
                v-model="state.instructions"
                :rows="8"
                class="w-full"
              />
            </UFormField>
          </fieldset>
        </UCard>

        <div class="space-y-6">
          <UCard>
            <template #header>
              <h2 class="font-bold text-highlighted">
                Class availability
              </h2>
            </template>

            <div class="space-y-3">
              <div
                v-if="assessment.assignedClassrooms.length === 0"
                class="rounded-xl border border-dashed border-default p-4 text-sm text-muted"
              >
                No classes are currently assigned.
              </div>

              <template v-else>
                <div
                  v-for="classroom in assessment.assignedClassrooms"
                  :key="classroom.id"
                  class="rounded-xl border border-default p-3"
                >
                  <p class="font-semibold text-highlighted">
                    {{ classroom.subjectCode }}
                    ·
                    {{ classroom.section }}
                  </p>

                  <p class="mt-1 text-xs text-muted">
                    {{ classroom.name }}
                  </p>
                </div>
              </template>

              <UButton
                :to="`/instructor/assessments/${assessmentId}/assign`"
                block
                color="neutral"
                variant="outline"
                icon="i-lucide-users-round"
              >
                Manage Class Assignments
              </UButton>
            </div>
          </UCard>

          <UCard>
            <template #header>
              <h2 class="font-bold text-highlighted">
                Delivery and result settings
              </h2>
            </template>

            <fieldset
              class="space-y-5"
              :disabled="!isDraft"
            >
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
                <div class="flex items-center justify-between gap-5">
                  <span class="font-semibold text-highlighted">
                    Randomize questions
                  </span>

                  <USwitch
                    v-model="state.randomizeQuestions"
                  />
                </div>

                <div class="flex items-center justify-between gap-5">
                  <span class="font-semibold text-highlighted">
                    Randomize choices
                  </span>

                  <USwitch
                    v-model="state.randomizeOptions"
                  />
                </div>

                <div class="flex items-center justify-between gap-5">
                  <span class="font-semibold text-highlighted">
                    Allow backtracking
                  </span>

                  <USwitch
                    v-model="state.allowBacktracking"
                  />
                </div>

                <div class="flex items-center justify-between gap-5">
                  <span class="font-semibold text-highlighted">
                    Leaderboard available
                  </span>

                  <USwitch
                    v-model="state.leaderboardEnabled"
                  />
                </div>
              </div>
            </fieldset>
          </UCard>

          <UButton
            v-if="isDraft"
            type="submit"
            block
            size="lg"
            :loading="isSaving"
          >
            Save Settings
          </UButton>

          <UButton
            v-if="assessment.status === 'draft'"
            block
            color="success"
            size="lg"
            icon="i-lucide-send"
            :loading="isRunningAction"
            :disabled="!publishReady"
            @click="runAction('publish')"
          >
            Publish Assessment
          </UButton>

          <UButton
            v-if="assessment.status === 'published'"
            block
            color="warning"
            variant="soft"
            size="lg"
            icon="i-lucide-undo-2"
            :loading="isRunningAction"
            @click="runAction('draft')"
          >
            Return to Draft
          </UButton>

          <UButton
            v-if="assessment.status === 'archived'"
            block
            color="success"
            variant="soft"
            size="lg"
            icon="i-lucide-archive-restore"
            :loading="isRunningAction"
            @click="runAction('restore')"
          >
            Restore as Draft
          </UButton>

          <UButton
            v-else
            block
            color="neutral"
            variant="outline"
            size="lg"
            icon="i-lucide-archive"
            :loading="isRunningAction"
            @click="runAction('archive')"
          >
            Archive Assessment
          </UButton>
        </div>
      </UForm>
    </template>
  </div>
</template>
