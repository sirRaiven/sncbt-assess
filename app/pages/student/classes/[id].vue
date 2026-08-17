<script setup lang="ts">
import type {
  Classroom,
  StudentClassMembership,
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

const {
  getStudentClass,
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

async function loadClass():
  Promise<void> {
  isLoading.value =
    true;

  errorMessage.value =
    "";

  const [
    classResult,
    deliveryResult,
  ] =
    await Promise.all([
      getStudentClass(
        classroomId.value,
      ),
      listStudentDeliveries(
        classroomId.value,
      ),
    ]);

  if (
    classResult.error
    || !classResult.data
  ) {
    errorMessage.value =
      classResult.error
      || "Unable to load the class.";

    isLoading.value =
      false;

    return;
  }

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

      <div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <div class="space-y-5">
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
                  Class assessments
                </h2>

                <p class="mt-1 text-sm text-muted">
                  Assessments become available automatically based on the schedule set by your instructor.
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

          <UAlert
            color="warning"
            variant="soft"
            title="Leaving a class"
            description="Your instructor must approve a new membership request if you decide to join this class again."
          />
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
