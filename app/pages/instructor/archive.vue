<script setup lang="ts">
import type {
  ArchiveSection,
  ArchivedAssessmentItem,
  ArchivedSessionItem,
  InstructorArchiveOverview,
} from "~/types/instructor-archive";

definePageMeta({
  layout: "instructor",
});

useSeoMeta({
  title: "Archive",
});

interface DeleteTarget {
  kind:
    | "assessment"
    | "session";
  id: string;
  title: string;
  detail: string;
}

const toast = useToast();

const {
  getArchiveOverview,
  deleteArchivedAssessment,
  deleteClosedSession,
} = useInstructorArchive();

const overview =
  ref<InstructorArchiveOverview | null>(
    null,
  );

const activeSection =
  ref<ArchiveSection>(
    "assessments",
  );

const query =
  ref("");

const isLoading =
  ref(true);

const errorMessage =
  ref("");

const deleteTarget =
  ref<DeleteTarget | null>(
    null,
  );

const confirmationText =
  ref("");

const isDeleting =
  ref(false);

const summary = computed(
  () =>
    overview.value?.summary
    ?? {
      archivedAssessments:
        0,
      closedSessions:
        0,
      blockedAssessments:
        0,
      totalRecords:
        0,
    },
);

const filteredAssessments = computed(
  () => {
    const keyword =
      query.value
        .trim()
        .toLowerCase();

    const assessments =
      overview.value?.assessments
      ?? [];

    if (!keyword) {
      return assessments;
    }

    return assessments.filter(
      (assessment) =>
        [
          assessment.title,
          assessment.subjectCode,
          assessment.assessmentType,
        ]
          .join(" ")
          .toLowerCase()
          .includes(keyword),
    );
  },
);

const filteredSessions = computed(
  () => {
    const keyword =
      query.value
        .trim()
        .toLowerCase();

    const sessions =
      overview.value?.sessions
      ?? [];

    if (!keyword) {
      return sessions;
    }

    return sessions.filter(
      (session) =>
        [
          session.assessmentTitle,
          session.subjectCode,
          session.classroomName,
          session.section,
          session.sessionCode,
          session.status,
        ]
          .join(" ")
          .toLowerCase()
          .includes(keyword),
    );
  },
);

const canConfirmDelete = computed(
  () =>
    confirmationText.value
      .trim()
      .toUpperCase()
    === "DELETE",
);

function formatDate(
  value: string | null,
): string {
  if (!value) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat(
    "en-PH",
    {
      dateStyle:
        "medium",
      timeStyle:
        "short",
    },
  ).format(
    new Date(value),
  );
}

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

function openAssessmentDelete(
  assessment: ArchivedAssessmentItem,
): void {
  deleteTarget.value = {
    kind:
      "assessment",
    id:
      assessment.id,
    title:
      assessment.title,
    detail:
      `${assessment.subjectCode} · ${assessment.questionCount} questions`,
  };

  confirmationText.value =
    "";
}

function openSessionDelete(
  session: ArchivedSessionItem,
): void {
  deleteTarget.value = {
    kind:
      "session",
    id:
      session.id,
    title:
      session.assessmentTitle,
    detail:
      `${session.subjectCode} · ${session.section} · Code ${session.sessionCode}`,
  };

  confirmationText.value =
    "";
}

function closeDeleteDialog(): void {
  if (isDeleting.value) {
    return;
  }

  deleteTarget.value =
    null;

  confirmationText.value =
    "";
}

async function loadArchive(): Promise<void> {
  isLoading.value =
    true;

  errorMessage.value =
    "";

  const result =
    await getArchiveOverview();

  if (
    result.error
    || !result.data
  ) {
    errorMessage.value =
      result.error
      || "Unable to load the instructor archive.";

    isLoading.value =
      false;

    return;
  }

  overview.value =
    result.data;

  isLoading.value =
    false;
}

