<script setup lang="ts">
import type {
  StudentAssessmentDelivery,
} from "~/types/assessment-delivery";

import type {
  StudentArchivedClassListItem,
} from "~/types/classroom";

type StudentArchiveSection =
  | "classes"
  | "assessments";

definePageMeta({
  layout:
    "student",
  middleware:
    ["student"],
});

useSeoMeta({
  title:
    "Archive",
});

const route =
  useRoute();

const router =
  useRouter();

const {
  listStudentDeliveries,
  restoreStudentDelivery,
} = useAssessmentDelivery();

const {
  listStudentArchivedClasses,
  restoreStudentClass,
} = useClassrooms();

const toast =
  useToast();

const deliveries =
  ref<StudentAssessmentDelivery[]>(
    [],
  );

const archivedClasses =
  ref<StudentArchivedClassListItem[]>(
    [],
  );

const isLoading =
  ref(true);

const errorMessage =
  ref("");

const query =
  ref("");

const busyRestoreAssessmentId =
  ref<string | null>(
    null,
  );

const busyRestoreClassId =
  ref<string | null>(
    null,
  );

const completedStatuses = [
  "submitted",
  "auto_submitted",
];

function initialSection():
  StudentArchiveSection {
  return route.query.section
    === "assessments"
      ? "assessments"
      : "classes";
}

const activeSection =
  ref<StudentArchiveSection>(
    initialSection(),
  );

const filteredClasses =
  computed(
    () => {
      const keyword =
        query.value
          .trim()
          .toLowerCase();

      if (!keyword) {
        return archivedClasses.value;
      }

      return archivedClasses.value
        .filter(
          (item) =>
            [
              item.classroom.name,
              item.classroom.subject_code,
              item.classroom.section,
              item.instructor.name,
            ]
              .join(" ")
              .toLowerCase()
              .includes(keyword),
        );
    },
  );

const filteredDeliveries =
  computed(
    () => {
      const keyword =
        query.value
          .trim()
          .toLowerCase();

      return deliveries.value
        .filter(
          (delivery) => {
            if (!keyword) {
              return true;
            }

            return [
              delivery.title,
              delivery.subjectCode,
              delivery.classroom.name,
              delivery.classroom.section,
            ]
              .join(" ")
              .toLowerCase()
              .includes(keyword);
          },
        )
        .sort(
          (
            first,
            second,
          ) =>
            new Date(
              second.attempt
                ?.submittedAt
              || second.endsAt,
            ).getTime()
            - new Date(
              first.attempt
                ?.submittedAt
              || first.endsAt,
            ).getTime(),
        );
    },
  );

const counts =
  computed(
    () => ({
      classes:
        archivedClasses.value.length,

      assessments:
        deliveries.value.length,

      completedAssessments:
        deliveries.value.filter(
          (delivery) =>
            Boolean(
              delivery.attempt
              && completedStatuses
                .includes(
                  delivery.attempt.status,
                ),
            ),
        ).length,

      records:
        archivedClasses.value.length
        + deliveries.value.length,
    }),
  );

const searchPlaceholder =
  computed(
    () =>
      activeSection.value
        === "classes"
        ? "Search archived class or instructor"
        : "Search archived assessment or class",
  );

