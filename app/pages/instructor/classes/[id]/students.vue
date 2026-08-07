<script setup lang="ts">
import type {
  ClassroomMember,
  InstructorClassroom,
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

const classroomId = computed(
  () => String(route.params.id),
);

const {
  getInstructorClass,
  listMembers,
  approveMember,
  rejectMember,
  removeMember,
} = useClassrooms();

const classroom =
  ref<InstructorClassroom | null>(null);

const members =
  ref<ClassroomMember[]>([]);

const activeTab =
  ref<MembershipStatus>("active");

const isLoading = ref(true);
const busyMembershipId =
  ref<string | null>(null);

const errorMessage = ref("");
const query = ref("");

const tabs: Array<{
  label: string;
  value: MembershipStatus;
}> = [
  {
    label: "Enrolled",
    value: "active",
  },
  {
    label: "Pending",
    value: "pending",
  },
  {
    label: "Rejected",
    value: "rejected",
  },
  {
    label: "Removed",
    value: "removed",
  },
  {
    label: "Left",
    value: "left",
  },
];

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

async function loadData(): Promise<void> {
  isLoading.value = true;
  errorMessage.value = "";

  const [
    classResult,
    memberResult,
  ] = await Promise.all([
    getInstructorClass(
      classroomId.value,
    ),

    listMembers(
      classroomId.value,
      activeTab.value,
    ),
  ]);

  if (
    classResult.error
    || !classResult.data
  ) {
    errorMessage.value =
      classResult.error
      || "Unable to load the class.";

    isLoading.value = false;
    return;
  }

  if (
    memberResult.error
    || !memberResult.data
  ) {
    errorMessage.value =
      memberResult.error
      || "Unable to load class memberships.";

    isLoading.value = false;
    return;
  }

  classroom.value =
    classResult.data.classroom;

  members.value =
    memberResult.data.members;

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
      title:
        "Membership action failed",
      description:
        result.error
        || "The action could not be completed.",
      color:
        "error",
    });

    busyMembershipId.value =
      null;

    return;
  }

  toast.add({
    title:
      "Membership updated",
    description:
      result.data.message,
    color:
      "success",
  });

  await loadData();

  busyMembershipId.value =
    null;
}

watch(
  activeTab,
  loadData,
);

onMounted(
  loadData,
);
</script>

<template>
  <div class="page-stack">
    <PortalBackButton
      :fallback-to="`/instructor/classes/${classroomId}`"
    />
    <PageHeader
      :eyebrow="
        classroom
          ? `${classroom.subject_code} · ${classroom.section}`
          : 'Class membership'
      "
      title="Class students"
      description="Review enrolled students and respond to membership requests."
    />

    <UAlert
      v-if="errorMessage"
      color="error"
      variant="soft"
      title="Memberships could not be loaded"
      :description="errorMessage"
    />

    <section
      v-if="classroom"
      class="grid gap-4 sm:grid-cols-3"
    >
      <StatCard
        label="Enrolled"
        :value="
          String(
            classroom.memberCounts.active,
          )
        "
        icon="i-lucide-users"
        tone="primary"
      />

      <StatCard
        label="Pending"
        :value="
          String(
            classroom.memberCounts.pending,
          )
        "
        icon="i-lucide-user-round-plus"
        tone="warning"
      />

      <StatCard
        label="Left or removed"
        :value="
          String(
            classroom.memberCounts.left
            + classroom.memberCounts.removed,
          )
        "
        icon="i-lucide-user-round-x"
        tone="neutral"
      />
    </section>

    <UCard>
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div class="flex flex-wrap gap-2">
          <UButton
            v-for="tab in tabs"
            :key="tab.value"
            :color="
              activeTab === tab.value
                ? 'primary'
                : 'neutral'
            "
            :variant="
              activeTab === tab.value
                ? 'soft'
                : 'ghost'
            "
            @click="
              activeTab = tab.value
            "
          >
            {{ tab.label }}

            <UBadge
              v-if="classroom"
              color="neutral"
              variant="soft"
              size="sm"
            >
              {{
                classroom.memberCounts[
                  tab.value
                ]
              }}
            </UBadge>
          </UButton>
        </div>

        <UInput
          v-model="query"
          icon="i-lucide-search"
          placeholder="Search student"
          class="w-full lg:w-72"
        />
      </div>
    </UCard>

    <USkeleton
      v-if="isLoading"
      class="h-80 rounded-xl"
    />

    <EmptyPanel
      v-else-if="
        filteredMembers.length === 0
      "
      icon="i-lucide-users"
      :title="
        activeTab === 'pending'
          ? 'No pending requests'
          : 'No memberships found'
      "
      description="Membership records for the selected status will appear here."
    />

    <div
      v-else
      class="table-shell table-scroll"
    >
      <table class="app-table">
        <thead>
          <tr>
            <th>Student</th>
            <th>Student number</th>
            <th>Requested</th>
            <th>Status</th>
            <th class="w-56">Action</th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="member in filteredMembers"
            :key="member.id"
          >
            <td>
              <div class="flex items-center gap-3">
                <UAvatar
                  :text="
                    member.student.name
                      .split(' ')
                      .map(
                        (part) => part[0],
                      )
                      .slice(0, 2)
                      .join('')
                  "
                  size="sm"
                />

                <div>
                  <p class="font-semibold text-highlighted">
                    {{ member.student.name }}
                  </p>

                  <p class="text-xs text-muted">
                    {{ member.student.email }}
                  </p>
                </div>
              </div>
            </td>

            <td class="font-mono text-xs">
              {{
                member.student.studentNumber
                || "—"
              }}
            </td>

            <td>
              {{
                new Date(
                  member.requested_at,
                ).toLocaleString()
              }}
            </td>

            <td>
              <StatusPill
                :status="
                  member.membership_status
                "
              />
            </td>

            <td>
              <div class="flex flex-wrap gap-2">
                <template
                  v-if="
                    member.membership_status
                    === 'pending'
                  "
                >
                  <UButton
                    color="success"
                    variant="soft"
                    size="sm"
                    icon="i-lucide-user-check"
                    :loading="
                      busyMembershipId
                      === member.id
                    "
                    @click="
                      runMemberAction(
                        member,
                        'approve',
                      )
                    "
                  >
                    Approve
                  </UButton>

                  <UButton
                    color="error"
                    variant="ghost"
                    size="sm"
                    icon="i-lucide-user-x"
                    :disabled="
                      busyMembershipId
                      === member.id
                    "
                    @click="
                      runMemberAction(
                        member,
                        'reject',
                      )
                    "
                  >
                    Reject
                  </UButton>
                </template>

                <UButton
                  v-else-if="
                    member.membership_status
                    === 'active'
                  "
                  color="error"
                  variant="soft"
                  size="sm"
                  icon="i-lucide-user-minus"
                  :loading="
                    busyMembershipId
                    === member.id
                  "
                  @click="
                    runMemberAction(
                      member,
                      'remove',
                    )
                  "
                >
                  Remove
                </UButton>

                <span
                  v-else
                  class="text-xs text-muted"
                >
                  No action available
                </span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
