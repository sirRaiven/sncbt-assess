<script setup lang="ts">
import type {
  FormSubmitEvent,
} from "@nuxt/ui";

import {
  z,
} from "zod";

import type {
  Classroom,
  StudentClassListItem,
} from "~/types/classroom";

definePageMeta({
  layout: "student",
  middleware: ["student"],
});

useSeoMeta({
  title: "My classes",
});

const route = useRoute();

const {
  joinClass,
  listStudentClasses,
} = useClassrooms();

const classes =
  ref<StudentClassListItem[]>([]);

const isLoading = ref(true);
const errorMessage = ref("");
const query = ref("");

const joinModalOpen = ref(false);
const isJoining = ref(false);
const joinErrorMessage = ref("");
const joinSuccessMessage = ref("");
const matchedClass =
  ref<Classroom | null>(null);
const matchedInstructorName = ref("");
const joinedImmediately = ref(false);

const joinSchema = z.object({
  joinCode: z
    .string()
    .trim()
    .transform(
      (value) =>
        value
          .toUpperCase()
          .replace(/\s+/g, ""),
    )
    .refine(
      (value) =>
        /^SNC-[A-Z0-9]{6}$/.test(value),
      "Enter a valid class code such as SNC-7K2P9A.",
    ),
});

type JoinClassSchema =
  z.output<typeof joinSchema>;

const joinState = reactive({
  joinCode: "",
});

const filteredClasses = computed(() => {
  const keyword =
    query.value
      .trim()
      .toLowerCase();

  if (!keyword) {
    return classes.value;
  }

  return classes.value.filter(
    (item) =>
      [
        item.classroom.name,
        item.classroom.subject_code,
        item.classroom.section,
        item.instructor.name,
      ]
        .join(" ")
        .toLowerCase()
        .includes(keyword),
  );
});

function resetJoinForm(): void {
  joinState.joinCode = "";
  joinErrorMessage.value = "";
  joinSuccessMessage.value = "";
  matchedClass.value = null;
  matchedInstructorName.value = "";
  joinedImmediately.value = false;
  isJoining.value = false;
}

function openJoinModal(
  initialCode = "",
): void {
  resetJoinForm();

  joinState.joinCode =
    initialCode
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "");

  joinModalOpen.value = true;
}

async function loadClasses(): Promise<void> {
  isLoading.value = true;
  errorMessage.value = "";

  const result =
    await listStudentClasses();

  if (
    result.error
    || !result.data
  ) {
    errorMessage.value =
      result.error
      || "Unable to load your classes.";

    isLoading.value = false;
    return;
  }

  // Defense in depth: the backend already excludes archived classes.
  // Keep the Student UI safe if a stale Edge Function is still cached/deployed.
  classes.value =
    result.data.classes.filter(
      (item) =>
        item.classroom.status
        === "active",
    );

  isLoading.value = false;
}

async function submitJoin(
  event: FormSubmitEvent<JoinClassSchema>,
): Promise<void> {
  isJoining.value = true;
  joinErrorMessage.value = "";
  joinSuccessMessage.value = "";
  matchedClass.value = null;
  matchedInstructorName.value = "";
  joinedImmediately.value = false;

  const result =
    await joinClass(
      event.data.joinCode,
    );

  if (
    result.error
    || !result.data
  ) {
    joinErrorMessage.value =
      result.error
      || "Unable to join the class.";

    isJoining.value = false;
    return;
  }

  matchedClass.value =
    result.data.classroom;

  matchedInstructorName.value =
    result.data.instructor.name;

  joinedImmediately.value =
    result.data.membership.membership_status
    === "active";

  joinSuccessMessage.value =
    joinedImmediately.value
      ? "You joined the class successfully and can open it now."
      : "Your request was sent to the instructor for approval.";

  isJoining.value = false;

  await loadClasses();
}

watch(
  joinModalOpen,
  (open) => {
    if (!open) {
      resetJoinForm();
    }
  },
);

