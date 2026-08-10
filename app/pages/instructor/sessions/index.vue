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
    "Live Sessions",
});

const {
  listInstructorDeliveries,
} = useAssessmentDelivery();

const deliveries =
  ref<
    InstructorDeliveryListItem[]
  >(
    [],
  );

const activeFilter =
  ref<
    | "all"
    | "open"
    | "upcoming"
    | "closed"
    | "cancelled"
  >(
    "all",
  );

const isLoading =
  ref(true);

const errorMessage =
  ref("");

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
      "Ended",
    value:
      "closed",
  },
  {
    label:
      "Cancelled",
    value:
      "cancelled",
  },
] as const;

const filteredDeliveries =
  computed(
    () =>
      activeFilter.value
      === "all"
        ? deliveries.value
        : deliveries.value
          .filter(
            (delivery) =>
              delivery.status
              === activeFilter.value,
          ),
  );

const counts =
  computed(
    () => ({
      open:
        deliveries.value.filter(
          (delivery) =>
            delivery.status
            === "open",
        ).length,
      upcoming:
        deliveries.value.filter(
          (delivery) =>
            delivery.status
            === "upcoming",
        ).length,
      closed:
        deliveries.value.filter(
          (delivery) =>
            delivery.status
            === "closed",
        ).length,
      participants:
        deliveries.value.reduce(
          (
            total,
            delivery,
          ) =>
            total
            + delivery.startedCount,
          0,
        ),
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

async function loadDeliveries():
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
      || "Unable to load the assessment sessions.";

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
      eyebrow="Assessment monitoring"
      title="Live Sessions"
      description="Open and ended classroom assessment deliveries appear here automatically. Use the monitor to view student progress, scoring, and ranking."
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
      title="Sessions could not be loaded"
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
        icon="i-lucide-radio-tower"
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
        label="Ended"
        :value="
          String(
            counts.closed,
          )
        "
        icon="i-lucide-history"
        tone="neutral"
      />

      <StatCard
        label="Students started"
        :value="
          String(
            counts.participants,
          )
        "
        icon="i-lucide-users"
        tone="primary"
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
      class="space-y-4"
    >
      <USkeleton
        v-for="number in 4"
        :key="number"
        class="h-36 rounded-xl"
      />
    </div>

    <EmptyPanel
      v-else-if="
        filteredDeliveries.length
        === 0
      "
      icon="i-lucide-radio-tower"
      title="No assessment sessions"
      description="Publish an assessment and assign it to a class with a schedule. The delivery will appear here automatically."
    >
      <template #actions>
        <UButton
          to="/instructor/assessments"
          icon="i-lucide-clipboard-list"
        >
          Open Assessments
        </UButton>
      </template>
    </EmptyPanel>

    <div
      v-else
      class="space-y-4"
    >
      <div
        v-for="delivery in filteredDeliveries"
        :key="delivery.assignmentId"
        class="overflow-hidden rounded-xl border border-default p-5 transition-colors hover:border-primary/30"
      >
        <div class="flex flex-col gap-5 xl:flex-row xl:items-center">
          <div class="min-w-0 flex-1 rounded-lg bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-4">
            <div class="flex flex-wrap items-center gap-2">
              <StatusPill
                :status="
                  delivery.status
                "
              />

              <UBadge
                color="neutral"
                variant="soft"
              >
                {{ delivery.subjectCode }}
                ·
                {{ delivery.classroom.section }}
              </UBadge>
            </div>

            <h2 class="mt-3 text-xl font-black text-highlighted">
              {{ delivery.title }}
            </h2>

            <p class="mt-1 text-sm text-muted">
              {{ delivery.classroom.name }}
              ·
              {{ formatDate(delivery.startsAt) }}
              —
              {{ formatDate(delivery.endsAt) }}
            </p>
          </div>

          <div class="grid grid-cols-2 gap-3 sm:grid-cols-5 xl:min-w-[560px]">
            <div class="rounded-lg bg-elevated p-3 text-center">
              <p class="text-xs text-muted">
                Class
              </p>

              <p class="mt-1 font-black text-highlighted">
                {{ delivery.classMemberCount }}
              </p>
            </div>

            <div class="rounded-lg bg-elevated p-3 text-center">
              <p class="text-xs text-muted">
                Started
              </p>

              <p class="mt-1 font-black text-highlighted">
                {{ delivery.startedCount }}
              </p>
            </div>

            <div class="rounded-lg bg-elevated p-3 text-center">
              <p class="text-xs text-muted">
                In progress
              </p>

              <p class="mt-1 font-black text-highlighted">
                {{ delivery.inProgressCount }}
              </p>
            </div>

            <div class="rounded-lg bg-elevated p-3 text-center">
              <p class="text-xs text-muted">
                Submitted
              </p>

              <p class="mt-1 font-black text-highlighted">
                {{
                  delivery.submittedCount
                  + delivery.autoSubmittedCount
                }}
              </p>
            </div>

            <div class="rounded-lg bg-elevated p-3 text-center">
              <p class="text-xs text-muted">
                Not started
              </p>

              <p class="mt-1 font-black text-highlighted">
                {{ delivery.notStartedCount }}
              </p>
            </div>
          </div>

          <UButton
            :to="`/instructor/sessions/${delivery.assignmentId}/monitor`"
            icon="i-lucide-chart-no-axes-combined"
          >
            Open Monitor
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>
