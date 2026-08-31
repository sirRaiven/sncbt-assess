<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";

import { assessmentScheduleActionAvailability } from "~/utils/assessment-schedule-actions";

import type {
  AssessmentClassOption,
} from "~/types/assessment";

import type {
  AssessmentScheduleInput,
  AssessmentScheduleItem,
  InstructorAssessmentScheduleOverview,
} from "~/types/assessment-schedule";

definePageMeta({
  layout:
    "instructor",
});

useSeoMeta({
  title:
    "Assign Assessment",
});

interface ClassScheduleRow {
  classroom:
    AssessmentClassOption;
  selected: boolean;
  startsAtLocal: string;
  endsAtLocal: string;
  maxAttempts: number;
  existing:
    AssessmentScheduleItem
    | null;
}

type ScheduleAction = "edit" | "extend" | "reopen";

const route =
  useRoute();

const toast =
  useToast();

const assessmentId =
  computed(
    () =>
      String(
        route.params.id,
      ),
  );

const {
  listClassOptions,
} = useAssessments();

const {
  getInstructorSchedule,
  saveSchedules,
  closeSchedule,
  editSchedule,
  extendSchedule,
  reopenSchedule,
} = useAssessmentSchedules();

const overview =
  ref<
    InstructorAssessmentScheduleOverview
    | null
  >(
    null,
  );

const rows =
  ref<ClassScheduleRow[]>(
    [],
  );

const isLoading =
  ref(true);

const isSaving =
  ref(false);

const closingId =
  ref<string | null>(
    null,
  );

const errorMessage =
  ref("");

const saveConfirmationOpen =
  ref(false);

const saveSuccessOpen =
  ref(false);

const classSearchQuery =
  ref("");

const lastSavedSchedules =
  ref<AssessmentScheduleItem[]>(
    [],
  );

const closeConfirmationOpen =
  ref(false);

const pendingCloseSchedule =
  ref<
    AssessmentScheduleItem
    | null
  >(
    null,
  );

const scheduleActionOpen = ref(false);
const scheduleAction = ref<ScheduleAction | null>(null);
const pendingScheduleAction = ref<AssessmentScheduleItem | null>(null);
const isScheduleActionSaving = ref(false);

const selectedRows =
  computed(
    () =>
      rows.value.filter(
        (row) =>
          row.selected,
      ),
  );

const visibleRows =
  computed(
    () => {
      const query =
        classSearchQuery.value
          .trim()
          .toLowerCase();

      if (!query) {
        return rows.value;
      }

      return rows.value.filter(
        (row) =>
          [
            row.classroom.name,
            row.classroom.subjectCode,
            row.classroom.section,
          ]
            .join(" " )
            .toLowerCase()
            .includes(query),
      );
    },
  );

const existingSchedules =
  computed(
    () =>
      [...(overview.value?.schedules ?? [])]
        .filter(
          (schedule) =>
            !schedule.cancelledAt,
        )
        .sort(
          (first, second) => {
            const priority = {
              open: 0,
              upcoming: 1,
              closed: 2,
              cancelled: 3,
            } as const;

            const difference =
              priority[first.status]
              - priority[second.status];

            if (difference !== 0) {
              return difference;
            }

            return new Date(second.endsAt).getTime()
              - new Date(first.endsAt).getTime();
          },
        ),
  );

const activeSchedulesForSave =
  computed(
    () =>
      existingSchedules.value.filter(
        (schedule) =>
          schedule.status === "open"
          || schedule.status === "upcoming",
      ),
  );

const singleSavedSchedule =
  computed(
    () =>
      lastSavedSchedules.value.length
        === 1
        ? lastSavedSchedules.value[0]
        : null,
  );

const liveSessionActionLabel =
  computed(
    () =>
      singleSavedSchedule.value
        ? "Open Session Monitor"
        : "Open Live Sessions",
  );

const canEdit =
  computed(
    () =>
      overview.value
        ?.assessment.status
      === "published",
  );

function pad(
  value: number,
): string {
  return String(value)
    .padStart(
      2,
      "0",
    );
}

