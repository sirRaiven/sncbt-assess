<script setup lang="ts">
import type {
  DashboardAttentionTone,
  InstructorDashboardOverview,
} from "~/types/dashboard-overview";

definePageMeta({
  layout: "instructor",
});

useSeoMeta({
  title: "Instructor overview",
});

const toast = useToast();

const {
  getInstructorOverview,
} = useDashboardOverview();

const overview =
  ref<InstructorDashboardOverview | null>(
    null,
  );

const isLoading = ref(true);
const isRefreshing = ref(false);
const errorMessage = ref("");

let refreshTimer:
  | ReturnType<typeof setInterval>
  | null = null;

const greeting = computed(() => {
  const hour =
    new Date().getHours();

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 18) {
    return "Good afternoon";
  }

  return "Good evening";
});

const academicContextLabel = computed(() => {
  if (!overview.value?.academicContext) {
    return "Instructor workspace";
  }

  return [
    overview.value.academicContext.semester,
    overview.value.academicContext.schoolYear,
  ].join(" · ");
});

const openSessionRoute = computed(() => {
  const session =
    overview.value?.openSession;

  if (!session) {
    return "/instructor/sessions";
  }

  return session.status === "lobby"
    ? `/instructor/sessions/${session.id}/lobby`
    : `/instructor/sessions/${session.id}/monitor`;
});

const openSessionActionLabel = computed(() => {
  return overview.value?.openSession?.status
    === "lobby"
    ? "Open Lobby"
    : "Open Monitor";
});

function modeLabel(
  value: string,
): string {
  return value
    .split("_")
    .map(
      (part) =>
        part.charAt(0).toUpperCase()
        + part.slice(1),
    )
    .join(" ");
}

function formatDateTime(
  value: string | null,
): string {
  if (!value) {
    return "Not started";
  }

  return new Date(value)
    .toLocaleString(
      undefined,
      {
        dateStyle: "medium",
        timeStyle: "short",
      },
    );
}

function attentionToneClass(
  tone: DashboardAttentionTone,
): string {
  const classes = {
    warning:
      "bg-warning/10 text-warning",
    info:
      "bg-info/10 text-info",
    success:
      "bg-success/10 text-success",
    neutral:
      "bg-elevated text-muted",
    error:
      "bg-error/10 text-error",
  };

  return classes[tone];
}

async function copySessionCode(): Promise<void> {
  const code =
    overview.value?.openSession
      ?.sessionCode;

  if (!code) {
    return;
  }

  try {
    await navigator.clipboard
      .writeText(code);

    toast.add({
      title:
        "Session code copied",
      description:
        code,
      color:
        "success",
    });
  } catch {
    toast.add({
      title:
        "Unable to copy the code",
      description:
        "Copy the displayed session code manually.",
      color:
        "warning",
    });
  }
}

async function loadOverview(
  silent = false,
): Promise<void> {
  if (silent) {
    isRefreshing.value = true;
  } else {
    isLoading.value = true;
  }

  errorMessage.value = "";

  const result =
    await getInstructorOverview();

  if (
    result.error
    || !result.data
  ) {
    errorMessage.value =
      result.error
      || "Unable to load the instructor overview.";

    isLoading.value = false;
    isRefreshing.value = false;
    return;
  }

  overview.value =
    result.data;

  isLoading.value = false;
  isRefreshing.value = false;
}

onMounted(() => {
  void loadOverview();

  refreshTimer = setInterval(
    () => {
      if (
        document.visibilityState
        === "visible"
      ) {
        void loadOverview(true);
      }
    },
    30000,
  );
});

onBeforeUnmount(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }
});
</script>

