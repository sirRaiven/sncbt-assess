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
  archiveClass,
} = useClassrooms();

const classes =
  ref<InstructorClassroom[]>([]);

const isLoading = ref(true);
const errorMessage = ref("");
const query = ref("");
const busyClassroomId =
  ref<string | null>(null);
const archiveModalOpen =
  ref(false);
const pendingArchiveClass =
  ref<InstructorClassroom | null>(
    null,
  );

const filteredClasses = computed(() => {
  const keyword =
    query.value
      .trim()
      .toLowerCase();

  return classes.value.filter(
    (classroom) => {
      if (
        classroom.status
        === "archived"
      ) {
        return false;
      }

      return (
        !keyword
        || [
          classroom.name,
          classroom.subject_code,
          classroom.section,
        ]
          .join(" ")
          .toLowerCase()
          .includes(keyword)
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

function requestArchiveClass(
  classroom: InstructorClassroom,
): void {
  pendingArchiveClass.value =
    classroom;
  archiveModalOpen.value =
    true;
}

async function confirmArchiveClass(): Promise<void> {
  if (!pendingArchiveClass.value) {
    return;
  }

  const classroom =
    pendingArchiveClass.value;

  busyClassroomId.value =
    classroom.id;

  const result =
    await archiveClass(
      classroom.id,
    );

  if (
    result.error
    || !result.data
  ) {
    toast.add({
      title:
        "Class could not be archived",
      description:
        result.error
        || "The class could not be archived.",
      color:
        "error",
    });

    busyClassroomId.value =
      null;
    return;
  }

  toast.add({
    title:
      "Class archived",
    description:
      `${classroom.name} and its assigned assessment access are now archived.`,
    color:
      "success",
  });

  archiveModalOpen.value =
    false;
  pendingArchiveClass.value =
    null;

  await loadClasses();

  busyClassroomId.value =
    null;
}

function classroomMenuItems(
  classroom: InstructorClassroom,
): DropdownMenuItem[][] {
  const navigationItems:
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
    navigationItems.push({
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

  const archiveItems:
    DropdownMenuItem[] = [
      {
        label:
          "Archive",
        icon:
          "i-lucide-archive",
        color:
          "warning",
        disabled:
          busyClassroomId.value
          === classroom.id,
        onSelect: () => {
          requestArchiveClass(
            classroom,
          );
        },
      },
    ];

  return [
    navigationItems,
    archiveItems,
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
          to="/instructor/archive?section=classes"
          color="neutral"
          variant="outline"
          icon="i-lucide-archive"
        >
          Open Archive
        </UButton>

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
      <div class="grid gap-3 lg:grid-cols-[1fr_auto]">
        <UInput
          v-model="query"
          icon="i-lucide-search"
          placeholder="Search subject, code, or section"
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
      description="Create your first class or adjust the search. Archived classes are available in Archive."
    >
      <template #actions>
        <UButton
          to="/instructor/archive?section=classes"
          color="neutral"
          variant="outline"
          icon="i-lucide-archive"
        >
          Open Archive
        </UButton>

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
      class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
    >
      <UCard
        v-for="classroom in filteredClasses"
        :key="classroom.id"
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

            <div class="flex items-center gap-1">
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
                  icon="i-lucide-ellipsis-vertical"
                  :aria-label="`Class actions for ${classroom.name}`"
                />
              </UDropdownMenu>
            </div>
          </div>

          <NuxtLink
            :to="`/instructor/classes/${classroom.id}`"
            class="group mt-6 block rounded-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/30"
            :aria-label="`Open ${classroom.name}`"
          >
            <h2 class="line-clamp-2 text-xl font-black leading-tight text-highlighted transition group-hover:text-primary">
              {{ classroom.name }}
            </h2>

            <p class="mt-2 text-sm font-medium text-muted">
              {{ classroom.subject_code }}
              ·
              {{ classroom.section }}
            </p>
          </NuxtLink>
        </div>

        <div class="p-5">
          <div class="flex min-h-7 flex-wrap gap-2">
            <UBadge
              color="neutral"
              variant="soft"
              icon="i-lucide-calendar-range"
            >
              {{ classroom.school_year }}
              ·
              {{ classroom.semester }}
            </UBadge>
          </div>

          <div class="mt-5 grid grid-cols-3 gap-3">
            <div class="rounded-xl bg-elevated p-3">
              <div class="flex items-center gap-2 text-muted">
                <UIcon
                  name="i-lucide-users"
                  class="size-4"
                />
                <span class="text-xs">Students</span>
              </div>
              <p class="mt-2 text-lg font-black text-highlighted">
                {{ classroom.memberCounts.active }}
              </p>
            </div>

            <div class="rounded-xl bg-elevated p-3">
              <div class="flex items-center gap-2 text-muted">
                <UIcon
                  name="i-lucide-user-round-clock"
                  class="size-4"
                />
                <span class="text-xs">Pending</span>
              </div>
              <p class="mt-2 text-lg font-black text-highlighted">
                {{ classroom.memberCounts.pending }}
              </p>
            </div>

            <div class="min-w-0 rounded-xl bg-elevated p-3">
              <div class="flex items-center gap-2 text-muted">
                <UIcon
                  :name="classroom.join_enabled ? 'i-lucide-key-round' : 'i-lucide-lock-keyhole'"
                  class="size-4"
                />
                <span class="text-xs">Code</span>
              </div>
              <p
                class="mt-2 truncate font-mono text-sm font-black text-highlighted"
                :title="classroom.join_enabled ? classroom.join_code : 'Disabled'"
              >
                {{
                  classroom.join_enabled
                    ? classroom.join_code
                    : "Disabled"
                }}
              </p>
            </div>
          </div>
        </div>
      </UCard>
    </div>

    <ConfirmationModal
      v-model:open="
        archiveModalOpen
      "
      title="Archive class?"
      :description="
        pendingArchiveClass
          ? `Archive ${pendingArchiveClass.name}? New joins will stop, assigned assessment access will close, and any Student currently taking an assessment in this class will be submitted automatically. Assessment records and Student results are kept.`
          : 'Archive this class and close its assigned assessment access?'
      "
      confirm-label="Archive Class"
      confirm-color="warning"
      icon="i-lucide-archive"
      :loading="
        Boolean(
          busyClassroomId,
        )
      "
      @confirm="
        confirmArchiveClass
      "
    />
  </div>
</template>
