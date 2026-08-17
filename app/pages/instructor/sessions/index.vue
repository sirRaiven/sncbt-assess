<script setup lang="ts">
import type {
  InstructorDeliveryListItem,
} from "~/types/assessment-delivery";

definePageMeta({
  layout: "instructor",
});

useSeoMeta({
  title: "Live Sessions",
});

const {
  listInstructorDeliveries,
} = useAssessmentDelivery();

const deliveries = ref<InstructorDeliveryListItem[]>([]);
const searchQuery = ref("");

const activeFilter = ref<
  | "all"
  | "open"
  | "upcoming"
  | "closed"
  | "cancelled"
>("all");

const isLoading = ref(true);
const errorMessage = ref("");

const filterItems = [
  { label: "All", value: "all" },
  { label: "Open", value: "open" },
  { label: "Upcoming", value: "upcoming" },
  { label: "Ended", value: "closed" },
  { label: "Cancelled", value: "cancelled" },
] as const;

const filteredDeliveries = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();

  return deliveries.value.filter((delivery) => {
    const matchesStatus =
      activeFilter.value === "all"
      || delivery.status === activeFilter.value;

    if (!matchesStatus) {
      return false;
    }

    if (!query) {
      return true;
    }

    return [
      delivery.title,
      delivery.subjectCode,
      delivery.classroom.name,
      delivery.classroom.section,
    ]
      .filter(Boolean)
      .some((value) =>
        String(value).toLowerCase().includes(query),
      );
  });
});

const counts = computed(() => ({
  all: deliveries.value.length,
  open: deliveries.value.filter(
    (delivery) => delivery.status === "open",
  ).length,
  upcoming: deliveries.value.filter(
    (delivery) => delivery.status === "upcoming",
  ).length,
  closed: deliveries.value.filter(
    (delivery) => delivery.status === "closed",
  ).length,
}));

function completedCount(
  delivery: InstructorDeliveryListItem,
): number {
  return delivery.submittedCount + delivery.autoSubmittedCount;
}

function completionPercent(
  delivery: InstructorDeliveryListItem,
): number {
  if (!delivery.classMemberCount) {
    return 0;
  }

  return Math.min(
    100,
    Math.round(
      (completedCount(delivery) / delivery.classMemberCount) * 100,
    ),
  );
}

function formatSessionWindow(
  startsAt: string,
  endsAt: string,
): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);

  const dateFormatter = new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
  });

  const timeFormatter = new Intl.DateTimeFormat("en-PH", {
    timeStyle: "short",
  });

  if (start.toDateString() === end.toDateString()) {
    return `${dateFormatter.format(start)} · ${timeFormatter.format(start)} – ${timeFormatter.format(end)}`;
  }

  const fullFormatter = new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return `${fullFormatter.format(start)} – ${fullFormatter.format(end)}`;
}

function actionLabel(
  delivery: InstructorDeliveryListItem,
): string {
  if (delivery.status === "open") {
    return "Open Monitor";
  }

  if (delivery.status === "upcoming") {
    return "View Details";
  }

  return "View Session";
}

function actionIcon(
  delivery: InstructorDeliveryListItem,
): string {
  return delivery.status === "open"
    ? "i-lucide-chart-no-axes-combined"
    : "i-lucide-arrow-right";
}

async function loadDeliveries(): Promise<void> {
  isLoading.value = true;
  errorMessage.value = "";

  const result = await listInstructorDeliveries();

  if (result.error || !result.data) {
    errorMessage.value =
      result.error
      || "Unable to load the assessment sessions.";

    isLoading.value = false;
    return;
  }

  deliveries.value = result.data.deliveries;
  isLoading.value = false;
}

onMounted(loadDeliveries);
</script>

