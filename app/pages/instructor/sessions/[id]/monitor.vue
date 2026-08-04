<script setup lang="ts">
definePageMeta({
    layout: "instructor",
});
const students = [
    {
        rank: 1,
        name: "Angela P. Cruz",
        progress: 38,
        correct: 34,
        score: 34000,
        status: "Answering",
    },
    {
        rank: 2,
        name: "Jared M. Flores",
        progress: 36,
        correct: 31,
        score: 31000,
        status: "Answering",
    },
    {
        rank: 3,
        name: "Mikaela R. Torres",
        progress: 35,
        correct: 30,
        score: 30000,
        status: "Answering",
    },
    {
        rank: 4,
        name: "Sofia D. Lim",
        progress: 50,
        correct: 29,
        score: 29000,
        status: "Completed",
    },
    {
        rank: 5,
        name: "Paolo L. Ramos",
        progress: 22,
        correct: 18,
        score: 18000,
        status: "Offline",
    },
];
</script>

<template>
  <div class="page-stack">
    <section
      class="rounded-xl bg-gradient-to-r from-sky-950 via-blue-900 to-indigo-900 p-6 text-white"
    >
      <div class="flex flex-col gap-5 xl:flex-row xl:justify-between">
        <div>
          <p class="text-xs font-bold uppercase tracking-[.18em] text-blue-200">
            ● Live assessment
          </p>
          <h1 class="mt-3 text-3xl font-black">
            Mobile Development Prelim Examination
          </h1>
          <p class="mt-2 text-sm text-blue-200">
            BSIT 2A · Session 382 914 · 00:24:18
          </p>
        </div>
        <div class="flex gap-3">
          <UButton
            color="neutral"
            variant="outline"
            class="border-white/30 text-white"
          >
            Pause
          </UButton>
          <UButton color="error">
            End Session
          </UButton>
        </div>
      </div>
    </section>
    <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <StatCard
        label="Participants"
        value="39/42"
        icon="i-lucide-users"
       />
      <StatCard
        label="Submitted"
        value="8"
        icon="i-lucide-circle-check-big"
        tone="success"
       />
      <StatCard
        label="Progress"
        value="68%"
        icon="i-lucide-chart-spline"
        tone="info"
       />
      <StatCard
        label="Average"
        value="76%"
        icon="i-lucide-chart-column"
        tone="warning"
       />
      <StatCard
        label="Disconnected"
        value="1"
        icon="i-lucide-wifi-off"
        tone="neutral"
       />
    </section>
    <div class="grid gap-6 xl:grid-cols-[1.3fr_.7fr]">
      <UCard>
        <template #header>
          <h2 class="font-bold text-highlighted">
            Student progress
          </h2>
        </template>
        <div class="table-scroll">
          <table class="app-table">
            <thead>
              <tr>
                <th>
                  Student
                </th>
                <th>
                  Progress
                </th>
                <th>
                  Correct
                </th>
                <th>
                  Score
                </th>
                <th>
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="s in students"
                :key="s.name"
              >
                <td class="font-semibold text-highlighted">
                  {{ s.name }}
                </td>
                <td>
                  <div class="flex items-center gap-2">
                    <UProgress
                      :model-value="s.progress*2"
                      class="w-24"
                     />
                    <span>
                      {{ s.progress }}/50
                    </span>
                  </div>
                </td>
                <td>
                  {{ s.correct }}
                </td>
                <td class="font-bold">
                  {{ s.score.toLocaleString() }}
                </td>
                <td>
                  <StatusPill :status="s.status" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </UCard>
      <UCard>
        <template #header>
          <h2 class="font-bold text-highlighted">
            Live ranking
          </h2>
        </template>
        <div
          v-for="s in students.slice(0,4)"
          :key="s.name"
          class="mb-3 flex items-center gap-3 rounded-xl border border-default p-3"
        >
          <span
            class="flex size-8 items-center justify-center rounded-xl font-black"
            :class="s.rank===1?'bg-amber-400 text-amber-950':'bg-elevated text-muted'"
          >
            {{ s.rank }}
          </span>
          <div class="flex-1">
            <p class="text-sm font-semibold">
              {{ s.name }}
            </p>
            <p class="text-xs text-muted">
              {{ s.correct }} correct
            </p>
          </div>
          <strong>
            {{ s.score.toLocaleString() }}
          </strong>
        </div>
      </UCard>
    </div>
  </div>
</template>
