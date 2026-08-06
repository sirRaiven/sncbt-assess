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
  layout: "instructor",
});

useSeoMeta({
  title: "Schedule assessment",
});

interface ClassScheduleRow {
  classroom: AssessmentClassOption;
  selected: boolean;
  startsAtLocal: string;
  endsAtLocal: string;
  existing: AssessmentScheduleItem | null;
}

const route = useRoute();
const toast = useToast();

const assessmentId = computed(
  () => String(route.params.id),
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
  ref<InstructorAssessmentScheduleOverview | null>(
    null,
  );

const rows =
  ref<ClassScheduleRow[]>([]);

const isLoading = ref(true);
const isSaving = ref(false);
const closingId = ref<string | null>(null);
const errorMessage = ref("");

const selectedRows = computed(
  () => rows.value.filter(
    (row) => row.selected,
  ),
);

const historicalSchedules = computed(
  () => (
    overview.value?.schedules
    ?? []
  ).filter(
    (schedule) =>
      schedule.status === "closed"
      || schedule.status === "cancelled",
  ),
);

const canEdit = computed(
  () =>
    overview.value?.assessment.status
    === "published",
);

function pad(
  value: number,
): string {
  return String(value).padStart(
    2,
    "0",
  );
}

function localInputValue(
  value: Date | string,
): string {
  const date =
    value instanceof Date
      ? value
      : new Date(value);

  return [
    date.getFullYear(),
    "-",
    pad(date.getMonth() + 1),
    "-",
    pad(date.getDate()),
    "T",
    pad(date.getHours()),
    ":",
    pad(date.getMinutes()),
  ].join("");
}

function defaultWindow(): {
  startsAtLocal: string;
  endsAtLocal: string;
} {
  const startsAt =
    new Date();

  startsAt.setSeconds(
    0,
    0,
  );

  startsAt.setMinutes(
    startsAt.getMinutes() + 15,
  );

  const endsAt =
    new Date(
      startsAt.getTime()
      + 60 * 60 * 1000,
    );

  return {
    startsAtLocal:
      localInputValue(startsAt),
    endsAtLocal:
      localInputValue(endsAt),
  };
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

function toggleRow(
  row: ClassScheduleRow,
): void {
  if (!canEdit.value) {
    return;
  }

  row.selected =
    !row.selected;
}

function buildRows(
  classes: AssessmentClassOption[],
  schedules: AssessmentScheduleItem[],
): ClassScheduleRow[] {
  const activeScheduleMap =
    new Map(
      schedules
        .filter(
          (schedule) =>
            schedule.status === "scheduled"
            || schedule.status === "open",
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
        activeScheduleMap.get(
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
            : defaults.startsAtLocal,
        endsAtLocal:
          existing
            ? localInputValue(
                existing.endsAt,
              )
            : defaults.endsAtLocal,
        existing,
      };
    },
  );
}

function validateRows(): string | null {
  const classroomIds =
    selectedRows.value.map(
      (row) =>
        row.classroom.id,
    );

  if (
    new Set(classroomIds).size
    !== classroomIds.length
  ) {
    return "Each class can be selected only once.";
  }

  for (
    const row
    of selectedRows.value
  ) {
    if (
      !row.startsAtLocal
      || !row.endsAtLocal
    ) {
      return `Complete both dates for ${row.classroom.subjectCode} · ${row.classroom.section}.`;
    }

    const startsAt =
      new Date(row.startsAtLocal);

    const endsAt =
      new Date(row.endsAtLocal);

    if (
      Number.isNaN(startsAt.getTime())
      || Number.isNaN(endsAt.getTime())
    ) {
      return `Enter valid dates for ${row.classroom.subjectCode} · ${row.classroom.section}.`;
    }

    if (
      endsAt.getTime()
      <= startsAt.getTime()
    ) {
      return `The end date must be later than the start date for ${row.classroom.subjectCode} · ${row.classroom.section}.`;
    }

    if (
      endsAt.getTime()
      <= Date.now()
    ) {
      return `The end date must be in the future for ${row.classroom.subjectCode} · ${row.classroom.section}.`;
    }
  }

  return null;
}

async function loadData(): Promise<void> {
  isLoading.value = true;
  errorMessage.value = "";

  const [
    scheduleResult,
    classResult,
  ] = await Promise.all([
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

    isLoading.value = false;
    return;
  }

  if (
    classResult.error
    || !classResult.data
  ) {
    errorMessage.value =
      classResult.error
      || "Unable to load your active classes.";

    isLoading.value = false;
    return;
  }

  overview.value =
    scheduleResult.data;

  rows.value =
    buildRows(
      classResult.data.classes,
      scheduleResult.data.schedules,
    );

  isLoading.value = false;
}

async function save(): Promise<void> {
  if (
    !overview.value
    || !canEdit.value
  ) {
    return;
  }

  const validationError =
    validateRows();

  if (validationError) {
    errorMessage.value =
      validationError;
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
      }),
    );

  isSaving.value = true;
  errorMessage.value = "";

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
      || "Unable to save the schedules.";

    isSaving.value = false;
    return;
  }

  toast.add({
    title: "Assessment schedule saved",
    description:
      result.data.message,
    color: "success",
  });

  await loadData();
  isSaving.value = false;
}

