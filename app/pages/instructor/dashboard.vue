<script setup lang="ts">
import type {
  InstructorDeliveryListItem,
} from "~/types/assessment-delivery";

definePageMeta({
  layout:
    "instructor",
});

useSeoMeta({
  title:
    "Instructor Overview",
});

const {
  listInstructorDeliveries,
} = useAssessmentDelivery();

const {
  profile,
  loadProfile,
} = useCurrentProfile();

const deliveries =
  ref<
    InstructorDeliveryListItem[]
  >(
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
      || "Instructor",
  );

const openDeliveries =
  computed(
    () =>
      deliveries.value.filter(
        (delivery) =>
          delivery.status
          === "open",
      ),
  );

const upcomingCount =
  computed(
    () =>
      deliveries.value.filter(
        (delivery) =>
          delivery.status
          === "upcoming",
      ).length,
  );

const endedCount =
  computed(
    () =>
      deliveries.value.filter(
        (delivery) =>
          delivery.status
          === "closed",
      ).length,
  );

const activeStudents =
  computed(
    () =>
      openDeliveries.value.reduce(
        (
          total,
          delivery,
        ) =>
          total
          + delivery.inProgressCount,
        0,
      ),
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

async function loadOverview():
  Promise<void> {
  isLoading.value =
    true;

  errorMessage.value =
    "";

  const result =
    await listInstructorDeliveries();

  if (
    result.error
    || !result.data
  ) {
    errorMessage.value =
      result.error
      || "Unable to load the instructor overview.";

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
      eyebrow="Instructor overview"
      :title="`Welcome, ${displayName}`"
      description="Scheduled classroom assessments open automatically. Monitor active students and review completed deliveries from one place."
    >
      <template #actions>
        <div class="flex flex-wrap gap-2">
          <UButton
            to="/instructor/assessments/create"
            icon="i-lucide-plus"
          >
            Create Assessment
          </UButton>

          <UButton
            to="/instructor/sessions"
            color="neutral"
            variant="outline"
            icon="i-lucide-radio-tower"
          >
            Open Monitoring
          </UButton>
        </div>
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
        label="Open deliveries"
        :value="
          String(
            openDeliveries.length,
          )
        "
        icon="i-lucide-radio-tower"
        tone="success"
      />

      <StatCard
        label="Students answering"
        :value="
          String(
            activeStudents,
          )
        "
        icon="i-lucide-users"
        tone="warning"
      />

      <StatCard
        label="Upcoming"
        :value="
          String(
            upcomingCount,
          )
        "
        icon="i-lucide-calendar-clock"
        tone="info"
      />

      <StatCard
        label="Ended deliveries"
        :value="
          String(
            endedCount,
          )
        "
        icon="i-lucide-history"
        tone="neutral"
      />
    </section>

    <UCard>
      <template #header>
        <div>
          <h2 class="font-black text-highlighted">
            Open assessment monitoring
          </h2>

          <p class="mt-1 text-sm text-muted">
            No manual Start Session action is required.
          </p>
        </div>
      </template>

      <div
        v-if="isLoading"
        class="space-y-3"
      >
        <USkeleton
          v-for="number in 3"
          :key="number"
          class="h-28 rounded-xl"
        />
      </div>

      <EmptyPanel
        v-else-if="
          openDeliveries.length
          === 0
        "
        icon="i-lucide-radio-tower"
        title="No assessment is open"
        description="Assign a published assessment to a class and configure its schedule."
      >
        <template #actions>
          <UButton
            to="/instructor/assessments"
            icon="i-lucide-clipboard-list"
          >
            Manage Assessments
          </UButton>
        </template>
      </EmptyPanel>

      <div
        v-else
        class="space-y-3"
      >
        <article
          v-for="delivery in openDeliveries"
          :key="delivery.assignmentId"
          class="rounded-xl border border-default p-4"
        >
          <div class="flex flex-col gap-4 xl:flex-row xl:items-center">
            <div class="min-w-0 flex-1">
              <p class="text-xs font-bold text-primary">
                {{ delivery.subjectCode }}
                ·
                {{ delivery.classroom.section }}
              </p>

              <h3 class="mt-2 font-black text-highlighted">
                {{ delivery.title }}
              </h3>

              <p class="mt-1 text-xs text-muted">
                Closes:
                {{ formatDate(delivery.endsAt) }}
              </p>
            </div>

            <div class="flex flex-wrap gap-2">
              <UBadge
                color="warning"
                variant="soft"
              >
                {{ delivery.inProgressCount }}
                in progress
              </UBadge>

              <UBadge
                color="success"
                variant="soft"
              >
                {{
                  delivery.submittedCount
                  + delivery.autoSubmittedCount
                }}
                submitted
              </UBadge>
            </div>

            <UButton
              :to="`/instructor/sessions/${delivery.assignmentId}/monitor`"
              icon="i-lucide-chart-no-axes-combined"
            >
              Monitor
            </UButton>
          </div>
        </article>
      </div>
    </UCard>
  </div>
</template>
