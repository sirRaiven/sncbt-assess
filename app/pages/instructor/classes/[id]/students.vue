<script setup lang="ts">
import type {
  DropdownMenuItem,
} from "@nuxt/ui";

import type {
  ClassroomEnrollmentSettings,
  ClassroomMember,
  MembershipStatus,
} from "~/types/classroom";

definePageMeta({
  layout: "instructor",
});

useSeoMeta({
  title: "Class students",
});

const route = useRoute();
const toast = useToast();
const supabase = useSupabaseClient();

const {
  classroomId,
  classroom,
  refreshClass,
} = useInstructorClassShell();

const activeView = computed<"students" | "requests">(
  () => route.query.view === "requests"
    ? "requests"
    : "students",
);

const membershipStatus = computed<MembershipStatus>(
  () => activeView.value === "requests"
    ? "pending"
    : "active",
);

const {
  getEnrollmentSettings,
  listMembers,
  approveMember,
  rejectMember,
  removeMember,
} = useClassrooms();

const enrollmentSettings =
  ref<ClassroomEnrollmentSettings | null>(null);

const members =
  ref<ClassroomMember[]>([]);

const isLoading = ref(true);
const busyMembershipId =
  ref<string | null>(null);
const bulkRemoving = ref(false);

const errorMessage = ref("");
const query = ref("");
const selectedMemberIds = ref<string[]>([]);

const isRealtimeRefreshing =
  ref(false);

let realtimeRefreshTimer:
  ReturnType<typeof setTimeout>
  | null = null;

let rosterChannel:
  ReturnType<typeof supabase.channel>
  | null = null;

const removeModalOpen = ref(false);
const memberToRemove =
  ref<ClassroomMember | null>(null);

const bulkRemoveModalOpen = ref(false);

