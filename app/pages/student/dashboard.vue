<script setup lang="ts">
import type {
  StudentAssessmentDelivery,
} from "~/types/assessment-delivery";

definePageMeta({
  layout:
    "student",
});

useSeoMeta({
  title:
    "Student Overview",
});

const {
  listStudentDeliveries,
} = useAssessmentDelivery();

const {
  profile,
  loadProfile,
} = useCurrentProfile();

const deliveries =
  ref<StudentAssessmentDelivery[]>(
    [],
  );

const isLoading =
  ref(true);

const errorMessage =
  ref("");

await loadProfile();

const displayName =
  computed(
    () =>
      profile.value?.first_name
      || "Student",
  );

const completedStatuses = [
  "submitted",
  "auto_submitted",
];

const openDeliveries =
  computed(
    () =>
      deliveries.value.filter(
        (delivery) =>
          delivery.status
          === "open"
          && !(
            delivery.attempt
            && completedStatuses
              .includes(
                delivery.attempt.status,
              )
          ),
      ),
  );

const upcomingDeliveries =
  computed(
    () =>
      deliveries.value
        .filter(
          (delivery) =>
            delivery.status
            === "upcoming",
        )
        .slice(
          0,
          4,
        ),
  );

const completedCount =
  computed(
    () =>
      deliveries.value.filter(
        (delivery) =>
          delivery.attempt
          && completedStatuses
            .includes(
              delivery.attempt.status,
            ),
      ).length,
  );

const classCount =
  computed(
    () =>
      new Set(
        deliveries.value.map(
          (delivery) =>
            delivery.classroom.id,
        ),
      ).size,
  );

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

function actionRoute(
  delivery:
    StudentAssessmentDelivery,
): string {
  if (
    delivery.canResume
  ) {
    return `/student/assessments/${delivery.assignmentId}/play`;
  }

  if (
    delivery.canViewResult
  ) {
    return `/student/results/${delivery.assignmentId}`;
  }

  return `/student/assessments/${delivery.assignmentId}/instructions`;
}

function actionLabel(
  delivery:
    StudentAssessmentDelivery,
): string {
  if (
    delivery.canResume
  ) {
    return "Continue";
  }

  if (
    delivery.canViewResult
  ) {
    return "View Result";
  }

  return "Open";
}

async function loadOverview():
  Promise<void> {
  isLoading.value =
    true;

  errorMessage.value =
    "";

  const result =
    await listStudentDeliveries();

  if (
    result.error
    || !result.data
  ) {
    errorMessage.value =
      result.error
      || "Unable to load your assessment overview.";

    isLoading.value =
      false;

    return;
  }

  deliveries.value =
    result.data.deliveries;

  isLoading.value =
    false;
}

onMounted(
  loadOverview,
);
</script>

