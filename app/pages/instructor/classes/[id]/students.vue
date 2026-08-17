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

const errorMessage = ref("");
const query = ref("");

const removeModalOpen = ref(false);
const memberToRemove =
  ref<ClassroomMember | null>(null);

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

const showRequests = computed(
  () =>
    Boolean(
      enrollmentSettings.value?.requiresApproval,
    )
    || Boolean(
      classroom.value?.memberCounts.pending,
    ),
);

async function loadData(): Promise<void> {
  if (!classroom.value) {
    return;
  }

  isLoading.value = true;
  errorMessage.value = "";

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
    errorMessage.value =
      memberResult.error
      || "We couldn't load the student list right now.";

    isLoading.value = false;
    return;
  }

  members.value =
    memberResult.data.members;

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

  isLoading.value = false;
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
          === member.id,
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
    void loadData();
  },
);

watch(
  classroomId,
  () => {
    void loadData();
  },
);

onMounted(
  loadData,
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
      <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div class="space-y-2">
          <USkeleton class="h-4 w-36 rounded" />
          <USkeleton class="h-9 w-52 rounded-lg" />
          <USkeleton class="h-5 w-64 rounded" />
        </div>
        <USkeleton class="h-10 w-full rounded-lg sm:w-80" />
      </div>

      <USkeleton class="h-11 w-64 rounded-lg" />

      <div class="overflow-hidden rounded-xl border border-default bg-default p-4">
        <div class="space-y-2">
          <USkeleton
            v-for="number in 5"
            :key="number"
            class="h-16 rounded-lg"
          />
        </div>
      </div>
    </div>

    <template v-else-if="classroom">
      <section class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.2em] text-primary">
            {{ classroom.subject_code }} · {{ classroom.section }}
          </p>

          <div class="mt-1 flex flex-wrap items-baseline gap-3">
            <h1 class="text-3xl font-black tracking-tight text-highlighted">
              Students
            </h1>

            <span class="text-2xl font-semibold text-muted">
              {{ classroom.memberCounts.active }}
            </span>
          </div>

          <div class="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
            <span>{{ classroom.name }}</span>
            <span aria-hidden="true">·</span>

            <UBadge
              :color="enrollmentSettings?.requiresApproval ? 'warning' : 'success'"
              variant="soft"
              size="sm"
            >
              {{
                enrollmentSettings?.requiresApproval
                  ? "Approval required"
                  : "Automatic join"
              }}
            </UBadge>
          </div>
        </div>

        <UInput
          v-model="query"
          icon="i-lucide-search"
          placeholder="Search students"
          aria-label="Search students"
          class="w-full sm:w-80"
        />
      </section>

      <div class="flex flex-wrap items-center gap-1 border-b border-default">
        <UButton
          :to="`/instructor/classes/${classroom.id}/students`"
          :color="activeView === 'students' ? 'primary' : 'neutral'"
          :variant="activeView === 'students' ? 'soft' : 'ghost'"
          icon="i-lucide-users"
          class="rounded-b-none"
          :aria-current="activeView === 'students' ? 'page' : undefined"
        >
          Students
          <UBadge
            color="neutral"
            variant="soft"
            size="sm"
          >
            {{ classroom.memberCounts.active }}
          </UBadge>
        </UButton>

        <UButton
          v-if="showRequests"
          :to="`/instructor/classes/${classroom.id}/students?view=requests`"
          :color="activeView === 'requests' ? 'warning' : 'neutral'"
          :variant="activeView === 'requests' ? 'soft' : 'ghost'"
          icon="i-lucide-user-round-clock"
          class="rounded-b-none"
          :aria-current="activeView === 'requests' ? 'page' : undefined"
        >
          Requests
          <UBadge
            :color="classroom.memberCounts.pending ? 'warning' : 'neutral'"
            variant="soft"
            size="sm"
          >
            {{ classroom.memberCounts.pending }}
          </UBadge>
        </UButton>
      </div>

      <UAlert
        v-if="activeView === 'requests' && !enrollmentSettings?.requiresApproval"
        color="info"
        variant="soft"
        icon="i-lucide-info"
        title="Automatic joining is currently enabled"
        description="These are earlier requests that were already pending. New students with a valid class code now join immediately."
      />

      <div class="overflow-hidden rounded-xl border border-default bg-default">
        <div class="flex items-center justify-between gap-3 border-b border-default px-4 py-4 sm:px-5">
          <div>
            <h2 class="font-bold text-highlighted">
              {{
                activeView === "requests"
                  ? "Enrollment requests"
                  : "Class roster"
              }}
            </h2>
            <p class="mt-0.5 text-xs text-muted">
              {{
                activeView === "requests"
                  ? "Approve or decline students waiting to join this class."
                  : "Students who currently have access to this class."
              }}
            </p>
          </div>

          <span class="text-sm font-semibold text-muted">
            {{ filteredMembers.length }}
          </span>
        </div>

        <div
          v-if="isLoading"
          class="space-y-1 p-4"
        >
          <USkeleton
            v-for="number in 4"
            :key="number"
            class="h-16 rounded-lg"
          />
        </div>

        <EmptyPanel
          v-else-if="filteredMembers.length === 0"
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
            class="flex flex-col gap-3 border-b border-default px-4 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:px-5"
          >
            <div class="flex min-w-0 items-center gap-3">
              <UAvatar
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

                <div class="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                  <span class="font-mono">
                    {{ member.student.studentNumber || "No student number" }}
                  </span>
                  <span v-if="member.student.email">
                    {{ member.student.email }}
                  </span>
                </div>

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
              class="flex shrink-0 gap-2"
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
                aria-label="Student actions"
                :disabled="busyMembershipId === member.id"
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
    </template>
  </div>
</template>

<style scoped>
.roster-view-enter-active,
.roster-view-leave-active {
  transition: opacity 140ms ease;
}

.roster-view-enter-from,
.roster-view-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .roster-view-enter-active,
  .roster-view-leave-active {
    transition: none;
  }
}
</style>
