<script setup lang="ts">
import type {
  Classroom,
  StudentClassMembership,
  StudentClassmate,
} from "~/types/classroom";

import type {
  StudentAssessmentDelivery,
} from "~/types/assessment-delivery";

definePageMeta({
  layout:
    "student",
  middleware: [
    "student",
  ],
});

useSeoMeta({
  title:
    "Class Details",
});

const route =
  useRoute();

const toast =
  useToast();

const classroomId =
  computed(
    () =>
      String(
        route.params.id,
      ),
  );

const activeSection =
  computed<
    "assessments"
    | "classmates"
  >(
    () =>
      route.query.view
      === "classmates"
        ? "classmates"
        : "assessments",
  );

const {
  getStudentClass,
  listClassmates,
  leaveClass,
} = useClassrooms();

const {
  listStudentDeliveries,
} = useAssessmentDelivery();

const classroom =
  ref<Classroom | null>(
    null,
  );

const membership =
  ref<StudentClassMembership | null>(
    null,
  );

const instructorName =
  ref("");

const classmates =
  ref<StudentClassmate[]>(
    [],
  );

const isLoadingClassmates =
  ref(false);

const classmatesError =
  ref("");

const classmateQuery =
  ref("");

const filteredClassmates =
  computed(
    () => {
      const keyword =
        classmateQuery.value
          .trim()
          .toLowerCase();

      if (!keyword) {
        return classmates.value;
      }

      return classmates.value.filter(
        (classmate) =>
          classmate.name
            .toLowerCase()
            .includes(
              keyword,
            ),
      );
    },
  );

const deliveries =
  ref<StudentAssessmentDelivery[]>(
    [],
  );

const isLoading =
  ref(true);

const isLeaving =
  ref(false);

const errorMessage =
  ref("");

const leaveModalOpen =
  ref(false);

function formatDate(
  value: string | null,
): string {
  if (!value) {
    return "Not recorded";
  }

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

function deliveryStatus(
  delivery:
    StudentAssessmentDelivery,
): string {
  if (
    delivery.attempt?.status
    === "in_progress"
  ) {
    return "in_progress";
  }

  if (
    delivery.attempt
    && [
      "submitted",
      "auto_submitted",
    ].includes(
      delivery.attempt.status,
    )
  ) {
    return delivery.attempt.status;
  }

  return delivery.status;
}

function deliveryAction(
  delivery:
    StudentAssessmentDelivery,
): {
  label: string;
  route: string;
  enabled: boolean;
} {
  if (
    delivery.canResume
  ) {
    return {
      label:
        "Continue Assessment",
      route:
        `/student/assessments/${delivery.assignmentId}/play`,
      enabled:
        true,
    };
  }

  if (
    delivery.canViewResult
  ) {
    return {
      label:
        "View Result",
      route:
        `/student/results/${delivery.assignmentId}`,
      enabled:
        true,
    };
  }

  if (
    delivery.canStart
  ) {
    return {
      label:
        "Start Assessment",
      route:
        `/student/assessments/${delivery.assignmentId}/instructions`,
      enabled:
        true,
    };
  }

  return {
    label:
      delivery.status
      === "upcoming"
        ? "View Schedule"
        : "View Details",
    route:
      `/student/assessments/${delivery.assignmentId}/instructions`,
    enabled:
      true,
  };
}

function classmateInitials(
  name: string,
): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map(
      (part) =>
        part.charAt(0),
    )
    .slice(
      0,
      2,
    )
    .join("")
    .toUpperCase()
    || "ST";
}

async function loadClassmates():
  Promise<void> {
  isLoadingClassmates.value =
    true;

  classmatesError.value =
    "";

  const result =
    await listClassmates(
      classroomId.value,
    );

  if (
    result.error
    || !result.data
  ) {
    classmates.value =
      [];

    classmatesError.value =
      result.error
      || "Unable to load classmates.";

    isLoadingClassmates.value =
      false;

    return;
  }

  classmates.value =
    result.data.classmates;

  isLoadingClassmates.value =
    false;
}