function selectSection(
  section:
    StudentArchiveSection,
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

function hasCompletedAttempt(
  delivery:
    StudentAssessmentDelivery,
): boolean {
  return Boolean(
    delivery.attempt
    && completedStatuses
      .includes(
        delivery.attempt.status,
      ),
  );
}

function formatDate(
  value: string,
): string {
  return new Intl
    .DateTimeFormat(
      "en-PH",
      {
        dateStyle:
          "medium",
        timeStyle:
          "short",
      },
    )
    .format(
      new Date(value),
    );
}

function assessmentTypeLabel(
  value:
    StudentAssessmentDelivery[
      "assessmentType"
    ],
): string {
  const labels = {
    quiz:
      "Quiz",
    examination:
      "Examination",
    activity:
      "Activity",
    practice:
      "Practice",
  } as const;

  return labels[value];
}

async function restoreClass(
  item:
    StudentArchivedClassListItem,
): Promise<void> {
  if (
    busyRestoreClassId.value
    || !item.archive.canRestore
  ) {
    return;
  }

  busyRestoreClassId.value =
    item.classroom.id;

  const result =
    await restoreStudentClass(
      item.classroom.id,
    );

  if (
    result.error
    || !result.data
  ) {
    toast.add({
      title:
        "Class could not be restored",
      description:
        result.error
        || "The archived class could not be restored.",
      color:
        "error",
    });

    busyRestoreClassId.value =
      null;

    return;
  }

  archivedClasses.value =
    archivedClasses.value
      .filter(
        (current) =>
          current.classroom.id
          !== item.classroom.id,
      );

  toast.add({
    title:
      "Class restored",
    description:
      "The class is available again in My Classes.",
    color:
      "success",
  });

  busyRestoreClassId.value =
    null;
}

async function restoreAssessment(
  delivery:
    StudentAssessmentDelivery,
): Promise<void> {
  if (busyRestoreAssessmentId.value) {
    return;
  }

  busyRestoreAssessmentId.value =
    delivery.assignmentId;

  const result =
    await restoreStudentDelivery(
      delivery.assignmentId,
    );

  if (
    result.error
    || !result.data
  ) {
    toast.add({
      title:
        "Assessment could not be restored",
      description:
        result.error
        || "The archived assessment could not be restored.",
      color:
        "error",
    });

    busyRestoreAssessmentId.value =
      null;

    return;
  }

  deliveries.value =
    deliveries.value.filter(
      (item) =>
        item.assignmentId
        !== delivery.assignmentId,
    );

  toast.add({
    title:
      "Assessment restored",
    description:
      "The assessment is available again on your Assessments page.",
    color:
      "success",
  });

  busyRestoreAssessmentId.value =
    null;
}

async function loadArchive():
  Promise<void> {
  isLoading.value =
    true;

  errorMessage.value =
    "";

  const [
    classResult,
    assessmentResult,
  ] =
    await Promise.all([
      listStudentArchivedClasses(),

      listStudentDeliveries(
        undefined,
        {
          includeArchivedCompleted:
            true,
          onlyStudentArchived:
            true,
        },
      ),
    ]);

  const errors =
    [
      classResult.error,
      assessmentResult.error,
    ].filter(
      Boolean,
    ) as string[];

  archivedClasses.value =
    classResult.data?.classes
    ?? [];

  deliveries.value =
    assessmentResult.data
      ?.deliveries
    ?? [];

  if (errors.length > 0) {
    errorMessage.value =
      errors.join(" ");
  }

  isLoading.value =
    false;
}

watch(
  () =>
    route.query.section,
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
      compact-mobile
      :breadcrumbs="[
        { label: 'Overview', to: '/student/dashboard', icon: 'i-lucide-layout-dashboard' },
        { label: 'Archive' },
      ]"
      eyebrow="Your records"
      title="Archive"
      description="Keep classes and closed assessments organized without deleting memberships, attempts, answers, or results."
    >
      <template #actions>
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-refresh-cw"
          :loading="isLoading"
          class="hidden sm:inline-flex"
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
      title="Archive could not be fully loaded"
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
      color="info"
      variant="soft"
      icon="i-lucide-shield-check"
      title="Archive keeps your records safe"
      description="Archiving only organizes your Student portal. Permanent deletion is not available, and your memberships, assessments, attempts, and results remain preserved."
    />

    <section class="hidden gap-4 sm:grid sm:grid-cols-4">
      <StatCard
        label="Archived classes"
        :value="String(counts.classes)"
        icon="i-lucide-school"
        tone="info"
      />

      <StatCard
        label="Archived assessments"
        :value="String(counts.assessments)"
        icon="i-lucide-clipboard-list"
        tone="primary"
      />

      <StatCard
        label="Completed"
        :value="String(counts.completedAssessments)"
        icon="i-lucide-circle-check-big"
        tone="success"
      />

      <StatCard
        label="Archive records"
        :value="String(counts.records)"
        icon="i-lucide-archive"
        tone="neutral"
      />
    </section>

    <UCard>
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div class="flex flex-wrap rounded-xl border border-default bg-elevated p-1">
          <button
            type="button"
            class="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold transition lg:flex-none"
            :class="
              activeSection === 'classes'
                ? 'bg-primary text-white shadow-sm'
                : 'text-muted hover:text-highlighted'
            "
            @click="selectSection('classes')"
          >
            <UIcon
              name="i-lucide-school"
              class="size-4"
            />

            Classes

            <span class="rounded-md bg-black/10 px-1.5 py-0.5 text-xs">
              {{ counts.classes }}
            </span>
          </button>

          <button
            type="button"
            class="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold transition lg:flex-none"
            :class="
              activeSection === 'assessments'
                ? 'bg-primary text-white shadow-sm'
                : 'text-muted hover:text-highlighted'
            "
            @click="selectSection('assessments')"
          >
            <UIcon
              name="i-lucide-clipboard-list"
              class="size-4"
            />

            Assessments

            <span class="rounded-md bg-black/10 px-1.5 py-0.5 text-xs">
              {{ counts.assessments }}
            </span>
          </button>
        </div>

        <UInput
          v-model="query"
          icon="i-lucide-search"
          :placeholder="searchPlaceholder"
          :aria-label="searchPlaceholder"
          class="w-full lg:ml-auto lg:max-w-md"
        />

        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-refresh-cw"
          square
          :loading="isLoading"
          aria-label="Refresh archive"
          class="sm:hidden"
          @click="loadArchive"
        />
      </div>
    </UCard>

    <div
      v-if="isLoading"
      class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
    >
      <USkeleton
        v-for="number in 4"
        :key="number"
        class="h-[22rem] rounded-xl"
      />
    </div>

    <template v-else-if="activeSection === 'classes'">
      <EmptyPanel
        v-if="filteredClasses.length === 0"
        icon="i-lucide-school"
        title="No archived classes"
        :description="query ? 'Try a different search.' : 'Classes you archive, and classes archived by your instructor, will appear here.'"
      >
        <template #actions>
          <UButton
            to="/student/classes"
            color="neutral"
            variant="outline"
            icon="i-lucide-book-open"
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
          v-for="item in filteredClasses"
          :key="item.membership.id"
          class="overflow-hidden"
          :ui="{
            body: 'p-0 sm:p-0',
          }"
        >
          <div class="relative border-b border-default bg-gradient-to-br from-info/18 via-info/8 to-transparent p-4 sm:min-h-40 sm:p-5">
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-center gap-2">
                <div class="flex size-10 items-center justify-center rounded-xl bg-info/15 text-info ring-1 ring-info/15">
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

              <UBadge
                color="neutral"
                variant="soft"
                icon="i-lucide-archive"
              >
                Archived
              </UBadge>
            </div>

            <h2 class="mt-5 line-clamp-2 text-xl font-black leading-tight text-highlighted">
              {{ item.classroom.name }}
            </h2>

            <p class="mt-2 text-sm font-medium text-muted">
              {{ item.classroom.subject_code }}
              ·
              {{ item.classroom.section }}
            </p>
          </div>

          <div class="p-4 sm:p-5">
            <div class="flex min-h-7 flex-wrap gap-2">
              <UBadge
                color="neutral"
                variant="soft"
                icon="i-lucide-user-round"
              >
                Instructor:
                {{ item.instructor.name }}
              </UBadge>

              <UBadge
                color="neutral"
                variant="soft"
                icon="i-lucide-calendar-range"
              >
                {{ item.classroom.school_year }}
                ·
                {{ item.classroom.semester }}
              </UBadge>
            </div>

            <div class="mt-4 rounded-xl border border-default/70 bg-elevated/35 px-3 py-2.5 text-sm">
              <div class="flex items-center gap-2">
                <UIcon
                  name="i-lucide-archive"
                  class="size-4 shrink-0 text-muted"
                />

                <span class="text-muted">
                  {{
                    item.archive.source === 'instructor'
                      ? 'Archived by instructor'
                      : 'Archived by you'
                  }}
                </span>
              </div>

              <p class="mt-1 pl-6 font-semibold text-highlighted">
                {{ formatDate(item.archive.archivedAt) }}
              </p>
            </div>

            <div class="mt-4 grid gap-2">
              <UButton
                v-if="item.classroom.status === 'active'"
                :to="`/student/classes/${item.classroom.id}`"
                color="neutral"
                variant="soft"
                icon="i-lucide-eye"
                block
              >
                View Class
              </UButton>

              <UButton
                v-if="item.archive.canRestore"
                type="button"
                color="neutral"
                variant="outline"
                icon="i-lucide-archive-restore"
                :loading="busyRestoreClassId === item.classroom.id"
                :disabled="Boolean(busyRestoreClassId)"
                block
                @click="restoreClass(item)"
              >
                Restore to My Classes
              </UButton>

              <UAlert
                v-else-if="item.archive.source === 'instructor'"
                color="neutral"
                variant="soft"
                icon="i-lucide-lock"
                title="Archived by your instructor"
                description="This class will return to My Classes only if the instructor reactivates it."
              />
            </div>
          </div>
        </UCard>
      </div>
    </template>

    <template v-else>
      <EmptyPanel
        v-if="filteredDeliveries.length === 0"
        icon="i-lucide-clipboard-list"
        title="No archived assessments"
        :description="query ? 'Try a different search.' : 'Closed assessments you archive will appear here.'"
      >
        <template #actions>
          <UButton
            to="/student/assessments"
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
          v-for="delivery in filteredDeliveries"
          :key="delivery.assignmentId"
          class="overflow-hidden"
          :ui="{
            body: 'p-0 sm:p-0',
          }"
        >
          <div class="relative border-b border-default bg-gradient-to-br from-primary/18 via-primary/8 to-transparent p-4 sm:p-5">
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-center gap-2">
                <div class="flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/15">
                  <UIcon
                    name="i-lucide-archive"
                    class="size-4.5"
                  />
                </div>

                <UBadge
                  color="neutral"
                  variant="soft"
                  size="sm"
                >
                  {{ assessmentTypeLabel(delivery.assessmentType) }}
                </UBadge>
              </div>

              <UBadge
                color="neutral"
                variant="soft"
                icon="i-lucide-archive"
              >
                Archived
              </UBadge>
            </div>

            <h2 class="mt-4 line-clamp-2 text-lg font-black leading-snug text-highlighted">
              {{ delivery.title }}
            </h2>

            <p class="mt-1.5 text-sm font-medium text-muted">
              {{ delivery.subjectCode }}
              ·
              {{ delivery.classroom.section }}
            </p>
          </div>

          <div class="p-4 sm:p-5">
            <div class="flex min-w-0 items-center gap-2 text-sm font-semibold text-primary">
              <UIcon
                name="i-lucide-school"
                class="size-4 shrink-0"
              />

              <span class="truncate">
                {{ delivery.classroom.name }}
              </span>
            </div>

            <div class="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
              <span class="inline-flex items-center gap-1.5">
                <UIcon
                  name="i-lucide-list-checks"
                  class="size-4"
                />

                <strong class="font-semibold text-highlighted">
                  {{ delivery.questionCount }}
                </strong>

                questions
              </span>

              <span class="inline-flex items-center gap-1.5">
                <UIcon
                  name="i-lucide-circle-dot"
                  class="size-4"
                />

                <strong class="font-semibold text-highlighted">
                  {{ delivery.totalPoints }}
                </strong>

                points
              </span>
            </div>

            <div class="mt-4 flex items-center gap-2 rounded-xl border border-default/70 bg-elevated/35 px-3 py-2.5 text-sm">
              <UIcon
                :name="hasCompletedAttempt(delivery) ? 'i-lucide-circle-check-big' : 'i-lucide-calendar-x'"
                class="size-4 shrink-0 text-muted"
              />

              <span class="shrink-0 text-muted">
                {{ hasCompletedAttempt(delivery) ? 'Submitted' : 'Closed' }}
              </span>

              <span class="min-w-0 truncate font-semibold text-highlighted">
                {{
                  formatDate(
                    hasCompletedAttempt(delivery) && delivery.attempt?.submittedAt
                      ? delivery.attempt.submittedAt
                      : delivery.endsAt
                  )
                }}
              </span>
            </div>

            <div class="mt-4 grid gap-2">
              <UButton
                v-if="delivery.canViewResult"
                :to="`/student/results/${delivery.assignmentId}`"
                color="neutral"
                variant="soft"
                icon="i-lucide-chart-column"
                block
              >
                View Result
              </UButton>

              <UButton
                type="button"
                color="neutral"
                variant="outline"
                icon="i-lucide-archive-restore"
                :loading="busyRestoreAssessmentId === delivery.assignmentId"
                :disabled="Boolean(busyRestoreAssessmentId)"
                block
                @click="restoreAssessment(delivery)"
              >
                Restore
              </UButton>
            </div>
          </div>
        </UCard>
      </div>
    </template>
  </div>
</template>
