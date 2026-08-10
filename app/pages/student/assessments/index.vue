<script setup lang="ts">
import type {
  DeliveryAvailabilityStatus,
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

const filteredDeliveries =
  computed(
    () => {
      if (
        activeFilter.value
        === "all"
      ) {
        return deliveries.value;
      }

      if (
        activeFilter.value
        === "completed"
      ) {
        return deliveries.value
          .filter(
            (delivery) =>
              delivery.attempt
              && completedStatuses
                .includes(
                  delivery.attempt.status,
                ),
          );
      }

      return deliveries.value
        .filter(
          (delivery) => {
            const completed =
              hasCompletedAttempt(
                delivery,
              );

            if (
              activeFilter.value
              === "open"
            ) {
              return (
                delivery.status
                  === "open"
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

            return (
              delivery.status
              === activeFilter.value
            );
          },
        );
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
      eyebrow="Classroom assessments"
      title="Assessments"
      description="Assessments assigned to your classes open automatically according to the schedule set by your instructor."
    >
      <template #actions>
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-refresh-cw"
          :loading="isLoading"
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

    <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
        label="Closed without attempt"
        :value="String(counts.closed)"
        icon="i-lucide-lock"
        tone="neutral"
      />
    </section>

    <UCard>
      <div class="flex flex-wrap gap-2">
        <UButton
          v-for="item in filterItems"
          :key="item.value"
          color="neutral"
          :variant="activeFilter === item.value ? 'soft' : 'ghost'"
          @click="activeFilter = item.value"
        >
          {{ item.label }}
        </UButton>
      </div>
    </UCard>

    <div
      v-if="isLoading"
      class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
    >
      <USkeleton
        v-for="number in 4"
        :key="number"
        class="h-[31rem] rounded-xl"
      />
    </div>

    <EmptyPanel
      v-else-if="filteredDeliveries.length === 0"
      icon="i-lucide-clipboard-list"
      title="No assessments in this view"
      description="Assigned classroom assessments will appear here when your instructor publishes and schedules them."
    />

    <div
      v-else
      class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
    >
      <UCard
        v-for="delivery in filteredDeliveries"
        :key="delivery.assignmentId"
        class="overflow-hidden"
        :ui="{
          body: 'p-0 sm:p-0',
        }"
      >
        <div class="relative min-h-40 border-b border-default bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-5">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-2">
              <div class="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/15">
                <UIcon
                  name="i-lucide-clipboard-check"
                  class="size-5"
                />
              </div>

              <UBadge
                color="neutral"
                variant="soft"
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
            class="group mt-6 block rounded-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/30"
            :aria-label="`${actionLabel(delivery)}: ${delivery.title}`"
          >
            <h2 class="line-clamp-2 text-xl font-black leading-tight text-highlighted transition group-hover:text-primary">
              {{ delivery.title }}
            </h2>

            <p class="mt-2 text-sm font-medium text-muted">
              {{ delivery.subjectCode }}
              ·
              {{ delivery.classroom.section }}
            </p>
          </NuxtLink>
        </div>

        <div class="p-5">
          <div class="flex min-h-7 flex-wrap gap-2">
            <UBadge
              color="primary"
              variant="soft"
              icon="i-lucide-school"
            >
              {{ delivery.classroom.name }}
            </UBadge>

            <UBadge
              color="neutral"
              variant="soft"
              icon="i-lucide-timer"
            >
              Per-question timing
            </UBadge>
          </div>

          <div class="mt-5 grid grid-cols-3 gap-3">
            <div class="rounded-xl bg-elevated p-3">
              <div class="flex items-center gap-2 text-muted">
                <UIcon
                  name="i-lucide-list-checks"
                  class="size-4"
                />
                <span class="text-xs">Questions</span>
              </div>

              <p class="mt-2 text-lg font-black text-highlighted">
                {{ delivery.questionCount }}
              </p>
            </div>

            <div class="rounded-xl bg-elevated p-3">
              <div class="flex items-center gap-2 text-muted">
                <UIcon
                  name="i-lucide-circle-dot"
                  class="size-4"
                />
                <span class="text-xs">Points</span>
              </div>

              <p class="mt-2 text-lg font-black text-highlighted">
                {{ delivery.totalPoints }}
              </p>
            </div>

            <div class="rounded-xl bg-elevated p-3">
              <div class="flex items-center gap-2 text-muted">
                <UIcon
                  name="i-lucide-calendar-clock"
                  class="size-4"
                />
                <span class="text-xs">Status</span>
              </div>

              <p class="mt-2 truncate text-sm font-black capitalize text-highlighted">
                {{ displayStatus(delivery).replaceAll('_', ' ') }}
              </p>
            </div>
          </div>

          <div class="mt-4 rounded-xl border border-default bg-default/30 p-3 text-sm">
            <div class="flex justify-between gap-4">
              <span class="text-muted">Opens</span>

              <span class="text-right font-semibold text-highlighted">
                {{ formatDate(delivery.startsAt) }}
              </span>
            </div>

            <div class="mt-2 flex justify-between gap-4">
              <span class="text-muted">Closes</span>

              <span class="text-right font-semibold text-highlighted">
                {{ formatDate(delivery.endsAt) }}
              </span>
            </div>
          </div>

          <div
            v-if="delivery.attemptPolicy"
            class="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-elevated p-3"
          >
            <div>
              <p class="text-xs text-muted">
                Attempts
              </p>

              <p class="mt-1 text-sm font-bold text-highlighted">
                {{ delivery.attemptPolicy.attemptsUsed }} of {{ delivery.attemptPolicy.maxAttempts }} used
              </p>
            </div>

            <UBadge
              :color="delivery.attemptPolicy.attemptsRemaining > 0 ? 'success' : 'neutral'"
              variant="soft"
            >
              {{ delivery.attemptPolicy.attemptsRemaining }} remaining
            </UBadge>
          </div>

          <UAlert
            v-if="hasCompletedAttempt(delivery) && delivery.canStart"
            class="mt-4"
            color="success"
            variant="soft"
            title="Another attempt is available"
            description="You have already submitted an attempt, but the server currently allows you to start another one."
          />

          <div
            v-if="delivery.attempt && delivery.attempt.status === 'in_progress'"
            class="mt-4 rounded-xl bg-elevated p-3"
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
            class="mt-5"
          >
            {{ actionLabel(delivery) }}
          </UButton>
        </div>
      </UCard>
    </div>
  </div>
</template>
