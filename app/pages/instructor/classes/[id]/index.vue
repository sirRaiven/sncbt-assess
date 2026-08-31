<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";

import type {
  AssessmentWithClassroom,
} from "~/types/assessment";

import type {
  InstructorDeliveryListItem,
} from "~/types/assessment-delivery";

import type {
  ClassroomEnrollmentSettings,
} from "~/types/classroom";

definePageMeta({
  layout: "instructor",
});

useSeoMeta({
  title: "Class assessments",
});

const toast = useToast();

const {
  classroomId,
  classroom,
  refreshClass,
} = useInstructorClassShell();

const {
  archiveClass,
  reactivateClass,
  regenerateCode,
  setCodeEnabled,
  getEnrollmentSettings,
  setEnrollmentApprovalRequired,
} = useClassrooms();

const {
  listInstructorAssessments,
} = useAssessments();

const {
  listInstructorDeliveries,
} = useAssessmentDelivery();

const enrollmentSettings =
  ref<ClassroomEnrollmentSettings | null>(null);

const assessments =
  ref<AssessmentWithClassroom[]>([]);

const deliveries =
  ref<InstructorDeliveryListItem[]>([]);

const deliveryDataAvailable = ref(false);

const isLoadingEnrollment = ref(true);
const isLoadingAssessments = ref(true);
const isUpdating = ref(false);
const isApprovalUpdating = ref(false);
const enrollmentSettingsError = ref("");
const assessmentError = ref("");

const approvalConfirmationOpen = ref(false);
const requestedApprovalValue = ref(false);

const archiveConfirmationOpen =
  ref(false);

const assignedAssessments = computed(
  () => assessments.value
    .filter(
      (assessment) =>
        assessment.status !== "archived"
        && (
          assessment.classroom_id === classroomId.value
          || assessment.assignedClassrooms.some(
            (assignedClassroom) =>
              assignedClassroom.id === classroomId.value,
          )
        ),
    )
    .sort(
      (a, b) =>
        new Date(b.updated_at).getTime()
        - new Date(a.updated_at).getTime(),
    ),
);

function typeLabel(value: string): string {
  return value
    .split("_")
    .map(
      (part) =>
        part.charAt(0).toUpperCase()
        + part.slice(1),
    )
    .join(" ");
}

function formatPublishedDate(value: string | null): string {
  if (!value) return "";

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeZone: "Asia/Manila",
  }).format(new Date(value));
}

function formatScheduleWindow(
  startsAt: string,
  endsAt: string,
): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);

  const dateFormatter = new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Manila",
  });

  const timeFormatter = new Intl.DateTimeFormat("en-PH", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Manila",
  });

  const sameDate = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Manila",
  });

  if (sameDate.format(start) === sameDate.format(end)) {
    return `${dateFormatter.format(start)} · ${timeFormatter.format(start)}–${timeFormatter.format(end)}`;
  }

  return `${dateFormatter.format(start)} ${timeFormatter.format(start)} – ${dateFormatter.format(end)} ${timeFormatter.format(end)}`;
}

function deliveryPriority(
  delivery: InstructorDeliveryListItem,
): number {
  switch (delivery.status) {
    case "open":
      return 0;
    case "upcoming":
      return 1;
    case "closed":
      return 2;
    default:
      return 3;
  }
}

function assessmentDelivery(
  assessmentId: string,
): InstructorDeliveryListItem | null {
  const matching = deliveries.value
    .filter(
      (delivery) =>
        delivery.assessmentId === assessmentId
        && delivery.classroom.id === classroomId.value
        && delivery.status !== "cancelled",
    )
    .sort((first, second) => {
      const priority = deliveryPriority(first) - deliveryPriority(second);
      if (priority !== 0) return priority;

      if (first.status === "closed" && second.status === "closed") {
        return new Date(second.endsAt).getTime() - new Date(first.endsAt).getTime();
      }

      return new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime();
    });

  return matching[0] ?? null;
}