function localInputValue(
  value:
    | Date
    | string,
): string {
  const date =
    value instanceof Date
      ? value
      : new Date(value);

  return [
    date.getFullYear(),
    "-",
    pad(
      date.getMonth() + 1,
    ),
    "-",
    pad(
      date.getDate(),
    ),
    "T",
    pad(
      date.getHours(),
    ),
    ":",
    pad(
      date.getMinutes(),
    ),
  ].join("");
}

function defaultWindow() {
  const startsAt =
    new Date();

  startsAt.setSeconds(
    0,
    0,
  );

  startsAt.setMinutes(
    startsAt.getMinutes()
    + 15,
  );

  const endsAt =
    new Date(
      startsAt.getTime()
      + 2 * 60 * 60 * 1000,
    );

  return {
    startsAtLocal:
      localInputValue(
        startsAt,
      ),
    endsAtLocal:
      localInputValue(
        endsAt,
      ),
  };
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

function formatLocalDate(
  value: string,
): string {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "Invalid date";
  }

  return formatDate(
    date.toISOString(),
  );
}

function selectVisibleClasses(): void {
  if (!canEdit.value) {
    return;
  }

  for (
    const row
    of visibleRows.value
  ) {
    row.selected =
      true;
  }
}

function buildRows(
  classes:
    AssessmentClassOption[],
  schedules:
    AssessmentScheduleItem[],
): ClassScheduleRow[] {
  const scheduledClassroomIds =
    new Set(
      schedules
        .filter(
          (schedule) =>
            !schedule.cancelledAt,
        )
        .map(
          (schedule) =>
            schedule.classroomId,
        ),
    );

  return classes
    .filter(
      (classroom) =>
        !scheduledClassroomIds.has(
          classroom.id,
        ),
    )
    .map(
      (classroom) => {
        const defaults =
          defaultWindow();

        return {
          classroom,
          selected: false,
          startsAtLocal:
            defaults.startsAtLocal,
          endsAtLocal:
            defaults.endsAtLocal,
          maxAttempts: 1,
          existing: null,
        };
      },
    );
}

function toggleRow(
  row: ClassScheduleRow,
): void {
  if (!canEdit.value) {
    return;
  }

  row.selected =
    !row.selected;
}

function validateRows():
  string | null {
  for (
    const row
    of selectedRows.value
  ) {
    const startsAt =
      new Date(
        row.startsAtLocal,
      );

    const endsAt =
      new Date(
        row.endsAtLocal,
      );

    if (
      Number.isNaN(
        startsAt.getTime(),
      )
      || Number.isNaN(
        endsAt.getTime(),
      )
    ) {
      return `Enter valid dates for ${row.classroom.subjectCode} · ${row.classroom.section}.`;
    }

    if (
      endsAt.getTime()
      <= startsAt.getTime()
    ) {
      return `The closing time must be later than the opening time for ${row.classroom.subjectCode} · ${row.classroom.section}.`;
    }

    if (
      endsAt.getTime()
      <= Date.now()
    ) {
      return `The closing time must be in the future for ${row.classroom.subjectCode} · ${row.classroom.section}.`;
    }

  }

  return null;
}

async function loadData():
  Promise<void> {
  isLoading.value =
    true;

  errorMessage.value =
    "";

  const [
    scheduleResult,
    classResult,
  ] =
    await Promise.all([
      getInstructorSchedule(
        assessmentId.value,
      ),
      listClassOptions(),
    ]);

  if (
    scheduleResult.error
    || !scheduleResult.data
  ) {
    errorMessage.value =
      scheduleResult.error
      || "Unable to load the assessment schedule.";

    isLoading.value =
      false;

    return;
  }

  if (
    classResult.error
    || !classResult.data
  ) {
    errorMessage.value =
      classResult.error
      || "Unable to load your active classes.";

    isLoading.value =
      false;

    return;
  }

  overview.value =
    scheduleResult.data;

  rows.value =
    buildRows(
      classResult.data.classes,
      scheduleResult.data
        .schedules,
    );

  isLoading.value =
    false;
}

function requestSave(): void {
  if (
    selectedRows.value.length
    === 0
  ) {
    errorMessage.value =
      "Choose at least one class before reviewing the assignment.";

    return;
  }

  const validationError =
    validateRows();

  if (validationError) {
    errorMessage.value =
      validationError;

    return;
  }

  saveConfirmationOpen.value =
    true;
}

