<script setup lang="ts">
import type {
  StudentSessionDetail,
} from "~/types/assessment-session";

definePageMeta({
  layout: "student",
});

useSeoMeta({
  title: "Session lobby",
});

const route =
  useRoute();

const toast =
  useToast();

const sessionId = computed(
  () =>
    String(
      route.params.id,
    ),
);

const {
  getStudentSession,
  leaveLobby,
} = useAssessmentSessions();

const {
  connectionStatus,
  subscribe,
} = useSessionRealtime();

const detail =
  ref<StudentSessionDetail | null>(
    null,
  );

const isLoading =
  ref(true);

const isLeaving =
  ref(false);

const errorMessage =
  ref("");

const leaveLobbyModalOpen =
  ref(false);

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
      || "Unable to load the session lobby.";

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

async function leave(): Promise<void> {
  if (!detail.value) {
    return;
  }

  isLeaving.value =
    true;

  const result =
    await leaveLobby(
      detail.value.session.id,
    );

  if (
    result.error
    || !result.data
  ) {
    toast.add({
      title:
        "Unable to leave lobby",
      description:
        result.error
        || "The action could not be completed.",
      color:
        "error",
    });

    isLeaving.value =
      false;

    return;
  }

  toast.add({
    title:
      "Lobby left",
    description:
      result.data.message,
    color:
      "success",
  });

  await navigateTo(
    "/student/sessions/join",
  );
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
      title="Session lobby could not be loaded"
      :description="errorMessage"
    />

    <div
      v-if="isLoading"
      class="mx-auto w-full max-w-4xl space-y-5"
    >
      <USkeleton class="h-56 rounded-xl" />
      <USkeleton class="h-72 rounded-xl" />
    </div>

    <div
      v-else-if="detail"
      class="mx-auto w-full max-w-4xl"
    >
      <section class="rounded-xl bg-gradient-to-r from-slate-950 via-brand-900 to-indigo-800 p-6 text-center text-white sm:p-9">
        <div class="flex justify-center">
          <StatusPill
            :status="detail.session.status"
          />
        </div>

        <p class="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-blue-200">
          {{ detail.assessment.subjectCode }}
          ·
          {{ detail.classroom.section }}
        </p>

        <h1 class="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
          {{ detail.assessment.title }}
        </h1>

        <p class="mt-3 text-sm text-blue-100">
          Instructor:
          {{ detail.instructor.name }}
        </p>

        <div class="mx-auto mt-7 grid max-w-xl grid-cols-3 gap-3">
          <div class="rounded-xl bg-white/10 p-4">
            <p class="text-xs text-blue-200">
              Questions
            </p>

            <p class="mt-1 text-xl font-black">
              {{ detail.assessment.questionCount }}
            </p>
          </div>

          <div class="rounded-xl bg-white/10 p-4">
            <p class="text-xs text-blue-200">
              Points
            </p>

            <p class="mt-1 text-xl font-black">
              {{ detail.assessment.totalPoints }}
            </p>
          </div>

          <div class="rounded-xl bg-white/10 p-4">
            <p class="text-xs text-blue-200">
              Mode
            </p>

            <p class="mt-1 text-sm font-black">
              {{
                detail.session.session_mode
                === "teacher_led"
                  ? "Teacher-led"
                  : "Student-paced"
              }}
            </p>
          </div>
        </div>
      </section>

      <UCard class="mt-6">
        <div class="py-5 text-center">
          <template
            v-if="
              detail.participant.status
              === 'removed'
            "
          >
            <div class="mx-auto flex size-14 items-center justify-center rounded-xl bg-error/10 text-error">
              <UIcon
                name="i-lucide-user-x"
                class="size-7"
              />
            </div>

            <h2 class="mt-5 text-xl font-black text-highlighted">
              Removed from session
            </h2>

            <p class="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted">
              The instructor removed this account from the live session. This code cannot be used again for the same session.
            </p>
          </template>

          <template
            v-else-if="
              detail.participant.status
              === 'left'
            "
          >
            <div class="mx-auto flex size-14 items-center justify-center rounded-xl bg-elevated text-muted">
              <UIcon
                name="i-lucide-log-out"
                class="size-7"
              />
            </div>

            <h2 class="mt-5 text-xl font-black text-highlighted">
              You left this lobby
            </h2>

            <p class="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted">
              Enter the session code again while it is still open to request re-entry.
            </p>

            <UButton
              to="/student/sessions/join"
              color="neutral"
              variant="outline"
              class="mt-7"
            >
              Return to Join Session
            </UButton>
          </template>

          <template
            v-else-if="
              detail.session.status
              === 'lobby'
            "
          >
            <div class="mx-auto flex size-14 items-center justify-center rounded-xl bg-warning/10 text-warning">
              <UIcon
                name="i-lucide-clock-3"
                class="size-7"
              />
            </div>

            <h2 class="mt-5 text-xl font-black text-highlighted">
              Waiting for the instructor
            </h2>

            <p class="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted">
              Keep this page open. The lobby updates automatically when the instructor starts the live assessment.
            </p>

            <div class="mt-5 flex justify-center">
              <div class="flex items-center gap-2 rounded-full bg-elevated px-4 py-2 text-sm">
                <span
                  class="size-2.5 rounded-full"
                  :class="
                    connectionStatus
                    === 'SUBSCRIBED'
                      ? 'bg-success'
                      : 'bg-warning'
                  "
                />

                <span class="font-semibold text-highlighted">
                  {{
                    connectionStatus
                    === "SUBSCRIBED"
                      ? "Live connection ready"
                      : "Connecting live updates"
                  }}
                </span>
              </div>
            </div>

            <UButton
              color="neutral"
              variant="outline"
              class="mt-7"
              icon="i-lucide-log-out"
              :loading="isLeaving"
              @click="
                leaveLobbyModalOpen = true
              "
            >
              Leave Lobby
            </UButton>
          </template>

          <template
            v-else-if="
              detail.session.status
              === 'active'
            "
          >
            <div class="mx-auto flex size-14 items-center justify-center rounded-xl bg-success/10 text-success">
              <UIcon
                name="i-lucide-play"
                class="size-7"
              />
            </div>

            <h2 class="mt-5 text-xl font-black text-highlighted">
              The session has started
            </h2>

            <p class="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted">
              Review the assessment instructions before the secure question player begins.
            </p>

            <UButton
              :to="`/student/sessions/${detail.session.id}/instructions`"
              class="mt-7"
              size="lg"
              icon="i-lucide-clipboard-check"
            >
              Continue to Instructions
            </UButton>
          </template>

          <template v-else>
            <div class="mx-auto flex size-14 items-center justify-center rounded-xl bg-elevated text-muted">
              <UIcon
                name="i-lucide-circle-stop"
                class="size-7"
              />
            </div>

            <h2 class="mt-5 text-xl font-black text-highlighted">
              Session closed
            </h2>

            <p class="mt-2 text-sm text-muted">
              This session has
              {{ detail.session.status }}.
            </p>

            <UButton
              to="/student/sessions/join"
              color="neutral"
              variant="outline"
              class="mt-7"
            >
              Return to Join Session
            </UButton>
          </template>
        </div>
      </UCard>

      <UAlert
        class="mt-6"
        color="info"
        variant="soft"
        title="Eligibility confirmed"
        description="The server verified your active student account and approved membership in the class selected by the instructor."
      />
    </div>

    <ConfirmationModal
      v-model:open="
        leaveLobbyModalOpen
      "
      title="Leave the live-session lobby?"
      description="You will be removed from the waiting lobby. You may need to enter the session code again if rejoining is still permitted."
      confirm-label="Leave Lobby"
      confirm-color="error"
      icon="i-lucide-log-out"
      :loading="isLeaving"
      @confirm="leave"
    />
  </div>
</template>
