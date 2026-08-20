<script setup lang="ts">
import type {
  InstructorClassroom,
} from "~/types/classroom";

import type {
  AppBreadcrumbItem,
} from "~/types/navigation";

definePageMeta({
  layout: "instructor",
});

const route = useRoute();

const classroomId = computed(
  () => String(route.params.id),
);

const isWorkspaceRoute = computed(
  () => !route.path.endsWith("/edit"),
);

const activeSection = computed<"assessments" | "students">(
  () => route.path.includes("/students")
    ? "students"
    : "assessments",
);

const classBreadcrumbs = computed<AppBreadcrumbItem[]>(
  () => [
    {
      label: "Overview",
      to: "/instructor/dashboard",
      icon: "i-lucide-layout-dashboard",
    },
    {
      label: "My Classes",
      to: "/instructor/classes",
    },
    {
      label:
        classroom.value?.name
        || "Class",
      to:
        `/instructor/classes/${classroomId.value}`,
    },
    {
      label:
        activeSection.value === "students"
          ? "Students"
          : "Assessments",
    },
  ],
);

const {
  getInstructorClass,
} = useClassrooms();

const classroom =
  ref<InstructorClassroom | null>(null);
const isLoading = ref(true);
const errorMessage = ref("");

async function refreshClass(): Promise<void> {
  if (!isWorkspaceRoute.value) {
    return;
  }

  isLoading.value = !classroom.value;
  errorMessage.value = "";

  const result =
    await getInstructorClass(
      classroomId.value,
    );

  if (
    result.error
    || !result.data
  ) {
    errorMessage.value =
      result.error
      || "We couldn't load this class right now.";
    isLoading.value = false;
    return;
  }

  classroom.value =
    result.data.classroom;
  isLoading.value = false;
}

provideInstructorClassShell({
  classroomId,
  classroom,
  isLoading,
  errorMessage,
  refreshClass,
});

watch(
  classroomId,
  () => {
    classroom.value = null;

    if (isWorkspaceRoute.value) {
      void refreshClass();
    }
  },
);

watch(
  isWorkspaceRoute,
  (workspace) => {
    if (workspace) {
      void refreshClass();
    }
  },
);

onMounted(() => {
  if (isWorkspaceRoute.value) {
    void refreshClass();
  }
});
</script>