async function save():
  Promise<void> {
  if (
    !overview.value
    || !canEdit.value
  ) {
    return;
  }

  const preservedSchedules:
    AssessmentScheduleInput[] =
    activeSchedulesForSave.value.map(
      (schedule) => ({
        classroomId:
          schedule.classroomId,
        startsAt:
          schedule.startsAt,
        endsAt:
          schedule.endsAt,
        timeLimitSeconds:
          null,
        maxAttempts:
          schedule.maxAttempts,
      }),
    );

  const newSchedules:
    AssessmentScheduleInput[] =
    selectedRows.value.map(
      (row) => ({
        classroomId:
          row.classroom.id,
        startsAt:
          new Date(
            row.startsAtLocal,
          ).toISOString(),
        endsAt:
          new Date(
            row.endsAtLocal,
          ).toISOString(),
        // Deprecated whole-attempt timing is always disabled.
        // The class closing time is the only assessment deadline.
        timeLimitSeconds:
          null,
        maxAttempts:
          row.maxAttempts,
      }),
    );

  const schedules =
    [
      ...preservedSchedules,
      ...newSchedules,
    ];

  isSaving.value =
    true;

  errorMessage.value =
    "";

  const result =
    await saveSchedules(
      assessmentId.value,
      schedules,
    );

  if (
    result.error
    || !result.data
  ) {
    errorMessage.value =
      result.error
      || "Unable to save the class schedules.";

    isSaving.value =
      false;

    return;
  }

  const selectedClassroomIds =
    new Set(
      newSchedules.map(
        (schedule) =>
          schedule.classroomId,
      ),
    );

  lastSavedSchedules.value =
    result.data.schedules.filter(
      (schedule) =>
        selectedClassroomIds.has(
          schedule.classroomId,
        )
        && !schedule.cancelledAt,
    );

  overview.value =
    result.data;

  rows.value =
    buildRows(
      rows.value.map(
        (row) =>
          row.classroom,
      ),
      result.data.schedules,
    );

  saveConfirmationOpen.value =
    false;

  saveSuccessOpen.value =
    true;

  toast.add({
    title:
      "Assessment assigned",
    description:
      `${lastSavedSchedules.value.length} ${lastSavedSchedules.value.length === 1 ? "class is" : "classes are"} ready in Live Sessions.`,
    color:
      "success",
  });

  isSaving.value =
    false;
}

async function openLiveSessions():
  Promise<void> {
  saveSuccessOpen.value =
    false;

  if (singleSavedSchedule.value) {
    await navigateTo(
      `/instructor/sessions/${singleSavedSchedule.value.id}/monitor`,
    );

    return;
  }

  await navigateTo(
    "/instructor/sessions",
  );
}

async function backToAssessments():
  Promise<void> {
  saveSuccessOpen.value =
    false;

  await navigateTo(
    "/instructor/assessments",
  );
}

function requestScheduleAction(
  schedule: AssessmentScheduleItem,
  action: ScheduleAction,
): void {
  pendingScheduleAction.value =
    schedule;
  scheduleAction.value =
    action;
  scheduleActionOpen.value =
    true;
}

function scheduleMenuItems(
  schedule: AssessmentScheduleItem,
): DropdownMenuItem[][] {
  const availability =
    assessmentScheduleActionAvailability(
      schedule.status,
    );

  const lifecycleItems: DropdownMenuItem[] = [];

  if (availability.edit) {
    lifecycleItems.push({
      label: "Edit schedule",
      icon: "i-lucide-calendar-cog",
      onSelect: () =>
        requestScheduleAction(
          schedule,
          "edit",
        ),
    });
  }

  if (availability.extend) {
    lifecycleItems.push({
      label: "Extend due date",
      icon: "i-lucide-calendar-plus-2",
      onSelect: () =>
        requestScheduleAction(
          schedule,
          "extend",
        ),
    });
  }

  if (availability.reopen) {
    lifecycleItems.push({
      label: "Reopen with new schedule",
      icon: "i-lucide-rotate-ccw",
      onSelect: () =>
        requestScheduleAction(
          schedule,
          "reopen",
        ),
    });
  }

  const secondaryItems: DropdownMenuItem[] = [
    {
      label: "View live monitoring",
      icon: "i-lucide-radio-tower",
      to: `/instructor/sessions/${schedule.id}/monitor`,
    },
  ];

  if (availability.close) {
    secondaryItems.push({
      label: "Close early",
      icon: "i-lucide-lock",
      color: "error",
      onSelect: () =>
        requestClose(
          schedule,
        ),
    });
  }

  return [
    ...(lifecycleItems.length > 0
      ? [lifecycleItems]
      : []),
    secondaryItems,
  ];
}

