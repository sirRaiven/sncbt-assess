<script setup lang="ts">
import type {
  FormSubmitEvent,
} from "@nuxt/ui";

import {
  z,
} from "zod";

definePageMeta({
  layout: "student",
});

useSeoMeta({
  title: "Join live session",
});

const route =
  useRoute();

const {
  joinSession,
} = useAssessmentSessions();

const schema = z.object({
  sessionCode: z
    .string()
    .transform(
      (value) =>
        value.replace(
          /[^0-9]/g,
          "",
        ),
    )
    .refine(
      (value) =>
        /^\d{6}$/.test(
          value,
        ),
      "Enter a valid six-digit session code.",
    ),
});

type JoinSessionSchema =
  z.output<typeof schema>;

const state = reactive({
  sessionCode:
    typeof route.query.code
    === "string"
      ? route.query.code
        .replace(
          /[^0-9]/g,
          "",
        )
        .slice(
          0,
          6,
        )
      : "",
});

const isSubmitting =
  ref(false);

const errorMessage =
  ref("");

function normalizeInput(): void {
  state.sessionCode =
    state.sessionCode
      .replace(
        /[^0-9]/g,
        "",
      )
      .slice(
        0,
        6,
      );
}

async function submit(
  event: FormSubmitEvent<JoinSessionSchema>,
): Promise<void> {
  isSubmitting.value =
    true;

  errorMessage.value =
    "";

  const result =
    await joinSession(
      event.data.sessionCode,
    );

  if (
    result.error
    || !result.data
  ) {
    errorMessage.value =
      result.error
      || "Unable to join the live session.";

    isSubmitting.value =
      false;

    return;
  }

  await navigateTo(
    `/student/sessions/${result.data.detail.session.id}/lobby`,
  );
}
</script>

<template>
  <div class="page-stack">
    <PageHeader
      eyebrow="Live assessment"
      title="Join a live session"
      description="Enter the six-digit code displayed by your instructor."
    />

    <div class="mx-auto w-full max-w-2xl">
      <UCard>
        <div class="text-center">
          <div class="mx-auto flex size-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <UIcon
              name="i-lucide-log-in"
              class="size-7"
            />
          </div>

          <h2 class="mt-5 text-xl font-black text-highlighted">
            Enter session code
          </h2>

          <p class="mt-2 text-sm leading-6 text-muted">
            Your student account must have an approved membership in the class selected for this session.
          </p>
        </div>

        <UAlert
          v-if="errorMessage"
          class="mt-6"
          color="error"
          variant="soft"
          title="Unable to join session"
          :description="errorMessage"
        />

        <UForm
          :schema="schema"
          :state="state"
          class="mt-7"
          @submit="submit"
        >
          <UFormField
            name="sessionCode"
          >
            <UInput
              v-model="state.sessionCode"
              size="xl"
              class="w-full text-center font-mono text-2xl tracking-[0.35em]"
              placeholder="000000"
              maxlength="6"
              inputmode="numeric"
              autocomplete="one-time-code"
              @input="normalizeInput"
            />
          </UFormField>

          <UButton
            type="submit"
            block
            size="lg"
            class="mt-4"
            icon="i-lucide-log-in"
            :loading="isSubmitting"
          >
            Join Session
          </UButton>
        </UForm>

        <div class="mt-7 grid gap-3 sm:grid-cols-3">
          <div class="rounded-lg bg-elevated p-4 text-center">
            <UIcon
              name="i-lucide-user-check"
              class="mx-auto size-5 text-primary"
            />

            <p class="mt-2 text-xs font-semibold text-highlighted">
              Active account
            </p>
          </div>

          <div class="rounded-lg bg-elevated p-4 text-center">
            <UIcon
              name="i-lucide-school"
              class="mx-auto size-5 text-primary"
            />

            <p class="mt-2 text-xs font-semibold text-highlighted">
              Approved class member
            </p>
          </div>

          <div class="rounded-lg bg-elevated p-4 text-center">
            <UIcon
              name="i-lucide-shield-check"
              class="mx-auto size-5 text-primary"
            />

            <p class="mt-2 text-xs font-semibold text-highlighted">
              Server verified
            </p>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
