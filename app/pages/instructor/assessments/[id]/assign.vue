<script setup lang="ts">
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

const removedExistingRows =
  computed(
    () =>
      rows.value.filter(
        (row) =>
          Boolean(
            row.existing,
          )
          && !row.selected,
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
  const activeMap =
    new Map(
      schedules
        .filter(
          (schedule) =>
            [
              "upcoming",
              "open",
            ].includes(
              schedule.status,
            ),
        )
        .map(
          (schedule) => [
            schedule.classroomId,
            schedule,
          ],
        ),
    );

  return classes.map(
    (classroom) => {
      const existing =
        activeMap.get(
          classroom.id,
        )
        ?? null;

      const defaults =
        defaultWindow();

      return {
        classroom,
        selected:
          Boolean(existing),
        startsAtLocal:
          existing
            ? localInputValue(
                existing.startsAt,
              )
            : defaults
              .startsAtLocal,
        endsAtLocal:
          existing
            ? localInputValue(
                existing.endsAt,
              )
            : defaults
              .endsAtLocal,
        maxAttempts:
          existing?.maxAttempts
          ?? 1,
        existing,
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

  const schedules:
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
      schedules.map(
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
  loadData,
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
      description="Choose the classes that should receive this assessment, then set their access window."
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
                <span class="text-sm font-black">1</span>
              </div>

              <div>
                <h2 class="font-black text-highlighted">
                  Choose classes
                </h2>

                <p class="mt-1 text-sm text-muted">
                  Select the classes that should receive this assessment.
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
          icon="i-lucide-school"
          title="No active classes"
          description="Create or reactivate a class before assigning this assessment."
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

                  <UBadge
                    v-if="row.existing"
                    color="success"
                    variant="soft"
                    size="sm"
                  >
                    Assigned
                  </UBadge>
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
              <div
                class="mb-3 flex items-center gap-2 text-sm font-semibold text-highlighted"
              >
                <div
                  class="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary"
                >
                  <span class="text-xs font-black">2</span>
                </div>

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

              <div
                v-if="row.existing"
                class="mt-4 flex items-center justify-between gap-3 rounded-xl bg-elevated/50 px-3 py-2.5"
              >
                <p class="text-xs text-muted">
                  This class already has an active schedule.
                </p>

                <UButton
                  color="error"
                  variant="ghost"
                  size="sm"
                  icon="i-lucide-lock"
                  :loading="closingId === row.existing.id"
                  @click="requestClose(row.existing)"
                >
                  Close early
                </UButton>
              </div>
            </div>
          </article>
        </div>
      </UCard>

      <div
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
              <p class="text-xs font-bold uppercase tracking-[0.14em] text-primary">
                Step 3
              </p>

              <h2 class="mt-1 text-xl font-black text-highlighted">
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

          <UAlert
            v-if="removedExistingRows.length > 0"
            class="mt-4"
            color="warning"
            variant="soft"
            icon="i-lucide-triangle-alert"
            title="Existing assignments will be removed"
            :description="`${removedExistingRows.length} previously assigned ${removedExistingRows.length === 1 ? 'class is' : 'classes are'} no longer selected.`"
          />

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
