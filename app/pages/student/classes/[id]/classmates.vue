<script setup lang="ts">
import type {
  Classroom,
  StudentClassMembership,
  StudentClassmate,
} from "~/types/classroom";

definePageMeta({
  layout:
    "student",
  middleware: [
    "student",
  ],
});

useSeoMeta({
  title:
    "Classmates",
});

const route =
  useRoute();

const toast =
  useToast();

const classroomId =
  computed(
    () =>
      String(
        route.params.id,
      ),
  );

const {
  getStudentClass,
  listClassmates,
  leaveClass,
} = useClassrooms();

const classroom =
  ref<Classroom | null>(
    null,
  );

const membership =
  ref<StudentClassMembership | null>(
    null,
  );

const instructorName =
  ref("");

const classmates =
  ref<StudentClassmate[]>(
    [],
  );

const query =
  ref("");

const isLoading =
  ref(true);

const isRefreshing =
  ref(false);

const isLeaving =
  ref(false);

const errorMessage =
  ref("");

const leaveModalOpen =
  ref(false);

const filteredClassmates =
  computed(
    () => {
      const keyword =
        query.value
          .trim()
          .toLowerCase();

      if (!keyword) {
        return classmates.value;
      }

      return classmates.value
        .filter(
          (classmate) =>
            classmate.name
              .toLowerCase()
              .includes(
                keyword,
              ),
        );
    },
  );

function formatDate(
  value: string | null,
): string {
  if (!value) {
    return "Not recorded";
  }

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

function classmateInitials(
  name: string,
): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map(
      (part) =>
        part.charAt(0),
    )
    .slice(
      0,
      2,
    )
    .join("")
    .toUpperCase()
    || "ST";
}

async function loadClassmates(
  refreshOnly = false,
): Promise<void> {
  if (refreshOnly) {
    isRefreshing.value =
      true;
  }

  const result =
    await listClassmates(
      classroomId.value,
    );

  if (
    result.error
    || !result.data
  ) {
    errorMessage.value =
      result.error
      || "Unable to load classmates.";

    if (refreshOnly) {
      isRefreshing.value =
        false;
    }

    return;
  }

  classmates.value =
    result.data.classmates;

  if (refreshOnly) {
    isRefreshing.value =
      false;
  }
}

async function loadClass():
  Promise<void> {
  isLoading.value =
    true;

  errorMessage.value =
    "";

  const classResult =
    await getStudentClass(
      classroomId.value,
    );

  if (
    classResult.error
    || !classResult.data
    || classResult.data
      .classroom.status
      !== "active"
  ) {
    isLoading.value =
      false;

    toast.add({
      title:
        "Class unavailable",
      description:
        "This class has been archived and is no longer available in My Classes.",
      color:
        "neutral",
    });

    await navigateTo(
      "/student/classes",
      {
        replace:
          true,
      },
    );

    return;
  }

  classroom.value =
    classResult.data.classroom;

  membership.value =
    classResult.data.membership;

  instructorName.value =
    classResult.data
      .instructor.name;

  await loadClassmates();

  isLoading.value =
    false;
}

