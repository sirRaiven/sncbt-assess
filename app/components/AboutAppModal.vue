<script setup lang="ts">
import {
  APP_DESCRIPTION,
  APP_INSTITUTION,
  APP_NAME,
  APP_RELEASE_DATE,
  APP_SUMMARY,
  APP_VERSION_LABEL,
} from "~/utils/app-version";

const open =
  defineModel<boolean>(
    "open",
    {
      default:
        false,
    },
  );

const copyrightYear =
  new Date().getFullYear();
</script>

<template>
  <UModal
    v-model:open="open"
    :ui="{
      content:
        'w-[calc(100%-1rem)] overflow-hidden sm:max-w-xl',
    }"
  >
    <template #content>
      <section class="relative overflow-hidden bg-default">
        <div
          class="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-br from-primary/16 via-primary/6 to-transparent"
          aria-hidden="true"
        />

        <div class="relative p-5 sm:p-6">
          <UButton
            type="button"
            color="neutral"
            variant="ghost"
            square
            icon="i-lucide-x"
            class="absolute right-4 top-4 rounded-full sm:right-5 sm:top-5"
            aria-label="Close About SNCBT Assess"
            @click="open = false"
          />

          <header class="pr-10">
            <p class="text-xs font-bold uppercase tracking-[0.18em] text-primary">
              About SNCBT Assess
            </p>

            <div class="mt-4 flex min-w-0 items-center gap-4">
              <div
                class="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-default/70 bg-default/85 shadow-sm backdrop-blur sm:size-16"
              >
                <InstitutionLogo
                  size="lg"
                  eager
                />
              </div>

              <div class="min-w-0">
                <h2 class="text-2xl font-black tracking-tight text-highlighted sm:text-[1.7rem]">
                  {{ APP_NAME }}
                </h2>

                <p class="mt-1 text-sm leading-5 text-muted">
                  {{ APP_DESCRIPTION }}
                </p>
              </div>
            </div>
          </header>

          <div class="mt-6 rounded-2xl border border-default bg-elevated/35 p-4 sm:p-5">
            <p class="text-sm leading-6 text-muted">
              {{ APP_SUMMARY }}
            </p>
          </div>

          <div class="mt-4 grid gap-3 sm:grid-cols-2">
            <article class="rounded-2xl border border-default bg-default p-4">
              <div class="flex items-center gap-3">
                <div
                  class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
                >
                  <UIcon
                    name="i-lucide-target"
                    class="size-4.5"
                  />
                </div>

                <h3 class="text-sm font-bold text-highlighted">
                  Purpose
                </h3>
              </div>

              <p class="mt-3 text-xs leading-5 text-muted">
                To support class organization, assessment delivery, progress review, and the release of results in one familiar place.
              </p>
            </article>

            <article class="rounded-2xl border border-default bg-default p-4">
              <div class="flex items-center gap-3">
                <div
                  class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
                >
                  <UIcon
                    name="i-lucide-school"
                    class="size-4.5"
                  />
                </div>

                <h3 class="text-sm font-bold text-highlighted">
                  College community
                </h3>
              </div>

              <p class="mt-3 text-xs leading-5 text-muted">
                Developed for the instructors and students of {{ APP_INSTITUTION }}.
              </p>
            </article>
          </div>

          <div
            class="mt-4 flex items-start gap-3 rounded-2xl border border-default/80 bg-elevated/25 px-4 py-3.5"
          >
            <UIcon
              name="i-lucide-sparkles"
              class="mt-0.5 size-4.5 shrink-0 text-primary"
            />

            <p class="text-xs leading-5 text-muted">
              SNCBT Assess continues to be improved gradually based on classroom needs, practical use, and feedback from its users.
            </p>
          </div>

          <div
            class="mt-5 flex flex-col gap-3 border-t border-default pt-4 sm:flex-row sm:items-end sm:justify-between"
          >
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-wider text-dimmed">
                Current release
              </p>

              <div class="mt-1.5 flex flex-wrap items-center gap-2">
                <UBadge
                  color="primary"
                  variant="soft"
                  size="sm"
                >
                  {{ APP_VERSION_LABEL }}
                </UBadge>

                <span class="text-xs font-medium text-muted">
                  Updated {{ APP_RELEASE_DATE }}
                </span>
              </div>
            </div>

            <p class="text-xs leading-5 text-muted sm:text-right">
              © {{ copyrightYear }}<br class="hidden sm:block">
              {{ APP_INSTITUTION }}
            </p>
          </div>
        </div>
      </section>
    </template>
  </UModal>
</template>
