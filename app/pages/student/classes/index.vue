<script setup lang="ts">
import type {
  StudentClassListItem,
} from "~/types/classroom";

definePageMeta({
  layout: "student",
  middleware: ["student"],
});

useSeoMeta({
  title: "My classes",
});

const {
  listStudentClasses,
} = useClassrooms();

const classes =
  ref<StudentClassListItem[]>([]);

const isLoading = ref(true);
const errorMessage = ref("");
const query = ref("");

const filteredClasses = computed(() => {
  const keyword =
    query.value
      .trim()
      .toLowerCase();

  if (!keyword) {
    return classes.value;
  }

  return classes.value.filter(
    (item) =>
      [
        item.classroom.name,
        item.classroom.subject_code,
        item.classroom.section,
        item.instructor.name,
      ]
        .join(" ")
        .toLowerCase()
        .includes(keyword),
  );
});

async function loadClasses(): Promise<void> {
  isLoading.value = true;
  errorMessage.value = "";

  const result =
    await listStudentClasses();

  if (
    result.error
    || !result.data
  ) {
    errorMessage.value =
      result.error
      || "Unable to load your classes.";

    isLoading.value = false;
    return;
  }

  classes.value =
    result.data.classes;

  isLoading.value = false;
}

onMounted(
  loadClasses,
);
</script>

<template>
  <div class="page-stack">
    <PageHeader
      eyebrow="Learning spaces"
      title="My classes"
      description="View joined classes and pending membership requests."
    >
      <template #actions>
        <UButton
          to="/student/classes/join"
          icon="i-lucide-plus"
        >
          Join Class
        </UButton>
      </template>
    </PageHeader>

    <UAlert
      v-if="errorMessage"
      color="error"
      variant="soft"
      title="Classes could not be loaded"
      :description="errorMessage"
    />

    <UCard>
      <div class="grid gap-3 lg:grid-cols-[1fr_auto]">
        <UInput
          v-model="query"
          icon="i-lucide-search"
          placeholder="Search class or instructor"
          class="w-full"
        />

        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-refresh-cw"
          :loading="isLoading"
          @click="loadClasses"
        >
          Refresh
        </UButton>
      </div>
    </UCard>

    <div
      v-if="isLoading"
      class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
    >
      <USkeleton
        v-for="number in 3"
        :key="number"
        class="h-80 rounded-xl"
      />
    </div>

    <EmptyPanel
      v-else-if="filteredClasses.length === 0"
      icon="i-lucide-book-open"
      title="No classes yet"
      description="Enter a class code from your instructor to request membership."
    >
      <template #actions>
        <UButton
          to="/student/classes/join"
          icon="i-lucide-plus"
        >
          Join Class
        </UButton>
      </template>
    </EmptyPanel>

    <div
      v-else
      class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
    >
      <UCard
        v-for="item in filteredClasses"
        :key="item.membership.id"
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
                  name="i-lucide-school"
                  class="size-5"
                />
              </div>

              <UBadge
                color="neutral"
                variant="soft"
              >
                Class
              </UBadge>
            </div>

            <StatusPill
              :status="
                item.membership.membership_status === 'pending'
                  ? 'Pending approval'
                  : item.classroom.status
              "
            />
          </div>

          <NuxtLink
            v-if="item.membership.membership_status !== 'pending'"
            :to="`/student/classes/${item.classroom.id}`"
            class="group mt-6 block rounded-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/30"
            :aria-label="`Open ${item.classroom.name}`"
          >
            <h2 class="line-clamp-2 text-xl font-black leading-tight text-highlighted transition group-hover:text-primary">
              {{ item.classroom.name }}
            </h2>

            <p class="mt-2 text-sm font-medium text-muted">
              {{ item.classroom.subject_code }}
              ·
              {{ item.classroom.section }}
            </p>
          </NuxtLink>

          <div
            v-else
            class="mt-6"
          >
            <h2 class="line-clamp-2 text-xl font-black leading-tight text-highlighted">
              {{ item.classroom.name }}
            </h2>

            <p class="mt-2 text-sm font-medium text-muted">
              {{ item.classroom.subject_code }}
              ·
              {{ item.classroom.section }}
            </p>
          </div>
        </div>

        <div class="p-5">
          <div class="flex min-h-7 flex-wrap gap-2">
            <UBadge
              color="neutral"
              variant="soft"
              icon="i-lucide-user-round"
            >
              {{ item.instructor.name }}
            </UBadge>

            <UBadge
              color="neutral"
              variant="soft"
              icon="i-lucide-calendar-range"
            >
              {{ item.classroom.school_year }}
              ·
              {{ item.classroom.semester }}
            </UBadge>
          </div>

          <UAlert
            v-if="item.membership.membership_status === 'pending'"
            class="mt-5"
            color="warning"
            variant="soft"
            title="Awaiting approval"
            description="The instructor must approve your membership before the class can be opened."
          />

          <UButton
            v-else
            :to="`/student/classes/${item.classroom.id}`"
            block
            variant="soft"
            trailing-icon="i-lucide-arrow-right"
            class="mt-5"
          >
            Open Class
          </UButton>
        </div>
      </UCard>
    </div>
  </div>
</template>
