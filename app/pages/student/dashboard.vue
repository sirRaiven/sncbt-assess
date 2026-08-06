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
    return `/student/assessments/${delivery.assignmentId}/completed`;
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
      eyebrow="Student overview"
      :title="`Welcome, ${displayName}`"
      description="Open assessments, saved attempts, and upcoming classroom activities are shown here automatically."
    >
      <template #actions>
        <UButton
          to="/student/assessments"
          icon="i-lucide-clipboard-list"
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

    <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
      class="grid gap-5 xl:grid-cols-2"
    >
      <USkeleton class="h-96 rounded-xl" />
      <USkeleton class="h-96 rounded-xl" />
    </div>

    <div
      v-else
      class="grid gap-5 xl:grid-cols-2"
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
