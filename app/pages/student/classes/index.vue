<script setup lang="ts">
import type {
  DropdownMenuItem,
} from "@nuxt/ui";

import type {
  InstructorClassroom,
} from "~/types/classroom";

definePageMeta({
  layout: "instructor",
});

useSeoMeta({
  title: "My classes",
});

const toast = useToast();

const {
  listInstructorClasses,
} = useClassrooms();

const classes =
  ref<InstructorClassroom[]>([]);

const isLoading = ref(true);
const errorMessage = ref("");
const query = ref("");
const statusFilter = ref(
  "All statuses",
);

const filteredClasses = computed(() => {
  const keyword =
    query.value
      .trim()
      .toLowerCase();

  return classes.value.filter(
    (classroom) => {
      const matchesQuery =
        !keyword
        || [
          classroom.name,
          classroom.subject_code,
          classroom.section,
        ]
          .join(" ")
          .toLowerCase()
          .includes(keyword);

      const matchesStatus =
        statusFilter.value
          === "All statuses"
        || classroom.status
          === statusFilter.value
            .toLowerCase();

      return (
        matchesQuery
        && matchesStatus
      );
    },
  );
});

async function loadClasses(): Promise<void> {
  isLoading.value = true;
  errorMessage.value = "";

  const result =
    await listInstructorClasses();

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
    result.data.classrooms;

  isLoading.value = false;
}

function copyCode(
  code: string,
): void {
  void navigator.clipboard
    .writeText(code);

  toast.add({
    title:
      "Class code copied",
    description:
      code,
    color:
      "success",
  });
}

function classroomMenuItems(
  classroom: InstructorClassroom,
): DropdownMenuItem[][] {
  const items:
    DropdownMenuItem[] = [
      {
        label:
          "Open Class",
        icon:
          "i-lucide-arrow-up-right",
        to:
          `/instructor/classes/${classroom.id}`,
      },
    ];

  if (classroom.join_enabled) {
    items.push({
      label:
        "Copy Class Code",
      icon:
        "i-lucide-copy",
      onSelect: () => {
        copyCode(
          classroom.join_code,
        );
      },
    });
  }

  return [
    items,
  ];
}

onMounted(
  loadClasses,
);
</script>

<template>
  <div class="page-stack">
    <PageHeader
      eyebrow="Classroom management"
      title="My classes"
      description="Create classes, manage enrollment codes, and review student membership."
    >
      <template #actions>
        <UButton
          to="/instructor/classes/create"
          icon="i-lucide-plus"
        >
          Create Class
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
      <div class="grid gap-3 lg:grid-cols-[1fr_220px_auto]">
        <UInput
          v-model="query"
          icon="i-lucide-search"
          placeholder="Search subject, code, or section"
          class="w-full"
        />

        <USelect
          v-model="statusFilter"
          :items="[
            'All statuses',
            'Active',
            'Archived',
          ]"
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
        class="h-80 rounded-xl"
      />
    </div>

    <EmptyPanel
      v-else-if="
        filteredClasses.length === 0
      "
      icon="i-lucide-school"
      title="No classes found"
      description="Create your first class or adjust the current filters."
    >
      <template #actions>
        <UButton
          to="/instructor/classes/create"
          icon="i-lucide-plus"
        >
          Create Class
        </UButton>
      </template>
    </EmptyPanel>

    <div
      v-else
      class="grid gap-5 md:grid-cols-2 xl:grid-cols-3"
    >
      <UCard
        v-for="classroom in filteredClasses"
        :key="classroom.id"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <UIcon
              name="i-lucide-school"
              class="size-5"
            />
          </div>

          <div class="flex items-center gap-2">
            <StatusPill
              :status="classroom.status"
            />

            <UDropdownMenu
              :items="classroomMenuItems(classroom)"
              :content="{
                align: 'end',
                side: 'bottom',
                sideOffset: 6,
              }"
              :ui="{
                content: 'w-52',
                item: 'min-h-10',
                itemLabel: 'font-semibold',
              }"
            >
              <UButton
                type="button"
                color="neutral"
                variant="ghost"
                size="sm"
                square
                icon="i-heroicons-ellipsis-horizontal"
                :aria-label="`Class actions for ${classroom.name}`"
              />
            </UDropdownMenu>
          </div>
        </div>

        <NuxtLink
          :to="`/instructor/classes/${classroom.id}`"
          class="group mt-5 block rounded-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/30"
          :aria-label="`Open ${classroom.name}`"
        >
          <h2 class="text-lg font-black text-highlighted transition group-hover:text-primary">
            {{ classroom.name }}
          </h2>

          <p class="mt-1 text-sm text-muted">
            {{ classroom.subject_code }}
            ·
            {{ classroom.section }}
          </p>

          <p class="mt-2 text-xs text-muted">
            {{ classroom.school_year }}
            ·
            {{ classroom.semester }}
          </p>
        </NuxtLink>

        <div class="mt-5 grid grid-cols-3 gap-3">
          <div class="rounded-lg bg-elevated p-3">
            <p class="text-xs text-muted">
              Students
            </p>
            <p class="mt-1 text-xl font-black text-highlighted">
              {{ classroom.memberCounts.active }}
            </p>
          </div>

          <div class="rounded-lg bg-elevated p-3">
            <p class="text-xs text-muted">
              Pending
            </p>
            <p class="mt-1 text-xl font-black text-highlighted">
              {{ classroom.memberCounts.pending }}
            </p>
          </div>

          <div class="rounded-lg bg-elevated p-3">
            <p class="text-xs text-muted">
              Code
            </p>
            <p class="mt-1 truncate font-mono text-xs font-black text-highlighted">
              {{
                classroom.join_enabled
                  ? classroom.join_code
                  : "Disabled"
              }}
            </p>
          </div>
        </div>

      </UCard>
    </div>
  </div>
</template>