async function closeEarly(
  schedule: AssessmentScheduleItem,
): Promise<void> {
  closingId.value =
    schedule.id;

  const result =
    await closeSchedule(
      schedule.id,
    );

  if (
    result.error
    || !result.data
  ) {
    toast.add({
      title: "Schedule could not be closed",
      description:
        result.error
        || "The schedule could not be updated.",
      color: "error",
    });

    closingId.value = null;
    return;
  }

  toast.add({
    title: "Schedule closed",
    description:
      result.data.message,
    color: "success",
  });

  await loadData();
  closingId.value = null;
}

onMounted(loadData);
</script>

<template>
  <div class="page-stack">
    <PageHeader
      eyebrow="Automatic class access"
      :title="overview?.assessment.title || 'Schedule assessment'"
      description="Choose one or more classes and set when the assessment automatically opens and closes. No instructor session code or manual start is required."
    >
      <template #actions>
        <UButton
          to="/instructor/assessments"
          color="neutral"
          variant="outline"
          icon="i-lucide-arrow-left"
        >
          Assessments
        </UButton>
      </template>
    </PageHeader>

    <UAlert
      v-if="errorMessage"
      color="error"
      variant="soft"
      title="Schedule could not be updated"
      :description="errorMessage"
    />

    <div
      v-if="isLoading"
      class="space-y-5"
    >
      <USkeleton class="h-32 rounded-xl" />
      <USkeleton class="h-96 rounded-xl" />
    </div>

    <template v-else-if="overview">
      <UAlert
        v-if="!canEdit"
        color="warning"
        variant="soft"
        title="Publish before scheduling"
        description="Only published assessments can be scheduled for automatic student access."
      />

      <section class="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Questions"
          :value="String(overview.assessment.questionCount)"
          icon="i-lucide-list-checks"
          tone="primary"
        />

        <StatCard
          label="Total points"
          :value="String(overview.assessment.totalPoints)"
          icon="i-lucide-award"
          tone="info"
        />

        <StatCard
          label="Scheduled classes"
          :value="String(selectedRows.length)"
          icon="i-lucide-calendar-clock"
          tone="success"
        />
      </section>

      <UAlert
        color="info"
        variant="soft"
        icon="i-lucide-clock-3"
        title="Server-controlled availability"
        description="Students enrolled in a selected class see the assessment automatically. Access opens at the start date and closes at the end date using server time."
      />

      <UCard>
        <template #header>
          <div>
            <h2 class="font-bold text-highlighted">
              Class schedules
            </h2>

            <p class="mt-1 text-sm text-muted">
              Select a class, then enter its availability window. Different classes may use different dates.
            </p>
          </div>
        </template>

        <EmptyPanel
          v-if="rows.length === 0"
          icon="i-lucide-school"
          title="No active classes"
          description="Create or reactivate a class before scheduling this assessment."
        />

        <div
          v-else
          class="space-y-4"
        >
          <article
            v-for="row in rows"
            :key="row.classroom.id"
            class="rounded-xl border p-4 transition"
            :class="
              row.selected
                ? 'border-primary bg-primary/5'
                : 'border-default bg-default'
            "
          >
            <div class="flex flex-col gap-4 xl:flex-row xl:items-start">
              <button
                type="button"
                class="flex min-w-0 flex-1 items-start gap-3 text-left disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="!canEdit"
                @click="toggleRow(row)"
              >
                <span
                  class="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border"
                  :class="
                    row.selected
                      ? 'border-primary bg-primary text-white'
                      : 'border-default text-transparent'
                  "
                >
                  <UIcon
                    name="i-lucide-check"
                    class="size-4"
                  />
                </span>

                <span class="min-w-0">
                  <span class="block font-black text-highlighted">
                    {{ row.classroom.subjectCode }}
                    ·
                    {{ row.classroom.section }}
                  </span>

                  <span class="mt-1 block text-sm text-muted">
                    {{ row.classroom.name }}
                    ·
                    {{ row.classroom.schoolYear }}
                    ·
                    {{ row.classroom.semester }}
                  </span>
                </span>
              </button>

              <div
                v-if="row.selected"
                class="grid gap-3 sm:grid-cols-2 xl:w-[560px]"
              >
                <UFormField label="Starts">
                  <UInput
                    v-model="row.startsAtLocal"
                    type="datetime-local"
                    class="w-full"
                    :disabled="!canEdit"
                  />
                </UFormField>

                <UFormField label="Ends and closes">
                  <UInput
                    v-model="row.endsAtLocal"
                    type="datetime-local"
                    class="w-full"
                    :disabled="!canEdit"
                  />
                </UFormField>
              </div>
            </div>
          </article>
        </div>
      </UCard>

      <UCard
        v-if="historicalSchedules.length > 0"
      >
        <template #header>
          <div>
            <h2 class="font-bold text-highlighted">
              Closed schedule history
            </h2>

            <p class="mt-1 text-sm text-muted">
              These class windows have ended or were cancelled. Rescheduling the same class creates a new active window on the existing assignment record.
            </p>
          </div>
        </template>

        <div class="space-y-3">
          <div
            v-for="schedule in historicalSchedules"
            :key="schedule.id"
            class="flex flex-col gap-3 rounded-xl border border-default p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p class="font-bold text-highlighted">
                {{ schedule.classroom.subjectCode }}
                ·
                {{ schedule.classroom.section }}
              </p>

              <p class="mt-1 text-sm text-muted">
                {{ formatDate(schedule.startsAt) }}
                —
                {{ formatDate(schedule.endsAt) }}
              </p>
            </div>

            <StatusPill :status="schedule.status" />
          </div>
        </div>
      </UCard>

      <div class="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <UButton
          to="/instructor/assessments"
          color="neutral"
          variant="outline"
          size="lg"
        >
          Cancel
        </UButton>

        <UButton
          size="lg"
          icon="i-lucide-save"
          :loading="isSaving"
          :disabled="!canEdit"
          @click="save"
        >
          Save Class Schedules
        </UButton>
      </div>

      <UCard
        v-if="overview.schedules.some((schedule) => schedule.status === 'open')"
      >
        <template #header>
          <h2 class="font-bold text-highlighted">
            Open class access
          </h2>
        </template>

        <div class="space-y-3">
          <div
            v-for="schedule in overview.schedules.filter((item) => item.status === 'open')"
            :key="schedule.id"
            class="flex flex-col gap-3 rounded-xl border border-default p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p class="font-bold text-highlighted">
                {{ schedule.classroom.subjectCode }}
                ·
                {{ schedule.classroom.section }}
              </p>

              <p class="mt-1 text-sm text-muted">
                Closes {{ formatDate(schedule.endsAt) }}
              </p>
            </div>

            <UButton
              color="error"
              variant="soft"
              icon="i-lucide-lock"
              :loading="closingId === schedule.id"
              @click="closeEarly(schedule)"
            >
              Close Early
            </UButton>
          </div>
        </div>
      </UCard>
    </template>
  </div>
</template>