async function loadClass():
  Promise<void> {
  isLoading.value =
    true;

  errorMessage.value =
    "";

  const classResult =
    await getStudentClass(
      classroomId.value,
    );

  if (
    classResult.error
    || !classResult.data
    || classResult.data
      .classroom.status
      !== "active"
  ) {
    isLoading.value =
      false;

    toast.add({
      title:
        "Class unavailable",
      description:
        "This class has been archived and is no longer available in My Classes.",
      color:
        "neutral",
    });

    await navigateTo(
      "/student/classes",
      {
        replace:
          true,
      },
    );

    return;
  }

  const [
    deliveryResult,
  ] = await Promise.all([
    listStudentDeliveries(
      classroomId.value,
    ),
    loadClassmates(),
  ]);

  if (
    deliveryResult.error
    || !deliveryResult.data
  ) {
    errorMessage.value =
      deliveryResult.error
      || "Unable to load the class assessments.";

    isLoading.value =
      false;

    return;
  }

  classroom.value =
    classResult.data.classroom;

  membership.value =
    classResult.data.membership;

  instructorName.value =
    classResult.data
      .instructor.name;

  deliveries.value =
    deliveryResult.data
      .deliveries;

  isLoading.value =
    false;
}

async function leave():
  Promise<void> {
  if (!classroom.value) {
    return;
  }

  isLeaving.value =
    true;

  const result =
    await leaveClass(
      classroom.value.id,
    );

  if (
    result.error
    || !result.data
  ) {
    toast.add({
      title:
        "Unable to leave class",
      description:
        result.error
        || "The class membership could not be updated.",
      color:
        "error",
    });

    isLeaving.value =
      false;

    return;
  }

  leaveModalOpen.value =
    false;

  toast.add({
    title:
      "Class left",
    description:
      result.data.message,
    color:
      "success",
  });

  await navigateTo(
    "/student/classes",
  );
}

onMounted(
  loadClass,
);
</script>