async function leave():
  Promise<void> {
  if (!classroom.value) {
    return;
  }

  isLeaving.value =
    true;

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

    isLeaving.value =
      false;

    return;
  }

  leaveModalOpen.value =
    false;

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
    <PortalBackButton
      fallback-to="/student/classes"
    />

    <UAlert
      v-if="errorMessage"
      color="error"
      variant="soft"
      title="Classmates could not be loaded"
      :description="errorMessage"
    />

    <div
      v-if="isLoading"
      class="space-y-5"
    >
      <USkeleton class="h-44 rounded-xl" />
      <USkeleton class="h-12 rounded-xl" />
      <USkeleton class="h-96 rounded-xl" />
    </div>

    <template
      v-else-if="
        classroom
        && membership
      "
    >
      <section class="relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-800 via-blue-700 to-violet-700 p-6 text-white shadow-xl shadow-primary/15 ring-1 ring-white/10 sm:p-8 dark:shadow-black/25">
        <div class="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-white/10 blur-3xl" />
        <div class="pointer-events-none absolute -bottom-24 left-1/3 size-64 rounded-full bg-cyan-300/10 blur-3xl" />

        <div class="absolute right-4 top-4 z-10 sm:right-6 sm:top-6">
          <UPopover
            :content="{
              align: 'end',
              side: 'bottom',
              sideOffset: 8,
            }"
          >
            <UButton
              type="button"
              color="neutral"
              variant="solid"
              size="sm"
              square
              icon="i-lucide-info"
              aria-label="View class information"
              class="rounded-full bg-slate-950 text-white shadow-sm ring-1 ring-white/15 hover:bg-slate-900 focus-visible:ring-2 focus-visible:ring-white/80"
            />

            <template #content>
              <div class="w-[min(22rem,calc(100vw-2rem))] p-4 sm:p-5">
                <div class="flex items-start gap-3">
                  <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <UIcon
                      name="i-lucide-info"
                      class="size-4"
                    />
                  </div>

                  <div class="min-w-0">
                    <h2 class="font-bold text-highlighted">
                      Class information
                    </h2>

                    <p class="mt-1 text-xs leading-5 text-muted">
                      Instructor, subject, and academic details for this classroom.
                    </p>
                  </div>
                </div>

                <dl class="mt-4 grid grid-cols-2 gap-x-4 gap-y-4">
                  <div>
                    <dt class="text-xs text-muted">
                      Subject code
                    </dt>

                    <dd class="mt-1 text-sm font-semibold text-highlighted">
                      {{ classroom.subject_code }}
                    </dd>
                  </div>

                  <div>
                    <dt class="text-xs text-muted">
                      Section
                    </dt>

                    <dd class="mt-1 text-sm font-semibold text-highlighted">
                      {{ classroom.section }}
                    </dd>
                  </div>

                  <div>
                    <dt class="text-xs text-muted">
                      School year
                    </dt>

                    <dd class="mt-1 text-sm font-semibold text-highlighted">
                      {{ classroom.school_year }}
                    </dd>
                  </div>

                  <div>
                    <dt class="text-xs text-muted">
                      Semester
                    </dt>

                    <dd class="mt-1 text-sm font-semibold text-highlighted">
                      {{ classroom.semester }}
                    </dd>
                  </div>
                </dl>

                <USeparator class="my-4" />

                <div>
                  <p class="text-xs font-medium text-muted">
                    Instructor
                  </p>

                  <p class="mt-1.5 text-sm font-semibold text-highlighted">
                    {{ instructorName }}
                  </p>
                </div>

                <USeparator class="my-4" />

                <div>
                  <p class="text-xs font-medium text-muted">
                    Description
                  </p>

                  <p class="mt-1.5 whitespace-pre-line text-sm leading-6 text-highlighted">
                    {{
                      classroom.description
                      || "No class description was provided."
                    }}
                  </p>
                </div>
              </div>
            </template>
          </UPopover>
        </div>

        <div class="relative min-w-0 pr-12 sm:pr-14">
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
          </div>

          <h1 class="mt-4 text-2xl font-black tracking-tight sm:text-3xl">
            {{ classroom.name }}
          </h1>

          <p class="mt-2 text-sm text-blue-100">
            <span class="font-semibold text-white">
              Instructor:
            </span>
            {{ instructorName }}
            ·
            {{ classroom.school_year }}
            ·
            {{ classroom.semester }}
          </p>
        </div>
      </section>

      <StudentClassNavigation
        :classroom-id="classroom.id"
        active="classmates"
        :classmate-count="classmates.length"
      />

      <div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <div>
          <UCard
            :ui="{
              body: 'p-0 sm:p-0',
            }"
          >
            <template #header>
              <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div class="flex flex-wrap items-center gap-2">
                    <h2 class="font-black text-highlighted">
                      Classmates
                    </h2>

                    <UBadge
                      color="neutral"
                      variant="soft"
                    >
                      {{ classmates.length }}
                    </UBadge>
                  </div>

                  <p class="mt-1 text-sm text-muted">
                    Other active Students who are enrolled in this class.
                  </p>
                </div>

                <div class="flex w-full flex-col gap-2 sm:flex-row md:w-auto">
                  <UInput
                    v-model="query"
                    icon="i-lucide-search"
                    placeholder="Search classmates"
                    aria-label="Search classmates"
                    class="w-full md:w-64"
                  />

                  <UButton
                    type="button"
                    color="neutral"
                    variant="outline"
                    icon="i-lucide-refresh-cw"
                    :loading="isRefreshing"
                    @click="loadClassmates(true)"
                  >
                    Refresh
                  </UButton>
                </div>
              </div>
            </template>

            <EmptyPanel
              v-if="
                classmates.length
                === 0
              "
              icon="i-lucide-users-round"
              title="No classmates yet"
              description="You are currently the only active Student in this class."
              class="m-5"
            />

            <EmptyPanel
              v-else-if="
                filteredClassmates.length
                === 0
              "
              icon="i-lucide-search-x"
              title="No classmates found"
              description="Try another name."
              class="m-5"
            />

            <ul
              v-else
              class="divide-y divide-default"
              aria-label="Classmates"
            >
              <li
                v-for="(classmate, index) in filteredClassmates"
                :key="`${classmate.name}-${index}`"
                class="flex min-w-0 items-center gap-4 px-5 py-4 sm:px-6"
              >
                <UAvatar
                  :src="classmate.avatarUrl || undefined"
                  :text="classmateInitials(classmate.name)"
                  :alt="classmate.name"
                  size="lg"
                  class="shrink-0"
                />

                <div class="min-w-0 flex-1">
                  <p class="truncate font-bold text-highlighted">
                    {{ classmate.name }}
                  </p>

                  <p class="mt-0.5 text-xs text-muted">
                    Classmate
                  </p>
                </div>
              </li>
            </ul>
          </UCard>
        </div>

        <div class="space-y-5">
          <UCard>
            <template #header>
              <h2 class="font-black text-highlighted">
                Membership
              </h2>
            </template>

            <div class="space-y-4">
              <div class="flex justify-between gap-4">
                <span class="text-sm text-muted">
                  Status
                </span>

                <StatusPill
                  :status="
                    membership.membership_status
                  "
                />
              </div>

              <div class="flex justify-between gap-4">
                <span class="text-sm text-muted">
                  Joined
                </span>

                <span class="text-right text-sm font-bold text-highlighted">
                  {{
                    formatDate(
                      membership.approved_at
                      || membership.created_at,
                    )
                  }}
                </span>
              </div>
            </div>

            <UButton
              class="mt-5"
              block
              color="error"
              variant="soft"
              icon="i-lucide-log-out"
              @click="
                leaveModalOpen = true
              "
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

    <ConfirmationModal
      v-model:open="
        leaveModalOpen
      "
      title="Leave this class?"
      description="You will lose access to the class and its active assessments. Rejoining may require instructor approval."
      confirm-label="Leave Class"
      confirm-color="error"
      icon="i-lucide-log-out"
      :loading="isLeaving"
      @confirm="leave"
    />
  </div>
</template>
