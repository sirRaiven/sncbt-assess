<script setup lang="ts">
definePageMeta({
  layout:
    "student",
});
</script>

<template>
  <div class="page-stack">
    <PortalBackButton
      fallback-to="/student/results"
      :use-history="false"
    />

    <PageHeader
      eyebrow="Assessment result"
      title="Mobile Development Prelim Examination"
      description="IT216 · BSIT 2A · Submitted Aug 3, 2026"
    />

    <section class="rounded-xl bg-gradient-to-r from-brand-900 via-brand-700 to-indigo-700 p-6 text-white sm:p-7">
      <p class="text-blue-200">
        Final score
      </p>

      <p class="mt-2 text-5xl font-black sm:text-6xl">
        47 / 50
      </p>

      <p class="mt-3 text-blue-100">
        Excellent work. You achieved 94% and rank #1.
      </p>
    </section>

    <section class="grid gap-4 sm:grid-cols-3">
      <StatCard
        label="Correct"
        value="47"
        icon="i-lucide-circle-check-big"
        tone="success"
      />

      <StatCard
        label="Incorrect"
        value="3"
        icon="i-lucide-circle-x"
        tone="warning"
      />

      <StatCard
        label="Completion time"
        value="31m"
        icon="i-lucide-clock-3"
        tone="info"
      />
    </section>

    <UAlert
      color="info"
      variant="soft"
      title="Answer review is controlled by your instructor"
      description="Correct answers and explanations appear only when result review is enabled."
    />
  </div>
</template>
