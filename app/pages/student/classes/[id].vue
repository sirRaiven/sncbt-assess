<script setup lang="ts">
import type {
  Classroom,
  StudentClassMembership,
} from "~/types/classroom";

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

const classroom =
  ref<Classroom | null>(null);

const membership =
  ref<StudentClassMembership | null>(null);

const instructorName = ref("");
const isLoading = ref(true);
const isLeaving = ref(false);
const errorMessage = ref("");

async function loadClass(): Promise<void> {
  isLoading.value = true;
  errorMessage.value = "";

  const result =
    await getStudentClass(
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

  membership.value =
    result.data.membership;

  instructorName.value =
    result.data.instructor.name;

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

          <USeparator class="my-6" />

          <EmptyPanel
            icon="i-lucide-clipboard-list"
            title="No assessments connected yet"
            description="Assessment assignment and availability will be implemented in Phase 2."
          />
        </UCard>

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
                      membership
                        ?.membership_status
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