<template>
  <div class="page-stack">
    <PortalBackButton
      fallback-to="/student/classes"
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
    >
      <USkeleton class="h-44 rounded-xl" />
      <USkeleton class="h-96 rounded-xl" />
    </div>

    <template
      v-else-if="
        classroom
        && membership
      "
    >
      <section class="relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-800 via-blue-700 to-violet-700 p-6 text-white shadow-xl shadow-primary/15 ring-1 ring-white/10 sm:p-8 dark:shadow-black/25">
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
                      Instructor, subject, and academic details for this classroom.
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
                    Instructor
                  </p>

                  <p class="mt-1.5 text-sm font-semibold text-highlighted">
                    {{ instructorName }}
                  </p>
                </div>

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

        <div class="relative min-w-0 pr-12 sm:pr-14">
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
          </div>

          <h1 class="mt-4 text-2xl font-black tracking-tight sm:text-3xl">
            {{ classroom.name }}
          </h1>

          <p class="mt-2 text-sm text-blue-100">
            <span class="font-semibold text-white">
              Instructor:
            </span>
            {{ instructorName }}
            ·
            {{ classroom.school_year }}
            ·
            {{ classroom.semester }}
          </p>
        </div>
      </section>

      <StudentClassNavigation
        :classroom-id="classroom.id"
        :active="activeSection"
        :classmate-count="classmates.length"
      />

      <div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <div class="space-y-5">
          <template
            v-if="
              activeSection
              === 'assessments'
            "
          >
          <UCard>
            <template #header>
              <h2 class="font-black text-highlighted">
                Class overview
              </h2>
            </template>

            <p class="text-sm leading-6 text-muted">
              {{
                classroom.description
                || "No class description was provided."
              }}
            </p>
          </UCard>

          <UCard>
            <template #header>
              <div>
                <h2 class="font-black text-highlighted">
                  Class assignments
                </h2>

                <p class="mt-1 text-sm text-muted">
                  Assignments become available automatically based on the schedule set by your instructor.
                </p>
              </div>
            </template>

            <EmptyPanel
              v-if="
                deliveries.length
                === 0
              "
              icon="i-lucide-clipboard-list"
              title="No assigned assessments"
              description="Published and scheduled assessments for this class will appear here."
            />

            <div
              v-else
              class="space-y-4"
            >
              <article
                v-for="delivery in deliveries"
                :key="delivery.assignmentId"
                class="rounded-xl border border-default p-4"
              >
                <div class="flex flex-col gap-4 lg:flex-row lg:items-center">
                  <div class="flex min-w-0 flex-1 items-start gap-3">
                    <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <UIcon
                        name="i-lucide-clipboard-check"
                        class="size-5"
                      />
                    </div>

                    <div class="min-w-0">
                      <div class="flex flex-wrap items-center gap-2">
                        <h3 class="font-black text-highlighted">
                          {{ delivery.title }}
                        </h3>

                        <StatusPill
                          :status="
                            deliveryStatus(
                              delivery,
                            )
                          "
                        />
                      </div>

                      <p class="mt-1 text-sm text-muted">
                        {{ delivery.assessmentType }}
                        ·
                        {{ delivery.questionCount }}
                        questions
                        ·
                        {{ delivery.totalPoints }}
                        points
                      </p>

                      <p class="mt-2 text-xs text-muted">
                        Opens:
                        {{
                          formatDate(
                            delivery.startsAt,
                          )
                        }}
                        ·
                        Closes:
                        {{
                          formatDate(
                            delivery.endsAt,
                          )
                        }}
                      </p>
                    </div>
                  </div>

                  <UButton
                    :to="
                      deliveryAction(
                        delivery,
                      ).route
                    "
                    :disabled="
                      !deliveryAction(
                        delivery,
                      ).enabled
                    "
                    :variant="
                      delivery.canStart
                      || delivery.canResume
                        ? 'solid'
                        : 'outline'
                    "
                    :color="
                      delivery.canStart
                      || delivery.canResume
                        ? 'primary'
                        : 'neutral'
                    "
                  >
                    {{
                      deliveryAction(
                        delivery,
                      ).label
                    }}
                  </UButton>
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
                      Saved progress
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
              </article>
            </div>
          </UCard>
          </template>

          <template v-else>
            <div class="space-y-5">
              <section
                class="flex flex-col gap-4 rounded-2xl border border-primary/10 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-5 py-4 shadow-sm shadow-primary/5 sm:flex-row sm:items-center sm:justify-between dark:border-primary/15 dark:from-primary/15 dark:via-primary/5"
              >
                <div>
                  <h2 class="text-2xl font-black tracking-tight text-highlighted">
                    Classmates
                  </h2>

                  <p class="mt-1 text-sm text-muted">
                    Students who are currently enrolled in this class.
                  </p>
                </div>

                <div class="flex w-full gap-2 sm:w-auto">
                  <UInput
                    v-model="classmateQuery"
                    icon="i-lucide-search"
                    placeholder="Search classmates"
                    aria-label="Search classmates"
                    class="w-full sm:w-72"
                  />

                  <UButton
                    type="button"
                    color="neutral"
                    variant="outline"
                    icon="i-lucide-refresh-cw"
                    square
                    :loading="isLoadingClassmates"
                    aria-label="Refresh classmates"
                    @click="loadClassmates"
                  />
                </div>
              </section>

              <UAlert
                v-if="classmatesError"
                color="warning"
                variant="soft"
                title="Classmates unavailable"
                :description="classmatesError"
              />

              <div
                v-if="isLoadingClassmates"
                class="overflow-hidden rounded-2xl border border-primary/10 bg-default/95 shadow-lg shadow-primary/5 ring-1 ring-primary/5 dark:border-primary/15 dark:bg-default/90 dark:shadow-black/15"
                aria-label="Loading classmates"
                aria-busy="true"
              >
                <div class="flex items-center justify-between gap-3 border-b border-default bg-primary/5 px-4 py-4 sm:px-5 dark:bg-primary/10">
                  <USkeleton class="h-5 w-28 rounded" />
                  <USkeleton class="h-5 w-10 rounded-full" />
                </div>

                <div class="divide-y divide-default">
                  <div
                    v-for="number in 6"
                    :key="number"
                    class="flex items-center gap-3 px-4 py-3.5 sm:px-5"
                  >
                    <USkeleton class="size-10 shrink-0 rounded-full" />

                    <div class="min-w-0 flex-1 space-y-2">
                      <USkeleton
                        class="h-4 rounded"
                        :class="
                          number % 2
                            ? 'w-40'
                            : 'w-52'
                        "
                      />
                      <USkeleton class="h-3 w-24 rounded" />
                    </div>
                  </div>
                </div>
              </div>

              <div
                v-else
                class="overflow-hidden rounded-2xl border border-default bg-default"
              >
                <div class="flex items-center justify-between gap-3 border-b border-primary/10 bg-primary/5 px-4 py-3.5 sm:px-5 dark:bg-primary/10">
                  <h3 class="font-bold text-highlighted">
                    Classmates
                  </h3>

                  <UBadge
                    color="neutral"
                    variant="soft"
                    size="sm"
                  >
                    {{ classmates.length }}
                  </UBadge>
                </div>

                <EmptyPanel
                  v-if="classmates.length === 0"
                  class="m-4"
                  icon="i-lucide-users"
                  title="No classmates yet"
                  description="You are currently the only active Student in this class."
                />

                <EmptyPanel
                  v-else-if="filteredClassmates.length === 0"
                  class="m-4"
                  icon="i-lucide-search-x"
                  title="No matching classmates"
                  description="Try a different classmate name."
                />

                <TransitionGroup
                  v-else
                  name="classmate-row"
                  tag="ul"
                  appear
                  aria-label="Classmates"
                  class="divide-y divide-default"
                >
                  <li
                    v-for="(classmate, index) in filteredClassmates"
                    :key="`${classmate.name}-${classmate.avatarUrl || 'initials'}`"
                    class="classmate-row flex min-w-0 items-center gap-3 px-4 py-3.5 transition-colors hover:bg-primary/5 sm:px-5"
                    :style="{
                      '--classmate-delay':
                        `${Math.min(index, 8) * 35}ms`,
                    }"
                  >
                    <UAvatar
                      :src="classmate.avatarUrl || undefined"
                      :text="classmateInitials(classmate.name)"
                      :alt="classmate.name"
                      size="md"
                      class="shrink-0 ring-1 ring-primary/10"
                    />

                    <div class="min-w-0 flex-1">
                      <p class="truncate font-semibold text-highlighted">
                        {{ classmate.name }}
                      </p>

                      <p class="mt-0.5 text-xs text-muted">
                        Classmate
                      </p>
                    </div>
                  </li>
                </TransitionGroup>
              </div>
            </div>
          </template>
        </div>

        <div class="space-y-5">
          <UCard>
            <template #header>
              <h2 class="font-black text-highlighted">
                Membership
              </h2>
            </template>

            <div class="space-y-4">
              <div class="flex justify-between gap-4">
                <span class="text-sm text-muted">
                  Status
                </span>

                <StatusPill
                  :status="
                    membership.membership_status
                  "
                />
              </div>

              <div class="flex justify-between gap-4">
                <span class="text-sm text-muted">
                  Joined
                </span>

                <span class="text-right text-sm font-bold text-highlighted">
                  {{
                    formatDate(
                      membership.approved_at
                      || membership.created_at,
                    )
                  }}
                </span>
              </div>
            </div>

            <UButton
              class="mt-5"
              block
              color="error"
              variant="soft"
              icon="i-lucide-log-out"
              @click="
                leaveModalOpen = true
              "
            >
              Leave Class
            </UButton>
          </UCard>
        </div>
      </div>
    </template>

    <ConfirmationModal
      v-model:open="
        leaveModalOpen
      "
      title="Leave this class?"
      description="Your active membership will be removed. You may lose access to open assessments in this class."
      confirm-label="Leave Class"
      confirm-color="error"
      icon="i-lucide-log-out"
      :loading="isLeaving"
      @confirm="leave"
    />
  </div>
</template>


<style scoped>
.classmate-row-enter-active,
.classmate-row-leave-active {
  transition:
    opacity 220ms ease,
    transform 220ms ease,
    background-color 160ms ease;
}

.classmate-row-enter-active {
  transition-delay:
    var(
      --classmate-delay,
      0ms
    );
}

.classmate-row-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.classmate-row-leave-to {
  opacity: 0;
  transform: translateX(8px);
}

.classmate-row-move {
  transition:
    transform 220ms ease;
}

@media (prefers-reduced-motion: reduce) {
  .classmate-row-enter-active,
  .classmate-row-leave-active,
  .classmate-row-move {
    transition: none;
  }

  .classmate-row-enter-from,
  .classmate-row-leave-to {
    transform: none;
  }
}
</style>