<template>
  <div class="page-stack">
    <PageHeader
      compact-mobile
      eyebrow="Student overview"
      :title="`Welcome, ${displayName}`"
      description="Open assessments, saved attempts, and upcoming classroom activities are shown here automatically."
    >
      <template #actions>
        <UButton
          to="/student/assessments"
          icon="i-lucide-clipboard-list"
          class="hidden sm:inline-flex"
        >
          Open Assessments
        </UButton>
      </template>
    </PageHeader>

    <UAlert
      v-if="errorMessage"
      color="error"
      variant="soft"
      title="Overview could not be loaded"
      :description="errorMessage"
    />

    <section class="space-y-4 sm:hidden" aria-label="Student priorities">
      <template v-if="isLoading">
        <USkeleton class="h-36 rounded-xl" />
        <USkeleton class="h-28 rounded-xl" />
      </template>

      <template v-else-if="openDeliveries.length > 0">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.14em] text-primary">
              Needs attention
            </p>
            <h2 class="mt-1 text-lg font-black text-highlighted">
              Open assessments
            </h2>
          </div>

          <UButton
            to="/student/assessments"
            color="neutral"
            variant="ghost"
            size="sm"
            trailing-icon="i-lucide-arrow-right"
          >
            See all
          </UButton>
        </div>

        <UCard
          v-for="delivery in openDeliveries.slice(0, 3)"
          :key="delivery.assignmentId"
          class="overflow-hidden"
          :ui="{ body: 'p-4' }"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <StatusPill
                  :status="delivery.attempt?.status || delivery.status"
                />
                <span class="text-xs font-bold text-primary">
                  {{ delivery.subjectCode }} · {{ delivery.classroom.section }}
                </span>
              </div>

              <h3 class="mt-2 line-clamp-2 text-base font-black text-highlighted">
                {{ delivery.title }}
              </h3>

              <p class="mt-2 flex items-center gap-1.5 text-xs text-muted">
                <UIcon name="i-lucide-clock-3" class="size-3.5 shrink-0" />
                <span class="truncate">Closes {{ formatDate(delivery.endsAt) }}</span>
              </p>
            </div>
          </div>

          <UButton
            :to="actionRoute(delivery)"
            :icon="delivery.canResume ? 'i-lucide-play' : 'i-lucide-arrow-right'"
            block
            class="mt-4"
          >
            {{ actionLabel(delivery) }}
          </UButton>
        </UCard>
      </template>

      <template v-else-if="upcomingDeliveries.length > 0">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.14em] text-primary">
              Next up
            </p>
            <h2 class="mt-1 text-lg font-black text-highlighted">
              Upcoming assessments
            </h2>
          </div>

          <UButton
            to="/student/assessments"
            color="neutral"
            variant="ghost"
            size="sm"
            trailing-icon="i-lucide-arrow-right"
          >
            See all
          </UButton>
        </div>

        <UCard
          v-for="delivery in upcomingDeliveries.slice(0, 2)"
          :key="delivery.assignmentId"
          :ui="{ body: 'p-4' }"
        >
          <p class="text-xs font-bold text-primary">
            {{ delivery.subjectCode }} · {{ delivery.classroom.section }}
          </p>
          <h3 class="mt-2 line-clamp-2 font-black text-highlighted">
            {{ delivery.title }}
          </h3>
          <p class="mt-2 flex items-center gap-1.5 text-sm text-muted">
            <UIcon name="i-lucide-calendar-clock" class="size-4 shrink-0" />
            <span class="truncate">Opens {{ formatDate(delivery.startsAt) }}</span>
          </p>
        </UCard>
      </template>

      <UCard v-else :ui="{ body: 'p-4' }">
        <div class="flex items-start gap-3">
          <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-success/10 text-success">
            <UIcon name="i-lucide-circle-check-big" class="size-5" />
          </div>
          <div class="min-w-0">
            <h2 class="font-black text-highlighted">You're caught up</h2>
            <p class="mt-1 text-sm leading-5 text-muted">
              No assessment needs your attention right now.
            </p>
          </div>
        </div>
      </UCard>
    </section>

    <section class="sm:hidden" aria-labelledby="student-workspace-title">
      <div class="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 id="student-workspace-title" class="text-base font-black text-highlighted">
            Your workspace
          </h2>
          <p class="mt-0.5 text-xs text-muted">
            Go straight to the areas you use most.
          </p>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <NuxtLink
          to="/student/assessments"
          class="group min-h-28 rounded-2xl border border-default bg-default p-4 transition hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-default"
          aria-label="Open assessments, schedules, and saved attempts"
        >
          <div class="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary/15">
            <UIcon name="i-lucide-clipboard-list" class="size-5" />
          </div>
          <h3 class="mt-3 text-sm font-black text-highlighted">
            Assessments
          </h3>
          <p class="mt-1 text-xs leading-4 text-muted">
            Schedules and saved attempts
          </p>
        </NuxtLink>

        <NuxtLink
          to="/student/classes"
          class="group min-h-28 rounded-2xl border border-default bg-default p-4 transition hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-default"
          aria-label="Open your classes and enrolled subjects"
        >
          <div class="flex size-10 items-center justify-center rounded-xl bg-info/10 text-info transition group-hover:bg-info/15">
            <UIcon name="i-lucide-book-open" class="size-5" />
          </div>
          <h3 class="mt-3 text-sm font-black text-highlighted">
            My classes
          </h3>
          <p class="mt-1 text-xs leading-4 text-muted">
            Subjects and class details
          </p>
        </NuxtLink>

        <NuxtLink
          to="/student/results"
          class="group min-h-28 rounded-2xl border border-default bg-default p-4 transition hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-default"
          aria-label="Review assessment results and feedback"
        >
          <div class="flex size-10 items-center justify-center rounded-xl bg-success/10 text-success transition group-hover:bg-success/15">
            <UIcon name="i-lucide-trophy" class="size-5" />
          </div>
          <h3 class="mt-3 text-sm font-black text-highlighted">
            Results
          </h3>
          <p class="mt-1 text-xs leading-4 text-muted">
            Scores and feedback
          </p>
        </NuxtLink>

        <NuxtLink
          to="/student/profile"
          class="group min-h-28 rounded-2xl border border-default bg-default p-4 transition hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-default"
          aria-label="Open your student profile and account information"
        >
          <div class="flex size-10 items-center justify-center rounded-xl bg-neutral/10 text-muted transition group-hover:bg-neutral/15">
            <UIcon name="i-lucide-user-round" class="size-5" />
          </div>
          <h3 class="mt-3 text-sm font-black text-highlighted">
            Profile
          </h3>
          <p class="mt-1 text-xs leading-4 text-muted">
            Account and student details
          </p>
        </NuxtLink>
      </div>
    </section>

    <section class="hidden gap-4 sm:grid sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Open now"
        :value="
          String(
            openDeliveries.length,
          )
        "
        icon="i-lucide-unlock"
        tone="success"
      />

      <StatCard
        label="Upcoming"
        :value="
          String(
            upcomingDeliveries.length,
          )
        "
        icon="i-lucide-calendar-clock"
        tone="info"
      />

      <StatCard
        label="Completed"
        :value="
          String(
            completedCount,
          )
        "
        icon="i-lucide-circle-check-big"
        tone="primary"
      />

      <StatCard
        label="Classes with assessments"
        :value="
          String(
            classCount,
          )
        "
        icon="i-lucide-book-open"
        tone="neutral"
      />
    </section>

    <div
      v-if="isLoading"
      class="hidden gap-5 sm:grid xl:grid-cols-2"
    >
      <USkeleton class="h-96 rounded-xl" />
      <USkeleton class="h-96 rounded-xl" />
    </div>

    <div
      v-else
      class="hidden gap-5 sm:grid xl:grid-cols-2"
    >
      <UCard>
        <template #header>
          <div>
            <h2 class="font-black text-highlighted">
              Available now
            </h2>

            <p class="mt-1 text-sm text-muted">
              Start or continue without waiting for an instructor session code.
            </p>
          </div>
        </template>

        <EmptyPanel
          v-if="
            openDeliveries.length
            === 0
          "
          icon="i-lucide-circle-check"
          title="No open assessments"
          description="There is no classroom assessment requiring your attention right now."
        />

        <div
          v-else
          class="space-y-3"
        >
          <article
            v-for="delivery in openDeliveries.slice(0, 5)"
            :key="delivery.assignmentId"
            class="rounded-xl border border-default p-4"
          >
            <div class="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <StatusPill
                    :status="
                      delivery.attempt?.status
                      || delivery.status
                    "
                  />

                  <span class="text-xs font-bold text-primary">
                    {{ delivery.subjectCode }}
                    ·
                    {{ delivery.classroom.section }}
                  </span>
                </div>

                <h3 class="mt-2 font-black text-highlighted">
                  {{ delivery.title }}
                </h3>

                <p class="mt-1 text-xs text-muted">
                  Closes:
                  {{ formatDate(delivery.endsAt) }}
                </p>
              </div>

              <UButton
                :to="actionRoute(delivery)"
                :icon="
                  delivery.canResume
                    ? 'i-lucide-play'
                    : 'i-lucide-arrow-right'
                "
              >
                {{ actionLabel(delivery) }}
              </UButton>
            </div>
          </article>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <div>
            <h2 class="font-black text-highlighted">
              Upcoming assessments
            </h2>

            <p class="mt-1 text-sm text-muted">
              Review the opening schedule and prepare before access begins.
            </p>
          </div>
        </template>

        <EmptyPanel
          v-if="
            upcomingDeliveries.length
            === 0
          "
          icon="i-lucide-calendar-check"
          title="Nothing upcoming"
          description="New scheduled assessments will appear here."
        />

        <div
          v-else
          class="space-y-3"
        >
          <article
            v-for="delivery in upcomingDeliveries"
            :key="delivery.assignmentId"
            class="rounded-xl border border-default p-4"
          >
            <p class="text-xs font-bold text-primary">
              {{ delivery.subjectCode }}
              ·
              {{ delivery.classroom.section }}
            </p>

            <h3 class="mt-2 font-black text-highlighted">
              {{ delivery.title }}
            </h3>

            <p class="mt-2 text-sm text-muted">
              Opens:
              {{ formatDate(delivery.startsAt) }}
            </p>
          </article>
        </div>
      </UCard>
    </div>
  </div>
</template>