async function confirmPermanentDelete(): Promise<void> {
  if (
    !deleteTarget.value
    || !canConfirmDelete.value
  ) {
    return;
  }

  isDeleting.value =
    true;

  const target =
    deleteTarget.value;

  const result =
    target.kind
      === "assessment"
      ? await deleteArchivedAssessment(
          target.id,
        )
      : await deleteClosedSession(
          target.id,
        );

  if (
    result.error
    || !result.data
  ) {
    toast.add({
      title:
        "Permanent deletion failed",
      description:
        result.error
        || "The record could not be deleted.",
      color:
        "error",
    });

    isDeleting.value =
      false;

    return;
  }

  toast.add({
    title:
      "Record permanently deleted",
    description:
      result.data.message,
    color:
      "success",
  });

  deleteTarget.value =
    null;

  confirmationText.value =
    "";

  await loadArchive();

  isDeleting.value =
    false;
}

onMounted(
  loadArchive,
);
</script>

<template>
  <div class="page-stack">
    <PageHeader
      eyebrow="Records management"
      title="Archive"
      description="Review archived assessments and closed live sessions. Permanent deletion is restricted to records you own and cannot be undone."
    >
      <template #actions>
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-refresh-cw"
          :loading="isLoading"
          @click="loadArchive"
        >
          Refresh
        </UButton>
      </template>
    </PageHeader>

    <UAlert
      v-if="errorMessage"
      color="error"
      variant="soft"
      title="Archive could not be loaded"
      :description="errorMessage"
    >
      <template #actions>
        <UButton
          color="error"
          variant="soft"
          @click="loadArchive"
        >
          Try Again
        </UButton>
      </template>
    </UAlert>

    <UAlert
      color="warning"
      variant="soft"
      icon="i-lucide-triangle-alert"
      title="Permanent deletion"
      description="Deleting a record from this page cannot be reversed. Keep academic records archived when they are still covered by your institution's retention policy."
    />

    <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Archived assessments"
        :value="
          String(
            summary.archivedAssessments,
          )
        "
        icon="i-lucide-file-archive"
        tone="warning"
      />

      <StatCard
        label="Closed sessions"
        :value="
          String(
            summary.closedSessions,
          )
        "
        icon="i-lucide-radio-tower"
        tone="neutral"
      />

      <StatCard
        label="Linked history"
        :value="
          String(
            summary.blockedAssessments,
          )
        "
        icon="i-lucide-link-2"
        tone="info"
      />

      <StatCard
        label="Archive records"
        :value="
          String(
            summary.totalRecords,
          )
        "
        icon="i-lucide-archive"
        tone="primary"
      />
    </section>

    <UCard>
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div class="flex rounded-xl border border-default bg-elevated p-1">
          <button
            type="button"
            class="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold transition lg:flex-none"
            :class="
              activeSection
                === 'assessments'
                ? 'bg-primary text-white shadow-sm'
                : 'text-muted hover:text-highlighted'
            "
            @click="
              activeSection =
                'assessments'
            "
          >
            <UIcon
              name="i-lucide-file-archive"
              class="size-4"
            />

            Assessments

            <span class="rounded-md bg-black/10 px-1.5 py-0.5 text-xs">
              {{
                summary.archivedAssessments
              }}
            </span>
          </button>

          <button
            type="button"
            class="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold transition lg:flex-none"
            :class="
              activeSection
                === 'sessions'
                ? 'bg-primary text-white shadow-sm'
                : 'text-muted hover:text-highlighted'
            "
            @click="
              activeSection =
                'sessions'
            "
          >
            <UIcon
              name="i-lucide-history"
              class="size-4"
            />

            Sessions

            <span class="rounded-md bg-black/10 px-1.5 py-0.5 text-xs">
              {{
                summary.closedSessions
              }}
            </span>
          </button>
        </div>

        <UInput
          v-model="query"
          icon="i-lucide-search"
          :placeholder="
            activeSection
              === 'assessments'
              ? 'Search archived assessments'
              : 'Search assessment, class, or code'
          "
          class="w-full lg:ml-auto lg:max-w-md"
        />
      </div>
    </UCard>

    <div
      v-if="isLoading"
      class="grid gap-4 xl:grid-cols-2"
    >
      <USkeleton
        v-for="number in 4"
        :key="number"
        class="h-72 rounded-xl"
      />
    </div>

    <template v-else>
      <template
        v-if="
          activeSection
          === 'assessments'
        "
      >
        <EmptyPanel
          v-if="
            filteredAssessments.length
            === 0
          "
          icon="i-lucide-file-archive"
          title="No archived assessments"
          description="Assessments moved to Archive will appear here."
        >
          <template #actions>
            <UButton
              to="/instructor/assessments"
              color="neutral"
              variant="outline"
              icon="i-lucide-clipboard-list"
            >
              Open Assessments
            </UButton>
          </template>
        </EmptyPanel>

        <div
          v-else
          class="grid gap-4 xl:grid-cols-2"
        >
          <UCard
            v-for="assessment in filteredAssessments"
            :key="assessment.id"
          >
            <div class="flex items-start gap-4">
              <div class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <UIcon
                  name="i-lucide-file-archive"
                  class="size-5"
                />
              </div>

              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div class="min-w-0">
                    <h2 class="font-black text-highlighted">
                      {{ assessment.title }}
                    </h2>

                    <p class="mt-1 text-sm text-muted">
                      {{ assessment.subjectCode }}
                      ·
                      {{
                        typeLabel(
                          assessment.assessmentType,
                        )
                      }}
                    </p>
                  </div>

                  <StatusPill status="Archived" />
                </div>

                <div class="mt-5 grid grid-cols-3 gap-3">
                  <div class="rounded-lg bg-elevated p-3">
                    <p class="text-xs text-muted">
                      Questions
                    </p>

                    <p class="mt-1 font-black text-highlighted">
                      {{ assessment.questionCount }}
                    </p>
                  </div>

                  <div class="rounded-lg bg-elevated p-3">
                    <p class="text-xs text-muted">
                      Points
                    </p>

                    <p class="mt-1 font-black text-highlighted">
                      {{ assessment.totalPoints }}
                    </p>
                  </div>

                  <div class="rounded-lg bg-elevated p-3">
                    <p class="text-xs text-muted">
                      Linked sessions
                    </p>

                    <p class="mt-1 font-black text-highlighted">
                      {{ assessment.linkedSessionCount }}
                    </p>
                  </div>
                </div>

                <p class="mt-4 text-xs text-muted">
                  Archived:
                  {{
                    formatDate(
                      assessment.archivedAt
                      || assessment.updatedAt,
                    )
                  }}
                </p>

                <UAlert
                  v-if="
                    assessment.linkedSessionCount > 0
                    || assessment.assignedClassCount > 0
                  "
                  class="mt-4"
                  color="warning"
                  variant="soft"
                  title="Linked records will also be removed"
                  :description="`Permanent deletion will remove ${assessment.assignedClassCount} class schedule(s), ${assessment.linkedSessionCount} session record(s), their participants, and existing attempt records in one database transaction.`"
                />

                <div class="mt-5 flex flex-wrap gap-2">
                  <UButton
                    :to="`/instructor/assessments/${assessment.id}/preview`"
                    color="neutral"
                    variant="outline"
                    icon="i-lucide-eye"
                  >
                    View Assessment
                  </UButton>

                  <UButton
                    color="error"
                    variant="soft"
                    icon="i-lucide-trash-2"
                    @click="
                      openAssessmentDelete(
                        assessment,
                      )
                    "
                  >
                    Delete Permanently
                  </UButton>
                </div>
              </div>
            </div>
          </UCard>
        </div>
      </template>

      <template v-else>
        <EmptyPanel
          v-if="
            filteredSessions.length
            === 0
          "
          icon="i-lucide-history"
          title="No closed sessions"
          description="Ended and cancelled live sessions will appear here."
        >
          <template #actions>
            <UButton
              to="/instructor/sessions"
              color="neutral"
              variant="outline"
              icon="i-lucide-radio-tower"
            >
              Open Live Sessions
            </UButton>
          </template>
        </EmptyPanel>

        <div
          v-else
          class="grid gap-4 xl:grid-cols-2"
        >
          <UCard
            v-for="session in filteredSessions"
            :key="session.id"
          >
            <div class="flex items-start gap-4">
              <div class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-slate-500/10 text-muted">
                <UIcon
                  name="i-lucide-history"
                  class="size-5"
                />
              </div>

              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div class="min-w-0">
                    <h2 class="font-black text-highlighted">
                      {{ session.assessmentTitle }}
                    </h2>

                    <p class="mt-1 text-sm text-muted">
                      {{ session.subjectCode }}
                      ·
                      {{ session.section }}
                    </p>
                  </div>

                  <StatusPill
                    :status="session.status"
                  />
                </div>

                <div class="mt-4 flex flex-wrap gap-2">
                  <UBadge
                    color="neutral"
                    variant="soft"
                    class="font-mono tracking-[0.12em]"
                  >
                    {{
                      session.sessionCode
                        .replace(
                          /(\d{3})(\d{3})/,
                          "$1 $2",
                        )
                    }}
                  </UBadge>

                  <UBadge
                    color="info"
                    variant="soft"
                  >
                    {{ session.classroomName }}
                  </UBadge>
                </div>

                <div class="mt-5 grid grid-cols-2 gap-3">
                  <div class="rounded-lg bg-elevated p-3">
                    <p class="text-xs text-muted">
                      Participants
                    </p>

                    <p class="mt-1 font-black text-highlighted">
                      {{ session.participantCount }}
                    </p>
                  </div>

                  <div class="rounded-lg bg-elevated p-3">
                    <p class="text-xs text-muted">
                      Closed
                    </p>

                    <p class="mt-1 text-xs font-bold text-highlighted">
                      {{
                        formatDate(
                          session.closedAt,
                        )
                      }}
                    </p>
                  </div>
                </div>

                <div class="mt-5">
                  <UButton
                    color="error"
                    variant="soft"
                    icon="i-lucide-trash-2"
                    @click="
                      openSessionDelete(
                        session,
                      )
                    "
                  >
                    Delete Permanently
                  </UButton>
                </div>
              </div>
            </div>
          </UCard>
        </div>
      </template>
    </template>

    <Teleport to="body">
      <div
        v-if="deleteTarget"
        class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm"
        @click.self="closeDeleteDialog"
      >
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="archive-delete-title"
          class="w-full max-w-lg rounded-xl border border-default bg-default p-6 shadow-2xl"
        >
          <div class="flex items-start gap-4">
            <div class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-error/10 text-error">
              <UIcon
                name="i-lucide-triangle-alert"
                class="size-5"
              />
            </div>

            <div class="min-w-0 flex-1">
              <h2
                id="archive-delete-title"
                class="text-lg font-black text-highlighted"
              >
                Permanently delete
                {{
                  deleteTarget.kind
                    === "assessment"
                    ? "assessment"
                    : "session"
                }}?
              </h2>

              <p class="mt-2 text-sm leading-6 text-muted">
                <strong class="text-highlighted">
                  {{ deleteTarget.title }}
                </strong>

                <br>

                {{ deleteTarget.detail }}
              </p>
            </div>

            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-x"
              aria-label="Close confirmation"
              :disabled="isDeleting"
              @click="closeDeleteDialog"
            />
          </div>

          <UAlert
            class="mt-5"
            color="error"
            variant="soft"
            title="This action cannot be undone"
            :description="
              deleteTarget.kind === 'assessment'
                ? 'The assessment, class schedules, linked sessions, participants, questions, and existing attempt records will be removed together. Any active participant will lose access immediately.'
                : 'The closed session, participants, and existing attempt records will be removed together.'
            "
          />

          <div class="mt-5">
            <label
              for="archive-delete-confirmation"
              class="text-sm font-bold text-highlighted"
            >
              Type
              <span class="font-mono text-error">
                DELETE
              </span>
              to continue
            </label>

            <UInput
              id="archive-delete-confirmation"
              v-model="confirmationText"
              class="mt-2 w-full"
              placeholder="DELETE"
              autocomplete="off"
              :disabled="isDeleting"
              @keyup.enter="
                confirmPermanentDelete
              "
            />
          </div>

          <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <UButton
              color="neutral"
              variant="outline"
              :disabled="isDeleting"
              @click="closeDeleteDialog"
            >
              Cancel
            </UButton>

            <UButton
              color="error"
              icon="i-lucide-trash-2"
              :loading="isDeleting"
              :disabled="
                !canConfirmDelete
              "
              @click="
                confirmPermanentDelete
              "
            >
              Delete Permanently
            </UButton>
          </div>
        </section>
      </div>
    </Teleport>
  </div>
</template>