<template>
  <div
    v-if="isWorkspaceRoute"
    class="page-stack"
  >
    <AppBreadcrumbs
      :items="classBreadcrumbs"
    />

    <UAlert
      v-if="errorMessage"
      color="error"
      variant="soft"
      title="Class could not be loaded"
      :description="errorMessage"
    />

    <div
      v-if="isLoading"
      class="space-y-5"
      aria-label="Loading class"
    >
      <USkeleton class="h-44 rounded-2xl sm:h-48" />
      <USkeleton class="h-12 rounded-xl" />

      <div class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <USkeleton class="h-72 rounded-xl" />
        <USkeleton class="h-72 rounded-xl" />
      </div>
    </div>

    <template v-else-if="classroom">
      <section class="relative overflow-hidden rounded-xl bg-gradient-to-r from-brand-900 via-brand-700 to-indigo-700 p-6 text-white shadow-xl shadow-primary/15 ring-1 ring-white/10 sm:p-8 dark:shadow-black/25">
        <div class="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-white/10 blur-3xl" />
        <div class="pointer-events-none absolute -bottom-24 left-1/3 size-64 rounded-full bg-cyan-300/10 blur-3xl" />

        <div class="absolute right-4 top-4 z-10 sm:right-6 sm:top-6">
          <UPopover
            :content="{
              align: 'end',
              side: 'bottom',
              sideOffset: 8,
            }"
          >
            <UButton
              type="button"
              color="neutral"
              variant="solid"
              size="sm"
              square
              icon="i-lucide-info"
              aria-label="View class information"
              class="rounded-full bg-slate-950 text-white shadow-sm ring-1 ring-white/15 hover:bg-slate-900 focus-visible:ring-2 focus-visible:ring-white/80"
            />

            <template #content>
              <div class="w-[min(22rem,calc(100vw-2rem))] p-4 sm:p-5">
                <div class="flex items-start gap-3">
                  <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <UIcon
                      name="i-lucide-info"
                      class="size-4"
                    />
                  </div>

                  <div class="min-w-0">
                    <h2 class="font-bold text-highlighted">
                      Class information
                    </h2>
                    <p class="mt-1 text-xs leading-5 text-muted">
                      Subject and academic details for this classroom.
                    </p>
                  </div>
                </div>

                <dl class="mt-4 grid grid-cols-2 gap-x-4 gap-y-4">
                  <div>
                    <dt class="text-xs text-muted">
                      Subject code
                    </dt>
                    <dd class="mt-1 text-sm font-semibold text-highlighted">
                      {{ classroom.subject_code }}
                    </dd>
                  </div>

                  <div>
                    <dt class="text-xs text-muted">
                      Section
                    </dt>
                    <dd class="mt-1 text-sm font-semibold text-highlighted">
                      {{ classroom.section }}
                    </dd>
                  </div>

                  <div>
                    <dt class="text-xs text-muted">
                      School year
                    </dt>
                    <dd class="mt-1 text-sm font-semibold text-highlighted">
                      {{ classroom.school_year }}
                    </dd>
                  </div>

                  <div>
                    <dt class="text-xs text-muted">
                      Semester
                    </dt>
                    <dd class="mt-1 text-sm font-semibold text-highlighted">
                      {{ classroom.semester }}
                    </dd>
                  </div>
                </dl>

                <USeparator class="my-4" />

                <div>
                  <p class="text-xs font-medium text-muted">
                    Description
                  </p>
                  <p class="mt-1.5 whitespace-pre-line text-sm leading-6 text-highlighted">
                    {{
                      classroom.description
                      || "No class description was provided."
                    }}
                  </p>
                </div>
              </div>
            </template>
          </UPopover>
        </div>

        <div class="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div class="min-w-0 pr-12 sm:pr-14 lg:pr-0">
            <div class="flex flex-wrap items-center gap-2">
              <UBadge
                color="neutral"
                variant="soft"
                class="bg-white/10 text-blue-50"
              >
                {{ classroom.subject_code }}
              </UBadge>

              <UBadge
                color="neutral"
                variant="soft"
                class="bg-white/10 text-blue-50"
              >
                {{ classroom.section }}
              </UBadge>

              <StatusPill
                :status="classroom.status"
              />
            </div>

            <h1 class="mt-4 text-2xl font-black tracking-tight sm:text-3xl">
              {{ classroom.name }}
            </h1>

            <p class="mt-2 text-sm text-blue-100">
              {{ classroom.school_year }}
              ·
              {{ classroom.semester }}
            </p>
          </div>

          <div class="flex shrink-0 justify-end lg:items-end">
            <UButton
              :to="`/instructor/classes/${classroom.id}/edit`"
              color="neutral"
              variant="solid"
              icon="i-lucide-pencil"
              aria-label="Edit class details"
              class="w-fit bg-slate-950 text-white shadow-sm ring-1 ring-white/10 hover:bg-slate-900 focus-visible:ring-2 focus-visible:ring-white/80"
            >
              Edit Class
            </UButton>
          </div>
        </div>
      </section>

      <InstructorClassNavigation
        :classroom-id="classroom.id"
        :active="activeSection"
        :student-count="classroom.memberCounts.active"
        :pending-count="classroom.memberCounts.pending"
      />

      <div class="min-h-[14rem]">
        <NuxtPage
          :transition="{
            name: 'class-content',
            mode: 'out-in',
          }"
        />
      </div>
    </template>
  </div>

  <NuxtPage v-else />
</template>

<style>
.class-content-enter-active,
.class-content-leave-active {
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}

.class-content-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.class-content-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@media (prefers-reduced-motion: reduce) {
  .class-content-enter-active,
  .class-content-leave-active {
    transition: none;
  }
}
</style>
