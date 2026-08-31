<script setup lang="ts">
import type { AssessmentScheduleItem } from "~/types/assessment-schedule";

export type AssessmentScheduleAction = "edit" | "extend" | "reopen";

const props = defineProps<{
  schedule: Pick<AssessmentScheduleItem, "id" | "startsAt" | "endsAt"> & {
    classroom?: AssessmentScheduleItem["classroom"];
  } | null;
  action: AssessmentScheduleAction | null;
  loading?: boolean;
}>();

const emit = defineEmits<{
  confirm: [payload: {
    startsAt: string | null;
    endsAt: string;
    reason: string;
  }];
}>();

const open = defineModel<boolean>("open", { default: false });

const startsAtLocal = ref("");
const endsAtLocal = ref("");
const reason = ref("");
const validationMessage = ref("");

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function localInputValue(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
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

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(new Date(value));
}

function defaultReopenWindow(): { startsAt: string; endsAt: string } {
  const startsAt = new Date();
  startsAt.setSeconds(0, 0);
  startsAt.setMinutes(startsAt.getMinutes() + 15);
  const endsAt = new Date(startsAt.getTime() + 2 * 60 * 60 * 1000);

  return {
    startsAt: localInputValue(startsAt),
    endsAt: localInputValue(endsAt),
  };
}

function initialize(): void {
  validationMessage.value = "";
  reason.value = "";

  if (!props.schedule || !props.action) {
    startsAtLocal.value = "";
    endsAtLocal.value = "";
    return;
  }

  if (props.action === "reopen") {
    const defaults = defaultReopenWindow();
    startsAtLocal.value = defaults.startsAt;
    endsAtLocal.value = defaults.endsAt;
    return;
  }

  startsAtLocal.value = localInputValue(props.schedule.startsAt);

  if (props.action === "extend") {
    const currentEnd = new Date(props.schedule.endsAt);
    const suggestedEnd = new Date(currentEnd.getTime() + 24 * 60 * 60 * 1000);
    endsAtLocal.value = localInputValue(suggestedEnd);
    return;
  }

  endsAtLocal.value = localInputValue(props.schedule.endsAt);
}

watch(
  () => [open.value, props.action, props.schedule?.id] as const,
  ([isOpen]) => {
    if (isOpen) initialize();
  },
);

const title = computed(() => {
  switch (props.action) {
    case "edit":
      return "Edit schedule";
    case "extend":
      return "Extend due date";
    case "reopen":
      return "Reopen assessment";
    default:
      return "Update schedule";
  }
});

const description = computed(() => {
  switch (props.action) {
    case "edit":
      return "Move an upcoming schedule before Students have started. This action cannot open the assessment immediately.";
    case "extend":
      return "Move only the whole-class closing deadline later. The opening time does not change.";
    case "reopen":
      return "Set a new access window for a closed schedule. Submitted attempts stay submitted and are not reset.";
    default:
      return "Review the schedule change before confirming.";
  }
});

const confirmLabel = computed(() => {
  switch (props.action) {
    case "edit":
      return "Save schedule";
    case "extend":
      return "Extend due date";
    case "reopen":
      return "Reopen assessment";
    default:
      return "Save";
  }
});

function validate(): string | null {
  if (!props.schedule || !props.action) return "No schedule was selected.";

  const endsAt = new Date(endsAtLocal.value);
  if (Number.isNaN(endsAt.getTime())) return "Choose a valid closing date and time.";

  if (props.action === "extend") {
    if (endsAt.getTime() <= new Date(props.schedule.endsAt).getTime()) {
      return "The new due date must be later than the current due date.";
    }

    if (reason.value.trim().length < 3) {
      return "Enter a short reason for the extension.";
    }

    return null;
  }

  const startsAt = new Date(startsAtLocal.value);
  if (Number.isNaN(startsAt.getTime())) return "Choose a valid opening date and time.";
  if (startsAt.getTime() <= Date.now()) return "Choose a future opening time.";
  if (endsAt.getTime() <= startsAt.getTime()) return "The closing time must be later than the opening time.";

  if (props.action === "reopen" && reason.value.trim().length < 3) {
    return "Enter a short reason for reopening the assessment.";
  }

  return null;
}