async function confirmScheduleAction(
  payload: {
    startsAt: string | null;
    endsAt: string;
    reason: string;
  },
): Promise<void> {
  if (
    !pendingScheduleAction.value
    || !scheduleAction.value
  ) {
    return;
  }

  isScheduleActionSaving.value =
    true;

  const schedule =
    pendingScheduleAction.value;

  const result =
    scheduleAction.value === "edit"
      ? await editSchedule(
          schedule.id,
          payload.startsAt!,
          payload.endsAt,
          payload.reason,
        )
      : scheduleAction.value === "extend"
        ? await extendSchedule(
            schedule.id,
            payload.endsAt,
            payload.reason,
          )
        : await reopenSchedule(
            schedule.id,
            payload.startsAt!,
            payload.endsAt,
            payload.reason,
          );

  if (
    result.error
    || !result.data
  ) {
    toast.add({
      title:
        scheduleAction.value === "edit"
          ? "Schedule was not edited"
          : scheduleAction.value === "extend"
            ? "Due date was not extended"
            : "Assessment was not reopened",
      description:
        result.error
        || "The schedule could not be updated.",
      color: "error",
    });

    isScheduleActionSaving.value =
      false;
    return;
  }

  toast.add({
    title:
      scheduleAction.value === "edit"
        ? "Schedule updated"
        : scheduleAction.value === "extend"
          ? "Due date extended"
          : "Assessment reopened",
    description:
      result.data.message,
    color: "success",
  });

  scheduleActionOpen.value =
    false;
  pendingScheduleAction.value =
    null;
  scheduleAction.value =
    null;
  isScheduleActionSaving.value =
    false;

  await loadData();
}

function requestClose(
  schedule:
    AssessmentScheduleItem,
): void {
  pendingCloseSchedule.value =
    schedule;

  closeConfirmationOpen.value =
    true;
}

async function confirmClose():
  Promise<void> {
  if (
    !pendingCloseSchedule.value
  ) {
    return;
  }

  closingId.value =
    pendingCloseSchedule.value.id;

  const result =
    await closeSchedule(
      pendingCloseSchedule.value.id,
    );

  if (
    result.error
    || !result.data
  ) {
    toast.add({
      title:
        "Schedule could not be closed",
      description:
        result.error
        || "The assessment access could not be closed.",
      color:
        "error",
    });

    closingId.value =
      null;

    return;
  }

  closeConfirmationOpen.value =
    false;

  pendingCloseSchedule.value =
    null;

  toast.add({
    title:
      "Assessment access closed",
    description:
      result.data.message,
    color:
      "success",
  });

  await loadData();

  closingId.value =
    null;
}

onMounted(
  async () => {
    await loadData();

    const requestedAssignmentId =
      typeof route.query.assignmentId === "string"
        ? route.query.assignmentId
        : null;

    const requestedAction =
      route.query.action === "edit"
      || route.query.action === "extend"
      || route.query.action === "reopen"
        ? route.query.action
        : null;

    if (
      requestedAssignmentId
      && requestedAction
    ) {
      const schedule =
        overview.value?.schedules.find(
          (item) =>
            item.id === requestedAssignmentId,
        );

      if (schedule) {
        requestScheduleAction(
          schedule,
          requestedAction,
        );
      }
    }
  },
);
</script>

