<script setup lang="ts">
import type {
  AssessmentClassOption,
  AssessmentWithClassroom,
} from "~/types/assessment";

definePageMeta({
  layout: "instructor",
});

useSeoMeta({
  title: "Assign assessment",
});

const route = useRoute();
const toast = useToast();

const assessmentId = computed(
  () => String(route.params.id),
);

const {
  getInstructorAssessment,
  listClassOptions,
  setAssessmentAssignments,
} = useAssessments();

const assessment =
  ref<AssessmentWithClassroom | null>(null);

const classOptions =
  ref<AssessmentClassOption[]>([]);

const selectedClassroomIds =
  ref<string[]>([]);

const isLoading = ref(true);
const isSaving = ref(false);
const errorMessage = ref("");

const isArchived = computed(
  () => assessment.value?.status === "archived",
);

async function loadData(): Promise<void> {
  isLoading.value = true;
  errorMessage.value = "";

  const [
    assessmentResult,
    classResult,
  ] = await Promise.all([
    getInstructorAssessment(
      assessmentId.value,
    ),
    listClassOptions(),
  ]);

  if (
    assessmentResult.error
    || !assessmentResult.data
  ) {
    errorMessage.value =
      assessmentResult.error
      || "Unable to load the assessment.";

    isLoading.value = false;
    return;
  }

  if (
    classResult.error
    || !classResult.data
  ) {
    errorMessage.value =
      classResult.error
      || "Unable to load active classes.";

    isLoading.value = false;
    return;
  }

  assessment.value =
    assessmentResult.data.assessment;

  classOptions.value =
    classResult.data.classes;

  selectedClassroomIds.value =
    assessment.value.assignedClassrooms.map(
      (classroom) => classroom.id,
    );

  isLoading.value = false;
}

async function saveAssignments(): Promise<void> {
  if (!assessment.value) {
    return;
  }

  isSaving.value = true;
  errorMessage.value = "";

  const result =
    await setAssessmentAssignments(
      assessment.value.id,
      selectedClassroomIds.value,
    );

  if (
    result.error
    || !result.data
  ) {
    errorMessage.value =
      result.error
      || "Unable to update class assignments.";

    isSaving.value = false;
    return;
  }

  assessment.value =
    result.data.assessment;

  selectedClassroomIds.value =
    assessment.value.assignedClassrooms.map(
      (classroom) => classroom.id,
    );

  toast.add({
    title:
      "Class assignments updated",
    description:
      result.data.message,
    color:
      "success",
  });

  isSaving.value = false;
}

onMounted(
  loadData,
);
</script>

<template>
  <div class="page-stack">
    <PageHeader
      eyebrow="Class availability"
      :title="assessment?.title || 'Assign assessment'"
      description="Choose which of your classes can access this published assessment."
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
      </template>
    </PageHeader>

    <UAlert
      v-if="errorMessage"
      color="error"
      variant="soft"
      title="Class assignments could not be updated"
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
      <UAlert
        v-if="isArchived"
        color="warning"
        variant="soft"
        title="Archived assessment"
        description="Restore this assessment before changing its class availability."
      />

      <div class="grid gap-6 xl:grid-cols-[1fr_330px]">
        <UCard>
          <template #header>
            <div>
              <h2 class="font-bold text-highlighted">
                Available classes
              </h2>

              <p class="mt-1 text-sm text-muted">
                Assignment is independent from the questions and publication status.
              </p>
            </div>
          </template>

          <AssessmentClassPicker
            v-model="selectedClassroomIds"
            :classes="classOptions"
            :disabled="isArchived"
          />
        </UCard>

        <div class="space-y-6">
          <UCard>
            <template #header>
              <h2 class="font-bold text-highlighted">
                Availability summary
              </h2>
            </template>

            <dl class="space-y-4 text-sm">
              <div class="flex justify-between gap-4">
                <dt class="text-muted">
                  Assessment status
                </dt>

                <dd>
                  <StatusPill
                    :status="assessment.status"
                  />
                </dd>
              </div>

              <div class="flex justify-between gap-4">
                <dt class="text-muted">
                  Selected classes
                </dt>

                <dd class="font-bold text-highlighted">
                  {{ selectedClassroomIds.length }}
                </dd>
              </div>

              <div class="flex justify-between gap-4">
                <dt class="text-muted">
                  Location
                </dt>

                <dd class="text-right font-semibold text-highlighted">
                  {{
                    selectedClassroomIds.length > 0
                      ? "Assigned to classes"
                      : "My Assessment Library"
                  }}
                </dd>
              </div>
            </dl>
          </UCard>

          <UAlert
            color="info"
            variant="soft"
            title="Student visibility"
            description="Students see this assessment only after it is published and assigned to a class where they have an active membership."
          />

          <UButton
            block
            size="lg"
            icon="i-lucide-save"
            :loading="isSaving"
            :disabled="isArchived"
            @click="saveAssignments"
          >
            Save Class Assignments
          </UButton>

          <UButton
            to="/instructor/assessments"
            block
            color="neutral"
            variant="outline"
            size="lg"
          >
            Return to Assessments
          </UButton>
        </div>
      </div>
    </template>
  </div>
</template>