function assessmentMenuItems(
  assessment: AssessmentWithClassroom,
): DropdownMenuItem[][] {
  const delivery = assessmentDelivery(assessment.id);

  return [
    [
      {
        label: "Edit assessment",
        icon: "i-lucide-pencil",
        to: `/instructor/assessments/${assessment.id}/edit`,
      },
      {
        label: "View live monitoring",
        icon: "i-lucide-radio-tower",
        to: delivery
          ? `/instructor/sessions/${delivery.assignmentId}/monitor`
          : undefined,
        disabled: !delivery,
      },
    ],
  ];
}

async function loadAssignedAssessments(): Promise<void> {
  isLoadingAssessments.value = true;
  assessmentError.value = "";

  const [assessmentResult, deliveryResult] =
    await Promise.all([
      listInstructorAssessments(),
      listInstructorDeliveries(),
    ]);

  if (
    assessmentResult.error
    || !assessmentResult.data
  ) {
    assessmentError.value =
      assessmentResult.error
      || "We couldn't load the assigned assessments right now.";
    isLoadingAssessments.value = false;
    return;
  }

  assessments.value =
    assessmentResult.data.assessments;

  deliveries.value =
    deliveryResult.data?.deliveries
    ?? [];

  deliveryDataAvailable.value =
    Boolean(deliveryResult.data);

  isLoadingAssessments.value = false;
}

async function loadEnrollmentSettings(): Promise<void> {
  isLoadingEnrollment.value = true;
  enrollmentSettingsError.value = "";

  const result =
    await getEnrollmentSettings(
      classroomId.value,
    );

  if (
    result.error
    || !result.data
  ) {
    enrollmentSettingsError.value =
      result.error
      || "We couldn't load the enrollment settings.";

    enrollmentSettings.value = {
      joinEnabled:
        classroom.value?.join_enabled
        ?? false,
      requiresApproval:
        classroom.value?.join_requires_approval
        ?? false,
      pendingCount:
        classroom.value?.memberCounts.pending
        ?? 0,
    };

    isLoadingEnrollment.value = false;
    return;
  }

  enrollmentSettings.value =
    result.data;
  isLoadingEnrollment.value = false;
}

function requestClassStatusAction():
  void {
  if (
    classroom.value?.status
    === "active"
  ) {
    archiveConfirmationOpen.value =
      true;

    return;
  }

  void runClassAction(
    "reactivate",
  );
}

async function runClassAction(
  action:
    | "archive"
    | "reactivate"
    | "regenerate"
    | "toggle-code",
): Promise<void> {
  if (!classroom.value) {
    return;
  }

  isUpdating.value = true;

  let result;

  if (action === "archive") {
    result =
      await archiveClass(
        classroom.value.id,
      );
  } else if (
    action === "reactivate"
  ) {
    result =
      await reactivateClass(
        classroom.value.id,
      );
  } else if (
    action === "regenerate"
  ) {
    result =
      await regenerateCode(
        classroom.value.id,
      );
  } else {
    result =
      await setCodeEnabled(
        classroom.value.id,
        !classroom.value.join_enabled,
      );
  }

  if (
    result.error
    || !result.data
  ) {
    toast.add({
      title: "Unable to update class",
      description:
        result.error
        || "The class couldn't be updated right now.",
      color: "error",
    });

    isUpdating.value = false;
    return;
  }

  toast.add({
    title:
      action === "archive"
        ? "Class archived"
        : "Class updated",
    description:
      result.data.message,
    color: "success",
  });

  if (action === "archive") {
    isUpdating.value = false;

    await navigateTo(
      "/instructor/archive?section=classes",
    );

    return;
  }

  await refreshClass();
  await loadEnrollmentSettings();
  isUpdating.value = false;
}

async function copyCode(): Promise<void> {
  if (!classroom.value) {
    return;
  }

  try {
    await navigator.clipboard.writeText(
      classroom.value.join_code,
    );

    toast.add({
      title: "Class code copied",
      description: classroom.value.join_code,
      color: "success",
    });
  } catch {
    toast.add({
      title: "Unable to copy class code",
      description:
        "Select the code and copy it manually.",
      color: "warning",
    });
  }
}