<template>
  <div class="page-stack pb-24">
    <PageHeader
      :breadcrumbs="[
        { label: 'Overview', to: '/instructor/dashboard', icon: 'i-lucide-layout-dashboard' },
        { label: 'Assessments', to: '/instructor/assessments' },
        { label: overview?.assessment.title || 'Assessment', to: `/instructor/assessments/${assessmentId}/edit` },
        { label: 'Schedule' },
      ]"
      eyebrow="Assign to classes"
      :title="
        overview?.assessment.title
        || 'Assign Assessment'
      "
      description="Manage existing class schedules safely, or assign this assessment to another class."
    />

    <AssessmentWorkspaceNavigation
      :assessment-id="assessmentId"
      active="schedule"
    />

    <UAlert
      v-if="errorMessage"
      color="error"
      variant="soft"
      title="Assignment needs attention"
      :description="errorMessage"
    />

    <div
      v-if="isLoading"
      class="space-y-5"
    >
      <USkeleton class="h-20 rounded-xl" />
      <USkeleton class="h-[420px] rounded-xl" />
    </div>

    <template
      v-else-if="overview"
    >
      <UAlert
        v-if="!canEdit"
        color="warning"
        variant="soft"
        title="Publish before assigning"
        description="This assessment must be published before it can be assigned to a class."
      />

      <div
        class="flex flex-wrap items-center gap-2 text-sm"
      >
        <UBadge
          color="neutral"
          variant="soft"
          icon="i-lucide-list-checks"
        >
          {{ overview.assessment.questionCount }} questions
        </UBadge>

        <UBadge
          color="neutral"
          variant="soft"
          icon="i-lucide-award"
        >
          {{ overview.assessment.totalPoints }} points
        </UBadge>

        <UBadge
          :color="selectedRows.length > 0 ? 'primary' : 'neutral'"
          variant="soft"
          icon="i-lucide-school"
        >
          {{ selectedRows.length }} selected
        </UBadge>
      </div>

      <UCard
        v-if="existingSchedules.length > 0"
        class="overflow-hidden"
        :ui="{ body: 'p-0 sm:p-0' }"
      >
        <template #header>
          <div class="flex items-center justify-between gap-3">
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h2 class="font-black text-highlighted">Assigned schedules</h2>
                <UBadge color="neutral" variant="soft">{{ existingSchedules.length }}</UBadge>
              </div>
              <p class="mt-1 text-sm text-muted">
                Existing schedules are locked from free-form editing. Use an explicit action to change access.
              </p>
            </div>
          </div>
        </template>

        <div class="divide-y divide-default">
          <article
            v-for="schedule in existingSchedules"
            :key="schedule.id"
            class="flex items-start gap-3 p-4 sm:p-5"
          >
            <div class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <UIcon name="i-lucide-calendar-clock" class="size-4" />
            </div>

            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <p class="font-black text-highlighted">
                  {{ schedule.classroom.subjectCode }} · {{ schedule.classroom.section }}
                </p>
                <StatusPill :status="schedule.status" />
              </div>

              <p class="mt-1 truncate text-sm text-muted">
                {{ schedule.classroom.name }}
              </p>

              <div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted">
                <span class="inline-flex items-center gap-1.5">
                  <UIcon name="i-lucide-calendar-days" class="size-3.5" />
                  Opens {{ formatDate(schedule.startsAt) }}
                </span>
                <span class="inline-flex items-center gap-1.5 font-semibold" :class="schedule.status === 'closed' ? 'text-muted' : 'text-highlighted'">
                  <UIcon name="i-lucide-flag" class="size-3.5" />
                  Due {{ formatDate(schedule.endsAt) }}
                </span>
              </div>
            </div>

            <UDropdownMenu
              :items="scheduleMenuItems(schedule)"
              :content="{ align: 'end', side: 'bottom', sideOffset: 6 }"
              :ui="{ content: 'w-60', item: 'min-h-10', itemLabel: 'font-semibold' }"
            >
              <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-ellipsis-vertical"
                square
                :aria-label="`Schedule actions for ${schedule.classroom.subjectCode} ${schedule.classroom.section}`"
              />
            </UDropdownMenu>
          </article>
        </div>
      </UCard>

      <UCard
        class="overflow-hidden"
        :ui="{
          body: 'p-0 sm:p-0',
        }"
      >
        <div
          class="border-b border-default bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-5 sm:p-6"
        >
          <div
            class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
          >
            <div class="flex items-start gap-3">
              <div
                class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary"
              >
                <UIcon name="i-lucide-school-plus" class="size-4" />
              </div>

              <div>
                <h2 class="font-black text-highlighted">
                  Assign to another class
                </h2>

                <p class="mt-1 text-sm text-muted">
                  Only classes without an existing schedule are listed here.
                </p>
              </div>
            </div>

            <div class="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
              <UInput
                v-model="classSearchQuery"
                icon="i-lucide-search"
                placeholder="Search class"
                aria-label="Search classes"
                class="w-full sm:w-64"
              />

              <UButton
                color="neutral"
                variant="outline"
                icon="i-lucide-check-check"
                :disabled="!canEdit || visibleRows.length === 0"
                @click="selectVisibleClasses"
              >
                Select all
              </UButton>
            </div>
          </div>
        </div>

        <EmptyPanel
          v-if="rows.length === 0"
          class="m-5"
          icon="i-lucide-calendar-check-2"
          :title="existingSchedules.length > 0 ? 'No additional classes to assign' : 'No active classes'"
          :description="existingSchedules.length > 0 ? 'Use the schedule actions above to edit, extend, close, or reopen an existing class schedule.' : 'Create or reactivate a class before assigning this assessment.'"
        />

        <EmptyPanel
          v-else-if="visibleRows.length === 0"
          class="m-5"
          icon="i-lucide-search-x"
          title="No matching classes"
          description="Try a different class name, subject code, or section."
        />

        <div
          v-else
          class="divide-y divide-default"
        >
          <article
            v-for="row in visibleRows"
            :key="row.classroom.id"
            class="transition"
            :class="
              row.selected
                ? 'bg-primary/[0.035]'
                : 'bg-default'
            "
          >
            <button
              type="button"
              class="flex w-full items-center gap-3 p-4 text-left transition hover:bg-elevated/40 sm:px-5"
              :disabled="!canEdit"
              :aria-pressed="row.selected"
              @click="toggleRow(row)"
            >
              <span
                class="flex size-6 shrink-0 items-center justify-center rounded-md border transition"
                :class="
                  row.selected
                    ? 'border-primary bg-primary text-white'
                    : 'border-default bg-default text-transparent'
                "
              >
                <UIcon
                  name="i-lucide-check"
                  class="size-4"
                />
              </span>

              <span class="min-w-0 flex-1">
                <span class="flex flex-wrap items-center gap-2">
                  <span class="font-black text-highlighted">
                    {{ row.classroom.subjectCode }}
                    ·
                    {{ row.classroom.section }}
                  </span>

                </span>

                <span class="mt-1 block truncate text-sm text-muted">
                  {{ row.classroom.name }}
                </span>
              </span>

              <UIcon
                :name="row.selected ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
                class="size-4 shrink-0 text-muted"
              />
            </button>

            <div
              v-if="row.selected"
              class="border-t border-default/70 px-4 pb-5 pt-4 sm:px-5"
            >
              <div class="mb-3 flex items-center gap-2 text-sm font-semibold text-highlighted">
                <UIcon name="i-lucide-calendar-range" class="size-4 text-primary" />
                Set access window
              </div>

              <div class="grid gap-4 md:grid-cols-2">
                <UFormField
                  label="Opens"
                  description="Students can start from this time."
                >
                  <UInput
                    v-model="row.startsAtLocal"
                    type="datetime-local"
                    class="w-full"
                  />
                </UFormField>

                <UFormField
                  label="Closes"
                  description="This is the final deadline."
                >
                  <UInput
                    v-model="row.endsAtLocal"
                    type="datetime-local"
                    class="w-full"
                  />
                </UFormField>
              </div>

            </div>
          </article>
        </div>
      </UCard>

      <div
        v-if="rows.length > 0"
        class="sticky bottom-4 z-20 rounded-2xl border border-default bg-default/95 p-3 shadow-xl backdrop-blur supports-[backdrop-filter]:bg-default/85"
      >
        <div
          class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="min-w-0">
            <p class="font-bold text-highlighted">
              {{
                selectedRows.length === 0
                  ? 'Choose a class to continue'
                  : `${selectedRows.length} ${selectedRows.length === 1 ? 'class' : 'classes'} selected`
              }}
            </p>

            <p class="mt-0.5 text-xs text-muted">
              Review the schedule before saving.
            </p>
          </div>

          <UButton
            icon="i-lucide-arrow-right"
            trailing
            :disabled="!canEdit || selectedRows.length === 0"
            @click="requestSave"
          >
            Review & Save
          </UButton>
        </div>
      </div>
    </template>

    <UModal
      v-model:open="saveConfirmationOpen"
      :ui="{
        content: 'sm:max-w-2xl',
      }"
    >
      <template #content>
        <div class="p-5 sm:p-6">
          <div class="flex items-start gap-3">
            <div
              class="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary"
            >
              <UIcon
                name="i-lucide-calendar-check"
                class="size-5"
              />
            </div>

            <div class="min-w-0">
              <h2 class="text-xl font-black text-highlighted">
                Review assignment
              </h2>

              <p class="mt-1 text-sm text-muted">
                Confirm the classes and access times before saving.
              </p>
            </div>
          </div>

          <div class="mt-5 space-y-2">
            <div
              v-for="row in selectedRows"
              :key="row.classroom.id"
              class="rounded-xl border border-default bg-elevated/35 p-4"
            >
              <div
                class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
              >
                <div class="min-w-0">
                  <p class="font-black text-highlighted">
                    {{ row.classroom.subjectCode }}
                    ·
                    {{ row.classroom.section }}
                  </p>

                  <p class="mt-1 truncate text-sm text-muted">
                    {{ row.classroom.name }}
                  </p>
                </div>

                <div class="shrink-0 text-sm sm:text-right">
                  <p class="font-semibold text-highlighted">
                    {{ formatLocalDate(row.startsAtLocal) }}
                  </p>

                  <p class="mt-1 text-muted">
                    to {{ formatLocalDate(row.endsAtLocal) }}
                  </p>
                </div>
              </div>
            </div>
          </div>


          <div
            class="mt-6 flex flex-col-reverse gap-2 border-t border-default pt-4 sm:flex-row sm:justify-end"
          >
            <UButton
              color="neutral"
              variant="ghost"
              :disabled="isSaving"
              @click="saveConfirmationOpen = false"
            >
              Go Back
            </UButton>

            <UButton
              icon="i-lucide-calendar-check"
              :loading="isSaving"
              @click="save"
            >
              Assign Assessment
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <UModal
      v-model:open="saveSuccessOpen"
      :ui="{
        content: 'sm:max-w-md',
      }"
    >
      <template #content>
        <div class="p-6 text-center sm:p-7">
          <div
            class="mx-auto flex size-16 items-center justify-center rounded-full bg-success/12 text-success ring-8 ring-success/5"
          >
            <UIcon
              name="i-lucide-check"
              class="size-8 stroke-[3]"
            />
          </div>

          <h2 class="mt-5 text-2xl font-black text-highlighted">
            Assessment assigned
          </h2>

          <p class="mt-2 text-sm leading-6 text-muted">
            {{
              lastSavedSchedules.length === 1
                ? 'The class schedule is ready.'
                : `${lastSavedSchedules.length} class schedules are ready.`
            }}
            What would you like to do next?
          </p>

          <div class="mt-6 grid gap-2">
            <UButton
              size="lg"
              icon="i-lucide-radio-tower"
              block
              @click="openLiveSessions"
            >
              {{ liveSessionActionLabel }}
            </UButton>

            <UButton
              size="lg"
              color="neutral"
              variant="outline"
              icon="i-lucide-clipboard-list"
              block
              @click="backToAssessments"
            >
              Back to Assessments
            </UButton>
          </div>

          <UButton
            class="mt-3"
            color="neutral"
            variant="ghost"
            size="sm"
            @click="saveSuccessOpen = false"
          >
            Stay on this page
          </UButton>
        </div>
      </template>
    </UModal>

    <AssessmentScheduleActionModal
      v-model:open="scheduleActionOpen"
      :schedule="pendingScheduleAction"
      :action="scheduleAction"
      :loading="isScheduleActionSaving"
      @confirm="confirmScheduleAction"
    />

    <ConfirmationModal
      v-model:open="closeConfirmationOpen"
      title="Close assessment access now?"
      description="Students will no longer be able to start. In-progress attempts will be submitted automatically."
      confirm-label="Close Access"
      confirm-color="error"
      icon="i-lucide-lock"
      :loading="Boolean(closingId)"
      @confirm="confirmClose"
    />
  </div>
</template>