function submit(): void {
  const error = validate();
  if (error) {
    validationMessage.value = error;
    return;
  }

  validationMessage.value = "";

  emit("confirm", {
    startsAt: props.action === "extend"
      ? null
      : new Date(startsAtLocal.value).toISOString(),
    endsAt: new Date(endsAtLocal.value).toISOString(),
    reason: reason.value.trim(),
  });
}
</script>

<template>
  <UModal
    v-model:open="open"
    :ui="{ content: 'sm:max-w-lg' }"
  >
    <template #content>
      <div class="p-5 sm:p-6">
        <div class="flex items-start gap-3">
          <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <UIcon
              :name="action === 'extend' ? 'i-lucide-calendar-plus-2' : action === 'reopen' ? 'i-lucide-rotate-ccw' : 'i-lucide-calendar-cog'"
              class="size-5"
            />
          </div>

          <div class="min-w-0">
            <h2 class="font-black text-highlighted">{{ title }}</h2>
            <p class="mt-1 text-sm leading-6 text-muted">{{ description }}</p>
            <p
              v-if="schedule?.classroom"
              class="mt-2 text-xs font-semibold text-primary"
            >
              {{ schedule.classroom.subjectCode }} · {{ schedule.classroom.section }}
            </p>
          </div>
        </div>

        <div
          v-if="action === 'extend' && schedule"
          class="mt-5 rounded-xl border border-default bg-elevated/40 px-3 py-2.5 text-sm"
        >
          <span class="text-muted">Current due date</span>
          <span class="ml-2 font-semibold text-highlighted">{{ formatDate(schedule.endsAt) }}</span>
        </div>

        <div class="mt-5 grid gap-4">
          <UFormField
            v-if="action !== 'extend'"
            :label="action === 'reopen' ? 'New opening time' : 'Opens'"
          >
            <UInput
              v-model="startsAtLocal"
              type="datetime-local"
              class="w-full"
            />
          </UFormField>

          <UFormField :label="action === 'extend' ? 'New due date' : action === 'reopen' ? 'New closing time' : 'Closes'">
            <UInput
              v-model="endsAtLocal"
              type="datetime-local"
              class="w-full"
            />
          </UFormField>

          <UFormField
            :label="action === 'edit' ? 'Reason (optional)' : 'Reason'"
            :description="action === 'extend' ? 'Example: Student concern, connectivity issue, or class suspension.' : action === 'reopen' ? 'Recorded with the reopened schedule for reference.' : undefined"
          >
            <UTextarea
              v-model="reason"
              :rows="3"
              maxlength="500"
              placeholder="Add a short note"
              class="w-full"
            />
          </UFormField>
        </div>

        <UAlert
          v-if="validationMessage"
          class="mt-4"
          color="error"
          variant="soft"
          :description="validationMessage"
        />

        <UAlert
          v-if="action === 'reopen'"
          class="mt-4"
          color="warning"
          variant="soft"
          icon="i-lucide-shield-alert"
          title="Previous results stay unchanged"
          description="Reopening does not reset submitted attempts. Only Students who still have an attempt available can start during the new window."
        />

        <div class="mt-6 flex flex-col-reverse gap-2 border-t border-default pt-4 sm:flex-row sm:justify-end">
          <UButton
            color="neutral"
            variant="ghost"
            :disabled="loading"
            @click="open = false"
          >
            Cancel
          </UButton>
          <UButton
            :icon="action === 'extend' ? 'i-lucide-calendar-plus-2' : action === 'reopen' ? 'i-lucide-rotate-ccw' : 'i-lucide-calendar-check'"
            :loading="loading"
            @click="submit"
          >
            {{ confirmLabel }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
