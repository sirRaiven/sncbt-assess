<script setup lang="ts">
definePageMeta({
    layout: "student",
});
</script>

<template>
  <div class="page-stack">
    <section
      class="rounded-xl bg-gradient-to-r from-brand-900 via-brand-700 to-indigo-700 p-7 text-white"
    >
      <p class="text-blue-200">
        Good evening, Angela.
      </p>
      <h1 class="mt-2 text-4xl font-black">
        Ready for your next learning activity?
      </h1>
      <p class="mt-3 max-w-2xl text-blue-100">
        Check active assessments, enter a live session, and review your latest results.
      </p>
      <UButton
        to="/student/sessions/join"
        color="neutral"
        class="mt-6 bg-white text-brand-800"
        icon="i-lucide-log-in"
      >
        Join Live Session
      </UButton>
    </section>
    <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Enrolled classes"
        value="6"
        icon="i-lucide-book-open"
        tone="primary"
       />
      <StatCard
        label="Completed assessments"
        value="14"
        icon="i-lucide-circle-check-big"
        tone="success"
       />
      <StatCard
        label="Average score"
        value="88%"
        icon="i-lucide-chart-column"
        tone="info"
       />
      <StatCard
        label="Best rank"
        value="#2"
        icon="i-lucide-trophy"
        tone="warning"
       />
    </section>
    <section class="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
      <FeaturePage
        title="My classes"
        description="Classes and available academic activities."
       />
      <UCard>
        <template #header>
          <div class="flex justify-between">
            <h2 class="font-bold text-highlighted">
              Live now
            </h2>
            <StatusPill status="Live" />
          </div>
        </template>
        <h3 class="font-black text-highlighted">
          Mobile Development Prelim Examination
        </h3>
        <p class="mt-1 text-sm text-muted">
          IT216 · BSIT 2A
        </p>
        <div class="mt-5 rounded-xl bg-slate-950 p-5 text-center text-white">
          <p class="text-xs text-slate-400">
            SESSION CODE
          </p>
          <p class="mt-2 font-mono text-3xl font-black tracking-[.18em]">
            382 914
          </p>
        </div>
        <UButton
          to="/student/sessions/demo/lobby"
          block
          class="mt-5"
        >
          Enter Session
        </UButton>
      </UCard>
    </section>
  </div>
</template>