onMounted(
  async () => {
    await loadClasses();

    const sharedJoinCode =
      typeof route.query.join === "string"
        ? route.query.join
        : "";

    if (sharedJoinCode) {
      openJoinModal(
        sharedJoinCode,
      );
    }
  },
);
</script>

<template>
  <div class="page-stack">
    <PageHeader
      :breadcrumbs="[
        { label: 'Overview', to: '/student/dashboard', icon: 'i-lucide-layout-dashboard' },
        { label: 'My Classes' },
      ]"
      eyebrow="Learning spaces"
      title="My classes"
      description="Open your active classes and pending join requests."
    >
      <template #actions>
        <UButton
          type="button"
          icon="i-lucide-plus"
          @click="openJoinModal()"
        >
          Join Class
        </UButton>
      </template>
    </PageHeader>

    <UAlert
      v-if="errorMessage"
      color="error"
      variant="soft"
      title="Classes could not be loaded"
      :description="errorMessage"
    />

    <UCard>
      <div class="grid gap-3 lg:grid-cols-[1fr_auto]">
        <UInput
          v-model="query"
          icon="i-lucide-search"
          placeholder="Search class or instructor"
          class="w-full"
        />

        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-refresh-cw"
          :loading="isLoading"
          @click="loadClasses"
        >
          Refresh
        </UButton>
      </div>
    </UCard>

    <div
      v-if="isLoading"
      class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
    >
      <USkeleton
        v-for="number in 3"
        :key="number"
        class="h-80 rounded-xl"
      />
    </div>

    <EmptyPanel
      v-else-if="filteredClasses.length === 0"
      icon="i-lucide-book-open"
      title="No classes yet"
      description="Enter a class code from your instructor to join a class."
    >
      <template #actions>
        <UButton
          type="button"
          icon="i-lucide-plus"
          @click="openJoinModal()"
        >
          Join Class
        </UButton>
      </template>
    </EmptyPanel>

    <div
      v-else
      class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
    >
      <UCard
        v-for="item in filteredClasses"
        :key="item.membership.id"
        class="overflow-hidden"
        :ui="{
          body: 'p-0 sm:p-0',
        }"
      >
        <div class="relative min-h-40 border-b border-default bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-5">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-2">
              <div class="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/15">
                <UIcon
                  name="i-lucide-school"
                  class="size-5"
                />
              </div>

              <UBadge
                color="neutral"
                variant="soft"
              >
                Class
              </UBadge>
            </div>

            <StatusPill
              :status="
                item.membership.membership_status === 'pending'
                  ? 'Pending approval'
                  : item.classroom.status
              "
            />
          </div>

          <NuxtLink
            v-if="item.membership.membership_status !== 'pending'"
            :to="`/student/classes/${item.classroom.id}`"
            class="group mt-6 block rounded-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/30"
            :aria-label="`Open ${item.classroom.name}`"
          >
            <h2 class="line-clamp-2 text-xl font-black leading-tight text-highlighted transition group-hover:text-primary">
              {{ item.classroom.name }}
            </h2>

            <p class="mt-2 text-sm font-medium text-muted">
              {{ item.classroom.subject_code }}
              ·
              {{ item.classroom.section }}
            </p>
          </NuxtLink>

          <div
            v-else
            class="mt-6"
          >
            <h2 class="line-clamp-2 text-xl font-black leading-tight text-highlighted">
              {{ item.classroom.name }}
            </h2>

            <p class="mt-2 text-sm font-medium text-muted">
              {{ item.classroom.subject_code }}
              ·
              {{ item.classroom.section }}
            </p>
          </div>
        </div>

        <div class="p-5">
          <div class="flex min-h-7 flex-wrap gap-2">
            <UBadge
              color="neutral"
              variant="soft"
              icon="i-lucide-user-round"
            >
              Instructor:
              {{ item.instructor.name }}
            </UBadge>

            <UBadge
              color="neutral"
              variant="soft"
              icon="i-lucide-calendar-range"
            >
              {{ item.classroom.school_year }}
              ·
              {{ item.classroom.semester }}
            </UBadge>
          </div>

          <UAlert
            v-if="item.membership.membership_status === 'pending'"
            class="mt-5"
            color="warning"
            variant="soft"
            title="Awaiting approval"
            description="The instructor must approve your membership before the class can be opened."
          />

          <UButton
            v-else
            :to="`/student/classes/${item.classroom.id}`"
            block
            variant="soft"
            trailing-icon="i-lucide-arrow-right"
            class="mt-5"
          >
            Open Class
          </UButton>
        </div>
      </UCard>
    </div>

    <UModal
      v-model:open="joinModalOpen"
      title="Join a class"
      description="Enter the class code provided by your instructor."
      :dismissible="!isJoining"
      :close="!isJoining"
      :ui="{
        content: 'w-[calc(100%-1rem)] sm:max-w-xl',
        header: 'border-b border-default px-4 py-4 sm:px-6',
        body: 'px-4 py-5 sm:px-6',
      }"
    >
      <template #body>
        <div class="text-center">
          <div class="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <UIcon
              name="i-lucide-school"
              class="size-6"
            />
          </div>

          <h2 class="mt-4 text-lg font-black text-highlighted">
            Enter the class code
          </h2>

          <p class="mt-1.5 text-sm leading-6 text-muted">
            Class codes begin with SNC followed by six letters or numbers.
            Most classes let you join immediately, while some require instructor approval.
          </p>
        </div>

        <UAlert
          v-if="joinErrorMessage"
          class="mt-5"
          color="error"
          variant="soft"
          title="Unable to join class"
          :description="joinErrorMessage"
        />

        <UAlert
          v-if="joinSuccessMessage"
          class="mt-5"
          color="success"
          variant="soft"
          :title="joinedImmediately ? 'Class joined' : 'Request sent'"
          :description="joinSuccessMessage"
        />

        <UForm
          v-if="!matchedClass"
          :schema="joinSchema"
          :state="joinState"
          class="mt-6"
          @submit="submitJoin"
        >
          <UFormField
            label="Class code"
            name="joinCode"
          >
            <UInput
              v-model="joinState.joinCode"
              size="xl"
              class="w-full text-center font-mono uppercase tracking-[0.14em]"
              placeholder="SNC-7K2P9A"
              autocomplete="off"
              autofocus
            />
          </UFormField>

          <UButton
            type="submit"
            block
            size="lg"
            class="mt-4"
            :loading="isJoining"
            icon="i-lucide-log-in"
          >
            Join Class
          </UButton>
        </UForm>

        <div
          v-if="matchedClass"
          class="mt-5 rounded-xl border border-success/30 bg-success/5 p-4 sm:p-5"
        >
          <div class="flex items-start gap-4">
            <div class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success">
              <UIcon
                name="i-lucide-circle-check-big"
                class="size-5"
              />
            </div>

            <div class="min-w-0 flex-1">
              <p class="font-black text-highlighted">
                {{ matchedClass.name }}
              </p>

              <p class="mt-1 text-sm text-muted">
                {{ matchedClass.subject_code }}
                ·
                {{ matchedClass.section }}
              </p>

              <p class="mt-2 text-sm text-muted">
                <span class="font-semibold text-highlighted">
                  Instructor:
                </span>
                {{ matchedInstructorName }}
              </p>

              <StatusPill
                class="mt-3"
                :status="joinedImmediately ? 'Active' : 'Pending approval'"
              />

              <div class="mt-4 flex flex-col gap-2 sm:flex-row">
                <UButton
                  v-if="joinedImmediately"
                  :to="`/student/classes/${matchedClass.id}`"
                  trailing-icon="i-lucide-arrow-right"
                  @click="joinModalOpen = false"
                >
                  Open Class
                </UButton>

                <UButton
                  color="neutral"
                  variant="outline"
                  @click="joinModalOpen = false"
                >
                  {{ joinedImmediately ? "Close" : "Done" }}
                </UButton>
              </div>
            </div>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
