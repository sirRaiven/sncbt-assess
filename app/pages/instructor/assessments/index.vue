<script setup lang="ts">
import type {
  AssessmentStatus,
  AssessmentWithClassroom,
} from "~/types/assessment";

definePageMeta({
  layout: "instructor",
});

useSeoMeta({
  title: "Assessments",
});

const toast = useToast();

const {
  listInstructorAssessments,
  duplicateAssessment,
  archiveAssessment,
  restoreAssessment,
  returnAssessmentToDraft,
} = useAssessments();

const assessments =
  ref<AssessmentWithClassroom[]>([]);

const isLoading = ref(true);
const busyAssessmentId =
  ref<string | null>(null);

const errorMessage = ref("");
const query = ref("");
const statusFilter = ref(
  "All statuses",
);

const counts = computed(() => ({
  all:
    assessments.value.length,
  draft:
    assessments.value.filter(
      (item) => item.status === "draft",
    ).length,
  published:
    assessments.value.filter(
      (item) => item.status === "published",
    ).length,
  unassigned:
    assessments.value.filter(
      (item) =>
        item.assignedClassrooms.length === 0,
    ).length,
}));

const filteredAssessments = computed(() => {
  const keyword =
    query.value
      .trim()
      .toLowerCase();

  return assessments.value.filter(
    (assessment) => {
      const assignedClassText =
        assessment.assignedClassrooms
          .map(
            (classroom) => [
              classroom.name,
              classroom.subjectCode,
              classroom.section,
            ].join(" "),
          )
          .join(" ");

      const matchesQuery =
        !keyword
        || [
          assessment.title,
          assessment.subject_name,
          assessment.subject_code,
          assignedClassText,
        ]
          .join(" ")
          .toLowerCase()
          .includes(keyword);

      const matchesStatus =
        statusFilter.value
          === "All statuses"
        || assessment.status
          === statusFilter.value
            .toLowerCase();

      return (
        matchesQuery
        && matchesStatus
      );
    },
  );
});

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

function assignmentLabel(
  assessment: AssessmentWithClassroom,
): string {
  const count =
    assessment.assignedClassrooms.length;

  if (count === 0) {
    return "Assessment Library";
  }

  if (count === 1) {
    return assessment.assignedClassrooms[0].section;
  }

  return `${count} classes`;
}

async function loadAssessments(): Promise<void> {
  isLoading.value = true;
  errorMessage.value = "";

  const result =
    await listInstructorAssessments();

  if (
    result.error
    || !result.data
  ) {
    errorMessage.value =
      result.error
      || "Unable to load your assessments.";

    isLoading.value = false;
    return;
  }

  assessments.value =
    result.data.assessments;

  isLoading.value = false;
}

