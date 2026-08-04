<script setup lang="ts">
import type {
  Classroom,
  StudentClassMembership,
} from "~/types/classroom";

import type {
  StudentPublishedAssessment,
} from "~/types/assessment";

definePageMeta({
  layout: "student",
});

useSeoMeta({
  title: "Class details",
});

const route = useRoute();
const toast = useToast();

const classroomId = computed(
  () => String(route.params.id),
);

const {
  getStudentClass,
  leaveClass,
} = useClassrooms();

const {
  listStudentClassAssessments,
} = useAssessments();

const classroom =
  ref<Classroom | null>(null);

const membership =
  ref<StudentClassMembership | null>(null);

const assessments =
  ref<StudentPublishedAssessment[]>([]);

const instructorName = ref("");
const isLoading = ref(true);
const isLeaving = ref(false);
const errorMessage = ref("");

function typeLabel(
  value: string,
): string {
  return value
    .split("_")
    .map(
      (part) =>
        part.charAt(0).toUpperCase()
        + part.slice(1),
    )
    .join(" ");
}

async function loadClass(): Promise<void> {
  isLoading.value = true;
  errorMessage.value = "";

  const [
    classResult,
    assessmentResult,
  ] = await Promise.all([
    getStudentClass(
      classroomId.value,
    ),
    listStudentClassAssessments(
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

    isLoading.value = false;
    return;
  }

  if (
    assessmentResult.error
    || !assessmentResult.data
  ) {
    errorMessage.value =
      assessmentResult.error
      || "Unable to load class assessments.";

    isLoading.value = false;
    return;
  }

  classroom.value =
    classResult.data.classroom;

  membership.value =
    classResult.data.membership;

  instructorName.value =
    classResult.data.instructor.name;

  assessments.value =
    assessmentResult.data.assessments;

  isLoading.value = false;
}

async function leave(): Promise<void> {
  if (!classroom.value) {
    return;
  }

  isLeaving.value = true;

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

    isLeaving.value = false;
    return;
  }

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
      <USkeleton class="h-72 rounded-xl" />
    </div>

    <template v-else-if="classroom">
      <section class="rounded-xl bg-gradient-to-r from-brand-900 via-brand-700 to-indigo-700 p-6 text-white sm:p-8">
        <UBadge
          color="neutral"
          variant="soft"
          class="bg-white/10 text-blue-50"
        >
          {{ classroom.subject_code }}
          ·
          {{ classroom.section }}
        </UBadge>

        <h1 class="mt-4 text-3xl font-black tracking-tight">
          {{ classroom.name }}
        </h1>

        <p class="mt-2 text-sm text-blue-100">
          {{ instructorName }}
          ·
          {{ classroom.school_year }}
          ·
          {{ classroom.semester }}
        </p>
      </section>

      <div class="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div class="space-y-6">
          <UCard>
            <template #header>
              <h2 class="font-bold text-highlighted">
                Class overview
              </h2>
            </template>

            <p class="whitespace-pre-line text-sm leading-6 text-muted">
              {{
                classroom.description
                || "No class description was provided."
              }}
            </p>
          </UCard>

          <UCard>
            <template #header>
              <div>
                <h2 class="font-bold text-highlighted">
                  Published assessments
                </h2>

                <p class="mt-1 text-sm text-muted">
                  An assessment session must be opened by the instructor before answering is allowed.
                </p>
              </div>
            </template>

            <EmptyPanel
              v-if="assessments.length === 0"
              icon="i-lucide-clipboard-list"
              title="No published assessments"
              description="Published quizzes and examinations assigned to this class will appear here."
            />

            <div
              v-else
              class="space-y-3"
            >
              <div
                v-for="assessment in assessments"
                :key="assessment.id"
                class="rounded-xl border border-default p-4"
              >
                <div class="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <UIcon
                      name="i-lucide-clipboard-check"
                      class="size-5"
                    />
                  </div>

                  <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p class="font-black text-highlighted">
                          {{ assessment.title }}
                        </p>

                        <p class="mt-1 text-sm text-muted">
                          {{ typeLabel(assessment.assessmentType) }}
                          ·
                          {{ assessment.questionCount }} questions
                          ·
                          {{ assessment.totalPoints }} points
                        </p>
                      </div>

                      <StatusPill status="Published" />
                    </div>

                    <p
                      v-if="assessment.instructions"
                      class="mt-3 line-clamp-2 text-sm leading-6 text-muted"
                    >
                      {{ assessment.instructions }}
                    </p>

                    <UAlert
                      class="mt-4"
                      color="info"
                      variant="soft"
                      title="Waiting for an assessment session"
                      description="Session creation and secure student attempts begin in Phase 5."
                    />
                  </div>
                </div>
              </div>
            </div>
          </UCard>
        </div>

        <div class="space-y-6">
          <UCard>
            <template #header>
              <h2 class="font-bold text-highlighted">
                Membership
              </h2>
            </template>

            <dl class="space-y-4 text-sm">
              <div class="flex justify-between gap-4">
                <dt class="text-muted">
                  Status
                </dt>

                <dd>
                  <StatusPill
                    :status="
                      membership?.membership_status
                      || 'Active'
                    "
                  />
                </dd>
              </div>

              <div class="flex justify-between gap-4">
                <dt class="text-muted">
                  Joined
                </dt>

                <dd class="text-right font-semibold text-highlighted">
                  {{
                    membership?.approved_at
                      ? new Date(
                          membership.approved_at,
                        ).toLocaleString()
                      : "—"
                  }}
                </dd>
              </div>
            </dl>

            <UButton
              block
              color="error"
              variant="soft"
              class="mt-5"
              icon="i-lucide-log-out"
              :loading="isLeaving"
              @click="leave"
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
  </div>
</template>
