<script setup lang="ts">
import type {
  StudentAssessmentDelivery,
} from "~/types/assessment-delivery";

definePageMeta({
  layout:
    "student",
});

useSeoMeta({
  title:
    "Assessment Instructions",
});

const route =
  useRoute();

const toast =
  useToast();

const assignmentId =
  computed(
    () =>
      String(
        route.params.id,
      ),
  );

const {
  getStudentDelivery,
  beginAttempt,
} = useAssessmentDelivery();

const delivery =
  ref<
    StudentAssessmentDelivery
    | null
  >(
    null,
  );

const isLoading =
  ref(true);

const isStarting =
  ref(false);

const errorMessage =
  ref("");

const startModalOpen =
  ref(false);

function formatDate(
  value: string,
): string {
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

function formatDuration(
  seconds: number | null,
): string {
  if (!seconds) {
    return "Available until the class schedule closes";
  }

  const minutes =
    Math.round(
      seconds / 60,
    );

  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}

const actionLabel =
  computed(
    () => {
      if (
        delivery.value
          ?.canResume
      ) {
        return "Continue Assessment";
      }

      if (
        delivery.value
          ?.canViewResult
      ) {
        return "View Result";
      }

      if (
        delivery.value
          ?.canStart
      ) {
        return "Begin Assessment";
      }

      if (
        delivery.value
          ?.attempt
        && [
          "submitted",
          "auto_submitted",
        ].includes(
          delivery.value
            .attempt.status,
        )
      ) {
        return "Submission Recorded";
      }

      if (
        delivery.value
          ?.status
        === "upcoming"
      ) {
        return "Assessment Not Open Yet";
      }

      return "Assessment Closed";
    },
  );

const canProceed =
  computed(
    () =>
      Boolean(
        delivery.value
        && (
          delivery.value.canStart
          || delivery.value.canResume
          || delivery.value.canViewResult
        ),
      ),
  );

async function loadDelivery():
  Promise<void> {
  isLoading.value =
    true;

  errorMessage.value =
    "";

  const result =
    await getStudentDelivery(
      assignmentId.value,
    );

  if (
    result.error
    || !result.data
  ) {
    errorMessage.value =
      result.error
      || "Unable to load the assessment instructions.";

    isLoading.value =
      false;

    return;
  }

  delivery.value =
    result.data.delivery;

  isLoading.value =
    false;
}

function requestProceed(): void {
  if (!delivery.value) {
    return;
  }

  if (
    delivery.value.canResume
  ) {
    void navigateTo(
      `/student/assessments/${assignmentId.value}/play`,
    );

    return;
  }

  if (
    delivery.value.canViewResult
  ) {
    void navigateTo(
      `/student/assessments/${assignmentId.value}/completed`,
    );

    return;
  }

  if (
    delivery.value.canStart
  ) {
    startModalOpen.value =
      true;
  }
}

async function startAttempt():
  Promise<void> {
  isStarting.value =
    true;

  const result =
    await beginAttempt(
      assignmentId.value,
    );

  if (
    result.error
    || !result.data
  ) {
    toast.add({
      title:
        "Assessment could not be started",
      description:
        result.error
        || "The assessment attempt could not be created.",
      color:
        "error",
    });

    isStarting.value =
      false;

    return;
  }

  startModalOpen.value =
    false;

  await navigateTo(
    `/student/assessments/${assignmentId.value}/play`,
  );
}

onMounted(
  loadDelivery,
);
</script>

<template>
  <div class="page-stack">
    <PortalBackButton
      fallback-to="/student/assessments"
    />
    <PageHeader
      eyebrow="Assessment instructions"
      :title="
        delivery?.title
        || 'Assessment'
      "
      :description="
        delivery
          ? `${delivery.subjectCode} · ${delivery.classroom.section}`
          : 'Loading assessment'
      "
    />

    <UAlert
      v-if="errorMessage"
      color="error"
      variant="soft"
      title="Assessment could not be loaded"
      :description="errorMessage"
    />

    <div
      v-if="isLoading"
      class="space-y-4"
    >
      <USkeleton class="h-48 rounded-xl" />
      <USkeleton class="h-80 rounded-xl" />
    </div>

    <template
      v-else-if="delivery"
    >
      <UCard>
        <template #header>
          <h2 class="font-black text-highlighted">
            Before you begin
          </h2>
        </template>

        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div class="rounded-xl bg-elevated p-4 text-center">
            <p class="text-xs text-muted">
              Questions
            </p>

            <p class="mt-2 text-2xl font-black text-highlighted">
              {{ delivery.questionCount }}
            </p>
          </div>

          <div class="rounded-xl bg-elevated p-4 text-center">
            <p class="text-xs text-muted">
              Total points
            </p>

            <p class="mt-2 text-2xl font-black text-highlighted">
              {{ delivery.totalPoints }}
            </p>
          </div>

          <div class="rounded-xl bg-elevated p-4 text-center">
            <p class="text-xs text-muted">
              Attempt duration
            </p>

            <p class="mt-2 text-sm font-black text-highlighted">
              {{
                formatDuration(
                  delivery.timeLimitSeconds,
                )
              }}
            </p>
          </div>

          <div class="rounded-xl bg-elevated p-4 text-center">
            <p class="text-xs text-muted">
              Backtracking
            </p>

            <p class="mt-2 text-sm font-black text-highlighted">
              {{
                delivery.allowBacktracking
                  ? "Allowed"
                  : "Disabled"
              }}
            </p>
          </div>
        </div>

        <div class="mt-6 grid gap-4 md:grid-cols-2">
          <div class="rounded-xl border border-default p-4">
            <p class="text-xs font-bold uppercase tracking-[0.14em] text-muted">
              Opens
            </p>

            <p class="mt-2 font-bold text-highlighted">
              {{
                formatDate(
                  delivery.startsAt,
                )
              }}
            </p>
          </div>

          <div class="rounded-xl border border-default p-4">
            <p class="text-xs font-bold uppercase tracking-[0.14em] text-muted">
              Closes
            </p>

            <p class="mt-2 font-bold text-highlighted">
              {{
                formatDate(
                  delivery.endsAt,
                )
              }}
            </p>
          </div>
        </div>

        <div class="mt-6 border-t border-default pt-6">
          <h3 class="font-black text-highlighted">
            Instructor instructions
          </h3>

          <p class="mt-3 whitespace-pre-line text-sm leading-7 text-muted">
            {{
              delivery.instructions
              || "Read each question carefully. Save your answer before continuing and submit only when you are ready."
            }}
          </p>
        </div>

        <div class="mt-6 space-y-3 border-t border-default pt-6">
          <div class="flex items-start gap-3">
            <UIcon
              name="i-lucide-circle-check"
              class="mt-0.5 size-5 text-success"
            />

            <p class="text-sm text-muted">
              The server controls the assessment timer, saves your progress, and prevents answers after submission.
            </p>
          </div>

          <div class="flex items-start gap-3">
            <UIcon
              name="i-lucide-circle-check"
              class="mt-0.5 size-5 text-success"
            />

            <p class="text-sm text-muted">
              Correct answers are not sent to your browser while the assessment is active.
            </p>
          </div>

          <div class="flex items-start gap-3">
            <UIcon
              name="i-lucide-circle-check"
              class="mt-0.5 size-5 text-success"
            />

            <p class="text-sm text-muted">
              Closing or refreshing the browser does not create another attempt. Use Continue Assessment to resume.
            </p>
          </div>
        </div>

        <UAlert
          v-if="
            delivery.status
            === 'upcoming'
          "
          class="mt-6"
          color="info"
          variant="soft"
          title="This assessment is upcoming"
          :description="`You can begin on ${formatDate(delivery.startsAt)}.`"
        />

        <UAlert
          v-else-if="
            delivery.status
            === 'closed'
            && !delivery.canViewResult
          "
          class="mt-6"
          color="warning"
          variant="soft"
          title="This assessment is closed"
          description="The class availability period has ended."
        />

        <UButton
          class="mt-6"
          block
          size="xl"
          :disabled="!canProceed"
          :icon="
            delivery.canViewResult
              ? 'i-lucide-chart-column'
              : 'i-lucide-play'
          "
          @click="requestProceed"
        >
          {{ actionLabel }}
        </UButton>
      </UCard>
    </template>

    <ConfirmationModal
      v-model:open="
        startModalOpen
      "
      title="Begin this assessment?"
      description="Your timer starts immediately after confirmation. The deadline is controlled by the server and cannot be paused by closing the browser."
      confirm-label="Begin Assessment"
      icon="i-lucide-play"
      :loading="isStarting"
      @confirm="startAttempt"
    />
  </div>
</template>
