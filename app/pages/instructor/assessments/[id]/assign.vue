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
  timeLimitMinutes:
    number | null;
  showLeaderboard: boolean;
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

      const defaultSeconds =
        overview.value
          ?.assessment
          .defaultTimeLimitSeconds
        ?? 3600;

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
        timeLimitMinutes:
          Math.round(
            (
              existing
                ?.timeLimitSeconds
              ?? defaultSeconds
            ) / 60,
          ),
        showLeaderboard:
          existing
            ?.showLeaderboard
          ?? overview.value
            ?.assessment
            .defaultLeaderboardEnabled
          ?? true,
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

    if (
      !row.timeLimitMinutes
      || row.timeLimitMinutes < 1
      || row.timeLimitMinutes > 360
    ) {
      return `Set a duration from 1 to 360 minutes for ${row.classroom.subjectCode} · ${row.classroom.section}.`;
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
        timeLimitSeconds:
          row.timeLimitMinutes
            ? row.timeLimitMinutes
              * 60
            : null,
        showLeaderboard:
          row.showLeaderboard,
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

  saveConfirmationOpen.value =
    false;

  toast.add({
    title:
      "Assessment assigned",
    description:
      "Students will receive access automatically during the selected schedule.",
    color:
      "success",
  });

  await loadData();

  isSaving.value =
    false;
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
  <div class="page-stack">
    <PageHeader
      eyebrow="Classroom delivery"
      :title="
        overview?.assessment.title
        || 'Assign Assessment'
      "
      description="Select classes and configure when students can begin, how long each attempt lasts, and whether ranking is available."
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
      title="Class assignment could not be updated"
      :description="errorMessage"
    />

    <div
      v-if="isLoading"
      class="space-y-5"
    >
      <USkeleton class="h-32 rounded-xl" />
      <USkeleton class="h-96 rounded-xl" />
    </div>

    <template
      v-else-if="overview"
    >
      <UAlert
        v-if="!canEdit"
        color="warning"
        variant="soft"
        title="Publish before assigning"
        description="Only published assessments can be opened for student answering."
      />

      <section class="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Questions"
          :value="
            String(
              overview.assessment
                .questionCount,
            )
          "
          icon="i-lucide-list-checks"
        />

        <StatCard
          label="Total points"
          :value="
            String(
              overview.assessment
                .totalPoints,
            )
          "
          icon="i-lucide-award"
          tone="info"
        />

        <StatCard
          label="Selected classes"
          :value="
            String(
              selectedRows.length,
            )
          "
          icon="i-lucide-school"
          tone="success"
        />
      </section>

      <UAlert
        color="info"
        variant="soft"
        icon="i-lucide-clock-3"
        title="Automatic student access"
        description="No session code or instructor Start button is required. Enrolled students can start or continue when the schedule is open."
      />

      <UCard>
        <template #header>
          <div>
            <h2 class="font-black text-highlighted">
              Classroom schedules
            </h2>

            <p class="mt-1 text-sm text-muted">
              Each class may use a different opening time, closing time, and attempt duration.
            </p>
          </div>
        </template>

        <EmptyPanel
          v-if="
            rows.length === 0
          "
          icon="i-lucide-school"
          title="No active classes"
          description="Create or reactivate a class before assigning this assessment."
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
            <div class="flex flex-col gap-4">
              <button
                type="button"
                class="flex items-start gap-3 text-left"
                :disabled="!canEdit"
                @click="
                  toggleRow(
                    row,
                  )
                "
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

                <span>
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
                class="grid gap-4 border-t border-default pt-4 md:grid-cols-2 xl:grid-cols-4"
              >
                <UFormField label="Opens">
                  <UInput
                    v-model="row.startsAtLocal"
                    type="datetime-local"
                    class="w-full"
                  />
                </UFormField>

                <UFormField label="Closes">
                  <UInput
                    v-model="row.endsAtLocal"
                    type="datetime-local"
                    class="w-full"
                  />
                </UFormField>

                <UFormField
                  label="Attempt duration"
                  description="Minutes"
                >
                  <UInput
                    v-model.number="row.timeLimitMinutes"
                    type="number"
                    min="1"
                    max="360"
                    class="w-full"
                  />
                </UFormField>

                <div class="flex items-end">
                  <USwitch
                    v-model="row.showLeaderboard"
                    label="Show leaderboard"
                  />
                </div>
              </div>

              <div
                v-if="
                  row.existing
                  && row.selected
                "
                class="flex justify-end"
              >
                <UButton
                  color="error"
                  variant="soft"
                  size="sm"
                  icon="i-lucide-lock"
                  :loading="
                    closingId
                    === row.existing.id
                  "
                  @click="
                    requestClose(
                      row.existing,
                    )
                  "
                >
                  Close Access Early
                </UButton>
              </div>
            </div>
          </article>
        </div>
      </UCard>

      <div class="flex justify-end">
        <UButton
          icon="i-lucide-calendar-check"
          :disabled="!canEdit"
          @click="requestSave"
        >
          Review and Save
        </UButton>
      </div>
    </template>

    <ConfirmationModal
      v-model:open="
        saveConfirmationOpen
      "
      title="Save classroom assessment schedules?"
      description="Students in the selected classes will be able to start independently when the opening time is reached. Their answers and timer will be controlled by the server."
      confirm-label="Save Schedules"
      icon="i-lucide-calendar-check"
      :loading="isSaving"
      @confirm="save"
    />

    <ConfirmationModal
      v-model:open="
        closeConfirmationOpen
      "
      title="Close assessment access now?"
      description="Students will no longer be able to start. In-progress attempts will be submitted and graded safely."
      confirm-label="Close Access"
      confirm-color="error"
      icon="i-lucide-lock"
      :loading="
        Boolean(
          closingId,
        )
      "
      @confirm="confirmClose"
    />
  </div>
</template>