async function shareCode(): Promise<void> {
  if (!classroom.value) {
    return;
  }

  const text =
    `Join ${classroom.value.name} in SNCBT Assess using class code ${classroom.value.join_code}.`;

  if (
    typeof navigator.share
    === "function"
  ) {
    try {
      await navigator.share({
        title:
          `${classroom.value.name} — SNCBT Assess`,
        text,
        url:
          `${window.location.origin}/student/classes?join=${encodeURIComponent(classroom.value.join_code)}`,
      });
      return;
    } catch (error) {
      if (
        error instanceof DOMException
        && error.name === "AbortError"
      ) {
        return;
      }
    }
  }

  await copyCode();
}

function requestApprovalChange(
  required: boolean,
): void {
  if (
    !enrollmentSettings.value
    || required
      === enrollmentSettings.value.requiresApproval
  ) {
    return;
  }

  requestedApprovalValue.value =
    required;

  if (
    !required
    && enrollmentSettings.value.pendingCount > 0
  ) {
    approvalConfirmationOpen.value = true;
    return;
  }

  void applyApprovalChange(required);
}

async function applyApprovalChange(
  required = requestedApprovalValue.value,
): Promise<void> {
  if (!classroom.value) {
    return;
  }

  approvalConfirmationOpen.value = false;
  isApprovalUpdating.value = true;

  const result =
    await setEnrollmentApprovalRequired(
      classroom.value.id,
      required,
    );

  if (
    result.error
    || !result.data
  ) {
    toast.add({
      title: "Unable to update enrollment",
      description:
        result.error
        || "The enrollment setting couldn't be updated right now.",
      color: "error",
    });

    isApprovalUpdating.value = false;
    return;
  }

  enrollmentSettings.value = {
    joinEnabled:
      classroom.value.join_enabled,
    requiresApproval:
      result.data.requiresApproval,
    pendingCount:
      result.data.pendingCount,
  };

  toast.add({
    title:
      required
        ? "Approval required"
        : "Automatic joining enabled",
    description:
      required
        ? "New students who use the class code will wait for your approval."
        : "New students with a valid class code will join immediately.",
    color: "success",
  });

  isApprovalUpdating.value = false;
}

watch(
  classroomId,
  () => {
    void Promise.all([
      loadEnrollmentSettings(),
      loadAssignedAssessments(),
    ]);
  },
);

onMounted(() => {
  void Promise.all([
    loadEnrollmentSettings(),
    loadAssignedAssessments(),
  ]);
});
</script>

