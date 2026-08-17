<script setup lang="ts">
import type {
  DropdownMenuItem,
} from "@nuxt/ui";

import type {
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

const assessmentActionModalOpen =
  ref(false);

const pendingAssessmentAction =
  ref<{
    assessment:
      AssessmentWithClassroom;
    action:
      | "archive"
      | "draft";
  } | null>(
    null,
  );

const pendingAssessmentTitle =
  computed(
    () =>
      pendingAssessmentAction.value
        ?.assessment.title
      || "this assessment",
  );

const assessmentActionTitle =
  computed(
    () =>
      pendingAssessmentAction.value
        ?.action
      === "archive"
        ? "Archive assessment?"
        : "Return assessment to draft?",
  );

const assessmentActionDescription =
  computed(
    () =>
      pendingAssessmentAction.value
        ?.action
      === "archive"
        ? `Archive ${pendingAssessmentTitle.value}? Scheduled class access will close and linked open live sessions will be cancelled safely.`
        : `Return ${pendingAssessmentTitle.value} to draft? Students will no longer receive published access until it is published again.`,
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
      if (
        assessment.status
        === "archived"
      ) {
        return false;
      }

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

function assessmentMenuItems(
  assessment: AssessmentWithClassroom,
): DropdownMenuItem[][] {
  const navigationItems:
    DropdownMenuItem[] = [];

  if (
    assessment.status
    === "published"
  ) {
    navigationItems.push({
      label:
        "Start Live",
      icon:
        "i-lucide-radio-tower",
      to:
        `/instructor/sessions/create?assessmentId=${assessment.id}`,
    });
  }

  navigationItems.push(
    {
      label:
        "Questions",
      icon:
        "i-lucide-list-plus",
      to:
        `/instructor/assessments/${assessment.id}/edit`,
    },
    {
      label:
        "Schedule Classes",
      icon:
        "i-lucide-calendar-clock",
      to:
        `/instructor/assessments/${assessment.id}/assign`,
    },
    {
      label:
        "Settings",
      icon:
        "i-lucide-settings-2",
      to:
        `/instructor/assessments/${assessment.id}/settings`,
    },
    {
      label:
        "Preview",
      icon:
        "i-lucide-eye",
      to:
        `/instructor/assessments/${assessment.id}/preview`,
    },
  );

  const managementItems:
    DropdownMenuItem[] = [
      {
        label:
          "Duplicate",
        icon:
          "i-lucide-copy-plus",
        disabled:
          busyAssessmentId.value
          === assessment.id,
        onSelect: () => {
          void runAction(
            assessment,
            "duplicate",
          );
        },
      },
    ];

  if (
    assessment.status
    === "published"
  ) {
    managementItems.push({
      label:
        "Return to Draft",
      icon:
        "i-lucide-undo-2",
      disabled:
        busyAssessmentId.value
        === assessment.id,
      onSelect: () => {
        requestAssessmentAction(
          assessment,
          "draft",
        );
      },
    });
  }

  const archiveItems:
    DropdownMenuItem[] = [
      {
        label:
          "Archive",
        icon:
          "i-lucide-archive",
        color:
          "warning",
        disabled:
          busyAssessmentId.value
          === assessment.id,
        onSelect: () => {
          requestAssessmentAction(
            assessment,
            "archive",
          );
        },
      },
    ];

  return [
    navigationItems,
    managementItems,
    archiveItems,
  ];
}

function requestAssessmentAction(
  assessment: AssessmentWithClassroom,
  action:
    | "archive"
    | "draft",
): void {
  pendingAssessmentAction.value = {
    assessment,
    action,
  };

  assessmentActionModalOpen.value =
    true;
}

async function confirmAssessmentAction(): Promise<void> {
  const pending =
    pendingAssessmentAction.value;

  if (!pending) {
    return;
  }

  await runAction(
    pending.assessment,
    pending.action,
  );

  assessmentActionModalOpen.value =
    false;

  pendingAssessmentAction.value =
    null;
}

async function runAction(
  assessment: AssessmentWithClassroom,
  action:
    | "duplicate"
    | "archive"
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

onMounted(
  loadAssessments,
);
</script>

<template>
  <div class="page-stack">
    <PageHeader
      :breadcrumbs="[
        { label: 'Overview', to: '/instructor/dashboard', icon: 'i-lucide-layout-dashboard' },
        { label: 'Assessments' },
      ]"
      eyebrow="Assessment library"
      title="Assessments"
      description="Create, organize, publish, and schedule assessments for your classes."
    >
      <template #actions>
        <UButton
          to="/instructor/archive?section=assessments"
          color="neutral"
          variant="outline"
          icon="i-lucide-archive"
        >
          Archive
        </UButton>

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
        label="Not scheduled"
        :value="String(counts.unassigned)"
        icon="i-lucide-calendar-off"
        tone="neutral"
      />
    </section>

    <UCard>
      <div class="grid gap-3 lg:grid-cols-[1fr_220px_auto]">
        <UInput
          v-model="query"
          icon="i-lucide-search"
          placeholder="Search assessment, subject, or class"
          aria-label="Search assessments"
          class="w-full"
        />

        <USelect
          v-model="statusFilter"
          :items="[
            'All statuses',
            'Draft',
            'Published',
          ]"
          aria-label="Filter assessments by status"
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
      class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
    >
      <UCard
        v-for="assessment in filteredAssessments"
        :key="assessment.id"
        class="overflow-hidden"
        :ui="{
          body: 'p-0 sm:p-0',
        }"
      >
        <div class="relative min-h-40 border-b border-default bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-5">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-2">
              <div class="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/15">
                <UIcon
                  name="i-lucide-clipboard-check"
                  class="size-5"
                />
              </div>

              <UBadge
                color="neutral"
                variant="soft"
              >
                {{ typeLabel(assessment.assessment_type) }}
              </UBadge>
            </div>

            <div class="flex items-center gap-1">
              <StatusPill
                :status="assessment.status"
              />

              <UDropdownMenu
                :items="assessmentMenuItems(assessment)"
                :content="{
                  align: 'end',
                  side: 'bottom',
                  sideOffset: 6,
                }"
                :ui="{
                  content: 'w-56',
                  item: 'min-h-10',
                  itemLabel: 'font-semibold',
                }"
              >
                <UButton
                  type="button"
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  square
                  icon="i-lucide-ellipsis-vertical"
                  :loading="busyAssessmentId === assessment.id"
                  :aria-label="`Assessment actions for ${assessment.title}`"
                />
              </UDropdownMenu>
            </div>
          </div>

          <NuxtLink
            :to="`/instructor/assessments/${assessment.id}/edit`"
            class="group mt-6 block rounded-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/30"
            :aria-label="`Open ${assessment.title}`"
          >
            <h2 class="line-clamp-2 text-xl font-black leading-tight text-highlighted transition group-hover:text-primary">
              {{ assessment.title }}
            </h2>

            <p class="mt-2 text-sm font-medium text-muted">
              {{ assessment.subject_code }}
              ·
              {{ assignmentLabel(assessment) }}
            </p>
          </NuxtLink>
        </div>

        <div class="p-5">
          <div class="flex min-h-7 flex-wrap gap-2">
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
                v-for="classroom in assessment.assignedClassrooms.slice(0, 2)"
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
              v-if="assessment.assignedClassrooms.length > 2"
              color="neutral"
              variant="soft"
            >
              +{{ assessment.assignedClassrooms.length - 2 }} more
            </UBadge>
          </div>

          <div class="mt-5 grid grid-cols-3 gap-3">
            <div class="rounded-xl bg-elevated p-3">
              <div class="flex items-center gap-2 text-muted">
                <UIcon
                  name="i-lucide-list-checks"
                  class="size-4"
                />
                <span class="text-xs">Questions</span>
              </div>
              <p class="mt-2 text-lg font-black text-highlighted">
                {{ assessment.question_count }}
              </p>
            </div>

            <div class="rounded-xl bg-elevated p-3">
              <div class="flex items-center gap-2 text-muted">
                <UIcon
                  name="i-lucide-circle-dot"
                  class="size-4"
                />
                <span class="text-xs">Points</span>
              </div>
              <p class="mt-2 text-lg font-black text-highlighted">
                {{ assessment.total_points }}
              </p>
            </div>

            <div class="rounded-xl bg-elevated p-3">
              <div class="flex items-center gap-2 text-muted">
                <UIcon
                  name="i-lucide-school"
                  class="size-4"
                />
                <span class="text-xs">Classes</span>
              </div>
              <p class="mt-2 text-lg font-black text-highlighted">
                {{ assessment.assignedClassrooms.length }}
              </p>
            </div>
          </div>
        </div>
      </UCard>
    </div>

    <ConfirmationModal
      v-model:open="
        assessmentActionModalOpen
      "
      :title="
        assessmentActionTitle
      "
      :description="
        assessmentActionDescription
      "
      :confirm-label="
        pendingAssessmentAction?.action
        === 'archive'
          ? 'Archive Assessment'
          : 'Return to Draft'
      "
      :confirm-color="
        pendingAssessmentAction?.action
        === 'archive'
          ? 'warning'
          : 'neutral'
      "
      :icon="
        pendingAssessmentAction?.action
        === 'archive'
          ? 'i-lucide-archive'
          : 'i-lucide-undo-2'
      "
      :loading="
        Boolean(
          busyAssessmentId,
        )
      "
      @confirm="
        confirmAssessmentAction
      "
    />
  </div>
</template>
