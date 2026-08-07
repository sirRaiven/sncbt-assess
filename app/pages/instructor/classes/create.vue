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
  title: "Create class",
});

const toast = useToast();

const {
  createClass,
} = useClassrooms();

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(
      2,
      "Class name is required.",
    )
    .max(150),

  subjectCode: z
    .string()
    .trim()
    .min(
      2,
      "Subject code is required.",
    )
    .max(30),

  section: z
    .string()
    .trim()
    .min(
      1,
      "Section is required.",
    )
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

  joinEnabled: z.boolean(),
});

type CreateClassSchema =
  z.output<typeof schema>;

const state = reactive<CreateClassSchema>({
  name: "",
  subjectCode: "",
  section: "",
  description: "",
  schoolYear: "2026-2027",
  semester: "First Semester",
  joinEnabled: true,
});

const isSubmitting = ref(false);
const errorMessage = ref("");

async function submit(
  event: FormSubmitEvent<CreateClassSchema>,
): Promise<void> {
  isSubmitting.value = true;
  errorMessage.value = "";

  const result =
    await createClass({
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

      joinEnabled:
        event.data.joinEnabled,
    });

  if (
    result.error
    || !result.data
  ) {
    errorMessage.value =
      result.error
      || "Unable to create the class.";

    isSubmitting.value = false;
    return;
  }

  toast.add({
    title:
      "Class created",
    description:
      result.data.message,
    color:
      "success",
  });

  await navigateTo(
    `/instructor/classes/${result.data.classroom.id}`,
  );
}
</script>

<template>
  <div class="page-stack">
    <PortalBackButton
      fallback-to="/instructor/classes"
    />
    <PageHeader
      eyebrow="New classroom"
      title="Create a class"
      description="Add the subject and section information. A unique class code will be generated after saving."
    />

    <div class="grid gap-6 xl:grid-cols-[1fr_340px]">
      <UCard>
        <template #header>
          <h2 class="font-bold text-highlighted">
            Class information
          </h2>
        </template>

        <UAlert
          v-if="errorMessage"
          class="mb-5"
          color="error"
          variant="soft"
          title="Class could not be created"
          :description="errorMessage"
        />

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
            help="Use a clear subject name that students will recognize."
          >
            <UInput
              v-model="state.name"
              placeholder="Introduction to Mobile Development"
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
                placeholder="IT216"
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
                placeholder="BSIT 2A"
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
                placeholder="2026-2027"
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
            label="Class description"
            name="description"
          >
            <UTextarea
              v-model="state.description"
              :rows="5"
              class="w-full"
              placeholder="Add a short description or class instructions."
            />
          </UFormField>

          <div class="flex items-start justify-between gap-6 rounded-xl border border-default p-4">
            <div>
              <p class="font-semibold text-highlighted">
                Enable class-code enrollment
              </p>

              <p class="mt-1 text-sm text-muted">
                Students may submit the generated code to request membership.
              </p>
            </div>

            <USwitch
              v-model="state.joinEnabled"
            />
          </div>

          <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <UButton
              to="/instructor/classes"
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
              Create Class
            </UButton>
          </div>
        </UForm>
      </UCard>

      <UCard class="h-fit">
        <template #header>
          <h2 class="font-bold text-highlighted">
            Enrollment process
          </h2>
        </template>

        <ol class="space-y-4 text-sm">
          <li class="flex gap-3">
            <span class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-black text-white">
              1
            </span>
            <span class="leading-6 text-muted">
              The system creates a unique class code.
            </span>
          </li>

          <li class="flex gap-3">
            <span class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-black text-white">
              2
            </span>
            <span class="leading-6 text-muted">
              Students enter the code from their account.
            </span>
          </li>

          <li class="flex gap-3">
            <span class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-black text-white">
              3
            </span>
            <span class="leading-6 text-muted">
              You approve or reject each request.
            </span>
          </li>
        </ol>
      </UCard>
    </div>
  </div>
</template>
