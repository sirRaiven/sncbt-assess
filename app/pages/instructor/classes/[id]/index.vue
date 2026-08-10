<script setup lang="ts">
import type {
  InstructorClassroom,
} from "~/types/classroom";

definePageMeta({
  layout: "instructor",
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
  getInstructorClass,
  archiveClass,
  reactivateClass,
  regenerateCode,
  setCodeEnabled,
} = useClassrooms();

const classroom =
  ref<InstructorClassroom | null>(null);

const isLoading = ref(true);
const isUpdating = ref(false);
const errorMessage = ref("");

async function loadClass(): Promise<void> {
  isLoading.value = true;
  errorMessage.value = "";

  const result =
    await getInstructorClass(
      classroomId.value,
    );

  if (
    result.error
    || !result.data
  ) {
    errorMessage.value =
      result.error
      || "Unable to load the class.";

    isLoading.value = false;
    return;
  }

  classroom.value =
    result.data.classroom;

  isLoading.value = false;
}

async function runClassAction(
  action:
    | "archive"
    | "reactivate"
    | "regenerate"
    | "toggle-code",
): Promise<void> {
  if (!classroom.value) {
    return;
  }

  isUpdating.value = true;

  let result;

  if (action === "archive") {
    result =
      await archiveClass(
        classroom.value.id,
      );
  } else if (
    action === "reactivate"
  ) {
    result =
      await reactivateClass(
        classroom.value.id,
      );
  } else if (
    action === "regenerate"
  ) {
    result =
      await regenerateCode(
        classroom.value.id,
      );
  } else {
    result =
      await setCodeEnabled(
        classroom.value.id,
        !classroom.value.join_enabled,
      );
  }

  if (
    result.error
    || !result.data
  ) {
    toast.add({
      title:
        "Class action failed",
      description:
        result.error
        || "The action could not be completed.",
      color:
        "error",
    });

    isUpdating.value = false;
    return;
  }

  toast.add({
    title:
      action === "archive"
        ? "Class archived"
        : "Class updated",
    description:
      result.data.message,
    color:
      "success",
  });

  if (action === "archive") {
    isUpdating.value = false;

    await navigateTo(
      "/instructor/archive?section=classes",
    );

    return;
  }

  await loadClass();

  isUpdating.value = false;
}

function copyCode(): void {
  if (!classroom.value) {
    return;
  }

  void navigator.clipboard
    .writeText(
      classroom.value.join_code,
    );

  toast.add({
    title:
      "Class code copied",
    description:
      classroom.value.join_code,
    color:
      "success",
  });
}

onMounted(
  loadClass,
);
</script>

<template>
  <div class="page-stack">
    <PortalBackButton
      fallback-to="/instructor/classes"
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
      <USkeleton class="h-48 rounded-xl" />
      <USkeleton class="h-72 rounded-xl" />
    </div>

    <template v-else-if="classroom">
      <section class="rounded-xl bg-gradient-to-r from-brand-900 via-brand-700 to-indigo-700 p-6 text-white sm:p-8">
        <div class="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
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

              <StatusPill
                :status="classroom.status"
              />
            </div>

            <h1 class="mt-4 text-3xl font-black tracking-tight">
              {{ classroom.name }}
            </h1>

            <p class="mt-2 text-sm text-blue-100">
              {{ classroom.school_year }}
              ·
              {{ classroom.semester }}
            </p>
          </div>

          <div class="flex flex-wrap gap-3">
            <UButton
              :to="`/instructor/classes/${classroom.id}/students`"
              color="neutral"
              variant="solid"
              icon="i-lucide-users"
              class="bg-white text-brand-800 hover:bg-blue-50"
            >
              Manage Students
            </UButton>

            <UButton
              :to="`/instructor/classes/${classroom.id}/edit`"
              color="neutral"
              variant="outline"
              icon="i-lucide-pencil"
              class="border-white/30 text-white hover:bg-white/10"
            >
              Edit Class
            </UButton>
          </div>
        </div>
      </section>

      <section class="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Enrolled students"
          :value="String(classroom.memberCounts.active)"
          icon="i-lucide-users"
          tone="primary"
        />

        <StatCard
          label="Pending requests"
          :value="String(classroom.memberCounts.pending)"
          icon="i-lucide-user-round-plus"
          tone="warning"
        />

        <StatCard
          label="Membership history"
          :value="
            String(
              classroom.memberCounts.rejected
              + classroom.memberCounts.removed
              + classroom.memberCounts.left,
            )
          "
          icon="i-lucide-history"
          tone="neutral"
        />
      </section>

      <section class="grid gap-6 xl:grid-cols-[1fr_360px]">
        <UCard>
          <template #header>
            <h2 class="font-bold text-highlighted">
              Class information
            </h2>
          </template>

          <dl class="grid gap-5 sm:grid-cols-2">
            <div>
              <dt class="text-sm text-muted">
                Subject code
              </dt>
              <dd class="mt-1 font-semibold text-highlighted">
                {{ classroom.subject_code }}
              </dd>
            </div>

            <div>
              <dt class="text-sm text-muted">
                Section
              </dt>
              <dd class="mt-1 font-semibold text-highlighted">
                {{ classroom.section }}
              </dd>
            </div>

            <div>
              <dt class="text-sm text-muted">
                School year
              </dt>
              <dd class="mt-1 font-semibold text-highlighted">
                {{ classroom.school_year }}
              </dd>
            </div>

            <div>
              <dt class="text-sm text-muted">
                Semester
              </dt>
              <dd class="mt-1 font-semibold text-highlighted">
                {{ classroom.semester }}
              </dd>
            </div>
          </dl>

          <USeparator class="my-6" />

          <div>
            <p class="text-sm text-muted">
              Description
            </p>

            <p class="mt-2 whitespace-pre-line text-sm leading-6 text-highlighted">
              {{
                classroom.description
                || "No class description was provided."
              }}
            </p>
          </div>

          <USeparator class="my-6" />

          <EmptyPanel
            icon="i-lucide-clipboard-list"
            title="Assessments begin in Phase 2"
            description="After classroom management is verified, published assessments will be assigned and displayed here."
          />
        </UCard>

        <div class="space-y-6">
          <UCard>
            <template #header>
              <div class="flex items-center justify-between gap-3">
                <h2 class="font-bold text-highlighted">
                  Class code
                </h2>

                <StatusPill
                  :status="
                    classroom.join_enabled
                      ? 'Active'
                      : 'Disabled'
                  "
                />
              </div>
            </template>

            <div class="rounded-xl bg-slate-950 p-6 text-center text-white">
              <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                Student enrollment code
              </p>

              <p class="mt-3 font-mono text-3xl font-black tracking-[0.16em]">
                {{ classroom.join_code }}
              </p>
            </div>

            <div class="mt-4 grid grid-cols-2 gap-3">
              <UButton
                color="neutral"
                variant="outline"
                icon="i-lucide-copy"
                :disabled="!classroom.join_enabled"
                @click="copyCode"
              >
                Copy
              </UButton>

              <UButton
                color="neutral"
                variant="outline"
                icon="i-lucide-refresh-cw"
                :loading="isUpdating"
                :disabled="
                  classroom.status === 'archived'
                "
                @click="
                  runClassAction('regenerate')
                "
              >
                Regenerate
              </UButton>
            </div>

            <UButton
              block
              color="neutral"
              variant="soft"
              class="mt-3"
              :icon="
                classroom.join_enabled
                  ? 'i-lucide-lock-keyhole'
                  : 'i-lucide-key-round'
              "
              :loading="isUpdating"
              :disabled="
                classroom.status === 'archived'
              "
              @click="
                runClassAction('toggle-code')
              "
            >
              {{
                classroom.join_enabled
                  ? "Disable Enrollment Code"
                  : "Enable Enrollment Code"
              }}
            </UButton>
          </UCard>

          <UCard>
            <template #header>
              <h2 class="font-bold text-highlighted">
                Class status
              </h2>
            </template>

            <UAlert
              v-if="
                classroom.status === 'active'
              "
              color="info"
              variant="soft"
              title="Active class"
              description="Students with an active membership can open this class."
            />

            <UAlert
              v-else
              color="warning"
              variant="soft"
              title="Archived class"
              description="New membership requests and enrollment-code access are disabled."
            />

            <UButton
              block
              class="mt-4"
              :color="
                classroom.status === 'active'
                  ? 'warning'
                  : 'success'
              "
              variant="soft"
              :icon="
                classroom.status === 'active'
                  ? 'i-lucide-archive'
                  : 'i-lucide-archive-restore'
              "
              :loading="isUpdating"
              @click="
                runClassAction(
                  classroom.status === 'active'
                    ? 'archive'
                    : 'reactivate',
                )
              "
            >
              {{
                classroom.status === "active"
                  ? "Archive Class"
                  : "Reactivate Class"
              }}
            </UButton>
          </UCard>
        </div>
      </section>
    </template>
  </div>
</template>
