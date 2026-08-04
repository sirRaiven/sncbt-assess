<script setup lang="ts">
import type {
  StudentClassListItem,
} from "~/types/classroom";

definePageMeta({
  layout: "student",
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
      class="grid gap-5 md:grid-cols-2 xl:grid-cols-3"
    >
      <USkeleton
        v-for="number in 3"
        :key="number"
        class="h-72 rounded-xl"
      />
    </div>

    <EmptyPanel
      v-else-if="
        filteredClasses.length === 0
      "
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
      class="grid gap-5 md:grid-cols-2 xl:grid-cols-3"
    >
      <UCard
        v-for="item in filteredClasses"
        :key="item.membership.id"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex size-11 items-center justify-center rounded-xl bg-primary/10 font-black text-primary">
            {{
              item.classroom
                .subject_code
                .slice(0, 2)
            }}
          </div>

          <StatusPill
            :status="
              item.membership
                .membership_status
                === 'pending'
                ? 'Pending approval'
                : item.classroom.status
            "
          />
        </div>

        <h2 class="mt-5 font-black text-highlighted">
          {{ item.classroom.name }}
        </h2>

        <p class="mt-1 text-sm text-muted">
          {{ item.classroom.subject_code }}
          ·
          {{ item.classroom.section }}
        </p>

        <p class="mt-3 text-xs text-muted">
          {{ item.instructor.name }}
        </p>

        <p class="mt-1 text-xs text-muted">
          {{ item.classroom.school_year }}
          ·
          {{ item.classroom.semester }}
        </p>

        <UAlert
          v-if="
            item.membership
              .membership_status
              === 'pending'
          "
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
          class="mt-5"
        >
          Open Class
        </UButton>
      </UCard>
    </div>
  </div>
</template>
