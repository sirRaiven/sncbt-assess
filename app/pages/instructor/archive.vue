<script setup lang="ts">
import type {
  DropdownMenuItem,
} from "@nuxt/ui";

import type {
  InstructorClassroom,
} from "~/types/classroom";
import type {
  ArchiveSection,
  ArchivedAssessmentItem,
  ArchivedSessionItem,
  InstructorArchiveOverview,
} from "~/types/instructor-archive";

definePageMeta({
  layout: "instructor",
});

useSeoMeta({
  title: "Archive",
});

interface DeleteTarget {
  kind:
    | "assessment"
    | "session";
  id: string;
  title: string;
  detail: string;
}

const route = useRoute();
const router = useRouter();
const toast = useToast();

const {
  getArchiveOverview,
  deleteArchivedAssessment,
  deleteClosedSession,
} = useInstructorArchive();

const {
  listInstructorClasses,
  reactivateClass,
} = useClassrooms();

const overview =
  ref<InstructorArchiveOverview | null>(
    null,
  );

const archivedClasses =
  ref<InstructorClassroom[]>([]);

function initialSection(): ArchiveSection {
  const requested =
    String(
      route.query.section
      ?? "",
    );

  if (
    requested === "classes"
    || requested === "assessments"
    || requested === "sessions"
  ) {
    return requested;
  }

  return "assessments";
}

const activeSection =
  ref<ArchiveSection>(
    initialSection(),
  );

const query =
  ref("");

const isLoading =
  ref(true);

const errorMessage =
  ref("");

const deleteTarget =
  ref<DeleteTarget | null>(
    null,
  );

const confirmationText =
  ref("");

const isDeleting =
  ref(false);

const busyClassroomId =
  ref<string | null>(null);

const summary = computed(
  () =>
    overview.value?.summary
    ?? {
      archivedAssessments:
        0,
      closedSessions:
        0,
      blockedAssessments:
        0,
      totalRecords:
        0,
    },
);

const archiveRecordCount = computed(
  () =>
    summary.value.totalRecords
    + archivedClasses.value.length,
);

const filteredClasses = computed(
  () => {
    const keyword =
      query.value
        .trim()
        .toLowerCase();

    if (!keyword) {
      return archivedClasses.value;
    }

    return archivedClasses.value.filter(
      (classroom) =>
        [
          classroom.name,
          classroom.subject_code,
          classroom.section,
          classroom.school_year,
          classroom.semester,
        ]
          .join(" ")
          .toLowerCase()
          .includes(keyword),
    );
  },
);

const filteredAssessments = computed(
  () => {
    const keyword =
      query.value
        .trim()
        .toLowerCase();

    const assessments =
      overview.value?.assessments
      ?? [];

    if (!keyword) {
      return assessments;
    }

    return assessments.filter(
      (assessment) =>
        [
          assessment.title,
          assessment.subjectCode,
          assessment.assessmentType,
        ]
          .join(" ")
          .toLowerCase()
          .includes(keyword),
    );
  },
);

const filteredSessions = computed(
  () => {
    const keyword =
      query.value
        .trim()
        .toLowerCase();

    const sessions =
      overview.value?.sessions
      ?? [];

    if (!keyword) {
      return sessions;
    }

    return sessions.filter(
      (session) =>
        [
          session.assessmentTitle,
          session.subjectCode,
          session.classroomName,
          session.section,
          session.sessionCode,
          session.status,
        ]
          .join(" ")
          .toLowerCase()
          .includes(keyword),
    );
  },
);

const searchPlaceholder = computed(
  () => {
    if (
      activeSection.value
      === "classes"
    ) {
      return "Search archived classes";
    }

    if (
      activeSection.value
      === "assessments"
    ) {
      return "Search archived assessments";
    }

    return "Search assessment, class, or code";
  },
);

const canConfirmDelete = computed(
  () =>
    confirmationText.value
      .trim()
      .toUpperCase()
    === "DELETE",
);