async function runAction(
  assessment: AssessmentWithClassroom,
  action:
    | "duplicate"
    | "archive"
    | "restore"
    | "draft",
): Promise<void> {
  busyAssessmentId.value =
    assessment.id;

  let result;

  if (action === "duplicate") {
    result =
      await duplicateAssessment(
        assessment.id,
      );
  } else if (action === "archive") {
    result =
      await archiveAssessment(
        assessment.id,
      );
  } else if (action === "restore") {
    result =
      await restoreAssessment(
        assessment.id,
      );
  } else {
    result =
      await returnAssessmentToDraft(
        assessment.id,
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

    busyAssessmentId.value = null;
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

  await loadAssessments();
  busyAssessmentId.value = null;
}

function getStatusAction(
  status: AssessmentStatus,
): {
  label: string;
  icon: string;
  action:
    | "archive"
    | "restore"
    | "draft";
} {
  if (status === "archived") {
    return {
      label: "Restore",
      icon:
        "i-lucide-archive-restore",
      action:
        "restore",
    };
  }

  if (status === "published") {
    return {
      label: "Return to Draft",
      icon:
        "i-lucide-undo-2",
      action:
        "draft",
    };
  }

  return {
    label: "Archive",
    icon:
      "i-lucide-archive",
    action:
      "archive",
  };
}

onMounted(
  loadAssessments,
);
</script>

<template>
  <div class="page-stack">
    <PageHeader
      eyebrow="Reusable assessment library"
      title="Assessments"
      description="Create once, assign to any class, and reuse quizzes or examinations across sections."
    >
      <template #actions>
        <UButton
          to="/instructor/assessments/create"
          icon="i-lucide-plus"
        >
          Create Assessment
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

    <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="All assessments"
        :value="String(counts.all)"
        icon="i-lucide-clipboard-list"
        tone="primary"
      />

      <StatCard
        label="Drafts"
        :value="String(counts.draft)"
        icon="i-lucide-file-pen-line"
        tone="warning"
      />

      <StatCard
        label="Published"
        :value="String(counts.published)"
        icon="i-lucide-send"
        tone="success"
      />

      <StatCard
        label="Library only"
        :value="String(counts.unassigned)"
        icon="i-lucide-library"
        tone="neutral"
      />
    </section>

    <UCard>
      <div class="grid gap-3 lg:grid-cols-[1fr_220px_auto]">
        <UInput
          v-model="query"
          icon="i-lucide-search"
          placeholder="Search assessment, subject, or class"
          class="w-full"
        />

        <USelect
          v-model="statusFilter"
          :items="[
            'All statuses',
            'Draft',
            'Published',
            'Archived',
          ]"
          class="w-full"
        />

        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-refresh-cw"
          :loading="isLoading"
          @click="loadAssessments"
        >
          Refresh
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
      title="No assessments found"
      description="Create your first reusable assessment or adjust the current filters."
    >
      <template #actions>
        <UButton
          to="/instructor/assessments/create"
          icon="i-lucide-plus"
        >
          Create Assessment
        </UButton>
      </template>
    </EmptyPanel>

    <div
      v-else
      class="grid gap-4 xl:grid-cols-2"
    >
      <UCard
        v-for="assessment in filteredAssessments"
        :key="assessment.id"
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
              <div class="min-w-0">
                <h2 class="font-black text-highlighted">
                  {{ assessment.title }}
                </h2>

                <p class="mt-1 text-sm text-muted">
                  {{ assessment.subject_code }}
                  ·
                  {{ typeLabel(assessment.assessment_type) }}
                  ·
                  {{ assignmentLabel(assessment) }}
                </p>
              </div>

              <StatusPill
                :status="assessment.status"
              />
            </div>

            <div class="mt-4 flex flex-wrap gap-2">
              <UBadge
                v-if="assessment.assignedClassrooms.length === 0"
                color="neutral"
                variant="soft"
                icon="i-lucide-library"
              >
                My Assessment Library
              </UBadge>

              <template v-else>
                <UBadge
                  v-for="classroom in assessment.assignedClassrooms.slice(0, 3)"
                  :key="classroom.id"
                  color="primary"
                  variant="soft"
                >
                  {{ classroom.subjectCode }}
                  ·
                  {{ classroom.section }}
                </UBadge>
              </template>

              <UBadge
                v-if="assessment.assignedClassrooms.length > 3"
                color="neutral"
                variant="soft"
              >
                +{{ assessment.assignedClassrooms.length - 3 }} more
              </UBadge>
            </div>

            <div class="mt-5 grid grid-cols-3 gap-3">
              <div class="rounded-lg bg-elevated p-3">
                <p class="text-xs text-muted">
                  Questions
                </p>
                <p class="mt-1 font-black text-highlighted">
                  {{ assessment.question_count }}
                </p>
              </div>

              <div class="rounded-lg bg-elevated p-3">
                <p class="text-xs text-muted">
                  Points
                </p>
                <p class="mt-1 font-black text-highlighted">
                  {{ assessment.total_points }}
                </p>
              </div>

              <div class="rounded-lg bg-elevated p-3">
                <p class="text-xs text-muted">
                  Classes
                </p>
                <p class="mt-1 font-black text-highlighted">
                  {{ assessment.assignedClassrooms.length }}
                </p>
              </div>
            </div>

            <div class="mt-5 flex flex-wrap gap-2">
              <UButton
                v-if="assessment.status === 'published'"
                :to="`/instructor/sessions/create?assessmentId=${assessment.id}`"
                icon="i-lucide-radio-tower"
              >
                Start Live
              </UButton>

              <UButton
                :to="`/instructor/assessments/${assessment.id}/edit`"
                :color="
                  assessment.status === 'published'
                    ? 'neutral'
                    : 'primary'
                "
                :variant="
                  assessment.status === 'published'
                    ? 'outline'
                    : 'soft'
                "
                icon="i-lucide-list-plus"
              >
                Questions
              </UButton>

              <UButton
                v-if="assessment.status === 'draft'"
                :to="`/instructor/assessments/${assessment.id}/import`"
                color="neutral"
                variant="outline"
                icon="i-lucide-file-spreadsheet"
              >
                Import Excel
              </UButton>

              <UButton
                :to="`/instructor/assessments/${assessment.id}/assign`"
                color="neutral"
                variant="outline"
                icon="i-lucide-users-round"
              >
                Assign Classes
              </UButton>

              <UButton
                :to="`/instructor/assessments/${assessment.id}/settings`"
                color="neutral"
                variant="outline"
                icon="i-lucide-settings-2"
              >
                Settings
              </UButton>

              <UButton
                :to="`/instructor/assessments/${assessment.id}/preview`"
                color="neutral"
                variant="ghost"
                icon="i-lucide-eye"
              >
                Preview
              </UButton>

              <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-copy-plus"
                :loading="busyAssessmentId === assessment.id"
                @click="runAction(assessment, 'duplicate')"
              >
                Duplicate
              </UButton>

              <UButton
                :color="
                  assessment.status === 'archived'
                    ? 'success'
                    : 'neutral'
                "
                variant="ghost"
                :icon="getStatusAction(assessment.status).icon"
                :disabled="busyAssessmentId === assessment.id"
                @click="
                  runAction(
                    assessment,
                    getStatusAction(assessment.status).action,
                  )
                "
              >
                {{ getStatusAction(assessment.status).label }}
              </UButton>
            </div>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
