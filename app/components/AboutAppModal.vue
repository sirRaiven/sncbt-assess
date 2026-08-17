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
        'w-[calc(100%-1rem)] overflow-hidden sm:max-w-lg',
    }"
  >
    <template #content>
      <section class="relative overflow-hidden bg-default">
        <div
          class="pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-br from-primary/20 via-primary/8 to-transparent"
          aria-hidden="true"
        />

        <div class="relative p-5 sm:p-6">
          <UButton
            color="neutral"
            variant="ghost"
            square
            icon="i-lucide-x"
            class="absolute right-4 top-4 rounded-full sm:right-5 sm:top-5"
            aria-label="Close About App"
            @click="open = false"
          />

          <header class="flex min-w-0 items-start gap-4 pr-10 sm:gap-5">
            <div
              class="flex size-16 shrink-0 items-center justify-center rounded-2xl border border-default/70 bg-default/80 shadow-sm backdrop-blur sm:size-18"
            >
              <InstitutionLogo
                size="lg"
                eager
              />
            </div>

            <div class="min-w-0 pt-0.5">
              <div class="flex flex-wrap items-center gap-2">
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

              <h2 class="mt-3 text-2xl font-black tracking-tight text-highlighted">
                {{ APP_NAME }}
              </h2>

              <p class="mt-1 text-sm font-medium text-muted">
                {{ APP_DESCRIPTION }}
              </p>
            </div>
          </header>

          <p class="mt-6 max-w-xl text-sm leading-6 text-muted">
            {{ APP_SUMMARY }}
          </p>

          <div class="mt-5 grid gap-3 sm:grid-cols-2">
            <article class="rounded-2xl border border-default bg-elevated/40 p-4">
              <div
                class="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary"
              >
                <UIcon
                  name="i-lucide-users-round"
                  class="size-4.5"
                />
              </div>

              <h3 class="mt-3 text-sm font-bold text-highlighted">
                Built around classroom work
              </h3>

              <p class="mt-1 text-xs leading-5 text-muted">
                Classes, assessments, monitoring, and released results are kept in one consistent workspace.
              </p>
            </article>

            <article class="rounded-2xl border border-default bg-elevated/40 p-4">
              <div
                class="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary"
              >
                <UIcon
                  name="i-lucide-school"
                  class="size-4.5"
                />
              </div>

              <h3 class="mt-3 text-sm font-bold text-highlighted">
                Institutional application
              </h3>

              <p class="mt-1 text-xs leading-5 text-muted">
                {{ APP_INSTITUTION }}
              </p>
            </article>
          </div>

          <footer
            class="mt-5 flex flex-col gap-1 border-t border-default pt-4 text-xs text-muted sm:flex-row sm:items-center sm:justify-between"
          >
            <span>
              © {{ copyrightYear }} {{ APP_INSTITUTION }}
            </span>

            <span class="font-mono text-dimmed">
              {{ APP_VERSION_LABEL }}
            </span>
          </footer>
        </div>
      </section>
    </template>
  </UModal>
</template>