function selectSection(
  section: ArchiveSection,
): void {
  activeSection.value =
    section;
  query.value =
    "";

  void router.replace({
    query: {
      ...route.query,
      section,
    },
  });
}

function formatDate(
  value: string | null,
): string {
  if (!value) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat(
    "en-PH",
    {
      dateStyle:
        "medium",
      timeStyle:
        "short",
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

function openAssessmentDelete(
  assessment: ArchivedAssessmentItem,
): void {
  deleteTarget.value = {
    kind:
      "assessment",
    id:
      assessment.id,
    title:
      assessment.title,
    detail:
      `${assessment.subjectCode} · ${assessment.questionCount} questions`,
  };

  confirmationText.value =
    "";
}

function openSessionDelete(
  session: ArchivedSessionItem,
): void {
  deleteTarget.value = {
    kind:
      "session",
    id:
      session.id,
    title:
      session.assessmentTitle,
    detail:
      `${session.subjectCode} · ${session.section} · Code ${session.sessionCode}`,
  };

  confirmationText.value =
    "";
}

function closeDeleteDialog(): void {
  if (isDeleting.value) {
    return;
  }

  deleteTarget.value =
    null;

  confirmationText.value =
    "";
}

async function loadArchive(): Promise<void> {
  isLoading.value =
    true;

  errorMessage.value =
    "";

  const [
    archiveResult,
    classesResult,
  ] = await Promise.all([
    getArchiveOverview(),
    listInstructorClasses(),
  ]);

  const errors =
    [
      archiveResult.error,
      classesResult.error,
    ].filter(
      Boolean,
    ) as string[];

  if (
    archiveResult.data
  ) {
    overview.value =
      archiveResult.data;
  }

  if (
    classesResult.data
  ) {
    archivedClasses.value =
      classesResult.data.classrooms.filter(
        (classroom) =>
          classroom.status
          === "archived",
      );
  }

  if (errors.length > 0) {
    errorMessage.value =
      errors.join(" ");
  }

  isLoading.value =
    false;
}

async function reactivateArchivedClass(
  classroom: InstructorClassroom,
): Promise<void> {
  busyClassroomId.value =
    classroom.id;

  const result =
    await reactivateClass(
      classroom.id,
    );

  if (
    result.error
    || !result.data
  ) {
    toast.add({
      title:
        "Class could not be reactivated",
      description:
        result.error
        || "The class could not be reactivated.",
      color:
        "error",
    });

    busyClassroomId.value =
      null;
    return;
  }

  toast.add({
    title:
      "Class reactivated",
    description:
      `${classroom.name} is available again in My Classes.`,
    color:
      "success",
  });

  await loadArchive();

  busyClassroomId.value =
    null;
}

function archivedClassMenuItems(
  classroom: InstructorClassroom,
): DropdownMenuItem[][] {
  return [
    [
      {
        label: "View Class",
        icon: "i-lucide-eye",
        to: `/instructor/classes/${classroom.id}`,
      },
    ],
    [
      {
        label: "Reactivate",
        icon: "i-lucide-archive-restore",
        color: "success",
        disabled:
          Boolean(busyClassroomId.value),
        onSelect: () => {
          void reactivateArchivedClass(
            classroom,
          );
        },
      },
    ],
  ];
}

function archivedAssessmentMenuItems(
  assessment: ArchivedAssessmentItem,
): DropdownMenuItem[][] {
  return [
    [
      {
        label: "View Assessment",
        icon: "i-lucide-eye",
        to: `/instructor/assessments/${assessment.id}/preview`,
      },
    ],
    [
      {
        label: "Delete Permanently",
        icon: "i-lucide-trash-2",
        color: "error",
        onSelect: () => {
          openAssessmentDelete(
            assessment,
          );
        },
      },
    ],
  ];
}

async function confirmPermanentDelete(): Promise<void> {
  if (
    !deleteTarget.value
    || !canConfirmDelete.value
  ) {
    return;
  }

  isDeleting.value =
    true;

  const target =
    deleteTarget.value;

  const result =
    target.kind
      === "assessment"
      ? await deleteArchivedAssessment(
          target.id,
        )
      : await deleteClosedSession(
          target.id,
        );

  if (
    result.error
    || !result.data
  ) {
    toast.add({
      title:
        "Permanent deletion failed",
      description:
        result.error
        || "The record could not be deleted.",
      color:
        "error",
    });

    isDeleting.value =
      false;

    return;
  }

  toast.add({
    title:
      "Record permanently deleted",
    description:
      result.data.message,
    color:
      "success",
  });

  deleteTarget.value =
    null;

  confirmationText.value =
    "";

  await loadArchive();

  isDeleting.value =
    false;
}

watch(
  () => route.query.section,
  () => {
    activeSection.value =
      initialSection();
    query.value =
      "";
  },
);

onMounted(
  loadArchive,
);
</script>

<template>
  <div class="page-stack">
    <PageHeader
      eyebrow="Records management"
      title="Archive"
      description="Review archived classes, archived assessments, and closed live sessions in one place."
    >
      <template #actions>
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-refresh-cw"
          :loading="isLoading"
          @click="loadArchive"
        >
          Refresh
        </UButton>
      </template>
    </PageHeader>

    <UAlert
      v-if="errorMessage"
      color="error"
      variant="soft"
      title="Archive could not be loaded"
      :description="errorMessage"
    >
      <template #actions>
        <UButton
          color="error"
          variant="soft"
          @click="loadArchive"
        >
          Try Again
        </UButton>
      </template>
    </UAlert>

    <UAlert
      v-if="activeSection !== 'classes'"
      color="warning"
      variant="soft"
      icon="i-lucide-triangle-alert"
      title="Permanent deletion"
      description="Permanent deletion is available only for archived assessments and closed sessions. Keep academic records archived when they are still covered by your institution's retention policy."
    />

    <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Archived classes"
        :value="
          String(
            archivedClasses.length,
          )
        "
        icon="i-lucide-school"
        tone="info"
      />

      <StatCard
        label="Archived assessments"
        :value="
          String(
            summary.archivedAssessments,
          )
        "
        icon="i-lucide-file-archive"
        tone="warning"
      />

      <StatCard
        label="Closed sessions"
        :value="
          String(
            summary.closedSessions,
          )
        "
        icon="i-lucide-radio-tower"
        tone="neutral"
      />

      <StatCard
        label="Archive records"
        :value="
          String(
            archiveRecordCount,
          )
        "
        icon="i-lucide-archive"
        tone="primary"
      />
    </section>

    <UCard>
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div class="flex flex-wrap rounded-xl border border-default bg-elevated p-1">
          <button
            type="button"
            class="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold transition lg:flex-none"
            :class="
              activeSection
                === 'classes'
                ? 'bg-primary text-white shadow-sm'
                : 'text-muted hover:text-highlighted'
            "
            @click="
              selectSection(
                'classes',
              )
            "
          >
            <UIcon
              name="i-lucide-school"
              class="size-4"
            />

            Classes

            <span class="rounded-md bg-black/10 px-1.5 py-0.5 text-xs">
              {{
                archivedClasses.length
              }}
            </span>
          </button>

          <button
            type="button"
            class="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold transition lg:flex-none"
            :class="
              activeSection
                === 'assessments'
                ? 'bg-primary text-white shadow-sm'
                : 'text-muted hover:text-highlighted'
            "
            @click="
              selectSection(
                'assessments',
              )
            "
          >
            <UIcon
              name="i-lucide-file-archive"
              class="size-4"
            />

            Assessments

            <span class="rounded-md bg-black/10 px-1.5 py-0.5 text-xs">
              {{
                summary.archivedAssessments
              }}
            </span>
          </button>

          <button
            type="button"
            class="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold transition lg:flex-none"
            :class="
              activeSection
                === 'sessions'
                ? 'bg-primary text-white shadow-sm'
                : 'text-muted hover:text-highlighted'
            "
            @click="
              selectSection(
                'sessions',
              )
            "
          >
            <UIcon
              name="i-lucide-history"
              class="size-4"
            />

            Sessions

            <span class="rounded-md bg-black/10 px-1.5 py-0.5 text-xs">
              {{
                summary.closedSessions
              }}
            </span>
          </button>
        </div>

        <UInput
          v-model="query"
          icon="i-lucide-search"
          :placeholder="searchPlaceholder"
          class="w-full lg:ml-auto lg:max-w-md"
        />
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

    <template v-else>
      <template
        v-if="
          activeSection
          === 'classes'
        "
      >
        <EmptyPanel
          v-if="
            filteredClasses.length
            === 0
          "
          icon="i-lucide-school"
          title="No archived classes"
          description="Classes moved to Archive will appear here."
        >
          <template #actions>
            <UButton
              to="/instructor/classes"
              color="neutral"
              variant="outline"
              icon="i-lucide-school"
            >
              Open My Classes
            </UButton>
          </template>
        </EmptyPanel>

        <div
          v-else
          class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
        >
          <UCard
            v-for="classroom in filteredClasses"
            :key="classroom.id"
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
                      name="i-lucide-school"
                      class="size-5"
                    />
                  </div>

                  <UBadge
                    color="neutral"
                    variant="soft"
                  >
                    Class
                  </UBadge>
                </div>

                <div class="flex items-center gap-1">
                  <StatusPill status="Archived" />

                  <UDropdownMenu
                    :items="archivedClassMenuItems(classroom)"
                    :content="{
                      align: 'end',
                      side: 'bottom',
                      sideOffset: 6,
                    }"
                    :ui="{
                      content: 'w-48',
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
                      :aria-label="`Archived class actions for ${classroom.name}`"
                    />
                  </UDropdownMenu>
                </div>
              </div>

              <NuxtLink
                :to="`/instructor/classes/${classroom.id}`"
                class="group mt-6 block rounded-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/30"
                :aria-label="`View archived class ${classroom.name}`"
              >
                <h2 class="line-clamp-2 text-xl font-black leading-tight text-highlighted transition group-hover:text-primary">
                  {{ classroom.name }}
                </h2>

                <p class="mt-2 text-sm font-medium text-muted">
                  {{ classroom.subject_code }}
                  ·
                  {{ classroom.section }}
                </p>
              </NuxtLink>
            </div>

            <div class="p-5">
              <div class="flex min-h-7 flex-wrap gap-2">
                <UBadge
                  color="neutral"
                  variant="soft"
                  icon="i-lucide-calendar-range"
                >
                  {{ classroom.school_year }}
                  ·
                  {{ classroom.semester }}
                </UBadge>
              </div>

              <div class="mt-5 grid grid-cols-3 gap-3">
                <div class="rounded-xl bg-elevated p-3">
                  <div class="flex items-center gap-2 text-muted">
                    <UIcon
                      name="i-lucide-users"
                      class="size-4"
                    />
                    <span class="text-xs">Students</span>
                  </div>

                  <p class="mt-2 text-lg font-black text-highlighted">
                    {{ classroom.memberCounts.active }}
                  </p>
                </div>

                <div class="rounded-xl bg-elevated p-3">
                  <div class="flex items-center gap-2 text-muted">
                    <UIcon
                      name="i-lucide-user-round-clock"
                      class="size-4"
                    />
                    <span class="text-xs">Pending</span>
                  </div>

                  <p class="mt-2 text-lg font-black text-highlighted">
                    {{ classroom.memberCounts.pending }}
                  </p>
                </div>

                <div class="min-w-0 rounded-xl bg-elevated p-3">
                  <div class="flex items-center gap-2 text-muted">
                    <UIcon
                      name="i-lucide-archive"
                      class="size-4"
                    />
                    <span class="text-xs">Archived</span>
                  </div>

                  <p
                    class="mt-2 line-clamp-2 text-xs font-black leading-tight text-highlighted"
                    :title="formatDate(classroom.archived_at || classroom.updated_at)"
                  >
                    {{
                      formatDate(
                        classroom.archived_at
                        || classroom.updated_at,
                      )
                    }}
                  </p>
                </div>
              </div>
            </div>
          </UCard>
        </div>
      </template>

      <template
        v-else-if="
          activeSection
          === 'assessments'
        "
      >
        <EmptyPanel
          v-if="
            filteredAssessments.length
            === 0
          "
          icon="i-lucide-file-archive"
          title="No archived assessments"
          description="Assessments moved to Archive will appear here."
        >
          <template #actions>
            <UButton
              to="/instructor/assessments"
              color="neutral"
              variant="outline"
              icon="i-lucide-clipboard-list"
            >
              Open Assessments
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
                    {{
                      typeLabel(
                        assessment.assessmentType,
                      )
                    }}
                  </UBadge>
                </div>

                <div class="flex items-center gap-1">
                  <StatusPill status="Archived" />

                  <UDropdownMenu
                    :items="archivedAssessmentMenuItems(assessment)"
                    :content="{
                      align: 'end',
                      side: 'bottom',
                      sideOffset: 6,
                    }"
                    :ui="{
                      content: 'w-52',
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
                      :aria-label="`Archived assessment actions for ${assessment.title}`"
                    />
                  </UDropdownMenu>
                </div>
              </div>

              <NuxtLink
                :to="`/instructor/assessments/${assessment.id}/preview`"
                class="group mt-6 block rounded-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/30"
                :aria-label="`View archived assessment ${assessment.title}`"
              >
                <h2 class="line-clamp-2 text-xl font-black leading-tight text-highlighted transition group-hover:text-primary">
                  {{ assessment.title }}
                </h2>

                <p class="mt-2 text-sm font-medium text-muted">
                  {{ assessment.subjectCode }}
                  · Archived assessment
                </p>
              </NuxtLink>
            </div>

            <div class="p-5">
              <div class="flex min-h-7 flex-wrap gap-2">
                <UBadge
                  color="neutral"
                  variant="soft"
                  icon="i-lucide-archive"
                >
                  Archived
                  {{
                    formatDate(
                      assessment.archivedAt
                      || assessment.updatedAt,
                    )
                  }}
                </UBadge>

                <UBadge
                  v-if="assessment.linkedSessionCount > 0"
                  color="warning"
                  variant="soft"
                  icon="i-lucide-link-2"
                >
                  {{ assessment.linkedSessionCount }}
                  linked
                  {{
                    assessment.linkedSessionCount === 1
                      ? 'session'
                      : 'sessions'
                  }}
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
                    {{ assessment.questionCount }}
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
                    {{ assessment.totalPoints }}
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
                    {{ assessment.assignedClassCount }}
                  </p>
                </div>
              </div>
            </div>
          </UCard>
        </div>

      </template>

      <template v-else>
        <EmptyPanel
          v-if="
            filteredSessions.length
            === 0
          "
          icon="i-lucide-history"
          title="No closed sessions"
          description="Ended and cancelled live sessions will appear here."
        >
          <template #actions>
            <UButton
              to="/instructor/sessions"
              color="neutral"
              variant="outline"
              icon="i-lucide-radio-tower"
            >
              Open Live Sessions
            </UButton>
          </template>
        </EmptyPanel>

        <div
          v-else
          class="grid gap-4 xl:grid-cols-2"
        >
          <UCard
            v-for="session in filteredSessions"
            :key="session.id"
          >
            <div class="flex items-start gap-4">
              <div class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-slate-500/10 text-muted">
                <UIcon
                  name="i-lucide-history"
                  class="size-5"
                />
              </div>

              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div class="min-w-0">
                    <h2 class="font-black text-highlighted">
                      {{ session.assessmentTitle }}
                    </h2>

                    <p class="mt-1 text-sm text-muted">
                      {{ session.subjectCode }}
                      ·
                      {{ session.section }}
                    </p>
                  </div>

                  <StatusPill
                    :status="session.status"
                  />
                </div>

                <div class="mt-4 flex flex-wrap gap-2">
                  <UBadge
                    color="neutral"
                    variant="soft"
                    class="font-mono tracking-[0.12em]"
                  >
                    {{
                      session.sessionCode
                        .replace(
                          /(\d{3})(\d{3})/,
                          "$1 $2",
                        )
                    }}
                  </UBadge>

                  <UBadge
                    color="info"
                    variant="soft"
                  >
                    {{ session.classroomName }}
                  </UBadge>
                </div>

                <div class="mt-5 grid grid-cols-2 gap-3">
                  <div class="rounded-lg bg-elevated p-3">
                    <p class="text-xs text-muted">
                      Participants
                    </p>

                    <p class="mt-1 font-black text-highlighted">
                      {{ session.participantCount }}
                    </p>
                  </div>

                  <div class="rounded-lg bg-elevated p-3">
                    <p class="text-xs text-muted">
                      Closed
                    </p>

                    <p class="mt-1 text-xs font-bold text-highlighted">
                      {{
                        formatDate(
                          session.closedAt,
                        )
                      }}
                    </p>
                  </div>
                </div>

                <div class="mt-5">
                  <UButton
                    color="error"
                    variant="soft"
                    icon="i-lucide-trash-2"
                    @click="
                      openSessionDelete(
                        session,
                      )
                    "
                  >
                    Delete Permanently
                  </UButton>
                </div>
              </div>
            </div>
          </UCard>
        </div>
      </template>
    </template>

    <Teleport to="body">
      <div
        v-if="deleteTarget"
        class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm"
        @click.self="closeDeleteDialog"
      >
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="archive-delete-title"
          class="w-full max-w-lg rounded-xl border border-default bg-default p-6 shadow-2xl"
        >
          <div class="flex items-start gap-4">
            <div class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-error/10 text-error">
              <UIcon
                name="i-lucide-triangle-alert"
                class="size-5"
              />
            </div>

            <div class="min-w-0 flex-1">
              <h2
                id="archive-delete-title"
                class="text-lg font-black text-highlighted"
              >
                Permanently delete
                {{
                  deleteTarget.kind
                    === "assessment"
                    ? "assessment"
                    : "session"
                }}?
              </h2>

              <p class="mt-2 text-sm leading-6 text-muted">
                <strong class="text-highlighted">
                  {{ deleteTarget.title }}
                </strong>

                <br>

                {{ deleteTarget.detail }}
              </p>
            </div>

            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-x"
              aria-label="Close confirmation"
              :disabled="isDeleting"
              @click="closeDeleteDialog"
            />
          </div>

          <UAlert
            class="mt-5"
            color="error"
            variant="soft"
            title="This action cannot be undone"
            :description="
              deleteTarget.kind === 'assessment'
                ? 'The assessment, class schedules, linked sessions, participants, questions, and existing attempt records will be removed together. Any active participant will lose access immediately.'
                : 'The closed session, participants, and existing attempt records will be removed together.'
            "
          />

          <div class="mt-5">
            <label
              for="archive-delete-confirmation"
              class="text-sm font-bold text-highlighted"
            >
              Type
              <span class="font-mono text-error">
                DELETE
              </span>
              to continue
            </label>

            <UInput
              id="archive-delete-confirmation"
              v-model="confirmationText"
              class="mt-2 w-full"
              placeholder="DELETE"
              autocomplete="off"
              :disabled="isDeleting"
              @keyup.enter="
                confirmPermanentDelete
              "
            />
          </div>

          <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <UButton
              color="neutral"
              variant="outline"
              :disabled="isDeleting"
              @click="closeDeleteDialog"
            >
              Cancel
            </UButton>

            <UButton
              color="error"
              icon="i-lucide-trash-2"
              :loading="isDeleting"
              :disabled="
                !canConfirmDelete
              "
              @click="
                confirmPermanentDelete
              "
            >
              Delete Permanently
            </UButton>
          </div>
        </section>
      </div>
    </Teleport>
  </div>
</template>
