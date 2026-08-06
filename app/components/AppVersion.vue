<script setup lang="ts">
import {
  APP_DESCRIPTION,
  APP_NAME,
  APP_RELEASE_DATE,
  APP_RELEASE_NAME,
  APP_VERSION,
  APP_VERSION_LABEL,
} from "~/utils/app-version";

const props = withDefaults(
  defineProps<{
    inverse?: boolean;
    compact?: boolean;
  }>(),
  {
    inverse:
      false,
    compact:
      false,
  },
);

const open =
  ref(false);

const triggerClass =
  computed(
    () =>
      props.inverse
        ? "text-slate-400 hover:bg-white/8 hover:text-white focus-visible:ring-primary/30"
        : "text-muted hover:bg-elevated hover:text-highlighted focus-visible:ring-primary/20",
  );

const copyrightYear =
  new Date().getFullYear();
</script>

<template>
  <div>
    <UTooltip
      v-if="compact"
      text="About SNCBT Assess"
    >
      <UButton
        color="neutral"
        variant="ghost"
        square
        size="sm"
        icon="i-lucide-info"
        aria-label="About SNCBT Assess"
        @click="open = true"
      />
    </UTooltip>

    <button
      v-else
      type="button"
      class="flex min-h-9 w-full items-center justify-center gap-2 rounded-lg px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-3"
      :class="triggerClass"
      aria-label="Open information about SNCBT Assess"
      @click="open = true"
    >
      <UIcon
        name="i-lucide-info"
        class="size-3.5"
      />

      <span>
        {{ APP_VERSION_LABEL }}
      </span>
    </button>

    <UModal
      v-model:open="open"
      :ui="{
        content:
          'sm:max-w-md',
      }"
    >
      <template #content>
        <div class="bg-default p-5 sm:p-6">
          <div class="flex items-start justify-between gap-4">
            <div class="flex min-w-0 items-center gap-4">
              <InstitutionLogo
                size="md"
                eager
              />

              <div class="min-w-0">
                <p class="text-xs font-bold uppercase tracking-[0.16em] text-primary">
                  About the application
                </p>

                <h2 class="mt-1 truncate text-xl font-black text-highlighted">
                  {{ APP_NAME }}
                </h2>

                <p class="mt-1 text-sm text-muted">
                  {{ APP_DESCRIPTION }}
                </p>
              </div>
            </div>

            <UButton
              color="neutral"
              variant="ghost"
              square
              icon="i-lucide-x"
              aria-label="Close application information"
              @click="open = false"
            />
          </div>

          <div class="mt-6 grid gap-3 sm:grid-cols-2">
            <div class="rounded-xl border border-default bg-elevated/60 p-4">
              <p class="text-xs font-semibold text-muted">
                Version
              </p>

              <p class="mt-1 font-black text-highlighted">
                {{ APP_VERSION_LABEL }}
              </p>
            </div>

            <div class="rounded-xl border border-default bg-elevated/60 p-4">
              <p class="text-xs font-semibold text-muted">
                Release
              </p>

              <p class="mt-1 font-black text-highlighted">
                {{ APP_RELEASE_NAME }}
              </p>
            </div>
          </div>

          <div class="mt-4 rounded-xl border border-default p-4">
            <div class="flex items-start gap-3">
              <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <UIcon
                  name="i-lucide-graduation-cap"
                  class="size-4.5"
                />
              </div>

              <div>
                <p class="font-bold text-highlighted">
                  Built for the SNCBT community
                </p>

                <p class="mt-1 text-sm leading-6 text-muted">
                  A classroom assessment platform for instructors and students of St. Nicolas College of Business and Technology.
                </p>
              </div>
            </div>
          </div>

          <dl class="mt-5 space-y-3 text-sm">
            <div class="flex items-center justify-between gap-4">
              <dt class="text-muted">
                Release date
              </dt>

              <dd class="text-right font-semibold text-highlighted">
                {{ APP_RELEASE_DATE }}
              </dd>
            </div>

            <div class="flex items-center justify-between gap-4">
              <dt class="text-muted">
                Version number
              </dt>

              <dd class="font-mono font-semibold text-highlighted">
                {{ APP_VERSION }}
              </dd>
            </div>
          </dl>

          <div class="mt-6 border-t border-default pt-4 text-center">
            <p class="text-xs text-muted">
              © {{ copyrightYear }} St. Nicolas College of Business and Technology
            </p>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
