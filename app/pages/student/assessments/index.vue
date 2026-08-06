<script setup lang="ts">
import type {
  AssessmentAvailabilityStatus,
  StudentScheduledAssessment,
} from "~/types/assessment-schedule";

definePageMeta({
  layout: "student",
});

useSeoMeta({
  title: "Assessments",
});

const {
  listStudentAssessments,
} = useAssessmentSchedules();

const assessments =
  ref<StudentScheduledAssessment[]>([]);

const activeFilter =
  ref<"all" | AssessmentAvailabilityStatus>(
    "all",
  );

const isLoading = ref(true);
const errorMessage = ref("");

const filterItems: Array<{
  label: string;
  value: "all" | AssessmentAvailabilityStatus;
}> = [
  {
    label: "All",
    value: "all",
  },
  {
    label: "Open",
    value: "open",
  },
  {
    label: "Upcoming",
    value: "scheduled",
  },
  {
    label: "Closed",
    value: "closed",
  },
];

const filteredAssessments = computed(
  () => {
    if (
      activeFilter.value
      === "all"
    ) {
      return assessments.value;
    }

    return assessments.value.filter(
      (assessment) =>
        assessment.status
        === activeFilter.value,
    );
  },
);

const counts = computed(
  () => ({
    open:
      assessments.value.filter(
        (item) =>
          item.status === "open",
      ).length,
    scheduled:
      assessments.value.filter(
        (item) =>
          item.status === "scheduled",
      ).length,
    closed:
      assessments.value.filter(
        (item) =>
          item.status === "closed",
      ).length,
  }),
);

function setFilter(
  value: "all" | AssessmentAvailabilityStatus,
): void {
  activeFilter.value = value;
}

function formatDate(
  value: string,
): string {
  return new Intl.DateTimeFormat(
    "en-PH",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(
    new Date(value),
  );
}

function typeLabel(
  value: string,
): string {
  return value
    .split("_")
    .map(
      (part) =>
        part.charAt(0).toUpperCase()
        + part.slice(1),
    )
    .join(" ");
}

function availabilityMessage(
  assessment: StudentScheduledAssessment,
): string {
  if (
    assessment.status
    === "open"
  ) {
    return `Open now · Closes ${formatDate(assessment.endsAt)}`;
  }

  if (
    assessment.status
    === "scheduled"
  ) {
    return `Opens ${formatDate(assessment.startsAt)}`;
  }

  return `Closed ${formatDate(assessment.endsAt)}`;
}

async function loadAssessments(): Promise<void> {
  isLoading.value = true;
  errorMessage.value = "";

  const result =
    await listStudentAssessments();

  if (
    result.error
    || !result.data
  ) {
    errorMessage.value =
      result.error
      || "Unable to load scheduled assessments.";

    isLoading.value = false;
    return;
  }

  assessments.value =
    result.data.assessments;

  isLoading.value = false;
}

onMounted(loadAssessments);
</script>

<template>
  <div class="page-stack">
    <PageHeader
      eyebrow="Class assessments"
      title="Assessments"
      description="Published assessments assigned to your classes appear here automatically. No session code is required for scheduled access."
    >
      <template #actions>
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-refresh-cw"
          :loading="isLoading"
          @click="loadAssessments"
        >
          Refresh
        </UButton>
      </template>
    </PageHeader>

    <UAlert
      v-if="errorMessage"
      color="error"
      variant="soft"
      title="Assessments could not be loaded"
      :description="errorMessage"
    />

    <section class="grid gap-4 sm:grid-cols-3">
      <StatCard
        label="Open now"
        :value="String(counts.open)"
        icon="i-lucide-unlock"
        tone="success"
      />

      <StatCard
        label="Upcoming"
        :value="String(counts.scheduled)"
        icon="i-lucide-calendar-clock"
        tone="info"
      />

      <StatCard
        label="Closed"
        :value="String(counts.closed)"
        icon="i-lucide-lock"
        tone="neutral"
      />
    </section>

    <UCard>
      <div class="flex flex-wrap gap-2">
        <UButton
          v-for="item in filterItems"
          :key="item.value"
          :color="activeFilter === item.value ? 'primary' : 'neutral'"
          :variant="activeFilter === item.value ? 'soft' : 'ghost'"
          @click="setFilter(item.value)"
        >
          {{ item.label }}
        </UButton>
      </div>
    </UCard>

    <div
      v-if="isLoading"
      class="grid gap-4 xl:grid-cols-2"
    >
      <USkeleton
        v-for="number in 4"
        :key="number"
        class="h-72 rounded-xl"
      />
    </div>

    <EmptyPanel
      v-else-if="filteredAssessments.length === 0"
      icon="i-lucide-clipboard-list"
      title="No assessments in this view"
      description="Scheduled assessments from your approved classes will appear here."
    />

    <div
      v-else
      class="grid gap-4 xl:grid-cols-2"
    >
      <UCard
        v-for="assessment in filteredAssessments"
        :key="assessment.assignmentId"
      >
        <div class="flex items-start gap-4">
          <div class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <UIcon
              name="i-lucide-clipboard-check"
              class="size-5"
            />
          </div>

          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 class="font-black text-highlighted">
                  {{ assessment.title }}
                </h2>

                <p class="mt-1 text-sm text-muted">
                  {{ assessment.subjectCode }}
                  ·
                  {{ assessment.classroom.section }}
                  ·
                  {{ typeLabel(assessment.assessmentType) }}
                </p>
              </div>

              <StatusPill :status="assessment.status" />
            </div>

            <div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div class="rounded-lg bg-elevated p-3">
                <p class="text-xs text-muted">
                  Questions
                </p>

                <p class="mt-1 font-black text-highlighted">
                  {{ assessment.questionCount }}
                </p>
              </div>

              <div class="rounded-lg bg-elevated p-3">
                <p class="text-xs text-muted">
                  Points
                </p>

                <p class="mt-1 font-black text-highlighted">
                  {{ assessment.totalPoints }}
                </p>
              </div>

              <div class="rounded-lg bg-elevated p-3 sm:col-span-1 col-span-2">
                <p class="text-xs text-muted">
                  Availability
                </p>

                <p class="mt-1 text-xs font-bold text-highlighted">
                  {{ availabilityMessage(assessment) }}
                </p>
              </div>
            </div>

            <UButton
              :to="`/student/assignments/${assessment.assignmentId}`"
              class="mt-5"
              :color="assessment.status === 'open' ? 'primary' : 'neutral'"
              :variant="assessment.status === 'open' ? 'solid' : 'outline'"
              :icon="assessment.status === 'open' ? 'i-lucide-play' : 'i-lucide-eye'"
            >
              {{
                assessment.status === "open"
                  ? "Open Assessment"
                  : "View Details"
              }}
            </UButton>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
