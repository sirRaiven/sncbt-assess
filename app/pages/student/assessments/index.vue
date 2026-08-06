<script setup lang="ts">
import type {
  DeliveryAvailabilityStatus,
  StudentAssessmentDelivery,
} from "~/types/assessment-delivery";

definePageMeta({
  layout:
    "student",
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
              delivery.attempt
              && completedStatuses
                .includes(
                  delivery.attempt.status,
                );

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
            && !(
              delivery.attempt
              && completedStatuses
                .includes(
                  delivery.attempt.status,
                )
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

function formatDuration(
  seconds: number | null,
): string {
  if (!seconds) {
    return "Until the class schedule closes";
  }

  const minutes =
    Math.round(
      seconds / 60,
    );

  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
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
    delivery.canViewResult
  ) {
    return `/student/assessments/${delivery.assignmentId}/completed`;
  }

  return `/student/assessments/${delivery.assignmentId}/instructions`;
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
        :value="
          String(
            counts.open,
          )
        "
        icon="i-lucide-unlock"
        tone="success"
      />

      <StatCard
        label="Upcoming"
        :value="
          String(
            counts.upcoming,
          )
        "
        icon="i-lucide-calendar-clock"
        tone="info"
      />

      <StatCard
        label="Completed"
        :value="
          String(
            counts.completed,
          )
        "
        icon="i-lucide-circle-check-big"
        tone="primary"
      />

      <StatCard
        label="Closed without attempt"
        :value="
          String(
            counts.closed,
          )
        "
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
          :variant="
            activeFilter
            === item.value
              ? 'soft'
              : 'ghost'
          "
          @click="
            activeFilter =
              item.value
          "
        >
          {{ item.label }}
        </UButton>
      </div>
    </UCard>

    <div
      v-if="isLoading"
      class="grid gap-4 xl:grid-cols-2"
    >
      <USkeleton
        v-for="number in 4"
        :key="number"
        class="h-72 rounded-xl"
      />
    </div>

    <EmptyPanel
      v-else-if="
        filteredDeliveries.length
        === 0
      "
      icon="i-lucide-clipboard-list"
      title="No assessments in this view"
      description="Assigned classroom assessments will appear here when your instructor publishes and schedules them."
    />

    <div
      v-else
      class="grid gap-4 xl:grid-cols-2"
    >
      <UCard
        v-for="delivery in filteredDeliveries"
        :key="delivery.assignmentId"
      >
        <div class="flex items-start gap-4">
          <div class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <UIcon
              name="i-lucide-clipboard-check"
              class="size-5"
            />
          </div>

          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p class="text-xs font-bold uppercase tracking-[0.14em] text-primary">
                  {{ delivery.subjectCode }}
                  ·
                  {{ delivery.classroom.section }}
                </p>

                <h2 class="mt-2 text-lg font-black text-highlighted">
                  {{ delivery.title }}
                </h2>

                <p class="mt-1 text-sm text-muted">
                  {{ delivery.classroom.name }}
                </p>
              </div>

              <StatusPill
                :status="
                  displayStatus(
                    delivery,
                  )
                "
              />
            </div>

            <div class="mt-5 grid gap-3 sm:grid-cols-3">
              <div class="rounded-lg bg-elevated p-3">
                <p class="text-xs text-muted">
                  Questions
                </p>

                <p class="mt-1 font-black text-highlighted">
                  {{ delivery.questionCount }}
                </p>
              </div>

              <div class="rounded-lg bg-elevated p-3">
                <p class="text-xs text-muted">
                  Points
                </p>

                <p class="mt-1 font-black text-highlighted">
                  {{ delivery.totalPoints }}
                </p>
              </div>

              <div class="rounded-lg bg-elevated p-3">
                <p class="text-xs text-muted">
                  Duration
                </p>

                <p class="mt-1 text-sm font-black text-highlighted">
                  {{
                    formatDuration(
                      delivery.timeLimitSeconds,
                    )
                  }}
                </p>
              </div>
            </div>

            <div class="mt-4 rounded-lg border border-default p-3 text-sm">
              <div class="flex justify-between gap-4">
                <span class="text-muted">
                  Opens
                </span>

                <span class="text-right font-semibold text-highlighted">
                  {{
                    formatDate(
                      delivery.startsAt,
                    )
                  }}
                </span>
              </div>

              <div class="mt-2 flex justify-between gap-4">
                <span class="text-muted">
                  Closes
                </span>

                <span class="text-right font-semibold text-highlighted">
                  {{
                    formatDate(
                      delivery.endsAt,
                    )
                  }}
                </span>
              </div>
            </div>

            <div
              v-if="
                delivery.attempt
                && delivery.attempt.status
                === 'in_progress'
              "
              class="mt-4"
            >
              <div class="flex justify-between text-xs text-muted">
                <span>
                  Progress
                </span>

                <span>
                  {{ delivery.attempt.answeredCount }}
                  /
                  {{ delivery.questionCount }}
                </span>
              </div>

              <UProgress
                class="mt-2"
                :model-value="
                  delivery.questionCount
                    ? (
                        delivery.attempt.answeredCount
                        / delivery.questionCount
                      ) * 100
                    : 0
                "
              />
            </div>

            <div class="mt-5 flex justify-end">
              <UButton
                :to="
                  actionRoute(
                    delivery,
                  )
                "
                :color="
                  delivery.canStart
                  || delivery.canResume
                    ? 'primary'
                    : 'neutral'
                "
                :variant="
                  delivery.canStart
                  || delivery.canResume
                    ? 'solid'
                    : 'outline'
                "
                :icon="
                  delivery.canResume
                    ? 'i-lucide-play'
                    : delivery.canViewResult
                      ? 'i-lucide-chart-column'
                      : 'i-lucide-eye'
                "
              >
                {{
                  actionLabel(
                    delivery,
                  )
                }}
              </UButton>
            </div>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
