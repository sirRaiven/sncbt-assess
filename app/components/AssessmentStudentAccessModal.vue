<script setup lang="ts">
import type {
  AssessmentStudentAccessOverview,
  AssessmentStudentAccessRow,
} from "~/types/assessment-student-access";

const props = defineProps<{
  assignmentId: string | null;
}>();

const open = defineModel<boolean>("open", { default: false });
const emit = defineEmits<{
  updated: [];
}>();

const toast = useToast();
const {
  listStudentAccess,
  grantStudentAccess,
  revokeStudentAccess,
} = useAssessmentSchedules();

const overview = ref<AssessmentStudentAccessOverview | null>(null);
const isLoading = ref(false);
const isSaving = ref(false);
const query = ref("");
const selectedStudent = ref<AssessmentStudentAccessRow | null>(null);
const startsAtLocal = ref("");
const endsAtLocal = ref("");
const reason = ref("");
const revokeTarget = ref<AssessmentStudentAccessRow | null>(null);
const revokeOpen = ref(false);

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function localInputValue(value: Date): string {
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

function resetGrantForm(): void {
  const start = new Date(Date.now() + 5 * 60 * 1000);
  start.setSeconds(0, 0);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  startsAtLocal.value = localInputValue(start);
  endsAtLocal.value = localInputValue(end);
  reason.value = "";
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(new Date(value));
}

function attemptLabel(row: AssessmentStudentAccessRow): string {
  if (!row.latestAttempt) return "No attempt yet";
  const status = row.latestAttempt.status.replaceAll("_", " ");
  return `Attempt ${row.latestAttempt.attemptNumber} · ${status}`;
}

const filteredStudents = computed(() => {
  const normalized = query.value.trim().toLowerCase();
  const rows = overview.value?.students ?? [];
  if (!normalized) return rows;
  return rows.filter((row) =>
    [row.studentName, row.studentNumber, row.latestAttempt?.status, row.grant?.type]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(normalized),
  );
});

async function load(): Promise<void> {
  if (!props.assignmentId) return;
  isLoading.value = true;
  const result = await listStudentAccess(props.assignmentId);
  if (result.error || !result.data) {
    toast.add({
      title: "Student access unavailable",
      description: result.error || "The student access list could not be loaded.",
      color: "error",
    });
    isLoading.value = false;
    return;
  }
  overview.value = result.data;
  isLoading.value = false;
}

function chooseStudent(row: AssessmentStudentAccessRow): void {
  selectedStudent.value = row;
  resetGrantForm();
}

function validateGrant(): string | null {
  const start = new Date(startsAtLocal.value);
  const end = new Date(endsAtLocal.value);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "Enter a valid personal access window.";
  if (end <= start) return "The closing time must be later than the opening time.";
  if (end.getTime() <= Date.now()) return "The personal access window must end in the future.";
  return null;
}

async function grant(): Promise<void> {
  if (!props.assignmentId || !selectedStudent.value) return;
  const validation = validateGrant();
  if (validation) {
    toast.add({ title: "Check the access window", description: validation, color: "warning" });
    return;
  }

  isSaving.value = true;
  const result = await grantStudentAccess(
    props.assignmentId,
    selectedStudent.value.studentId,
    new Date(startsAtLocal.value).toISOString(),
    new Date(endsAtLocal.value).toISOString(),
    reason.value.trim(),
  );

  if (result.error || !result.data) {
    toast.add({
      title: "Personal access was not granted",
      description: result.error || "Please try again.",
      color: "error",
    });
    isSaving.value = false;
    return;
  }

  overview.value = result.data;
  toast.add({
    title: selectedStudent.value.grantKind === "second_chance" ? "Second chance granted" : "Make-up access granted",
    description: `${selectedStudent.value.studentName} now has a personal assessment window.`,
    color: "success",
  });
  selectedStudent.value = null;
  isSaving.value = false;
  emit("updated");
}

function requestRevoke(row: AssessmentStudentAccessRow): void {
  revokeTarget.value = row;
  revokeOpen.value = true;
}

async function confirmRevoke(): Promise<void> {
  if (!props.assignmentId || !revokeTarget.value?.grant) return;
  isSaving.value = true;
  const result = await revokeStudentAccess(props.assignmentId, revokeTarget.value.grant.id);
  if (result.error || !result.data) {
    toast.add({ title: "Access was not revoked", description: result.error || "Please try again.", color: "error" });
    isSaving.value = false;
    return;
  }
  overview.value = result.data;
  revokeOpen.value = false;
  revokeTarget.value = null;
  isSaving.value = false;
  emit("updated");
  toast.add({ title: "Personal access revoked", description: "The unused access window is no longer available.", color: "success" });
}

watch(
  () => [open.value, props.assignmentId] as const,
  ([isOpen]) => {
    if (isOpen && props.assignmentId) {
      selectedStudent.value = null;
      query.value = "";
      resetGrantForm();
      void load();
    }
  },
);
</script>

<template>
  <UModal
    v-model:open="open"
    title="Manage student access"
    description="Grant a personal make-up or second-chance window without reopening the assessment for the whole class."
    :ui="{ content: 'sm:max-w-4xl' }"
  >
    <template #content>
      <UCard :ui="{ body: 'p-0 sm:p-0' }">
        <template #header>
          <div class="flex items-start justify-between gap-3">
            <div>
              <h2 class="font-black text-highlighted">Manage student access</h2>
              <p v-if="overview" class="mt-1 text-sm text-muted">
                {{ overview.assignment.subjectCode }} · {{ overview.assignment.section }} · {{ overview.assignment.assessmentTitle }}
              </p>
              <p class="mt-1 text-xs text-muted">Only the selected student receives this access window.</p>
            </div>
            <UButton color="neutral" variant="ghost" icon="i-lucide-x" square aria-label="Close student access" @click="open = false" />
          </div>
        </template>

        <div v-if="isLoading" class="space-y-3 p-5">
          <USkeleton v-for="item in 4" :key="item" class="h-16 rounded-xl" />
        </div>

        <div v-else-if="overview" class="grid min-h-96 md:grid-cols-[minmax(0,1fr)_320px]">
          <section class="border-b border-default p-4 md:border-b-0 md:border-r sm:p-5">
            <UInput v-model="query" icon="i-lucide-search" placeholder="Search student or student number" class="w-full" />

            <div class="mt-4 max-h-[28rem] space-y-2 overflow-y-auto pr-1">
              <article
                v-for="row in filteredStudents"
                :key="row.studentId"
                class="rounded-xl border border-default p-3"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="truncate font-bold text-highlighted">{{ row.studentName }}</p>
                    <p class="mt-0.5 text-xs text-muted">{{ row.studentNumber || 'No student number' }} · {{ attemptLabel(row) }}</p>
                  </div>
                  <UBadge v-if="row.grant" :color="row.grant.status === 'open' ? 'success' : row.grant.status === 'upcoming' ? 'primary' : 'neutral'" variant="soft">
                    {{ row.grant.type === 'second_chance' ? 'Second chance' : 'Make-up' }}
                  </UBadge>
                </div>

                <div v-if="row.grant" class="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                  <span>{{ formatDate(row.grant.startsAt) }} → {{ formatDate(row.grant.endsAt) }}</span>
                  <UButton color="error" variant="ghost" size="xs" icon="i-lucide-ban" @click="requestRevoke(row)">Revoke</UButton>
                </div>

                <div v-else class="mt-3 flex justify-end">
                  <UButton
                    v-if="row.canGrant"
                    size="sm"
                    variant="soft"
                    icon="i-lucide-user-round-check"
                    @click="chooseStudent(row)"
                  >
                    {{ row.grantKind === 'second_chance' ? 'Grant second chance' : 'Grant make-up access' }}
                  </UButton>
                  <span v-else class="text-xs text-muted">
                    {{ row.latestAttempt?.status === 'in_progress'
                      ? 'Finish the current attempt before granting another window.'
                      : !row.latestAttempt && overview.assignment.status !== 'closed'
                        ? 'Normal class access is still available.'
                        : 'Personal access is not available right now.' }}
                  </span>
                </div>
              </article>

              <p v-if="filteredStudents.length === 0" class="py-10 text-center text-sm text-muted">No students match your search.</p>
            </div>
          </section>

          <aside class="bg-elevated/40 p-4 sm:p-5">
            <template v-if="selectedStudent">
              <p class="text-xs font-bold uppercase tracking-[0.14em] text-primary">
                {{ selectedStudent.grantKind === 'second_chance' ? 'Second chance' : 'Make-up access' }}
              </p>
              <h3 class="mt-1 font-black text-highlighted">{{ selectedStudent.studentName }}</h3>
              <p class="mt-1 text-xs text-muted">One additional personal access window. The class schedule is unchanged.</p>

              <div class="mt-5 space-y-4">
                <UFormField label="Available from">
                  <UInput v-model="startsAtLocal" type="datetime-local" class="w-full" />
                </UFormField>
                <UFormField label="Available until">
                  <UInput v-model="endsAtLocal" type="datetime-local" class="w-full" />
                </UFormField>
                <UFormField label="Reason" description="Optional note for the access history.">
                  <UTextarea v-model="reason" :rows="3" placeholder="Optional: connectivity issue, medical concern, instructor approval, etc." class="w-full" />
                </UFormField>
              </div>

              <div class="mt-5 flex gap-2">
                <UButton color="neutral" variant="outline" class="flex-1" @click="selectedStudent = null">Cancel</UButton>
                <UButton class="flex-1" :loading="isSaving" icon="i-lucide-check" @click="grant">Grant access</UButton>
              </div>
            </template>

            <div v-else class="flex min-h-64 flex-col items-center justify-center text-center">
              <div class="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <UIcon name="i-lucide-user-round-cog" class="size-5" />
              </div>
              <h3 class="mt-3 font-bold text-highlighted">Choose a student</h3>
              <p class="mt-1 max-w-56 text-sm text-muted">Select an eligible student to set a personal access window.</p>
            </div>
          </aside>
        </div>
      </UCard>
    </template>
  </UModal>

  <ConfirmationModal
    v-model:open="revokeOpen"
    title="Revoke this personal access?"
    description="The student will no longer be able to use this unused personal assessment window. Existing attempts and results are not changed."
    confirm-label="Revoke Access"
    confirm-color="error"
    icon="i-lucide-ban"
    :loading="isSaving"
    @confirm="confirmRevoke"
  />
</template>
