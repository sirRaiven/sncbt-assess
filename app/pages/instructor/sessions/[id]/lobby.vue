<script setup lang="ts">
import type {
  InstructorSessionDetail,
  SessionParticipant,
} from "~/types/assessment-session";

definePageMeta({
  layout: "instructor",
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
  getInstructorSession,
  startSession,
  cancelSession,
  removeParticipant,
} = useAssessmentSessions();

const {
  connectionStatus,
  subscribe,
} = useSessionRealtime();

const detail =
  ref<InstructorSessionDetail | null>(
    null,
  );

const isLoading =
  ref(true);

const busyAction =
  ref("");

const errorMessage =
  ref("");

const joinedParticipants = computed(
  () =>
    detail.value
      ?.participants
      .filter(
        (participant) =>
          [
            "waiting",
            "active",
          ].includes(
            participant.status,
          ),
      )
    ?? [],
);

function formattedCode(): string {
  return (
    detail.value?.session.session_code
      .replace(
        /(\d{3})(\d{3})/,
        "$1 $2",
      )
    ?? ""
  );
}

function initials(
  participant: SessionParticipant,
): string {
  return participant.student.name
    .split(" ")
    .filter(Boolean)
    .map(
      (part) =>
        part.charAt(0),
    )
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

async function loadSession(
  silent = false,
): Promise<void> {
  if (!silent) {
    isLoading.value =
      true;
  }

  const result =
    await getInstructorSession(
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

  if (
    detail.value.session.status
    !== "lobby"
  ) {
    await navigateTo(
      `/instructor/sessions/${detail.value.session.id}/monitor`,
    );
  }
}

async function copyCode(): Promise<void> {
  if (!detail.value) {
    return;
  }

  await navigator.clipboard.writeText(
    detail.value.session.session_code,
  );

  toast.add({
    title:
      "Session code copied",
    description:
      formattedCode(),
    color:
      "success",
  });
}

async function copyJoinLink(): Promise<void> {
  if (!detail.value) {
    return;
  }

  const joinUrl =
    `${window.location.origin}/student/sessions/join?code=${detail.value.session.session_code}`;

  await navigator.clipboard.writeText(
    joinUrl,
  );

  toast.add({
    title:
      "Student join link copied",
    description:
      "Share the link with approved students in the selected class.",
    color:
      "success",
  });
}

async function start(): Promise<void> {
  if (!detail.value) {
    return;
  }

  busyAction.value =
    "start";

  const result =
    await startSession(
      detail.value.session.id,
    );

  if (
    result.error
    || !result.data
  ) {
    toast.add({
      title:
        "Session could not be started",
      description:
        result.error
        || "The action could not be completed.",
      color:
        "error",
    });

    busyAction.value =
      "";

    return;
  }

  toast.add({
    title:
      "Session started",
    description:
      result.data.message,
    color:
      "success",
  });

  await navigateTo(
    `/instructor/sessions/${detail.value.session.id}/monitor`,
  );
}

async function cancel(): Promise<void> {
  if (!detail.value) {
    return;
  }

  const confirmed =
    window.confirm(
      "Cancel this waiting lobby? The session code will stop working.",
    );

  if (!confirmed) {
    return;
  }

  busyAction.value =
    "cancel";

  const result =
    await cancelSession(
      detail.value.session.id,
    );

  if (
    result.error
    || !result.data
  ) {
    toast.add({
      title:
        "Lobby could not be cancelled",
      description:
        result.error
        || "The action could not be completed.",
      color:
        "error",
    });

    busyAction.value =
      "";

    return;
  }

  toast.add({
    title:
      "Lobby cancelled",
    description:
      result.data.message,
    color:
      "success",
  });

  await navigateTo(
    "/instructor/sessions",
  );
}

async function remove(
  participant: SessionParticipant,
): Promise<void> {
  if (!detail.value) {
    return;
  }

  const confirmed =
    window.confirm(
      `Remove ${participant.student.name} from this session?`,
    );

  if (!confirmed) {
    return;
  }

  busyAction.value =
    participant.id;

  const result =
    await removeParticipant(
      detail.value.session.id,
      participant.id,
    );

  if (
    result.error
    || !result.data
  ) {
    toast.add({
      title:
        "Participant could not be removed",
      description:
        result.error
        || "The action could not be completed.",
      color:
        "error",
    });

    busyAction.value =
      "";

    return;
  }

  detail.value =
    result.data.detail;

  toast.add({
    title:
      "Participant removed",
    description:
      result.data.message,
    color:
      "success",
  });

  busyAction.value =
    "";
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
      class="space-y-5"
    >
      <USkeleton class="h-64 rounded-xl" />
      <USkeleton class="h-80 rounded-xl" />
    </div>

    <template v-else-if="detail">
      <section class="rounded-xl bg-gradient-to-r from-slate-950 via-brand-900 to-indigo-800 p-6 text-white sm:p-8">
        <div class="flex flex-col gap-7 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <StatusPill status="Lobby" />

              <UBadge
                color="neutral"
                variant="soft"
                class="bg-white/10 text-blue-50"
              >
                {{
                  detail.session.session_mode
                  === "teacher_led"
                    ? "Teacher-led"
                    : "Student-paced"
                }}
              </UBadge>
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
              Waiting for approved students to join
            </p>
          </div>

          <div class="rounded-xl bg-white/10 p-5 text-center backdrop-blur">
            <p class="text-xs font-bold uppercase tracking-[0.18em] text-blue-200">
              Session code
            </p>

            <p class="mt-2 font-mono text-4xl font-black tracking-[0.18em]">
              {{ formattedCode() }}
            </p>

            <div class="mt-4 flex justify-center gap-2">
              <UButton
                color="neutral"
                variant="solid"
                size="sm"
                icon="i-lucide-copy"
                class="bg-white text-brand-800 hover:bg-blue-50"
                @click="copyCode"
              >
                Copy Code
              </UButton>

              <UButton
                color="neutral"
                variant="outline"
                size="sm"
                icon="i-lucide-link"
                class="border-white/30 text-white hover:bg-white/10"
                @click="copyJoinLink"
              >
                Copy Link
              </UButton>
            </div>
          </div>
        </div>
      </section>

      <section class="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="In lobby"
          :value="
            String(
              joinedParticipants.length,
            )
          "
          icon="i-lucide-users"
          tone="primary"
        />

        <StatCard
          label="Session entries"
          :value="
            String(
              joinedParticipants.length
              + detail.participantCounts.left
              + detail.participantCounts.removed,
            )
          "
          icon="i-lucide-user-check"
          tone="info"
          change="Students who entered this code"
        />

        <StatCard
          label="Live connection"
          :value="
            connectionStatus
            === 'SUBSCRIBED'
              ? 'Ready'
              : 'Connecting'
          "
          icon="i-lucide-wifi"
          :tone="
            connectionStatus
            === 'SUBSCRIBED'
              ? 'success'
              : 'warning'
          "
        />
      </section>

      <div class="grid gap-6 xl:grid-cols-[1fr_340px]">
        <UCard>
          <template #header>
            <div>
              <h2 class="font-black text-highlighted">
                Students in the lobby
              </h2>

              <p class="mt-1 text-sm text-muted">
                The list updates automatically when approved students enter the session code.
              </p>
            </div>
          </template>

          <EmptyPanel
            v-if="
              joinedParticipants.length
              === 0
            "
            icon="i-lucide-users"
            title="Waiting for students"
            description="Share the six-digit code or join link with approved members of the selected class."
          />

          <div
            v-else
            class="grid gap-3 md:grid-cols-2"
          >
            <div
              v-for="participant in joinedParticipants"
              :key="participant.id"
              class="flex items-center gap-3 rounded-xl border border-default p-4"
            >
              <UAvatar
                :text="
                  initials(
                    participant,
                  )
                "
                size="md"
              />

              <div class="min-w-0 flex-1">
                <p class="truncate font-bold text-highlighted">
                  {{ participant.student.name }}
                </p>

                <p class="mt-1 truncate text-xs text-muted">
                  {{
                    participant.student.studentNumber
                    || participant.student.email
                    || "Student"
                  }}
                </p>
              </div>

              <div class="flex items-center gap-2">
                <StatusPill
                  :status="participant.status"
                />

                <UButton
                  color="error"
                  variant="ghost"
                  icon="i-lucide-user-x"
                  size="sm"
                  :loading="
                    busyAction
                    === participant.id
                  "
                  aria-label="Remove participant"
                  @click="
                    remove(
                      participant,
                    )
                  "
                />
              </div>
            </div>
          </div>
        </UCard>

        <div class="space-y-6">
          <UCard>
            <template #header>
              <h2 class="font-black text-highlighted">
                Session settings
              </h2>
            </template>

            <dl class="space-y-4 text-sm">
              <div class="flex justify-between gap-4">
                <dt class="text-muted">
                  Class
                </dt>

                <dd class="text-right font-bold text-highlighted">
                  {{ detail.classroom.subjectCode }}
                  ·
                  {{ detail.classroom.section }}
                </dd>
              </div>

              <div class="flex justify-between gap-4">
                <dt class="text-muted">
                  Late joining
                </dt>

                <dd class="font-bold text-highlighted">
                  {{
                    detail.session.allow_late_join
                      ? "Allowed"
                      : "Disabled"
                  }}
                </dd>
              </div>

              <div class="flex justify-between gap-4">
                <dt class="text-muted">
                  Leaderboard
                </dt>

                <dd class="font-bold text-highlighted">
                  {{
                    detail.session.show_leaderboard
                      ? "Available"
                      : "Hidden"
                  }}
                </dd>
              </div>

              <div class="flex justify-between gap-4">
                <dt class="text-muted">
                  Questions
                </dt>

                <dd class="font-bold text-highlighted">
                  {{ detail.assessment.questionCount }}
                </dd>
              </div>
            </dl>
          </UCard>

          <UButton
            block
            size="lg"
            icon="i-lucide-play"
            :loading="
              busyAction
              === 'start'
            "
            :disabled="
              joinedParticipants.length
              === 0
            "
            @click="start"
          >
            Start Session
          </UButton>

          <UButton
            block
            color="error"
            variant="soft"
            size="lg"
            icon="i-lucide-circle-x"
            :loading="
              busyAction
              === 'cancel'
            "
            @click="cancel"
          >
            Cancel Lobby
          </UButton>

          <UAlert
            v-if="
              joinedParticipants.length
              === 0
            "
            color="warning"
            variant="soft"
            title="At least one student is required"
            description="The Start Session button becomes available after a student joins."
          />
        </div>
      </div>
    </template>
  </div>
</template>
