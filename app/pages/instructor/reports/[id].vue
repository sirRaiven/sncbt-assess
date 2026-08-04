<script setup lang="ts">
definePageMeta({
    layout: "instructor",
});
const r = [['1', 'Angela P. Cruz', '47/50', '94%'], ['2', 'Mikaela R. Torres', '45/50', '90%'], ['3', 'Jared M. Flores', '44/50', '88%']];
</script>

<template>
  <div class="page-stack">
    <PageHeader
      eyebrow="Session report"
      title="Mobile Development Prelim Examination"
      description="BSIT 2A · Completed Aug 3, 2026 · 39 participants"
    >
      <template #actions>
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-printer"
        >
          Print
        </UButton>
        <UButton icon="i-lucide-file-spreadsheet">
          Export Excel
        </UButton>
      </template>
    </PageHeader>
    <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <StatCard
        label="Class average"
        value="81%"
        icon="i-lucide-chart-column"
       />
      <StatCard
        label="Highest score"
        value="94%"
        icon="i-lucide-trophy"
        tone="success"
       />
      <StatCard
        label="Lowest score"
        value="56%"
        icon="i-lucide-chart-no-axes-column-decreasing"
        tone="warning"
       />
      <StatCard
        label="Completion"
        value="39/42"
        icon="i-lucide-users"
        tone="info"
       />
      <StatCard
        label="Average time"
        value="30m"
        icon="i-lucide-clock-3"
        tone="neutral"
       />
    </section>
    <div class="table-shell table-scroll">
      <table class="app-table">
        <thead>
          <tr>
            <th>
              Rank
            </th>
            <th>
              Student
            </th>
            <th>
              Score
            </th>
            <th>
              Percentage
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="x in r"
            :key="x[1]"
          >
            <td>
              {{ x[0] }}
            </td>
            <td class="font-semibold">
              {{ x[1] }}
            </td>
            <td>
              {{ x[2] }}
            </td>
            <td class="font-black">
              {{ x[3] }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
