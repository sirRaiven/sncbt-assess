<script setup lang="ts">
import type {
  InstructorSessionDetail,
  SessionParticipant,
} from "~/types/assessment-session";

definePageMeta({
  layout: "instructor",
});

useSeoMeta({
  title: "Live session monitor",
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
  endSession,
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

const elapsedSeconds =
  ref(0);

let elapsedTimer:
  | ReturnType<typeof setInterval>
  | null = null;

const visibleParticipants = computed(
  () =>
    detail.value
      ?.participants
      .filter(
        (participant) =>
          participant.status
          !== "removed",
      )
    ?? [],
);

const elapsedLabel = computed(() => {
  const hours =
    Math.floor(
      elapsedSeconds.value
      / 3600,
    );

  const minutes =
    Math.floor(
      (
        elapsedSeconds.value
        % 3600
      )
      / 60,
    );

  const seconds =
    elapsedSeconds.value
    % 60;

  return [
    hours,
    minutes,
    seconds,
  ]
    .map(
      (value) =>
        String(value)
          .padStart(
            2,
            "0",
          ),
    )
    .join(":");
});

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

function updateElapsed(): void {
  if (
    !detail.value?.session.started_at
  ) {
    elapsedSeconds.value =
      0;

    return;
  }

  const endingTime =
    detail.value.session.ended_at
      ? Date.parse(
          detail.value.session.ended_at,
        )
      : Date.now();

  elapsedSeconds.value =
    Math.max(
      0,
      Math.floor(
        (
          endingTime
          - Date.parse(
            detail.value.session.started_at,
          )
        )
        / 1000,
      ),
    );
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
      || "Unable to load the live session.";

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

  updateElapsed();

  if (
    detail.value.session.status
    === "lobby"
  ) {
    await navigateTo(
      `/instructor/sessions/${detail.value.session.id}/lobby`,
    );
  }
}

async function end(): Promise<void> {
  if (!detail.value) {
    return;
  }

  const confirmed =
    window.confirm(
      "End this live session? The session code will stop working.",
    );

  if (!confirmed) {
    return;
  }

  busyAction.value =
    "end";

  const result =
    await endSession(
      detail.value.session.id,
    );

  if (
    result.error
    || !result.data
  ) {
    toast.add({
      title:
        "Session could not be ended",
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
      "Session ended",
    description:
      result.data.message,
    color:
      "success",
  });

  busyAction.value =
    "";
}

async function remove(
  participant: SessionParticipant,
): Promise<void> {
  if (
    !detail.value
    || detail.value.session.status
    !== "active"
  ) {
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

    elapsedTimer = setInterval(
      updateElapsed,
      1000,
    );
  },
);

onBeforeUnmount(
  () => {
    if (elapsedTimer) {
      clearInterval(
        elapsedTimer,
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
      title="Live session could not be loaded"
      :description="errorMessage"
    />

    <div
      v-if="isLoading"
      class="space-y-5"
    >
      <USkeleton class="h-56 rounded-xl" />
      <USkeleton class="h-80 rounded-xl" />
    </div>

    <template v-else-if="detail">
      <section class="rounded-xl bg-gradient-to-r from-slate-950 via-brand-900 to-indigo-800 p-6 text-white sm:p-8">
        <div class="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <StatusPill
                :status="
                  detail.session.status
                "
              />

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

            <h1 class="mt-3 text-3xl font-black tracking-tight">
              {{ detail.assessment.title }}
            </h1>

            <p class="mt-3 text-sm text-blue-100">
              Session
              {{
                detail.session.session_code
                  .replace(
                    /(\d{3})(\d{3})/,
                    "$1 $2",
                  )
              }}
              ·
              {{ elapsedLabel }}
            </p>
          </div>

          <UButton
            v-if="
              detail.session.status
              === 'active'
            "
            color="error"
            size="lg"
            icon="i-lucide-square"
            :loading="
              busyAction
              === 'end'
            "
            @click="end"
          >
            End Session
          </UButton>

          <UButton
            v-else
            to="/instructor/sessions"
            color="neutral"
            variant="solid"
            class="bg-white text-brand-800 hover:bg-blue-50"
          >
            Return to Sessions
          </UButton>
        </div>
      </section>

      <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active students"
          :value="
            String(
              detail.participantCounts.active,
            )
          "
          icon="i-lucide-users"
          tone="success"
        />

        <StatCard
          label="Finished"
          :value="
            String(
              detail.participantCounts.finished,
            )
          "
          icon="i-lucide-circle-check-big"
          tone="primary"
        />

        <StatCard
          label="Left"
          :value="
            String(
              detail.participantCounts.left,
            )
          "
          icon="i-lucide-log-out"
          tone="neutral"
        />

        <StatCard
          label="Connection"
          :value="
            connectionStatus
            === 'SUBSCRIBED'
              ? 'Live'
              : 'Polling'
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

      <UCard>
        <template #header>
          <div>
            <h2 class="font-black text-highlighted">
              Session participants
            </h2>

            <p class="mt-1 text-sm text-muted">
              Answer progress and scores will be connected after the student assessment player and grading workflow are finalized.
            </p>
          </div>
        </template>

        <EmptyPanel
          v-if="
            visibleParticipants.length
            === 0
          "
          icon="i-lucide-users"
          title="No session participants"
          description="No students joined this session."
        />

        <div
          v-else
          class="table-scroll"
        >
          <table class="app-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Student number</th>
                <th>Joined</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="participant in visibleParticipants"
                :key="participant.id"
              >
                <td>
                  <div class="flex items-center gap-3">
                    <UAvatar
                      :text="
                        initials(
                          participant,
                        )
                      "
                      size="sm"
                    />

                    <div>
                      <p class="font-semibold text-highlighted">
                        {{ participant.student.name }}
                      </p>

                      <p class="text-xs text-muted">
                        {{ participant.student.email }}
                      </p>
                    </div>
                  </div>
                </td>

                <td class="font-mono text-xs">
                  {{
                    participant.student.studentNumber
                    || "—"
                  }}
                </td>

                <td>
                  {{
                    new Date(
                      participant.joined_at,
                    ).toLocaleString()
                  }}
                </td>

                <td>
                  <StatusPill
                    :status="participant.status"
                  />
                </td>

                <td>
                  <UButton
                    v-if="
                      detail.session.status
                      === 'active'
                      && participant.status
                      === 'active'
                    "
                    color="error"
                    variant="ghost"
                    size="sm"
                    icon="i-lucide-user-x"
                    :loading="
                      busyAction
                      === participant.id
                    "
                    @click="
                      remove(
                        participant,
                      )
                    "
                  >
                    Remove
                  </UButton>

                  <span
                    v-else
                    class="text-xs text-muted"
                  >
                    No action
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </UCard>

      <UAlert
        v-if="
          detail.session.status
          === 'active'
        "
        color="info"
        variant="soft"
        title="Session foundation is active"
        description="Students have passed institutional eligibility checks and reached the instructions page. Secure answer delivery is the next workflow to design."
      />

      <UAlert
        v-else
        color="success"
        variant="soft"
        title="Session closed"
        description="The session code is no longer valid and the final participant states were preserved."
      />
    </template>
  </div>
</template>