<template>
  <div class="page-stack">
    <UAlert
      v-if="errorMessage"
      color="error"
      variant="soft"
      title="Dashboard could not be loaded"
      :description="errorMessage"
    >
      <template #actions>
        <UButton
          color="error"
          variant="soft"
          :loading="isRefreshing"
          @click="loadOverview(true)"
        >
          Try Again
        </UButton>
      </template>
    </UAlert>

    <div
      v-if="isLoading"
      class="space-y-6"
    >
      <USkeleton class="h-56 rounded-xl" />

      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <USkeleton
          v-for="number in 6"
          :key="number"
          class="h-32 rounded-xl"
        />
      </div>

      <div class="grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
        <USkeleton class="h-96 rounded-xl" />
        <USkeleton class="h-96 rounded-xl" />
      </div>
    </div>

    <template v-else-if="overview">
      <section class="rounded-xl bg-gradient-to-r from-brand-900 via-brand-700 to-indigo-700 p-7 text-white shadow-sm sm:p-8">
        <div class="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <UBadge
              color="neutral"
              variant="soft"
              class="bg-white/10 text-blue-50"
            >
              {{ academicContextLabel }}
            </UBadge>

            <h1 class="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
              {{ greeting }},
              {{ overview.profile.firstName }}.
            </h1>

            <p class="mt-3 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base">
              Review your classes, assessment library, membership requests, and current live-session activity.
            </p>
          </div>

          <div class="flex flex-wrap gap-3">
            <UButton
              to="/instructor/assessments/create"
              color="neutral"
              class="bg-white text-brand-800 hover:bg-blue-50"
              icon="i-lucide-file-plus-2"
            >
              Create Assessment
            </UButton>

            <UButton
              to="/instructor/sessions/create"
              color="neutral"
              variant="outline"
              class="border-white/30 text-white hover:bg-white/10"
              icon="i-lucide-radio-tower"
            >
              Start Live Session
            </UButton>

            <UButton
              color="neutral"
              variant="ghost"
              class="text-white hover:bg-white/10"
              icon="i-lucide-refresh-cw"
              :loading="isRefreshing"
              aria-label="Refresh dashboard"
              @click="loadOverview(true)"
            />
          </div>
        </div>
      </section>

      <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard
          label="Active classes"
          :value="String(overview.summary.activeClasses)"
          icon="i-lucide-school"
          tone="primary"
        />

        <StatCard
          label="Enrolled students"
          :value="String(overview.summary.enrolledStudents)"
          icon="i-lucide-users-round"
          tone="info"
          change="Unique active students"
        />

        <StatCard
          label="Published"
          :value="String(overview.summary.publishedAssessments)"
          icon="i-lucide-send"
          tone="success"
        />

        <StatCard
          label="Drafts"
          :value="String(overview.summary.draftAssessments)"
          icon="i-lucide-file-pen-line"
          tone="warning"
        />

        <StatCard
          label="Pending requests"
          :value="String(overview.summary.pendingMemberships)"
          icon="i-lucide-user-round-check"
          tone="warning"
        />

        <StatCard
          label="Open session"
          :value="overview.summary.hasOpenSession ? 'Yes' : 'No'"
          icon="i-lucide-radio"
          :tone="overview.summary.hasOpenSession ? 'success' : 'neutral'"
        />
      </section>

      <section class="grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
        <UCard>
          <template #header>
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p class="text-xs font-bold uppercase tracking-[0.16em] text-primary">
                  Live session
                </p>

                <h2 class="mt-1 font-black text-highlighted">
                  Current session activity
                </h2>
              </div>

              <StatusPill
                v-if="overview.openSession"
                :status="overview.openSession.status"
              />
            </div>
          </template>

          <div
            v-if="overview.openSession"
            class="space-y-6"
          >
            <div class="grid gap-5 lg:grid-cols-[1fr_250px]">
              <div>
                <h3 class="text-xl font-black text-highlighted">
                  {{ overview.openSession.assessmentTitle }}
                </h3>

                <p class="mt-2 text-sm text-muted">
                  {{ overview.openSession.subjectCode }}
                  ·
                  {{ overview.openSession.section }}
                  ·
                  {{ overview.openSession.classroomName }}
                </p>

                <div class="mt-4 flex flex-wrap gap-2">
                  <UBadge
                    color="info"
                    variant="soft"
                  >
                    {{ modeLabel(overview.openSession.sessionMode) }}
                  </UBadge>

                  <UBadge
                    color="neutral"
                    variant="soft"
                  >
                    {{ overview.openSession.allowLateJoin ? "Late joining allowed" : "Late joining closed" }}
                  </UBadge>

                  <UBadge
                    v-if="overview.openSession.showLeaderboard"
                    color="warning"
                    variant="soft"
                  >
                    Leaderboard enabled
                  </UBadge>
                </div>
              </div>

              <div class="rounded-xl bg-slate-950 p-5 text-center text-white">
                <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                  Session code
                </p>

                <p class="mt-2 font-mono text-3xl font-black tracking-[0.18em]">
                  {{ overview.openSession.sessionCode }}
                </p>

                <UButton
                  block
                  color="neutral"
                  variant="soft"
                  class="mt-4 bg-white/10 text-white hover:bg-white/15"
                  icon="i-lucide-copy"
                  @click="copySessionCode"
                >
                  Copy Code
                </UButton>
              </div>
            </div>

            <div class="grid gap-3 sm:grid-cols-4">
              <div class="rounded-lg bg-elevated p-4">
                <p class="text-xs text-muted">
                  Participants
                </p>
                <p class="mt-1 text-2xl font-black text-highlighted">
                  {{ overview.openSession.participantCount }}
                </p>
              </div>

              <div class="rounded-lg bg-elevated p-4">
                <p class="text-xs text-muted">
                  Waiting
                </p>
                <p class="mt-1 text-2xl font-black text-highlighted">
                  {{ overview.openSession.waitingCount }}
                </p>
              </div>

              <div class="rounded-lg bg-elevated p-4">
                <p class="text-xs text-muted">
                  Active
                </p>
                <p class="mt-1 text-2xl font-black text-highlighted">
                  {{ overview.openSession.activeCount }}
                </p>
              </div>

              <div class="rounded-lg bg-elevated p-4">
                <p class="text-xs text-muted">
                  Started
                </p>
                <p class="mt-1 text-sm font-bold leading-6 text-highlighted">
                  {{ formatDateTime(overview.openSession.startedAt) }}
                </p>
              </div>
            </div>

            <div class="flex flex-wrap gap-2">
              <UButton
                :to="openSessionRoute"
                icon="i-lucide-monitor-up"
              >
                {{ openSessionActionLabel }}
              </UButton>

              <UButton
                to="/instructor/sessions"
                color="neutral"
                variant="outline"
                icon="i-lucide-list"
              >
                All Sessions
              </UButton>
            </div>
          </div>

          <EmptyPanel
            v-else
            icon="i-lucide-radio-tower"
            title="No open live session"
            description="Create a session from any published assessment and select one of your active classes."
          >
            <template #actions>
              <UButton
                to="/instructor/sessions/create"
                icon="i-lucide-plus"
              >
                Start Live Session
              </UButton>
            </template>
          </EmptyPanel>
        </UCard>

        <UCard>
          <template #header>
            <h2 class="font-black text-highlighted">
              Quick actions
            </h2>
          </template>

          <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <UButton
              to="/instructor/classes/create"
              color="neutral"
              variant="outline"
              block
              class="justify-start"
              icon="i-lucide-school"
            >
              Create Class
            </UButton>

            <UButton
              to="/instructor/assessments/create"
              color="neutral"
              variant="outline"
              block
              class="justify-start"
              icon="i-lucide-file-plus-2"
            >
              Create Assessment
            </UButton>

            <UButton
              to="/instructor/sessions/create"
              color="neutral"
              variant="outline"
              block
              class="justify-start"
              icon="i-lucide-radio-tower"
            >
              Start Live Session
            </UButton>

            <UButton
              to="/instructor/assessments"
              color="neutral"
              variant="outline"
              block
              class="justify-start"
              icon="i-lucide-library-big"
            >
              Assessment Library
            </UButton>

            <UButton
              to="/instructor/classes"
              color="neutral"
              variant="outline"
              block
              class="justify-start"
              icon="i-lucide-users-round"
            >
              Review Class Memberships
            </UButton>
          </div>
        </UCard>
      </section>

      <section class="grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
        <UCard>
          <template #header>
            <div class="flex items-center justify-between gap-3">
              <div>
                <h2 class="font-black text-highlighted">
                  Recent assessments
                </h2>

                <p class="mt-1 text-sm text-muted">
                  Recently updated items from your assessment library.
                </p>
              </div>

              <UButton
                to="/instructor/assessments"
                color="neutral"
                variant="ghost"
                trailing-icon="i-lucide-arrow-right"
              >
                View All
              </UButton>
            </div>
          </template>

          <EmptyPanel
            v-if="overview.recentAssessments.length === 0"
            icon="i-lucide-clipboard-list"
            title="No assessments yet"
            description="Create an assessment and add questions to begin building your library."
          >
            <template #actions>
              <UButton
                to="/instructor/assessments/create"
                icon="i-lucide-plus"
              >
                Create Assessment
              </UButton>
            </template>
          </EmptyPanel>

          <div
            v-else
            class="divide-y divide-default"
          >
            <article
              v-for="assessment in overview.recentAssessments"
              :key="assessment.id"
              class="py-5 first:pt-0 last:pb-0"
            >
              <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <h3 class="font-black text-highlighted">
                      {{ assessment.title }}
                    </h3>

                    <StatusPill
                      :status="assessment.status"
                    />
                  </div>

                  <p class="mt-2 text-sm text-muted">
                    {{ assessment.subjectCode }}
                    ·
                    {{ assessment.questionCount }} questions
                    ·
                    {{ assessment.totalPoints }} points
                  </p>

                  <div class="mt-3 flex flex-wrap gap-2">
                    <UBadge
                      v-if="assessment.assignedClassCount === 0"
                      color="neutral"
                      variant="soft"
                    >
                      My Assessment Library
                    </UBadge>

                    <template v-else>
                      <UBadge
                        v-for="classroom in assessment.assignedClasses.slice(0, 3)"
                        :key="classroom.id"
                        color="info"
                        variant="soft"
                      >
                        {{ classroom.subjectCode }} · {{ classroom.section }}
                      </UBadge>
                    </template>

                    <UBadge
                      v-if="assessment.assignedClassCount > 3"
                      color="neutral"
                      variant="soft"
                    >
                      +{{ assessment.assignedClassCount - 3 }} more
                    </UBadge>
                  </div>
                </div>

                <div class="flex shrink-0 flex-wrap gap-2">
                  <UButton
                    :to="`/instructor/assessments/${assessment.id}/edit`"
                    color="neutral"
                    variant="outline"
                    size="sm"
                    icon="i-lucide-list-plus"
                  >
                    Questions
                  </UButton>

                  <UButton
                    :to="`/instructor/assessments/${assessment.id}/preview`"
                    color="neutral"
                    variant="ghost"
                    size="sm"
                    icon="i-lucide-eye"
                  >
                    Preview
                  </UButton>

                  <UButton
                    v-if="assessment.status === 'published'"
                    :to="`/instructor/sessions/create?assessmentId=${assessment.id}`"
                    size="sm"
                    icon="i-lucide-radio-tower"
                  >
                    Start Live
                  </UButton>
                </div>
              </div>
            </article>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <div>
              <h2 class="font-black text-highlighted">
                Attention needed
              </h2>

              <p class="mt-1 text-sm text-muted">
                Items that may require an instructor action.
              </p>
            </div>
          </template>

          <div
            v-if="overview.attentionItems.length > 0"
            class="space-y-3"
          >
            <div
              v-for="item in overview.attentionItems"
              :key="item.id"
              class="rounded-xl border border-default p-4"
            >
              <div class="flex items-start gap-3">
                <div
                  class="flex size-10 shrink-0 items-center justify-center rounded-lg"
                  :class="attentionToneClass(item.tone)"
                >
                  <UIcon
                    :name="item.icon"
                    class="size-5"
                  />
                </div>

                <div class="min-w-0 flex-1">
                  <div class="flex items-center justify-between gap-3">
                    <p class="font-bold text-highlighted">
                      {{ item.title }}
                    </p>

                    <UBadge
                      color="neutral"
                      variant="soft"
                    >
                      {{ item.count }}
                    </UBadge>
                  </div>

                  <p class="mt-1 text-sm leading-6 text-muted">
                    {{ item.description }}
                  </p>

                  <UButton
                    :to="item.href"
                    color="neutral"
                    variant="link"
                    class="mt-2 px-0"
                    trailing-icon="i-lucide-arrow-right"
                  >
                    {{ item.actionLabel }}
                  </UButton>
                </div>
              </div>
            </div>
          </div>

          <UAlert
            v-else
            color="success"
            variant="soft"
            title="Everything is in order"
            description="There are no pending dashboard items that need immediate attention."
          />
        </UCard>
      </section>

      <UCard>
        <template #header>
          <div class="flex items-center justify-between gap-3">
            <div>
              <h2 class="font-black text-highlighted">
                Class overview
              </h2>

              <p class="mt-1 text-sm text-muted">
                Active classes and current membership activity.
              </p>
            </div>

            <UButton
              to="/instructor/classes"
              color="neutral"
              variant="ghost"
              trailing-icon="i-lucide-arrow-right"
            >
              View All
            </UButton>
          </div>
        </template>

        <EmptyPanel
          v-if="overview.classes.length === 0"
          icon="i-lucide-school"
          title="No active classes"
          description="Create a class before enrolling students or starting a class-based session."
        >
          <template #actions>
            <UButton
              to="/instructor/classes/create"
              icon="i-lucide-plus"
            >
              Create Class
            </UButton>
          </template>
        </EmptyPanel>

        <div
          v-else
          class="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
        >
          <article
            v-for="classroom in overview.classes"
            :key="classroom.id"
            class="rounded-xl border border-default p-5"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <UIcon
                  name="i-lucide-school"
                  class="size-5"
                />
              </div>

              <UBadge
                color="success"
                variant="soft"
              >
                Active
              </UBadge>
            </div>

            <h3 class="mt-4 font-black text-highlighted">
              {{ classroom.name }}
            </h3>

            <p class="mt-1 text-sm text-muted">
              {{ classroom.subjectCode }}
              ·
              {{ classroom.section }}
            </p>

            <p class="mt-2 text-xs text-muted">
              {{ classroom.schoolYear }}
              ·
              {{ classroom.semester }}
            </p>

            <div class="mt-5 grid grid-cols-2 gap-3">
              <div class="rounded-lg bg-elevated p-3">
                <p class="text-xs text-muted">
                  Students
                </p>
                <p class="mt-1 text-xl font-black text-highlighted">
                  {{ classroom.activeStudents }}
                </p>
              </div>

              <div class="rounded-lg bg-elevated p-3">
                <p class="text-xs text-muted">
                  Pending
                </p>
                <p class="mt-1 text-xl font-black text-highlighted">
                  {{ classroom.pendingRequests }}
                </p>
              </div>
            </div>

            <div class="mt-5 flex gap-2">
              <UButton
                :to="`/instructor/classes/${classroom.id}`"
                color="neutral"
                variant="outline"
                size="sm"
                class="flex-1"
              >
                Open Class
              </UButton>

              <UButton
                :to="`/instructor/classes/${classroom.id}/students`"
                size="sm"
                class="flex-1"
              >
                Students
              </UButton>
            </div>
          </article>
        </div>
      </UCard>
    </template>
  </div>
</template>
