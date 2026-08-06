<script setup lang="ts">
import type {
  StudentSessionDetail,
} from "~/types/assessment-session";

definePageMeta({
  layout: "student",
});

useSeoMeta({
  title: "Assessment instructions",
});

const route =
  useRoute();

const sessionId = computed(
  () =>
    String(
      route.params.id,
    ),
);

const {
  getStudentSession,
} = useAssessmentSessions();

const {
  subscribe,
} = useSessionRealtime();

const detail =
  ref<StudentSessionDetail | null>(
    null,
  );

const isLoading =
  ref(true);

const errorMessage =
  ref("");

async function loadSession(
  silent = false,
): Promise<void> {
  if (!silent) {
    isLoading.value =
      true;
  }

  const result =
    await getStudentSession(
      sessionId.value,
    );

  if (
    result.error
    || !result.data
  ) {
    errorMessage.value =
      result.error
      || "Unable to load assessment instructions.";

    isLoading.value =
      false;

    return;
  }

  detail.value =
    result.data.detail;

  errorMessage.value =
    "";

  isLoading.value =
    false;
}

onMounted(
  async () => {
    await loadSession();

    if (detail.value) {
      await subscribe(
        detail.value.session.id,
        () =>
          loadSession(
            true,
          ),
      );
    }
  },
);
</script>

<template>
  <div class="page-stack">
    <UAlert
      v-if="errorMessage"
      color="error"
      variant="soft"
      title="Instructions could not be loaded"
      :description="errorMessage"
    />

    <div
      v-if="isLoading"
      class="mx-auto w-full max-w-4xl space-y-5"
    >
      <USkeleton class="h-48 rounded-xl" />
      <USkeleton class="h-96 rounded-xl" />
    </div>

    <div
      v-else-if="detail"
      class="mx-auto w-full max-w-4xl"
    >
      <PageHeader
        eyebrow="Live assessment instructions"
        :title="detail.assessment.title"
        :description="`${detail.assessment.subjectCode} · ${detail.classroom.section}`"
      />

      <UAlert
        v-if="
          detail.session.status
          !== 'active'
        "
        class="mt-6"
        color="warning"
        variant="soft"
        title="The live session is not active"
        :description="`Current session status: ${detail.session.status}`"
      />

      <UCard class="mt-6">
        <template #header>
          <h2 class="font-black text-highlighted">
            Before you begin
          </h2>
        </template>

        <div class="grid gap-4 sm:grid-cols-3">
          <div class="rounded-xl bg-elevated p-4 text-center">
            <p class="text-xs text-muted">
              Questions
            </p>

            <p class="mt-2 text-2xl font-black text-highlighted">
              {{ detail.assessment.questionCount }}
            </p>
          </div>

          <div class="rounded-xl bg-elevated p-4 text-center">
            <p class="text-xs text-muted">
              Total points
            </p>

            <p class="mt-2 text-2xl font-black text-highlighted">
              {{ detail.assessment.totalPoints }}
            </p>
          </div>

          <div class="rounded-xl bg-elevated p-4 text-center">
            <p class="text-xs text-muted">
              Session mode
            </p>

            <p class="mt-2 font-black text-highlighted">
              {{
                detail.session.session_mode
                === "teacher_led"
                  ? "Teacher-led"
                  : "Student-paced"
              }}
            </p>
          </div>
        </div>

        <USeparator class="my-7" />

        <div>
          <h3 class="font-bold text-highlighted">
            Instructor instructions
          </h3>

          <p class="mt-3 whitespace-pre-line text-sm leading-7 text-muted">
            {{
              detail.assessment.instructions
              || "Read every question carefully and submit only when you are ready."
            }}
          </p>
        </div>

        <USeparator class="my-7" />

        <div class="space-y-4 text-sm leading-6 text-muted">
          <div class="flex gap-3">
            <UIcon
              name="i-lucide-circle-check-big"
              class="mt-0.5 size-5 shrink-0 text-success"
            />

            <p>
              Keep this browser page open while the live assessment is active.
            </p>
          </div>

          <div class="flex gap-3">
            <UIcon
              name="i-lucide-circle-check-big"
              class="mt-0.5 size-5 shrink-0 text-success"
            />

            <p>
              The secure question player will validate your identity, session participation, and selected answers on the server.
            </p>
          </div>

          <div class="flex gap-3">
            <UIcon
              name="i-lucide-circle-check-big"
              class="mt-0.5 size-5 shrink-0 text-success"
            />

            <p>
              Correct answers and grading information will never be sent with the student question payload.
            </p>
          </div>
        </div>

        <UAlert
          class="mt-7"
          color="info"
          variant="soft"
          title="Question player is the next workflow"
          description="The live session, class eligibility, join code, waiting lobby, and start event are now working. Answer delivery and grading will be implemented after the complete instructor-to-student flow is agreed."
        />

        <UButton
          block
          size="lg"
          class="mt-6"
          icon="i-lucide-play"
          disabled
        >
          Begin Assessment
        </UButton>
      </UCard>
    </div>
  </div>
</template>