<template>
  <div class="space-y-6">
    <template v-if="classroom">
      <section class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <UCard
          class="overflow-hidden border-primary/10 border-t-primary/30 bg-gradient-to-br from-default via-default to-primary/5 shadow-lg shadow-primary/5 ring-1 ring-primary/5 dark:border-primary/15 dark:to-primary/10 dark:shadow-black/15"
          :ui="{
            body: 'p-0 sm:p-0',
          }"
        >
          <template #header>
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div class="flex items-start gap-3">
                <div class="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/10">
                  <UIcon name="i-lucide-notebook-tabs" class="size-5" />
                </div>

                <div>
                  <div class="flex flex-wrap items-center gap-2">
                    <h2 class="font-bold text-highlighted">
                      Assigned assessments
                    </h2>

                  <UBadge
                    color="neutral"
                    variant="soft"
                  >
                    {{ assignedAssessments.length }}
                  </UBadge>
                </div>

                </div>
              </div>

              <UButton
                to="/instructor/assessments"
                color="neutral"
                variant="outline"
                size="sm"
                icon="i-lucide-clipboard-list"
              >
                Assessment Library
              </UButton>
            </div>
          </template>

          <div
            v-if="isLoadingAssessments"
            class="space-y-3 p-5"
            aria-label="Loading assigned assessments"
          >
            <div
              v-for="number in 3"
              :key="number"
              class="flex items-center gap-4 rounded-2xl border border-primary/10 bg-default/80 p-4 shadow-sm"
            >
              <USkeleton class="size-11 shrink-0 rounded-xl" />
              <div class="min-w-0 flex-1 space-y-2">
                <USkeleton class="h-4 w-2/3" />
                <USkeleton class="h-3 w-1/3" />
              </div>
              <USkeleton class="h-8 w-20 rounded-lg" />
            </div>
          </div>

          <div
            v-else-if="assessmentError"
            class="p-5"
          >
            <UAlert
              color="warning"
              variant="soft"
              title="Assigned assessments unavailable"
              :description="assessmentError"
            />

            <UButton
              color="warning"
              variant="soft"
              size="sm"
              icon="i-lucide-refresh-cw"
              class="mt-3"
              @click="loadAssignedAssessments"
            >
              Try Again
            </UButton>
          </div>

          <div
            v-else-if="assignedAssessments.length === 0"
            class="p-5"
          >
            <div class="rounded-2xl border border-dashed border-primary/20 bg-gradient-to-br from-primary/5 via-default to-primary/10 px-5 py-12 text-center shadow-inner dark:from-primary/10 dark:to-primary/5">
              <div class="mx-auto flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <UIcon
                  name="i-lucide-clipboard-plus"
                  class="size-5"
                />
              </div>

              <h3 class="mt-4 font-bold text-highlighted">
                No assessments assigned yet
              </h3>
              <p class="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
                Open your Assessment Library to publish and schedule an assessment for this class.
              </p>

              <UButton
                to="/instructor/assessments"
                class="mt-4"
                trailing-icon="i-lucide-arrow-right"
              >
                Open Assessments
              </UButton>
            </div>
          </div>

          <div
            v-else
            class="space-y-3 p-4 sm:p-5"
          >
            <article
              v-for="assessment in assignedAssessments"
              :key="assessment.id"
              class="rounded-2xl border border-primary/10 bg-gradient-to-r from-default via-default to-primary/5 p-4 shadow-sm transition-colors hover:border-primary/20 sm:p-5 dark:border-primary/15 dark:to-primary/10"
            >
              <div class="flex min-w-0 items-start gap-3 sm:gap-4">
                <div class="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/10">
                  <UIcon
                    name="i-lucide-clipboard-check"
                    class="size-5"
                  />
                </div>

                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                    <UBadge
                      color="neutral"
                      variant="soft"
                      size="sm"
                    >
                      {{ typeLabel(assessment.assessment_type) }}
                    </UBadge>

                    <StatusPill :status="assessment.status" />

                    <span
                      v-if="assessment.status === 'published' && assessment.published_at"
                      class="text-xs text-muted"
                    >
                      Published {{ formatPublishedDate(assessment.published_at) }}
                    </span>
                  </div>

                  <NuxtLink
                    :to="`/instructor/assessments/${assessment.id}/edit`"
                    class="mt-2 block w-fit max-w-full font-bold text-highlighted transition-colors hover:text-primary focus-visible:rounded focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/30"
                  >
                    <span class="line-clamp-2">{{ assessment.title }}</span>
                  </NuxtLink>

                  <div class="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
                    <span class="inline-flex items-center gap-1.5">
                      <UIcon name="i-lucide-list-checks" class="size-3.5" />
                      {{ assessment.question_count }} question{{ assessment.question_count === 1 ? "" : "s" }}
                    </span>

                    <span class="inline-flex items-center gap-1.5">
                      <UIcon name="i-lucide-circle-dot" class="size-3.5" />
                      {{ assessment.total_points }} point{{ assessment.total_points === 1 ? "" : "s" }}
                    </span>

                    <span
                      v-if="assessmentDelivery(assessment.id)"
                      class="inline-flex min-w-0 items-center gap-1.5"
                    >
                      <UIcon name="i-lucide-calendar-clock" class="size-3.5 shrink-0" />
                      <span class="truncate">
                        {{ formatScheduleWindow(assessmentDelivery(assessment.id)!.startsAt, assessmentDelivery(assessment.id)!.endsAt) }}
                      </span>
                    </span>

                    <span
                      v-else-if="deliveryDataAvailable"
                      class="inline-flex items-center gap-1.5 text-muted/80"
                    >
                      <UIcon name="i-lucide-calendar-x" class="size-3.5" />
                      Not scheduled
                    </span>

                    <span
                      v-else
                      class="inline-flex items-center gap-1.5 text-muted/80"
                    >
                      <UIcon name="i-lucide-calendar-clock" class="size-3.5" />
                      Schedule unavailable
                    </span>
                  </div>
                </div>

                <UDropdownMenu
                  :items="assessmentMenuItems(assessment)"
                  :content="{ align: 'end', side: 'bottom', sideOffset: 6 }"
                  :ui="{ content: 'w-52', item: 'min-h-10', itemLabel: 'font-semibold' }"
                >
                  <UButton
                    color="neutral"
                    variant="ghost"
                    icon="i-lucide-ellipsis-vertical"
                    square
                    size="sm"
                    :aria-label="`Actions for ${assessment.title}`"
                  />
                </UDropdownMenu>
              </div>
            </article>
          </div>
        </UCard>

        <div class="space-y-6">
          <USkeleton
            v-if="isLoadingEnrollment"
            class="h-96 rounded-xl"
            aria-label="Loading student enrollment settings"
          />

          <UCard
            v-else
            class="overflow-hidden border-primary/10 border-t-primary/30 bg-gradient-to-br from-default via-default to-primary/5 shadow-lg shadow-primary/5 ring-1 ring-primary/5 dark:border-primary/15 dark:to-primary/10 dark:shadow-black/15"
          >
            <template #header>
              <div class="flex items-start justify-between gap-3">
                <div class="flex items-start gap-3">
                  <div class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/10">
                    <UIcon name="i-lucide-users-round" class="size-4" />
                  </div>

                  <div>
                    <h2 class="font-bold text-highlighted">
                      Student enrollment
                    </h2>
                    <p class="mt-1 text-xs text-muted">
                      Share the code and choose how students enter the class.
                    </p>
                  </div>
                </div>

                <StatusPill
                  :status="
                    classroom.join_enabled
                      ? 'Active'
                      : 'Disabled'
                  "
                />
              </div>
            </template>

            <div class="rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-brand-950 p-5 text-center text-white shadow-lg shadow-slate-950/20 ring-1 ring-white/10">
              <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Student enrollment code
              </p>

              <p class="mt-3 break-all font-mono text-2xl font-black tracking-[0.14em] sm:text-3xl">
                {{ classroom.join_code }}
              </p>
            </div>

            <div class="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              <UButton
                color="neutral"
                variant="outline"
                icon="i-lucide-copy"
                class="bg-default/70 shadow-xs hover:bg-primary/5"
                :disabled="!classroom.join_enabled"
                @click="copyCode"
              >
                Copy
              </UButton>

              <UButton
                color="neutral"
                variant="outline"
                icon="i-lucide-share-2"
                class="bg-default/70 shadow-xs hover:bg-primary/5"
                :disabled="!classroom.join_enabled"
                @click="shareCode"
              >
                Share
              </UButton>

              <UButton
                color="neutral"
                variant="outline"
                icon="i-lucide-refresh-cw"
                :loading="isUpdating"
                :disabled="classroom.status === 'archived'"
                class="col-span-2 bg-default/70 shadow-xs hover:bg-primary/5 sm:col-span-1"
                @click="runClassAction('regenerate')"
              >
                New Code
              </UButton>
            </div>

            <USeparator class="my-5" />

            <div class="space-y-4">
              <div class="flex items-start justify-between gap-5">
                <div>
                  <p class="text-sm font-semibold text-highlighted">
                    Allow students to join
                  </p>
                  <p class="mt-1 text-xs leading-5 text-muted">
                    Students can use this class code while enrollment is enabled.
                  </p>
                </div>

                <USwitch
                  :model-value="classroom.join_enabled"
                  :loading="isUpdating"
                  :disabled="classroom.status === 'archived'"
                  aria-label="Allow students to join with the class code"
                  @update:model-value="runClassAction('toggle-code')"
                />
              </div>

              <div class="flex items-start justify-between gap-5 border-t border-default pt-4">
                <div>
                  <div class="flex flex-wrap items-center gap-2">
                    <p class="text-sm font-semibold text-highlighted">
                      Require instructor approval
                    </p>

                    <UBadge
                      v-if="enrollmentSettings"
                      :color="enrollmentSettings.requiresApproval ? 'warning' : 'success'"
                      variant="soft"
                      size="sm"
                    >
                      {{
                        enrollmentSettings.requiresApproval
                          ? "Review requests"
                          : "Automatic join"
                      }}
                    </UBadge>
                  </div>

                  <p class="mt-1 text-xs leading-5 text-muted">
                    {{
                      enrollmentSettings?.requiresApproval
                        ? "Students wait in Requests until you approve them."
                        : "Students with a valid code join the class immediately."
                    }}
                  </p>
                </div>

                <USwitch
                  :model-value="enrollmentSettings?.requiresApproval || false"
                  :loading="isApprovalUpdating"
                  :disabled="
                    !classroom.join_enabled
                    || classroom.status === 'archived'
                    || Boolean(enrollmentSettingsError)
                  "
                  aria-label="Require instructor approval for new students"
                  @update:model-value="requestApprovalChange"
                />
              </div>
            </div>

            <UAlert
              v-if="enrollmentSettingsError"
              class="mt-4"
              color="warning"
              variant="soft"
              title="Enrollment setting unavailable"
              :description="enrollmentSettingsError"
            />

            <UButton
              v-if="classroom.memberCounts.pending > 0"
              :to="`/instructor/classes/${classroom.id}/students?view=requests`"
              block
              color="warning"
              variant="soft"
              icon="i-lucide-user-round-clock"
              class="mt-4"
            >
              Review {{ classroom.memberCounts.pending }} existing request{{ classroom.memberCounts.pending === 1 ? "" : "s" }}
            </UButton>
          </UCard>

          <UCard
            class="overflow-hidden border-primary/10 border-t-primary/30 bg-gradient-to-br from-default via-default to-primary/5 shadow-md shadow-primary/5 ring-1 ring-primary/5 dark:border-primary/15 dark:to-primary/10 dark:shadow-black/15"
          >
            <template #header>
              <div class="flex items-center gap-3">
                <div class="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <UIcon name="i-lucide-shield-check" class="size-4" />
                </div>
                <h2 class="font-bold text-highlighted">
                  Class status
                </h2>
              </div>
            </template>

            <UAlert
              v-if="classroom.status === 'active'"
              color="info"
              variant="soft"
              title="Active class"
              description="Enrolled students can open this class and access scheduled assessments."
            />

            <UAlert
              v-else
              color="warning"
              variant="soft"
              title="Archived class"
              description="New enrollment is disabled. Assessment deliveries assigned to this class remain closed unless you reactivate the class and schedule them again."
            />

            <UButton
              block
              class="mt-4"
              :color="classroom.status === 'active' ? 'warning' : 'success'"
              variant="soft"
              :icon="classroom.status === 'active' ? 'i-lucide-archive' : 'i-lucide-archive-restore'"
              :loading="isUpdating"
              @click="requestClassStatusAction"
            >
              {{
                classroom.status === "active"
                  ? "Archive Class"
                  : "Reactivate Class"
              }}
            </UButton>
          </UCard>
        </div>
      </section>

      <ConfirmationModal
        v-model:open="archiveConfirmationOpen"
        title="Archive this class?"
        description="New joins will stop. Every assigned assessment delivery for this class will close, and any Student currently taking one will be submitted automatically. Assessment records and Student results will be kept."
        confirm-label="Archive Class"
        confirm-color="warning"
        icon="i-lucide-archive"
        :loading="isUpdating"
        @confirm="runClassAction('archive')"
      />

      <ConfirmationModal
        v-model:open="approvalConfirmationOpen"
        title="Turn off approval for new joins?"
        :description="`New students with the class code will join immediately. ${enrollmentSettings?.pendingCount || 0} existing pending request${(enrollmentSettings?.pendingCount || 0) === 1 ? '' : 's'} will stay pending until you review them.`"
        confirm-label="Use Automatic Join"
        confirm-color="primary"
        icon="i-lucide-user-check"
        :loading="isApprovalUpdating"
        @confirm="applyApprovalChange(false)"
      />
    </template>
  </div>
</template>