const filteredMembers = computed(() => {
  const keyword =
    query.value
      .trim()
      .toLowerCase();

  if (!keyword) {
    return members.value;
  }

  return members.value.filter(
    (member) =>
      [
        member.student.name,
        member.student.email,
        member.student.studentNumber,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(keyword),
  );
});

const pendingRequestCount = computed(
  () =>
    enrollmentSettings.value?.pendingCount
    ?? classroom.value?.memberCounts.pending
    ?? 0,
);

const showRequests = computed(
  () =>
    Boolean(
      enrollmentSettings.value?.requiresApproval,
    )
    || pendingRequestCount.value > 0,
);

const visibleStudentIds = computed(
  () =>
    activeView.value === "students"
      ? filteredMembers.value.map((member) => member.id)
      : [],
);

const allVisibleSelected = computed(
  () =>
    visibleStudentIds.value.length > 0
    && visibleStudentIds.value.every(
      (id) => selectedMemberIds.value.includes(id),
    ),
);

const someVisibleSelected = computed(
  () =>
    visibleStudentIds.value.some(
      (id) => selectedMemberIds.value.includes(id),
    )
    && !allVisibleSelected.value,
);

const selectedMembers = computed(
  () => {
    const selected = new Set(selectedMemberIds.value);
    return members.value.filter((member) => selected.has(member.id));
  },
);

function isSelected(memberId: string): boolean {
  return selectedMemberIds.value.includes(memberId);
}

function setMemberSelected(
  memberId: string,
  selected: boolean,
): void {
  if (selected) {
    if (!selectedMemberIds.value.includes(memberId)) {
      selectedMemberIds.value = [
        ...selectedMemberIds.value,
        memberId,
      ];
    }
    return;
  }

  selectedMemberIds.value = selectedMemberIds.value.filter(
    (id) => id !== memberId,
  );
}

function toggleVisibleSelection(
  selected: boolean,
): void {
  const visible = new Set(visibleStudentIds.value);

  if (selected) {
    selectedMemberIds.value = Array.from(
      new Set([
        ...selectedMemberIds.value,
        ...visibleStudentIds.value,
      ]),
    );
    return;
  }

  selectedMemberIds.value = selectedMemberIds.value.filter(
    (id) => !visible.has(id),
  );
}

function clearSelection(): void {
  selectedMemberIds.value = [];
}

async function loadData(
  options:
    {
      background?:
        boolean;
    } = {},
): Promise<void> {
  if (!classroom.value) {
    return;
  }

  const background =
    Boolean(
      options.background,
    );

  if (!background) {
    isLoading.value = true;
    errorMessage.value = "";
  }

  const [
    settingsResult,
    memberResult,
  ] = await Promise.all([
    getEnrollmentSettings(
      classroomId.value,
    ),

    listMembers(
      classroomId.value,
      membershipStatus.value,
    ),
  ]);

  if (
    memberResult.error
    || !memberResult.data
  ) {
    if (!background) {
      errorMessage.value =
        memberResult.error
        || "We couldn't load the student list right now.";

      isLoading.value = false;
    }

    return;
  }

  members.value =
    memberResult.data.members;

  selectedMemberIds.value =
    selectedMemberIds.value.filter(
      (id) => members.value.some((member) => member.id === id),
    );

  enrollmentSettings.value =
    settingsResult.data
    || {
      joinEnabled:
        classroom.value.join_enabled,
      requiresApproval:
        classroom.value.join_requires_approval
        ?? false,
      pendingCount:
        classroom.value.memberCounts.pending,
    };

  if (!background) {
    isLoading.value = false;
  }
}

async function refreshRosterFromRealtime(): Promise<void> {
  if (
    isRealtimeRefreshing.value
  ) {
    return;
  }

  isRealtimeRefreshing.value =
    true;

  try {
    await refreshClass();

    await loadData({
      background:
        true,
    });
  } finally {
    isRealtimeRefreshing.value =
      false;
  }
}

function scheduleRealtimeRosterRefresh(): void {
  if (
    realtimeRefreshTimer
  ) {
    clearTimeout(
      realtimeRefreshTimer,
    );
  }

  realtimeRefreshTimer =
    setTimeout(
      () => {
        realtimeRefreshTimer =
          null;

        void refreshRosterFromRealtime();
      },
      250,
    );
}

function stopRosterRealtime(): void {
  if (
    realtimeRefreshTimer
  ) {
    clearTimeout(
      realtimeRefreshTimer,
    );

    realtimeRefreshTimer =
      null;
  }

  if (
    rosterChannel
  ) {
    void supabase.removeChannel(
      rosterChannel,
    );

    rosterChannel =
      null;
  }
}

function startRosterRealtime(): void {
  stopRosterRealtime();

  const id =
    classroomId.value;

  if (!id) {
    return;
  }

  rosterChannel =
    supabase
      .channel(
        `instructor-class-roster:${id}`,
      )
      .on(
        "postgres_changes",
        {
          event:
            "INSERT",
          schema:
            "public",
          table:
            "classroom_members",
          filter:
            `classroom_id=eq.${id}`,
        },
        () => {
          scheduleRealtimeRosterRefresh();
        },
      )
      .on(
        "postgres_changes",
        {
          event:
            "UPDATE",
          schema:
            "public",
          table:
            "classroom_members",
          filter:
            `classroom_id=eq.${id}`,
        },
        () => {
          scheduleRealtimeRosterRefresh();
        },
      )
      .subscribe();
}

async function runMemberAction(
  member: ClassroomMember,
  action:
    | "approve"
    | "reject"
    | "remove",
): Promise<void> {
  busyMembershipId.value =
    member.id;

  let result;

  if (action === "approve") {
    result =
      await approveMember(
        classroomId.value,
        member.id,
      );
  } else if (
    action === "reject"
  ) {
    result =
      await rejectMember(
        classroomId.value,
        member.id,
      );
  } else {
    result =
      await removeMember(
        classroomId.value,
        member.id,
      );
  }

  if (
    result.error
    || !result.data
  ) {
    toast.add({
      title: "Unable to update student",
      description:
        result.error
        || "The student record couldn't be updated right now.",
      color: "error",
    });

    busyMembershipId.value = null;
    return;
  }

  toast.add({
    title:
      action === "approve"
        ? "Student enrolled"
        : action === "reject"
          ? "Request declined"
          : "Student removed",
    description:
      result.data.message,
    color:
      action === "reject"
      || action === "remove"
        ? "warning"
        : "success",
  });

  setMemberSelected(member.id, false);
  await refreshClass();
  await loadData();
  busyMembershipId.value = null;
}

function requestRemove(
  member: ClassroomMember,
): void {
  memberToRemove.value = member;
  removeModalOpen.value = true;
}

async function confirmRemove(): Promise<void> {
  if (!memberToRemove.value) {
    return;
  }

  const member = memberToRemove.value;
  await runMemberAction(
    member,
    "remove",
  );

  removeModalOpen.value = false;
  memberToRemove.value = null;
}

function requestBulkRemove(): void {
  if (!selectedMembers.value.length) {
    return;
  }

  bulkRemoveModalOpen.value = true;
}

async function confirmBulkRemove(): Promise<void> {
  const targets = [...selectedMembers.value];

  if (!targets.length) {
    bulkRemoveModalOpen.value = false;
    return;
  }

  bulkRemoving.value = true;

  let removedCount = 0;
  const failedNames: string[] = [];

  for (const member of targets) {
    const result = await removeMember(
      classroomId.value,
      member.id,
    );

    if (result.error || !result.data) {
      failedNames.push(member.student.name);
    } else {
      removedCount += 1;
    }
  }

  await refreshClass();
  clearSelection();
  await loadData();

  bulkRemoving.value = false;
  bulkRemoveModalOpen.value = false;

  if (removedCount) {
    toast.add({
      title:
        removedCount === 1
          ? "Student removed"
          : `${removedCount} students removed`,
      description:
        failedNames.length
          ? `${failedNames.length} student record${failedNames.length === 1 ? "" : "s"} could not be updated.`
          : "The selected students no longer have access to this class. Their existing assessment records were kept.",
      color: failedNames.length ? "warning" : "success",
    });
  }

  if (!removedCount && failedNames.length) {
    toast.add({
      title: "Unable to remove selected students",
      description: "No student records were changed. Please try again.",
      color: "error",
    });
  }
}

function studentMenuItems(
  member: ClassroomMember,
): DropdownMenuItem[][] {
  return [
    [
      {
        label: "Remove from class",
        icon: "i-lucide-user-minus",
        color: "error",
        disabled:
          busyMembershipId.value
          === member.id
          || bulkRemoving.value,
        onSelect: () => {
          requestRemove(member);
        },
      },
    ],
  ];
}

function formatRequestedAt(
  value: string,
): string {
  return new Intl.DateTimeFormat(
    "en-PH",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(new Date(value));
}

watch(
  activeView,
  () => {
    query.value = "";
    clearSelection();
    void loadData();
  },
);

watch(
  classroomId,
  () => {
    clearSelection();
    void loadData();
    startRosterRealtime();
  },
);

onMounted(
  () => {
    void loadData();
    startRosterRealtime();
  },
);

onBeforeUnmount(
  () => {
    stopRosterRealtime();
  },
);
</script>

<template>
  <div class="space-y-5">
    <UAlert
      v-if="errorMessage"
      color="error"
      variant="soft"
      title="Students could not be loaded"
      :description="errorMessage"
    />

    <div
      v-if="isLoading"
      class="space-y-4"
      aria-label="Loading students"
    >
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="space-y-2">
          <USkeleton class="h-7 w-36 rounded-lg" />
          <USkeleton class="h-4 w-64 rounded" />
        </div>
        <USkeleton class="h-10 w-full rounded-lg sm:w-80" />
      </div>

      <div class="overflow-hidden rounded-2xl border border-primary/10 bg-default/95 shadow-lg shadow-primary/5 ring-1 ring-primary/5 dark:border-primary/15 dark:bg-default/90 dark:shadow-black/15">
        <div class="border-b border-default px-4 py-4 sm:px-5">
          <USkeleton class="h-5 w-36 rounded" />
        </div>
        <div class="space-y-1 p-2">
          <USkeleton
            v-for="number in 5"
            :key="number"
            class="h-16 rounded-lg"
          />
        </div>
      </div>
    </div>

    <template v-else-if="classroom">
      <section class="flex flex-col gap-4 rounded-2xl border border-primary/10 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-5 py-4 shadow-sm shadow-primary/5 sm:flex-row sm:items-center sm:justify-between dark:border-primary/15 dark:from-primary/15 dark:via-primary/5">
        <div>
          <h1 class="text-2xl font-black tracking-tight text-highlighted">
            {{ activeView === "requests" ? "Enrollment requests" : "Students" }}
          </h1>

          <p class="mt-1 text-sm text-muted">
            {{
              activeView === "requests"
                ? "Review students waiting to join this class."
                : "Manage students who currently have access to this class."
            }}
          </p>
        </div>

        <div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <UButton
            v-if="showRequests && activeView === 'students'"
            :to="`/instructor/classes/${classroom.id}/students?view=requests`"
            color="neutral"
            variant="outline"
            icon="i-lucide-user-round-clock"
          >
            Requests
            <UBadge
              :color="pendingRequestCount ? 'warning' : 'neutral'"
              variant="soft"
              size="sm"
            >
              {{ pendingRequestCount }}
            </UBadge>
          </UButton>

          <UButton
            v-if="activeView === 'requests'"
            :to="`/instructor/classes/${classroom.id}/students`"
            color="neutral"
            variant="outline"
            icon="i-lucide-users"
          >
            Back to roster
          </UButton>

          <UInput
            v-model="query"
            icon="i-lucide-search"
            :placeholder="activeView === 'requests' ? 'Search requests' : 'Search students'"
            :aria-label="activeView === 'requests' ? 'Search enrollment requests' : 'Search students'"
            class="w-full sm:w-80"
          />
        </div>
      </section>

      <UAlert
        v-if="activeView === 'requests' && !enrollmentSettings?.requiresApproval"
        color="info"
        variant="soft"
        icon="i-lucide-info"
        title="Earlier enrollment requests"
        description="These requests were already pending before automatic enrollment was enabled."
      />

      <div
        v-if="activeView === 'students' && selectedMemberIds.length"
        class="flex flex-col gap-3 rounded-2xl border border-primary/25 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-4 py-3 shadow-sm shadow-primary/5 sm:flex-row sm:items-center sm:justify-between"
        aria-live="polite"
      >
        <div class="flex items-center gap-3">
          <div class="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <UIcon
              name="i-lucide-list-checks"
              class="size-5"
            />
          </div>

          <div>
            <p class="font-semibold text-highlighted">
              {{ selectedMemberIds.length }}
              {{ selectedMemberIds.length === 1 ? "student selected" : "students selected" }}
            </p>
            <p class="text-xs text-muted">
              Use the bulk action to manage the selected students.
            </p>
          </div>
        </div>

        <div class="flex flex-wrap gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            :disabled="bulkRemoving"
            @click="clearSelection"
          >
            Clear selection
          </UButton>

          <UButton
            color="error"
            variant="soft"
            size="sm"
            icon="i-lucide-user-minus"
            :loading="bulkRemoving"
            @click="requestBulkRemove"
          >
            Remove selected
          </UButton>
        </div>
      </div>

      <div class="overflow-hidden rounded-xl border border-default bg-default">
        <div class="flex items-center gap-3 border-b border-primary/10 bg-primary/5 px-4 py-3.5 sm:px-5 dark:bg-primary/10">
          <UCheckbox
            v-if="activeView === 'students' && filteredMembers.length"
            :model-value="someVisibleSelected ? 'indeterminate' : allVisibleSelected"
            aria-label="Select all visible students"
            @update:model-value="toggleVisibleSelection($event === true)"
          />

          <div class="min-w-0 flex-1">
            <h2 class="font-bold text-highlighted">
              {{ activeView === "requests" ? "Pending students" : "Students" }}
            </h2>
            <p
              v-if="activeView === 'students' && query"
              class="mt-0.5 text-xs text-muted"
            >
              Select all applies to the students currently shown by your search.
            </p>
          </div>
        </div>

        <EmptyPanel
          v-if="filteredMembers.length === 0"
          class="m-4"
          :icon="activeView === 'requests' ? 'i-lucide-user-round-check' : 'i-lucide-users'"
          :title="
            activeView === 'requests'
              ? 'No enrollment requests'
              : query
                ? 'No matching students'
                : 'No students enrolled yet'
          "
          :description="
            activeView === 'requests'
              ? 'Students waiting for approval will appear here.'
              : query
                ? 'Try a different name or student number.'
                : 'Share the class code so students can join.'
          "
        />

        <div v-else>
          <article
            v-for="member in filteredMembers"
            :key="member.id"
            :class="[
              'flex flex-col gap-3 border-b border-default px-4 py-3.5 transition-colors last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:px-5',
              activeView === 'students' && isSelected(member.id)
                ? 'bg-primary/10'
                : 'hover:bg-primary/5',
            ]"
          >
            <div class="flex min-w-0 items-center gap-3">
              <UCheckbox
                v-if="activeView === 'students'"
                :model-value="isSelected(member.id)"
                :aria-label="`Select ${member.student.name}`"
                :disabled="bulkRemoving || busyMembershipId === member.id"
                @update:model-value="setMemberSelected(member.id, Boolean($event))"
              />

              <UAvatar
                :src="member.student.avatarUrl || undefined"
                :alt="member.student.name"
                :text="
                  member.student.name
                    .split(' ')
                    .map((part) => part[0])
                    .slice(0, 2)
                    .join('')
                "
                size="md"
              />

              <div class="min-w-0">
                <p class="truncate font-semibold text-highlighted">
                  {{ member.student.name }}
                </p>

                <p class="mt-0.5 truncate text-xs text-muted">
                  {{
                    member.student.studentNumber
                    || member.student.email
                    || "No institutional ID"
                  }}
                </p>

                <p
                  v-if="activeView === 'requests'"
                  class="mt-1 text-xs text-muted"
                >
                  Requested {{ formatRequestedAt(member.requested_at) }}
                </p>
              </div>
            </div>

            <div
              v-if="activeView === 'requests'"
              class="flex shrink-0 gap-2 pl-12 sm:pl-0"
            >
              <UButton
                color="success"
                variant="soft"
                size="sm"
                icon="i-lucide-user-check"
                :loading="busyMembershipId === member.id"
                @click="runMemberAction(member, 'approve')"
              >
                Approve
              </UButton>

              <UButton
                color="neutral"
                variant="outline"
                size="sm"
                icon="i-lucide-user-x"
                :disabled="busyMembershipId === member.id"
                @click="runMemberAction(member, 'reject')"
              >
                Decline
              </UButton>
            </div>

            <UDropdownMenu
              v-else
              :items="studentMenuItems(member)"
              :content="{
                align: 'end',
              }"
            >
              <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-ellipsis-vertical"
                :aria-label="`Actions for ${member.student.name}`"
                :disabled="busyMembershipId === member.id || bulkRemoving"
              />
            </UDropdownMenu>
          </article>
        </div>
      </div>

      <ConfirmationModal
        v-model:open="removeModalOpen"
        title="Remove student from class?"
        :description="memberToRemove ? `${memberToRemove.student.name} will lose access to this class. Their existing assessment records are not deleted.` : ''"
        confirm-label="Remove Student"
        confirm-color="error"
        icon="i-lucide-user-minus"
        :loading="Boolean(memberToRemove && busyMembershipId === memberToRemove.id)"
        @confirm="confirmRemove"
      />

      <ConfirmationModal
        v-model:open="bulkRemoveModalOpen"
        :title="selectedMemberIds.length === 1 ? 'Remove selected student?' : `Remove ${selectedMemberIds.length} selected students?`"
        :description="`The selected ${selectedMemberIds.length === 1 ? 'student' : 'students'} will lose access to this class. Existing assessment records will not be deleted.`"
        confirm-label="Remove Selected"
        confirm-color="error"
        icon="i-lucide-users-round"
        :loading="bulkRemoving"
        @confirm="confirmBulkRemove"
      />
    </template>
  </div>
</template>

<style scoped>
@media (prefers-reduced-motion: reduce) {
  * {
    scroll-behavior: auto;
  }
}
</style>
