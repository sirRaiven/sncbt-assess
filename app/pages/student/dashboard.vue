<script setup lang="ts">
import type {
  StudentDashboardOverview,
} from "~/types/dashboard-overview";

definePageMeta({
  layout: "student",
});

useSeoMeta({
  title: "Student overview",
});

const toast = useToast();

const {
  getStudentOverview,
} = useDashboardOverview();

const {
  joinSession,
} = useAssessmentSessions();

const overview =
  ref<StudentDashboardOverview | null>(
    null,
  );

const sessionCode = ref("");
const isLoading = ref(true);
const isRefreshing = ref(false);
const isJoining = ref(false);
const errorMessage = ref("");
const joinError = ref("");

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

const openSessionRoute = computed(() => {
  const session =
    overview.value?.openSession;

  if (!session) {
    return "/student/sessions/join";
  }

  return session.status === "lobby"
    ? `/student/sessions/${session.id}/lobby`
    : `/student/sessions/${session.id}/instructions`;
});

const openSessionActionLabel = computed(() => {
  return overview.value?.openSession?.status
    === "lobby"
    ? "Open Lobby"
    : "Continue to Instructions";
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

function typeLabel(
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

function normalizeSessionCode(): void {
  sessionCode.value =
    sessionCode.value
      .replace(/[^0-9]/g, "")
      .slice(0, 6);
}

async function submitJoinCode(): Promise<void> {
  normalizeSessionCode();
  joinError.value = "";

  if (!/^\d{6}$/.test(sessionCode.value)) {
    joinError.value =
      "Enter a valid six-digit session code.";
    return;
  }

  isJoining.value = true;

  const result =
    await joinSession(
      sessionCode.value,
    );

  if (
    result.error
    || !result.data
  ) {
    joinError.value =
      result.error
      || "Unable to join the live session.";

    isJoining.value = false;
    return;
  }

  toast.add({
    title:
      "Session joined",
    description:
      result.data.message,
    color:
      "success",
  });

  await navigateTo(
    `/student/sessions/${result.data.detail.session.id}/lobby`,
  );
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
    await getStudentOverview();

  if (
    result.error
    || !result.data
  ) {
    errorMessage.value =
      result.error
      || "Unable to load the student overview.";

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
      <USkeleton class="h-52 rounded-xl" />

      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <USkeleton
          v-for="number in 4"
          :key="number"
          class="h-32 rounded-xl"
        />
      </div>

      <div class="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
        <USkeleton class="h-96 rounded-xl" />
        <USkeleton class="h-96 rounded-xl" />
      </div>
    </div>

    <template v-else-if="overview">
      <section class="rounded-xl bg-gradient-to-r from-brand-900 via-brand-700 to-indigo-700 p-7 text-white shadow-sm sm:p-8">
        <div class="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p class="text-sm font-semibold text-blue-200">
              {{ greeting }},
              {{ overview.profile.firstName }}.
            </p>

            <h1 class="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              Your learning overview
            </h1>

            <p class="mt-3 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base">
              Review your classes, available assessments, pending requests, and current live-session activity.
            </p>
          </div>

          <div class="flex flex-wrap gap-3">
            <UButton
              to="/student/sessions/join"
              color="neutral"
              class="bg-white text-brand-800 hover:bg-blue-50"
              icon="i-lucide-log-in"
            >
              Join Live Session
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

      <section class="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
        <UCard>
          <template #header>
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p class="text-xs font-bold uppercase tracking-[0.16em] text-primary">
                  Live activity
                </p>

                <h2 class="mt-1 font-black text-highlighted">
                  Current session
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
            class="space-y-5"
          >
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

              <p class="mt-2 text-sm text-muted">
                Instructor:
                {{ overview.openSession.instructorName }}
              </p>
            </div>

            <div class="flex flex-wrap gap-2">
              <UBadge
                color="info"
                variant="soft"
              >
                {{ modeLabel(overview.openSession.sessionMode) }}
              </UBadge>

              <StatusPill
                :status="overview.openSession.participantStatus"
              />
            </div>

            <UButton
              :to="openSessionRoute"
              icon="i-lucide-arrow-right-circle"
            >
              {{ openSessionActionLabel }}
            </UButton>
          </div>

          <EmptyPanel
            v-else
            icon="i-lucide-radio"
            title="No joined live session"
            description="Enter the six-digit code provided by your instructor to join a waiting lobby."
          />
        </UCard>

        <UCard>
          <template #header>
            <div>
              <h2 class="font-black text-highlighted">
                Enter session code
              </h2>

              <p class="mt-1 text-sm text-muted">
                Use the code displayed by your instructor.
              </p>
            </div>
          </template>

          <form
            class="space-y-4"
            @submit.prevent="submitJoinCode"
          >
            <UFormField
              label="Six-digit code"
              :error="joinError"
            >
              <UInput
                v-model="sessionCode"
                inputmode="numeric"
                autocomplete="one-time-code"
                maxlength="6"
                size="xl"
                class="w-full"
                icon="i-lucide-key-round"
                placeholder="000000"
                @input="normalizeSessionCode"
              />
            </UFormField>

            <UButton
              type="submit"
              block
              size="lg"
              icon="i-lucide-log-in"
              :loading="isJoining"
            >
              Join Session
            </UButton>
          </form>
        </UCard>
      </section>

      <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Joined classes"
          :value="String(overview.summary.joinedClasses)"
          icon="i-lucide-book-open"
          tone="primary"
        />

        <StatCard
          label="Pending requests"
          :value="String(overview.summary.pendingClassRequests)"
          icon="i-lucide-clock-3"
          tone="warning"
        />

        <StatCard
          label="Available assessments"
          :value="String(overview.summary.availableAssessments)"
          icon="i-lucide-clipboard-list"
          tone="info"
        />

        <StatCard
          label="Active session"
          :value="overview.summary.hasOpenSession ? 'Yes' : 'No'"
          icon="i-lucide-radio"
          :tone="overview.summary.hasOpenSession ? 'success' : 'neutral'"
        />
      </section>

      <section class="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
        <UCard>
          <template #header>
            <div class="flex items-center justify-between gap-3">
              <div>
                <h2 class="font-black text-highlighted">
                  Available assessments
                </h2>

                <p class="mt-1 text-sm text-muted">
                  Published assessments assigned to your active classes.
                </p>
              </div>

              <UBadge
                color="info"
                variant="soft"
              >
                Live session required
              </UBadge>
            </div>
          </template>

          <EmptyPanel
            v-if="overview.availableAssessments.length === 0"
            icon="i-lucide-clipboard-list"
            title="No available assessments"
            description="Published assessments assigned to your joined classes will appear here."
          />

          <div
            v-else
            class="divide-y divide-default"
          >
            <article
              v-for="assessment in overview.availableAssessments"
              :key="`${assessment.assessmentId}-${assessment.classroomId}`"
              class="py-5 first:pt-0 last:pb-0"
            >
              <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <h3 class="font-black text-highlighted">
                      {{ assessment.title }}
                    </h3>

                    <UBadge
                      color="neutral"
                      variant="soft"
                    >
                      {{ typeLabel(assessment.assessmentType) }}
                    </UBadge>
                  </div>

                  <p class="mt-2 text-sm text-muted">
                    {{ assessment.subjectCode }}
                    ·
                    {{ assessment.section }}
                    ·
                    {{ assessment.classroomName }}
                  </p>

                  <p class="mt-2 text-xs text-muted">
                    {{ assessment.questionCount }} questions
                    ·
                    {{ assessment.totalPoints }} points
                  </p>
                </div>

                <UButton
                  :to="`/student/classes/${assessment.classroomId}`"
                  color="neutral"
                  variant="outline"
                  size="sm"
                  icon="i-lucide-school"
                >
                  Open Class
                </UButton>
              </div>
            </article>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <div class="flex items-center justify-between gap-3">
              <div>
                <h2 class="font-black text-highlighted">
                  Pending class requests
                </h2>

                <p class="mt-1 text-sm text-muted">
                  Requests awaiting instructor approval.
                </p>
              </div>

              <UButton
                to="/student/classes"
                color="neutral"
                variant="ghost"
                trailing-icon="i-lucide-arrow-right"
              >
                My Classes
              </UButton>
            </div>
          </template>

          <UAlert
            v-if="overview.pendingMemberships.length === 0"
            color="success"
            variant="soft"
            title="No pending requests"
            description="All of your current class requests have been reviewed."
          />

          <div
            v-else
            class="space-y-3"
          >
            <article
              v-for="request in overview.pendingMemberships"
              :key="request.membershipId"
              class="rounded-xl border border-default p-4"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="font-bold text-highlighted">
                    {{ request.subjectCode }}
                    ·
                    {{ request.section }}
                  </p>

                  <p class="mt-1 text-sm text-muted">
                    {{ request.name }}
                  </p>

                  <p class="mt-2 text-xs text-muted">
                    Instructor:
                    {{ request.instructorName }}
                  </p>
                </div>

                <StatusPill status="Pending" />
              </div>
            </article>
          </div>
        </UCard>
      </section>

      <UCard>
        <template #header>
          <div class="flex items-center justify-between gap-3">
            <div>
              <h2 class="font-black text-highlighted">
                My joined classes
              </h2>

              <p class="mt-1 text-sm text-muted">
                Active classes where your membership has been approved.
              </p>
            </div>

            <UButton
              to="/student/classes"
              color="neutral"
              variant="ghost"
              trailing-icon="i-lucide-arrow-right"
            >
              View All
            </UButton>
          </div>
        </template>

        <EmptyPanel
          v-if="overview.joinedClasses.length === 0"
          icon="i-lucide-book-open"
          title="No joined classes"
          description="Use a class code to request membership in an instructor's class."
        >
          <template #actions>
            <UButton
              to="/student/classes/join"
              icon="i-lucide-plus"
            >
              Join a Class
            </UButton>
          </template>
        </EmptyPanel>

        <div
          v-else
          class="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
        >
          <article
            v-for="classroom in overview.joinedClasses"
            :key="classroom.membershipId"
            class="rounded-xl border border-default p-5"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <UIcon
                  name="i-lucide-book-open"
                  class="size-5"
                />
              </div>

              <UBadge
                color="info"
                variant="soft"
              >
                {{ classroom.publishedAssessmentCount }} assessments
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

            <p class="mt-4 text-sm text-muted">
              {{ classroom.instructorName }}
            </p>

            <UButton
              :to="`/student/classes/${classroom.classroomId}`"
              block
              color="neutral"
              variant="outline"
              class="mt-5"
            >
              Open Class
            </UButton>
          </article>
        </div>
      </UCard>

      <UAlert
        color="info"
        variant="soft"
        title="Results and performance are coming in a later phase"
        description="The dashboard does not display fake scores, rankings, or completion totals. Those values will appear after secure answer storage and automatic grading are implemented."
      />
    </template>
  </div>
</template>
