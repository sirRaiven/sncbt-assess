<script setup lang="ts">
import type {
  StudentAssessmentDelivery,
} from "~/types/assessment-delivery";

definePageMeta({
  layout:
    "student",
  middleware:
    ["student"],
});

useSeoMeta({
  title:
    "Assessments",
});

const {
  listStudentDeliveries,
} = useAssessmentDelivery();

const deliveries =
  ref<StudentAssessmentDelivery[]>(
    [],
  );

const isLoading =
  ref(true);

const errorMessage =
  ref("");

const query =
  ref("");

const activeFilter =
  ref<
    | "all"
    | "open"
    | "upcoming"
    | "completed"
    | "closed"
  >(
    "all",
  );

const filterItems = [
  {
    label:
      "All",
    value:
      "all",
  },
  {
    label:
      "Open",
    value:
      "open",
  },
  {
    label:
      "Upcoming",
    value:
      "upcoming",
  },
  {
    label:
      "Completed",
    value:
      "completed",
  },
  {
    label:
      "Closed",
    value:
      "closed",
  },
] as const;

const completedStatuses = [
  "submitted",
  "auto_submitted",
];

function hasCompletedAttempt(
  delivery:
    StudentAssessmentDelivery,
): boolean {
  return Boolean(
    delivery.attempt
    && completedStatuses
      .includes(
        delivery.attempt.status,
      ),
  );
}

function deliveryPriority(
  delivery:
    StudentAssessmentDelivery,
): number {
  if (
    delivery.attempt?.status
    === "in_progress"
  ) {
    return 0;
  }

  if (
    delivery.status === "open"
    && (
      delivery.canStart
      || delivery.canResume
    )
  ) {
    return 1;
  }

  if (delivery.status === "upcoming") {
    return 2;
  }

  if (hasCompletedAttempt(delivery)) {
    return 3;
  }

  return 4;
}

function deliveryPriorityTime(
  delivery:
    StudentAssessmentDelivery,
): number {
  if (delivery.status === "upcoming") {
    return new Date(delivery.startsAt).getTime();
  }

  if (
    hasCompletedAttempt(delivery)
    && delivery.attempt?.submittedAt
  ) {
    return -new Date(delivery.attempt.submittedAt).getTime();
  }

  return new Date(delivery.endsAt).getTime();
}

const filteredDeliveries =
  computed(
    () => {
      const keyword =
        query.value
          .trim()
          .toLowerCase();

      return deliveries.value
        .filter((delivery) => {
          if (!keyword) {
            return true;
          }

          return [
            delivery.title,
            delivery.subjectCode,
            delivery.classroom.name,
            delivery.classroom.section,
          ]
            .join(" ")
            .toLowerCase()
            .includes(keyword);
        })
        .filter((delivery) => {
          if (activeFilter.value === "all") {
            return true;
          }

          if (activeFilter.value === "completed") {
            return Boolean(
              delivery.attempt
              && completedStatuses.includes(delivery.attempt.status),
            );
          }

          const completed =
            hasCompletedAttempt(delivery);

          if (activeFilter.value === "open") {
            return (
              delivery.status === "open"
              && (
                !completed
                || delivery.canStart
                || delivery.canResume
              )
            );
          }

          if (completed) {
            return false;
          }

          return delivery.status === activeFilter.value;
        })
        .sort((first, second) => {
          const priorityDifference =
            deliveryPriority(first)
            - deliveryPriority(second);

          if (priorityDifference !== 0) {
            return priorityDifference;
          }

          return deliveryPriorityTime(first)
            - deliveryPriorityTime(second);
        });
    },
  );

const counts =
  computed(
    () => ({
      open:
        deliveries.value.filter(
          (delivery) =>
            delivery.status
              === "open"
            && (
              !hasCompletedAttempt(
                delivery,
              )
              || delivery.canStart
              || delivery.canResume
            ),
        ).length,

      upcoming:
        deliveries.value.filter(
          (delivery) =>
            delivery.status
            === "upcoming",
        ).length,

      completed:
        deliveries.value.filter(
          (delivery) =>
            delivery.attempt
            && completedStatuses
              .includes(
                delivery.attempt.status,
              ),
        ).length,

      closed:
        deliveries.value.filter(
          (delivery) =>
            delivery.status
            === "closed"
            && !delivery.attempt,
        ).length,
    }),
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

function timelineLabel(
  delivery:
    StudentAssessmentDelivery,
): string {
  if (
    hasCompletedAttempt(delivery)
    && delivery.attempt?.submittedAt
  ) {
    return "Submitted";
  }

  if (
    delivery.status
    === "upcoming"
  ) {
    return "Opens";
  }

  if (
    delivery.status
    === "open"
  ) {
    return "Closes";
  }

  return "Closed";
}

function timelineValue(
  delivery:
    StudentAssessmentDelivery,
): string {
  if (
    hasCompletedAttempt(delivery)
    && delivery.attempt?.submittedAt
  ) {
    return delivery.attempt.submittedAt;
  }

  if (
    delivery.status
    === "upcoming"
  ) {
    return delivery.startsAt;
  }

  return delivery.endsAt;
}

function displayStatus(
  delivery:
    StudentAssessmentDelivery,
): string {
  if (
    delivery.attempt
    && completedStatuses
      .includes(
        delivery.attempt.status,
      )
  ) {
    return delivery.attempt.status;
  }

  if (
    delivery.attempt?.status
    === "in_progress"
  ) {
    return "in_progress";
  }

  return delivery.status;
}

function actionLabel(
  delivery:
    StudentAssessmentDelivery,
): string {
  if (
    delivery.canResume
  ) {
    return "Continue Assessment";
  }

  if (
    delivery.canStart
    && hasCompletedAttempt(
      delivery,
    )
  ) {
    return "Start Another Attempt";
  }

  if (
    delivery.canViewResult
  ) {
    return "View Result";
  }

  if (
    delivery.canStart
  ) {
    return "View Instructions";
  }

  if (
    delivery.status
    === "upcoming"
  ) {
    return "View Schedule";
  }

  return "View Details";
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
    delivery.canStart
  ) {
    return `/student/assessments/${delivery.assignmentId}/instructions`;
  }

  if (
    delivery.canViewResult
  ) {
    return `/student/results/${delivery.assignmentId}`;
  }

  return `/student/assessments/${delivery.assignmentId}/instructions`;
}

