<script setup lang="ts">
definePageMeta({
  layout: false,
});

useSeoMeta({
  title: "System Maintenance",
  description:
    "SNCBT Assessment Management System is temporarily unavailable while scheduled maintenance is in progress.",
  robots: "noindex, nofollow, noarchive",
});
</script>

<template>
  <main
    class="relative flex min-h-screen min-w-0 items-center justify-center overflow-hidden bg-[#f5f8fd] px-4 py-8 text-slate-900 sm:px-6 sm:py-12 dark:bg-[#0b1220] dark:text-slate-100"
  >
    <div
      class="pointer-events-none absolute inset-0 academic-grid opacity-55"
      aria-hidden="true"
    />
    <div
      class="pointer-events-none absolute -left-32 -top-32 size-80 rounded-full bg-blue-500/10 blur-3xl sm:size-[28rem]"
      aria-hidden="true"
    />
    <div
      class="pointer-events-none absolute -bottom-40 -right-32 size-96 rounded-full bg-indigo-500/10 blur-3xl sm:size-[32rem]"
      aria-hidden="true"
    />

    <section
      class="relative z-10 w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200/90 bg-white/95 shadow-2xl shadow-slate-950/10 backdrop-blur dark:border-white/10 dark:bg-slate-950/90 dark:shadow-black/30"
      aria-labelledby="maintenance-title"
    >
      <div class="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-600" />

      <div class="px-6 py-8 sm:px-10 sm:py-10 lg:px-12 lg:py-12">
        <div class="flex flex-col items-center text-center">
          <InstitutionLogo
            size="xl"
            eager
          />

          <div class="mt-6">
            <p class="text-xs font-bold uppercase tracking-[0.22em] text-blue-700 dark:text-blue-300">
              SNCBT Assessment Management System
            </p>

            <div
              class="mx-auto mt-5 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3.5 py-1.5 text-xs font-bold text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200"
            >
              <UIcon
                name="i-lucide-wrench"
                class="size-4"
                aria-hidden="true"
              />
              Maintenance in progress
            </div>

            <h1
              id="maintenance-title"
              class="mx-auto mt-5 max-w-2xl text-3xl font-black tracking-tight text-slate-950 sm:text-4xl dark:text-white"
            >
              SNCBT Assess is temporarily unavailable.
            </h1>

            <p class="mx-auto mt-4 max-w-xl text-sm leading-6 text-slate-600 sm:text-base sm:leading-7 dark:text-slate-300">
              We are performing scheduled maintenance to improve the reliability, security, and overall experience of the system. Access will resume after the maintenance work has been completed.
            </p>
          </div>

          <div class="mt-8 grid w-full gap-3 text-left sm:grid-cols-2">
            <div class="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.04]">
              <div class="flex gap-3">
                <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-600/10 text-blue-700 dark:bg-blue-400/10 dark:text-blue-300">
                  <UIcon
                    name="i-lucide-shield-check"
                    class="size-5"
                    aria-hidden="true"
                  />
                </span>
                <div>
                  <p class="text-sm font-bold text-slate-900 dark:text-white">
                    System maintenance
                  </p>
                  <p class="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">
                    Maintenance work is being completed before normal access is restored.
                  </p>
                </div>
              </div>
            </div>

            <div class="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.04]">
              <div class="flex gap-3">
                <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-600/10 text-blue-700 dark:bg-blue-400/10 dark:text-blue-300">
                  <UIcon
                    name="i-lucide-circle-check-big"
                    class="size-5"
                    aria-hidden="true"
                  />
                </span>
                <div>
                  <p class="text-sm font-bold text-slate-900 dark:text-white">
                    No action required
                  </p>
                  <p class="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">
                    Please return to this page after the maintenance period has ended.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div class="mt-8 w-full border-t border-slate-200 pt-6 dark:border-white/10">
            <p class="text-sm font-semibold text-slate-800 dark:text-slate-200">
              St. Nicolas College of Business and Technology
            </p>
            <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Thank you for your patience and understanding.
            </p>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>
