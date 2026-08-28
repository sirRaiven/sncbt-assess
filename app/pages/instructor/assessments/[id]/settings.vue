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

  allowBacktracking:
    z.boolean(),

  requireExamPermit:
    z.boolean(),
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
  resultVisibility: "score_and_answers",
  allowBacktracking: true,
  requireExamPermit: true,
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
  state.allowBacktracking =
    value.allow_backtracking;
  state.requireExamPermit =
    value.require_exam_permit;
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
        allowBacktracking:
          event.data.allowBacktracking,
        requireExamPermit:
          event.data.requireExamPermit,
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

  if (
    action === "draft"
    && "createdRevision" in result.data
    && result.data.createdRevision
  ) {
    await navigateTo(
      `/instructor/assessments/${result.data.assessment.id}/edit`,
    );

    return;
  }

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
    <PageHeader
      :breadcrumbs="[
        { label: 'Overview', to: '/instructor/dashboard', icon: 'i-lucide-layout-dashboard' },
        { label: 'Assessments', to: '/instructor/assessments' },
        { label: assessment?.title || 'Assessment', to: `/instructor/assessments/${assessmentId}/edit` },
        { label: 'Settings' },
      ]"
      eyebrow="Assessment settings"
      :title="assessment?.title || 'Assessment'"
      description="Manage reusable assessment content, behavior, publication, and class availability."
    >
      <template #actions>
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

    <AssessmentWorkspaceNavigation
      :assessment-id="assessmentId"
      active="settings"
    />

    <UAlert
      v-if="errorMessage"
      color="error"
      variant="soft"
      title="Unable to load assessment settings"
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
        description="Open the Question Builder and save at least one complete supported question."
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

            <div
              v-if="state.assessmentType === 'examination'"
              class="flex items-start justify-between gap-4 rounded-xl border border-default bg-elevated/35 p-4"
            >
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <UIcon
                    name="i-lucide-badge-check"
                    class="size-4 text-primary"
                  />

                  <p class="font-semibold text-highlighted">
                    Require exam permit
                  </p>
                </div>

                <p class="mt-1 text-sm leading-5 text-muted">
                  Students must complete an exam access declaration before starting.
                </p>
              </div>

              <USwitch
                v-model="state.requireExamPermit"
                aria-label="Require exam permit before starting"
              />
            </div>

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
                      label: 'Show score + instant feedback',
                      value: 'score_and_answers',
                    },
                  ]"
                  value-key="value"
                  label-key="label"
                  class="w-full"
                />
              </UFormField>

              <UAlert
                v-if="state.scoringMode === 'speed_bonus'"
                color="primary"
                variant="soft"
                icon="i-lucide-gauge"
                title="How speed bonus works"
                description="Correct answers earn their full question points plus up to 20% extra. The bonus decreases smoothly as more of the question timer is used. Incorrect or unanswered questions receive no speed bonus."
              />

              <UAlert
                v-if="state.resultVisibility === 'hidden'"
                color="neutral"
                variant="soft"
                icon="i-lucide-eye-off"
                title="Results stay private"
                description="Students can submit normally, but they will not see their score or Correct/Incorrect feedback."
              />

              <UAlert
                v-else-if="state.resultVisibility === 'score_only'"
                color="info"
                variant="soft"
                icon="i-lucide-trophy"
                title="Score after submission"
                description="Students see their released score after submitting. Individual answers are not checked on screen while the assessment is active."
              />

              <UAlert
                v-else
                color="success"
                variant="soft"
                icon="i-lucide-circle-check-big"
                title="Instant answer feedback"
                description="After a student commits an answer, SNCBT Assess shows only Correct or Incorrect. The correct answer is never revealed. Once feedback is shown, that question is locked and cannot be changed."
              />

              <UAlert
                color="info"
                variant="soft"
                icon="i-lucide-timer"
                title="Assessment timing"
                description="Set each question's answer time in Questions, then set the class opening and closing schedule in Schedule."
              />

              <USeparator />

              <div class="space-y-4">
                <div class="flex items-center justify-between gap-5">
                  <span class="font-semibold text-highlighted">
                    Randomize questions
                  </span>

                  <USwitch
                    v-model="state.randomizeQuestions"
                    aria-label="Randomize questions"
                  />
                </div>

                <div class="flex items-center justify-between gap-5">
                  <span class="font-semibold text-highlighted">
                    Randomize choices
                  </span>

                  <USwitch
                    v-model="state.randomizeOptions"
                    aria-label="Randomize choices"
                  />
                </div>

                <div class="flex items-center justify-between gap-5">
                  <span class="font-semibold text-highlighted">
                    Allow backtracking
                  </span>

                  <USwitch
                    v-model="state.allowBacktracking"
                    aria-label="Allow backtracking"
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

          <p
            v-if="assessment.status === 'published'"
            class="text-xs leading-5 text-muted"
          >
            If Students already used this assessment, SNCBT Assess preserves that historical version and opens a new editable draft revision instead of changing past results.
          </p>

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