function actionIcon(
  delivery:
    StudentAssessmentDelivery,
): string {
  if (
    delivery.canResume
    || delivery.canStart
  ) {
    return "i-lucide-play";
  }

  if (delivery.canViewResult) {
    return "i-lucide-chart-column";
  }

  return "i-lucide-eye";
}


function assessmentTypeLabel(
  value: StudentAssessmentDelivery["assessmentType"],
): string {
  const labels = {
    quiz: "Quiz",
    examination: "Examination",
    activity: "Activity",
    practice: "Practice",
  } as const;

  return labels[value];
}

async function loadDeliveries():
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
      || "Unable to load your assigned assessments.";

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
  loadDeliveries,
);
</script>

<template>
  <div class="page-stack">
    <PageHeader
      compact-mobile
      :breadcrumbs="[
        { label: 'Overview', to: '/student/dashboard', icon: 'i-lucide-layout-dashboard' },
        { label: 'Assessments' },
      ]"
      eyebrow="Your assessments"
      title="Assessments"
      description="Find assessments from your classes, check schedules, and continue any attempt already in progress."
    >
      <template #actions>
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-refresh-cw"
          :loading="isLoading"
          class="hidden sm:inline-flex"
          @click="loadDeliveries"
        >
          Refresh
        </UButton>
      </template>
    </PageHeader>

    <UAlert
      v-if="errorMessage"
      color="error"
      variant="soft"
      title="Assessments could not be loaded"
      :description="errorMessage"
    />

    <section class="hidden gap-4 sm:grid sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Open now"
        :value="String(counts.open)"
        icon="i-lucide-unlock"
        tone="success"
      />

      <StatCard
        label="Upcoming"
        :value="String(counts.upcoming)"
        icon="i-lucide-calendar-clock"
        tone="info"
      />

      <StatCard
        label="Completed"
        :value="String(counts.completed)"
        icon="i-lucide-circle-check-big"
        tone="primary"
      />

      <StatCard
        label="Closed"
        :value="String(counts.closed)"
        icon="i-lucide-lock"
        tone="neutral"
      />
    </section>

    <div class="space-y-2 sm:hidden">
      <div class="flex items-center gap-2">
        <UInput
          v-model="query"
          icon="i-lucide-search"
          placeholder="Search assessments"
          aria-label="Search your assessments"
          class="min-w-0 flex-1"
        />

        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-refresh-cw"
          square
          :loading="isLoading"
          aria-label="Refresh assessments"
          @click="loadDeliveries"
        />
      </div>

      <div
        role="group"
        aria-label="Filter assessments"
        class="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <UButton
          v-for="item in filterItems"
          :key="item.value"
          color="neutral"
          size="sm"
          class="shrink-0"
          :variant="activeFilter === item.value ? 'soft' : 'ghost'"
          :aria-pressed="activeFilter === item.value"
          @click="activeFilter = item.value"
        >
          {{ item.label }}
        </UButton>
      </div>
    </div>

    <UCard class="hidden sm:block">
      <div class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <UInput
          v-model="query"
          icon="i-lucide-search"
          placeholder="Search assessment or class"
          aria-label="Search your assessments"
          class="w-full"
        />

        <div
          role="group"
          aria-label="Filter assessments"
          class="flex flex-wrap gap-1"
        >
          <UButton
            v-for="item in filterItems"
            :key="item.value"
            color="neutral"
            :variant="activeFilter === item.value ? 'soft' : 'ghost'"
            :aria-pressed="activeFilter === item.value"
            @click="activeFilter = item.value"
          >
            {{ item.label }}
          </UButton>
        </div>
      </div>
    </UCard>

    <div
      v-if="isLoading"
      class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
    >
      <USkeleton
        v-for="number in 4"
        :key="number"
        class="h-[22rem] rounded-xl"
      />
    </div>

    <EmptyPanel
      v-else-if="filteredDeliveries.length === 0"
      icon="i-lucide-clipboard-list"
      title="No assessments found"
      :description="query ? 'Try a different search or filter.' : 'Assigned assessments will appear here when your instructor schedules them.'"
    />

    <div
      v-else
      class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
    >
      <UCard
        v-for="delivery in filteredDeliveries"
        :key="delivery.assignmentId"
        class="overflow-hidden transition-shadow hover:shadow-md"
        :ui="{
          body: 'p-0 sm:p-0',
        }"
      >
        <div
          class="relative border-b border-default bg-gradient-to-br from-primary/18 via-primary/8 to-transparent p-4 sm:p-5"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-2">
              <div
                class="flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/15"
              >
                <UIcon
                  name="i-lucide-clipboard-check"
                  class="size-4.5"
                />
              </div>

              <UBadge
                color="neutral"
                variant="soft"
                size="sm"
              >
                {{ assessmentTypeLabel(delivery.assessmentType) }}
              </UBadge>
            </div>

            <StatusPill
              :status="displayStatus(delivery)"
            />
          </div>

          <NuxtLink
            :to="actionRoute(delivery)"
            class="group mt-4 block rounded-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/30"
            :aria-label="`${actionLabel(delivery)}: ${delivery.title}`"
          >
            <h2
              class="line-clamp-2 text-lg font-black leading-snug text-highlighted transition group-hover:text-primary"
            >
              {{ delivery.title }}
            </h2>

            <p class="mt-1.5 text-sm font-medium text-muted">
              {{ delivery.subjectCode }}
              ·
              {{ delivery.classroom.section }}
            </p>
          </NuxtLink>
        </div>

        <div class="p-4 sm:p-5">
          <div
            class="flex min-w-0 items-center gap-2 text-sm font-semibold text-primary"
          >
            <UIcon
              name="i-lucide-school"
              class="size-4 shrink-0"
            />

            <span class="truncate">
              {{ delivery.classroom.name }}
            </span>
          </div>

          <div
            class="mt-4 hidden flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted sm:flex"
          >
            <span class="inline-flex items-center gap-1.5">
              <UIcon
                name="i-lucide-list-checks"
                class="size-4"
              />
              <strong class="font-semibold text-highlighted">
                {{ delivery.questionCount }}
              </strong>
              questions
            </span>

            <span class="inline-flex items-center gap-1.5">
              <UIcon
                name="i-lucide-circle-dot"
                class="size-4"
              />
              <strong class="font-semibold text-highlighted">
                {{ delivery.totalPoints }}
              </strong>
              points
            </span>
          </div>

          <div
            class="mt-4 flex items-center gap-2 rounded-xl border border-default/70 bg-elevated/35 px-3 py-2.5 text-sm"
          >
            <UIcon
              name="i-lucide-calendar-clock"
              class="size-4 shrink-0 text-muted"
            />

            <span class="shrink-0 text-muted">
              {{ timelineLabel(delivery) }}
            </span>

            <span class="min-w-0 truncate font-semibold text-highlighted">
              {{ formatDate(timelineValue(delivery)) }}
            </span>
          </div>

          <div
            v-if="delivery.attemptPolicy && delivery.attemptPolicy.maxAttempts > 1"
            class="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-elevated px-3 py-2.5"
          >
            <span class="text-xs text-muted">
              Attempt {{ delivery.attemptPolicy.attemptsUsed }} of {{ delivery.attemptPolicy.maxAttempts }}
            </span>

            <UBadge
              :color="delivery.attemptPolicy.attemptsRemaining > 0 ? 'success' : 'neutral'"
              variant="soft"
              size="sm"
            >
              {{ delivery.attemptPolicy.attemptsRemaining }} remaining
            </UBadge>
          </div>

          <div
            v-if="hasCompletedAttempt(delivery) && delivery.canStart"
            class="mt-4 flex items-center gap-2 rounded-xl bg-success/8 px-3 py-2.5 text-sm text-success"
          >
            <UIcon
              name="i-lucide-rotate-ccw"
              class="size-4 shrink-0"
            />
            <span class="font-medium">
              Another attempt is available
            </span>
          </div>

          <div
            v-if="delivery.attempt && delivery.attempt.status === 'in_progress'"
            class="mt-4"
          >
            <div class="flex justify-between text-xs text-muted">
              <span>Progress</span>
              <span>
                {{ delivery.attempt.answeredCount }} / {{ delivery.questionCount }}
              </span>
            </div>

            <UProgress
              class="mt-2"
              :model-value="
                delivery.questionCount
                  ? (delivery.attempt.answeredCount / delivery.questionCount) * 100
                  : 0
              "
            />
          </div>

          <UButton
            :to="actionRoute(delivery)"
            :color="delivery.canStart || delivery.canResume ? 'primary' : 'neutral'"
            :variant="delivery.canStart || delivery.canResume ? 'solid' : 'soft'"
            :icon="actionIcon(delivery)"
            block
            class="mt-4"
          >
            {{ actionLabel(delivery) }}
          </UButton>
        </div>
      </UCard>
    </div>
  </div>
</template>
