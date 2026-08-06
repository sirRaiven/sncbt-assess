<script setup lang="ts">
import type {
  LiveSessionMode,
  SessionAssessmentOption,
  SessionClassroomOption,
} from "~/types/assessment-session";

definePageMeta({
  layout: "instructor",
});

useSeoMeta({
  title: "Start live session",
});

const route =
  useRoute();

const toast =
  useToast();

const {
  listSessionOptions,
  createSession,
} = useAssessmentSessions();

const assessments =
  ref<SessionAssessmentOption[]>([]);

const classrooms =
  ref<SessionClassroomOption[]>([]);

const openSessionId =
  ref<string | null>(null);

const selectedAssessmentId =
  ref("");

const selectedClassroomId =
  ref("");

const sessionMode =
  ref<LiveSessionMode>(
    "student_paced",
  );

const allowLateJoin =
  ref(true);

const showLeaderboard =
  ref(false);

const assessmentQuery =
  ref("");

const classQuery =
  ref("");

const isLoading =
  ref(true);

const isCreating =
  ref(false);

const errorMessage =
  ref("");

const selectedAssessment = computed(
  () =>
    assessments.value.find(
      (item) =>
        item.id
        === selectedAssessmentId.value,
    )
    ?? null,
);

const selectedClassroom = computed(
  () =>
    classrooms.value.find(
      (item) =>
        item.id
        === selectedClassroomId.value,
    )
    ?? null,
);

const filteredAssessments = computed(() => {
  const keyword =
    assessmentQuery.value
      .trim()
      .toLowerCase();

  if (!keyword) {
    return assessments.value;
  }

  return assessments.value.filter(
    (item) =>
      [
        item.title,
        item.subjectCode,
        item.assessmentType,
      ]
        .join(" ")
        .toLowerCase()
        .includes(keyword),
  );
});

const filteredClassrooms = computed(() => {
  const keyword =
    classQuery.value
      .trim()
      .toLowerCase();

  const suggestedIds =
    new Set(
      selectedAssessment.value
        ?.assignedClassroomIds
      ?? [],
    );

  return classrooms.value
    .filter(
      (item) =>
        !keyword
        || [
          item.name,
          item.subjectCode,
          item.section,
        ]
          .join(" ")
          .toLowerCase()
          .includes(keyword),
    )
    .sort(
      (first, second) => {
        const firstSuggested =
          suggestedIds.has(
            first.id,
          )
            ? 1
            : 0;

        const secondSuggested =
          suggestedIds.has(
            second.id,
          )
            ? 1
            : 0;

        return (
          secondSuggested
          - firstSuggested
        );
      },
    );
});

const isReady = computed(
  () =>
    Boolean(
      selectedAssessment.value
      && selectedClassroom.value
      && !openSessionId.value,
    ),
);

function typeLabel(
  value: string,
): string {
  return value
    .split("_")
    .map(
      (part) =>
        part.charAt(0)
        .toUpperCase()
        + part.slice(1),
    )
    .join(" ");
}

function isSuggestedClass(
  classroomId: string,
): boolean {
  return (
    selectedAssessment.value
      ?.assignedClassroomIds
      .includes(
        classroomId,
      )
    ?? false
  );
}

async function loadOptions(): Promise<void> {
  isLoading.value =
    true;

  errorMessage.value =
    "";

  const result =
    await listSessionOptions();

  if (
    result.error
    || !result.data
  ) {
    errorMessage.value =
      result.error
      || "Unable to load live-session options.";

    isLoading.value =
      false;

    return;
  }

  assessments.value =
    result.data.assessments;

  classrooms.value =
    result.data.classrooms;

  openSessionId.value =
    result.data.openSessionId;

  const requestedAssessmentId =
    typeof route.query.assessmentId
    === "string"
      ? route.query.assessmentId
      : "";

  if (
    requestedAssessmentId
    && assessments.value.some(
      (item) =>
        item.id
        === requestedAssessmentId,
    )
  ) {
    selectedAssessmentId.value =
      requestedAssessmentId;
  }

  isLoading.value =
    false;
}

async function create(): Promise<void> {
  if (
    !selectedAssessment.value
    || !selectedClassroom.value
  ) {
    errorMessage.value =
      "Select a published assessment and an active class.";

    return;
  }

  isCreating.value =
    true;

  errorMessage.value =
    "";

  const result =
    await createSession({
      assessmentId:
        selectedAssessment.value.id,

      classroomId:
        selectedClassroom.value.id,

      sessionMode:
        sessionMode.value,

      allowLateJoin:
        allowLateJoin.value,

      showLeaderboard:
        showLeaderboard.value,
    });

  if (
    result.error
    || !result.data
  ) {
    errorMessage.value =
      result.error
      || "Unable to create the live session.";

    isCreating.value =
      false;

    return;
  }

  toast.add({
    title:
      "Live lobby created",
    description:
      result.data.message,
    color:
      "success",
  });

  await navigateTo(
    `/instructor/sessions/${result.data.detail.session.id}/lobby`,
  );
}

