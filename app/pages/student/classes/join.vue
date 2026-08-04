<script setup lang="ts">
import type {
  FormSubmitEvent,
} from "@nuxt/ui";

import {
  z,
} from "zod";

import type {
  Classroom,
} from "~/types/classroom";

definePageMeta({
  layout: "student",
});

useSeoMeta({
  title: "Join class",
});

const {
  joinClass,
} = useClassrooms();

const schema = z.object({
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
  z.output<typeof schema>;

const state = reactive({
  joinCode: "",
});

const isSubmitting = ref(false);
const errorMessage = ref("");
const successMessage = ref("");

const matchedClass =
  ref<Classroom | null>(null);

const instructorName = ref("");

async function submit(
  event: FormSubmitEvent<JoinClassSchema>,
): Promise<void> {
  isSubmitting.value = true;
  errorMessage.value = "";
  successMessage.value = "";
  matchedClass.value = null;

  const result =
    await joinClass(
      event.data.joinCode,
    );

  if (
    result.error
    || !result.data
  ) {
    errorMessage.value =
      result.error
      || "Unable to join the class.";

    isSubmitting.value = false;
    return;
  }

  matchedClass.value =
    result.data.classroom;

  instructorName.value =
    result.data.instructor.name;

  successMessage.value =
    result.data.message;

  isSubmitting.value = false;
}
</script>

<template>
  <div class="page-stack">
    <PageHeader
      eyebrow="Class enrollment"
      title="Join a class"
      description="Ask your instructor for the class code, then submit it below."
    />

    <div class="mx-auto w-full max-w-2xl">
      <UCard>
        <div class="text-center">
          <div class="mx-auto flex size-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <UIcon
              name="i-lucide-school"
              class="size-7"
            />
          </div>

          <h2 class="mt-5 text-xl font-black text-highlighted">
            Enter the class code
          </h2>

          <p class="mt-2 text-sm text-muted">
            Class codes begin with SNC followed by six letters or numbers.
          </p>
        </div>

        <UAlert
          v-if="errorMessage"
          class="mt-6"
          color="error"
          variant="soft"
          title="Class request unsuccessful"
          :description="errorMessage"
        />

        <UAlert
          v-if="successMessage"
          class="mt-6"
          color="success"
          variant="soft"
          title="Request submitted"
          :description="successMessage"
        />

        <UForm
          :schema="schema"
          :state="state"
          class="mt-7"
          @submit="submit"
        >
          <UFormField
            name="joinCode"
          >
            <UInput
              v-model="state.joinCode"
              size="xl"
              class="w-full text-center font-mono uppercase tracking-[0.14em]"
              placeholder="SNC-7K2P9A"
              autocomplete="off"
            />
          </UFormField>

          <UButton
            type="submit"
            block
            size="lg"
            class="mt-4"
            :loading="isSubmitting"
          >
            Submit Join Request
          </UButton>
        </UForm>

        <div
          v-if="matchedClass"
          class="mt-6 rounded-xl border border-success/30 bg-success/5 p-5"
        >
          <div class="flex items-start gap-4">
            <div class="flex size-11 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success">
              <UIcon
                name="i-lucide-circle-check-big"
                class="size-5"
              />
            </div>

            <div class="min-w-0">
              <p class="font-black text-highlighted">
                {{ matchedClass.name }}
              </p>

              <p class="mt-1 text-sm text-muted">
                {{ matchedClass.subject_code }}
                ·
                {{ matchedClass.section }}
              </p>

              <p class="mt-2 text-xs text-muted">
                Instructor:
                {{ instructorName }}
              </p>

              <StatusPill
                class="mt-3"
                status="Pending approval"
              />
            </div>
          </div>
        </div>

        <UButton
          to="/student/classes"
          block
          color="neutral"
          variant="ghost"
          class="mt-5"
          icon="i-lucide-arrow-left"
        >
          Return to My Classes
        </UButton>
      </UCard>
    </div>
  </div>
</template>
