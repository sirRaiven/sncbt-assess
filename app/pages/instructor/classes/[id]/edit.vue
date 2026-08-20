<script setup lang="ts">
import type {
  FormSubmitEvent,
} from "@nuxt/ui";

import {
  z,
} from "zod";

definePageMeta({
  layout: "instructor",
});

useSeoMeta({
  title: "Edit class",
});

const route = useRoute();
const toast = useToast();

const classroomId = computed(
  () => String(route.params.id),
);

const {
  getInstructorClass,
  updateClass,
} = useClassrooms();

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(2)
    .max(150),

  subjectCode: z
    .string()
    .trim()
    .min(2)
    .max(30),

  section: z
    .string()
    .trim()
    .min(1)
    .max(80),

  description: z
    .string()
    .trim()
    .max(2000),

  schoolYear: z
    .string()
    .regex(
      /^[0-9]{4}-[0-9]{4}$/,
      "Use the format 2026-2027.",
    ),

  semester: z.enum([
    "First Semester",
    "Second Semester",
    "Summer",
  ]),
});

type EditClassSchema =
  z.output<typeof schema>;

const state = reactive<EditClassSchema>({
  name: "",
  subjectCode: "",
  section: "",
  description: "",
  schoolYear: "2026-2027",
  semester: "First Semester",
});

const isLoading = ref(true);
const isSubmitting = ref(false);
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

  const classroom =
    result.data.classroom;

  state.name =
    classroom.name;

  state.subjectCode =
    classroom.subject_code;

  state.section =
    classroom.section;

  state.description =
    classroom.description
    || "";

  state.schoolYear =
    classroom.school_year;

  state.semester =
    classroom.semester;

  isLoading.value = false;
}

async function submit(
  event: FormSubmitEvent<EditClassSchema>,
): Promise<void> {
  isSubmitting.value = true;
  errorMessage.value = "";

  const result =
    await updateClass(
      classroomId.value,
      {
        name:
          event.data.name,

        subjectCode:
          event.data.subjectCode,

        section:
          event.data.section,

        description:
          event.data.description
          || null,

        schoolYear:
          event.data.schoolYear,

        semester:
          event.data.semester,
      },
    );

  if (
    result.error
    || !result.data
  ) {
    errorMessage.value =
      result.error
      || "Unable to update the class.";

    isSubmitting.value = false;
    return;
  }

  toast.add({
    title:
      "Class updated",
    description:
      result.data.message,
    color:
      "success",
  });

  await navigateTo(
    `/instructor/classes/${classroomId.value}`,
  );
}

onMounted(
  loadClass,
);
</script>

<template>
  <div class="page-stack">
    <PageHeader
      :breadcrumbs="[
        { label: 'Overview', to: '/instructor/dashboard', icon: 'i-lucide-layout-dashboard' },
        { label: 'My Classes', to: '/instructor/classes' },
        { label: state.name || 'Class', to: `/instructor/classes/${classroomId}` },
        { label: 'Edit' },
      ]"
      eyebrow="Class settings"
      title="Edit class information"
      description="Update the subject, section, academic period, and class description."
    />

    <UAlert
      v-if="errorMessage"
      color="error"
      variant="soft"
      title="Class could not be updated"
      :description="errorMessage"
    />

    <USkeleton
      v-if="isLoading"
      class="h-96 rounded-xl"
    />

    <UCard v-else>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-5"
        @submit="submit"
      >
        <UFormField
          label="Class name"
          name="name"
          required
        >
          <UInput
            v-model="state.name"
            class="w-full"
          />
        </UFormField>

        <div class="grid gap-5 sm:grid-cols-2">
          <UFormField
            label="Subject code"
            name="subjectCode"
            required
          >
            <UInput
              v-model="state.subjectCode"
              class="w-full"
            />
          </UFormField>

          <UFormField
            label="Section"
            name="section"
            required
          >
            <UInput
              v-model="state.section"
              class="w-full"
            />
          </UFormField>
        </div>

        <div class="grid gap-5 sm:grid-cols-2">
          <UFormField
            label="School year"
            name="schoolYear"
            required
          >
            <UInput
              v-model="state.schoolYear"
              class="w-full"
            />
          </UFormField>

          <UFormField
            label="Semester"
            name="semester"
            required
          >
            <USelect
              v-model="state.semester"
              :items="[
                'First Semester',
                'Second Semester',
                'Summer',
              ]"
              class="w-full"
            />
          </UFormField>
        </div>

        <UFormField
          label="Description"
          name="description"
        >
          <UTextarea
            v-model="state.description"
            :rows="6"
            class="w-full"
          />
        </UFormField>

        <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <UButton
            :to="`/instructor/classes/${classroomId}`"
            color="neutral"
            variant="outline"
            size="lg"
          >
            Cancel
          </UButton>

          <UButton
            type="submit"
            size="lg"
            :loading="isSubmitting"
          >
            Save Changes
          </UButton>
        </div>
      </UForm>
    </UCard>
  </div>
</template>
