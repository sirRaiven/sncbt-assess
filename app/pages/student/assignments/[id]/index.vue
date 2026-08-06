<script setup lang="ts">
import type {
  StudentAssessmentScheduleDetail,
} from "~/types/assessment-schedule";

definePageMeta({
  layout: "student",
});

useSeoMeta({
  title: "Assessment details",
});

const route = useRoute();

const assignmentId = computed(
  () => String(route.params.id),
);

const {
  getStudentAssignment,
} = useAssessmentSchedules();

const detail =
  ref<StudentAssessmentScheduleDetail | null>(
    null,
  );

const isLoading = ref(true);
const errorMessage = ref("");

function formatDate(
  value: string,
): string {
  return new Intl.DateTimeFormat(
    "en-PH",
    {
      dateStyle: "full",
      timeStyle: "short",
    },
  ).format(
    new Date(value),
  );
}

async function loadAssignment(): Promise<void> {
  isLoading.value = true;
  errorMessage.value = "";

  const result =
    await getStudentAssignment(
      assignmentId.value,
    );

  if (
    result.error
    || !result.data
  ) {
    errorMessage.value =
      result.error
      || "Unable to load the scheduled assessment.";

    isLoading.value = false;
    return;
  }

  detail.value =
    result.data;

  isLoading.value = false;
}

onMounted(loadAssignment);
</script>

<template>
  <div class="page-stack">
    <UAlert
      v-if="errorMessage"
      color="error"
      variant="soft"
      title="Assessment is unavailable"
      :description="errorMessage"
    >
      <template #actions>
        <UButton
          to="/student/assessments"
          color="error"
          variant="soft"
        >
          Return to Assessments
        </UButton>
      </template>
    </UAlert>

    <div
      v-if="isLoading"
      class="space-y-5"
    >
      <USkeleton class="h-44 rounded-xl" />
      <USkeleton class="h-96 rounded-xl" />
    </div>

    <template v-else-if="detail">
      <PageHeader
        eyebrow="Scheduled class assessment"
        :title="detail.assignment.title"
        :description="`${detail.assignment.subjectCode} · ${detail.assignment.classroom.section}`"
      >
        <template #actions>
          <StatusPill
            :status="detail.assignment.status"
          />
        </template>
      </PageHeader>

      <UCard>
        <template #header>
          <h2 class="font-bold text-highlighted">
            Before you begin
          </h2>
        </template>

        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div class="rounded-xl bg-elevated p-4 text-center">
            <p class="text-xs text-muted">
              Questions
            </p>

            <p class="mt-2 text-2xl font-black text-highlighted">
              {{ detail.assignment.questionCount }}
            </p>
          </div>

          <div class="rounded-xl bg-elevated p-4 text-center">
            <p class="text-xs text-muted">
              Total points
            </p>

            <p class="mt-2 text-2xl font-black text-highlighted">
              {{ detail.assignment.totalPoints }}
            </p>
          </div>

          <div class="rounded-xl bg-elevated p-4 text-center sm:col-span-2 xl:col-span-1">
            <p class="text-xs text-muted">
              Opens
            </p>

            <p class="mt-2 text-sm font-black text-highlighted">
              {{ formatDate(detail.assignment.startsAt) }}
            </p>
          </div>

          <div class="rounded-xl bg-elevated p-4 text-center sm:col-span-2 xl:col-span-1">
            <p class="text-xs text-muted">
              Closes
            </p>

            <p class="mt-2 text-sm font-black text-highlighted">
              {{ formatDate(detail.assignment.endsAt) }}
            </p>
          </div>
        </div>

        <USeparator class="my-6" />

        <div>
          <h3 class="font-bold text-highlighted">
            Instructor instructions
          </h3>

          <p class="mt-3 whitespace-pre-line text-sm leading-7 text-muted">
            {{
              detail.assignment.instructions
              || "Read every question carefully and submit only when you are ready."
            }}
          </p>
        </div>

        <UAlert
          v-if="detail.assignment.status === 'scheduled'"
          class="mt-6"
          color="info"
          variant="soft"
          title="This assessment has not opened yet"
          :description="`Access opens automatically on ${formatDate(detail.assignment.startsAt)}.`"
        />

        <UAlert
          v-else-if="detail.assignment.status === 'closed'"
          class="mt-6"
          color="neutral"
          variant="soft"
          title="This assessment is closed"
          :description="`The availability window ended on ${formatDate(detail.assignment.endsAt)}.`"
        />

        <UAlert
          v-else
          class="mt-6"
          color="success"
          variant="soft"
          title="Assessment access is open"
          :description="`You may begin until ${formatDate(detail.assignment.endsAt)}. The secure question player is the next implementation phase.`"
        />

        <UButton
          block
          size="lg"
          class="mt-6"
          icon="i-lucide-play"
          :disabled="true"
        >
          Secure Player Coming Next
        </UButton>
      </UCard>
    </template>
  </div>
</template>