onMounted(
  loadOptions,
);
</script>

<template>
  <div class="page-stack">
    <PageHeader
      eyebrow="Start now"
      title="Start a live session"
      description="Choose a published assessment, select one active class, and configure the waiting lobby."
    />

    <UAlert
      v-if="errorMessage"
      color="error"
      variant="soft"
      title="Live session could not be created"
      :description="errorMessage"
    />

    <UAlert
      v-if="openSessionId"
      color="info"
      variant="soft"
      title="A live session is already open"
      description="Only one waiting or active session can be hosted at a time."
    >
      <template #actions>
        <UButton
          :to="`/instructor/sessions/${openSessionId}/lobby`"
          color="info"
          variant="soft"
        >
          Open Current Session
        </UButton>
      </template>
    </UAlert>

    <div
      v-if="isLoading"
      class="grid gap-6 xl:grid-cols-[1fr_360px]"
    >
      <USkeleton class="h-[640px] rounded-xl" />
      <USkeleton class="h-96 rounded-xl" />
    </div>

    <div
      v-else
      class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]"
    >
      <div class="space-y-6">
        <UCard>
          <template #header>
            <div>
              <p class="text-xs font-bold uppercase tracking-[0.16em] text-primary">
                Step 1
              </p>

              <h2 class="mt-1 font-black text-highlighted">
                Choose a published assessment
              </h2>

              <p class="mt-1 text-sm text-muted">
                Assessments from your reusable library can be hosted for any active class.
              </p>
            </div>
          </template>

          <UInput
            v-model="assessmentQuery"
            icon="i-lucide-search"
            placeholder="Search assessment"
            class="mb-4 w-full"
          />

          <EmptyPanel
            v-if="
              filteredAssessments.length
              === 0
            "
            icon="i-lucide-clipboard-list"
            title="No published assessments"
            description="Publish an assessment containing valid questions before starting a live session."
          >
            <template #actions>
              <UButton
                to="/instructor/assessments"
                variant="soft"
              >
                Open Assessments
              </UButton>
            </template>
          </EmptyPanel>

          <div
            v-else
            class="grid gap-3 md:grid-cols-2"
          >
            <button
              v-for="assessment in filteredAssessments"
              :key="assessment.id"
              type="button"
              class="rounded-xl border p-4 text-left transition"
              :class="
                selectedAssessmentId
                === assessment.id
                  ? 'border-primary bg-primary/5 ring-3 ring-primary/10'
                  : 'border-default hover:border-primary/40 hover:bg-primary/5'
              "
              @click="
                selectedAssessmentId =
                  assessment.id
              "
            >
              <div class="flex items-start justify-between gap-3">
                <div class="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <UIcon
                    name="i-lucide-clipboard-check"
                    class="size-5"
                  />
                </div>

                <UIcon
                  v-if="
                    selectedAssessmentId
                    === assessment.id
                  "
                  name="i-lucide-circle-check-big"
                  class="size-5 text-primary"
                />
              </div>

              <p class="mt-4 font-black text-highlighted">
                {{ assessment.title }}
              </p>

              <p class="mt-1 text-sm text-muted">
                {{ assessment.subjectCode }}
                ·
                {{
                  typeLabel(
                    assessment.assessmentType,
                  )
                }}
              </p>

              <div class="mt-4 flex flex-wrap gap-2">
                <UBadge
                  color="neutral"
                  variant="soft"
                >
                  {{ assessment.questionCount }}
                  questions
                </UBadge>

                <UBadge
                  color="neutral"
                  variant="soft"
                >
                  {{ assessment.totalPoints }}
                  points
                </UBadge>
              </div>
            </button>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <div>
              <p class="text-xs font-bold uppercase tracking-[0.16em] text-primary">
                Step 2
              </p>

              <h2 class="mt-1 font-black text-highlighted">
                Choose the live-session class
              </h2>

              <p class="mt-1 text-sm text-muted">
                The selected class applies only to this live session and does not change permanent assessment assignments.
              </p>
            </div>
          </template>

          <UInput
            v-model="classQuery"
            icon="i-lucide-search"
            placeholder="Search active class"
            class="mb-4 w-full"
          />

          <EmptyPanel
            v-if="
              filteredClassrooms.length
              === 0
            "
            icon="i-lucide-school"
            title="No active classes"
            description="Create or reactivate a class before hosting a live assessment."
          />

          <div
            v-else
            class="grid gap-3 md:grid-cols-2"
          >
            <button
              v-for="classroom in filteredClassrooms"
              :key="classroom.id"
              type="button"
              class="rounded-xl border p-4 text-left transition"
              :class="
                selectedClassroomId
                === classroom.id
                  ? 'border-primary bg-primary/5 ring-3 ring-primary/10'
                  : 'border-default hover:border-primary/40 hover:bg-primary/5'
              "
              @click="
                selectedClassroomId =
                  classroom.id
              "
            >
              <div class="flex items-start justify-between gap-3">
                <div class="flex size-10 items-center justify-center rounded-xl bg-info/10 text-info">
                  <UIcon
                    name="i-lucide-school"
                    class="size-5"
                  />
                </div>

                <UBadge
                  v-if="
                    isSuggestedClass(
                      classroom.id,
                    )
                  "
                  color="success"
                  variant="soft"
                >
                  Assigned
                </UBadge>
              </div>

              <p class="mt-4 font-black text-highlighted">
                {{ classroom.name }}
              </p>

              <p class="mt-1 text-sm text-muted">
                {{ classroom.subjectCode }}
                ·
                {{ classroom.section }}
              </p>

              <p class="mt-3 text-xs text-muted">
                {{ classroom.activeMemberCount }}
                approved students
              </p>
            </button>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <div>
              <p class="text-xs font-bold uppercase tracking-[0.16em] text-primary">
                Step 3
              </p>

              <h2 class="mt-1 font-black text-highlighted">
                Choose session mode and settings
              </h2>
            </div>
          </template>

          <div class="grid gap-3 md:grid-cols-2">
            <button
              type="button"
              class="rounded-xl border p-4 text-left transition"
              :class="
                sessionMode
                === 'student_paced'
                  ? 'border-primary bg-primary/5 ring-3 ring-primary/10'
                  : 'border-default hover:border-primary/40'
              "
              @click="
                sessionMode =
                  'student_paced'
              "
            >
              <UIcon
                name="i-lucide-gauge"
                class="size-6 text-primary"
              />

              <p class="mt-4 font-black text-highlighted">
                Student-paced
              </p>

              <p class="mt-2 text-sm leading-6 text-muted">
                Students move through the assessment independently after the session starts.
              </p>
            </button>

            <button
              type="button"
              class="rounded-xl border p-4 text-left transition"
              :class="
                sessionMode
                === 'teacher_led'
                  ? 'border-primary bg-primary/5 ring-3 ring-primary/10'
                  : 'border-default hover:border-primary/40'
              "
              @click="
                sessionMode =
                  'teacher_led'
              "
            >
              <UIcon
                name="i-lucide-presentation"
                class="size-6 text-primary"
              />

              <p class="mt-4 font-black text-highlighted">
                Teacher-led
              </p>

              <p class="mt-2 text-sm leading-6 text-muted">
                The instructor controls question progression in a future assessment-player update.
              </p>
            </button>
          </div>

          <USeparator class="my-6" />

          <div class="space-y-5">
            <div class="flex items-start justify-between gap-5">
              <div>
                <p class="font-semibold text-highlighted">
                  Allow late joining
                </p>

                <p class="mt-1 text-sm text-muted">
                  Approved students may join after the session has started.
                </p>
              </div>

              <USwitch
                v-model="allowLateJoin"
              />
            </div>

            <div class="flex items-start justify-between gap-5">
              <div>
                <p class="font-semibold text-highlighted">
                  Leaderboard available
                </p>

                <p class="mt-1 text-sm text-muted">
                  Store the instructor's preference for the future grading and ranking phase.
                </p>
              </div>

              <USwitch
                v-model="showLeaderboard"
              />
            </div>
          </div>
        </UCard>
      </div>

      <div class="space-y-6 xl:sticky xl:top-24 xl:h-fit">
        <UCard>
          <template #header>
            <h2 class="font-black text-highlighted">
              Session summary
            </h2>
          </template>

          <dl class="space-y-5 text-sm">
            <div>
              <dt class="text-muted">
                Assessment
              </dt>

              <dd class="mt-1 font-bold text-highlighted">
                {{
                  selectedAssessment
                    ?.title
                  || "Not selected"
                }}
              </dd>
            </div>

            <div>
              <dt class="text-muted">
                Class
              </dt>

              <dd class="mt-1 font-bold text-highlighted">
                {{
                  selectedClassroom
                    ? `${selectedClassroom.subjectCode} · ${selectedClassroom.section}`
                    : "Not selected"
                }}
              </dd>
            </div>

            <div>
              <dt class="text-muted">
                Mode
              </dt>

              <dd class="mt-1 font-bold text-highlighted">
                {{
                  sessionMode
                  === "teacher_led"
                    ? "Teacher-led"
                    : "Student-paced"
                }}
              </dd>
            </div>

            <div>
              <dt class="text-muted">
                Eligible students
              </dt>

              <dd class="mt-1 font-bold text-highlighted">
                {{
                  selectedClassroom
                    ?.activeMemberCount
                  ?? 0
                }}
              </dd>
            </div>
          </dl>

          <UButton
            block
            size="lg"
            class="mt-6"
            icon="i-lucide-door-open"
            :loading="isCreating"
            :disabled="!isReady"
            @click="create"
          >
            Create Waiting Lobby
          </UButton>

          <UButton
            to="/instructor/sessions"
            block
            color="neutral"
            variant="ghost"
            class="mt-2"
          >
            Cancel
          </UButton>
        </UCard>

        <UAlert
          color="info"
          variant="soft"
          title="Institutional access"
          description="Only active students with an approved membership in the selected class can enter the lobby."
        />
      </div>
    </div>
  </div>
</template>