<template>
  <div class="page-stack">
    <PageHeader
      :breadcrumbs="[
        { label: 'Overview', to: '/instructor/dashboard', icon: 'i-lucide-layout-dashboard' },
        { label: 'Live Sessions' },
      ]"
      eyebrow="Assessment monitoring"
      title="Live Sessions"
      description="View scheduled classroom assessments and open a session to follow student progress."
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
        label="All sessions"
        :value="String(counts.all)"
        icon="i-lucide-layout-list"
        tone="primary"
      />

      <StatCard
        label="Open now"
        :value="String(counts.open)"
        icon="i-lucide-radio-tower"
        tone="success"
      />

      <StatCard
        label="Upcoming"
        :value="String(counts.upcoming)"
        icon="i-lucide-calendar-clock"
        tone="info"
      />

      <StatCard
        label="Ended"
        :value="String(counts.closed)"
        icon="i-lucide-history"
        tone="neutral"
      />
    </section>

    <UCard>
      <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div class="flex flex-wrap gap-1.5">
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

        <UInput
          v-model="searchQuery"
          icon="i-lucide-search"
          placeholder="Search sessions"
          aria-label="Search assessment sessions"
          class="w-full lg:max-w-sm"
        />
      </div>
    </UCard>

    <div
      v-if="isLoading"
      class="grid gap-5 xl:grid-cols-2"
    >
      <USkeleton
        v-for="number in 4"
        :key="number"
        class="h-72 rounded-2xl"
      />
    </div>

    <EmptyPanel
      v-else-if="filteredDeliveries.length === 0"
      icon="i-lucide-radio-tower"
      :title="deliveries.length === 0 ? 'No assessment sessions yet' : 'No matching sessions'"
      :description="
        deliveries.length === 0
          ? 'Publish an assessment and schedule it for a class. Its session will appear here automatically.'
          : 'Try another search term or change the current session filter.'
      "
    >
      <template
        v-if="deliveries.length === 0"
        #actions
      >
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
      class="grid gap-5 xl:grid-cols-2"
    >
      <UCard
        v-for="delivery in filteredDeliveries"
        :key="delivery.assignmentId"
        class="overflow-hidden"
        :ui="{
          body: 'p-0 sm:p-0',
        }"
      >
        <div class="grid h-full lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
          <div class="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-5 sm:p-6">
            <div class="flex flex-wrap items-center gap-2">
              <StatusPill :status="delivery.status" />

              <UBadge
                color="neutral"
                variant="soft"
              >
                {{ delivery.subjectCode }} · {{ delivery.classroom.section }}
              </UBadge>
            </div>

            <h2 class="mt-4 text-xl font-black leading-tight text-highlighted sm:text-2xl">
              {{ delivery.title }}
            </h2>

            <div class="mt-4 space-y-2 text-sm text-muted">
              <div class="flex items-start gap-2">
                <UIcon
                  name="i-lucide-school"
                  class="mt-0.5 size-4 shrink-0 text-primary"
                />

                <span>{{ delivery.classroom.name }}</span>
              </div>

              <div class="flex items-start gap-2">
                <UIcon
                  name="i-lucide-calendar-clock"
                  class="mt-0.5 size-4 shrink-0 text-primary"
                />

                <span>
                  {{ formatSessionWindow(delivery.startsAt, delivery.endsAt) }}
                </span>
              </div>
            </div>
          </div>

          <div class="flex flex-col justify-between gap-5 p-5 sm:p-6">
            <div
              v-if="delivery.status === 'upcoming'"
              class="rounded-xl bg-elevated/70 p-4 ring-1 ring-default"
            >
              <p class="text-xs font-semibold uppercase tracking-wide text-muted">
                Class size
              </p>

              <p class="mt-1 text-2xl font-black text-highlighted">
                {{ delivery.classMemberCount }}
                <span class="text-sm font-semibold text-muted">students</span>
              </p>

              <p class="mt-2 text-sm text-muted">
                Student progress will appear when the session begins.
              </p>
            </div>

            <div v-else>
              <div class="flex items-end justify-between gap-4">
                <div>
                  <p class="text-xs font-semibold uppercase tracking-wide text-muted">
                    Completion
                  </p>

                  <p class="mt-1 text-xl font-black text-highlighted">
                    {{ completedCount(delivery) }} of {{ delivery.classMemberCount }}
                    <span class="text-sm font-semibold text-muted">students</span>
                  </p>
                </div>

                <span class="font-mono text-sm font-bold text-primary">
                  {{ completionPercent(delivery) }}%
                </span>
              </div>

              <UProgress
                class="mt-3"
                :model-value="completionPercent(delivery)"
                :color="delivery.status === 'closed' ? 'success' : 'primary'"
              />

              <div class="mt-4 flex flex-wrap gap-2">
                <UBadge
                  color="success"
                  variant="soft"
                >
                  {{ completedCount(delivery) }} completed
                </UBadge>

                <UBadge
                  v-if="delivery.inProgressCount > 0"
                  color="warning"
                  variant="soft"
                >
                  {{ delivery.inProgressCount }} in progress
                </UBadge>

                <UBadge
                  v-if="delivery.notStartedCount > 0"
                  color="neutral"
                  variant="soft"
                >
                  {{ delivery.notStartedCount }} not started
                </UBadge>
              </div>
            </div>

            <UButton
              :to="`/instructor/sessions/${delivery.assignmentId}/monitor`"
              :icon="actionIcon(delivery)"
              :color="delivery.status === 'open' ? 'primary' : 'neutral'"
              :variant="delivery.status === 'open' ? 'solid' : 'soft'"
              block
            >
              {{ actionLabel(delivery) }}
            </UButton>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
