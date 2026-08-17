<script setup lang="ts">
const props = defineProps<{
  assessmentId: string;
  active: "questions" | "settings" | "schedule" | "preview";
}>();

const items = computed(() => [
  {
    key: "questions" as const,
    label: "Questions",
    icon: "i-lucide-list-checks",
    to: `/instructor/assessments/${props.assessmentId}/edit`,
  },
  {
    key: "settings" as const,
    label: "Settings",
    icon: "i-lucide-settings-2",
    to: `/instructor/assessments/${props.assessmentId}/settings`,
  },
  {
    key: "schedule" as const,
    label: "Schedule",
    icon: "i-lucide-calendar-clock",
    to: `/instructor/assessments/${props.assessmentId}/assign`,
  },
  {
    key: "preview" as const,
    label: "Preview",
    icon: "i-lucide-eye",
    to: `/instructor/assessments/${props.assessmentId}/preview`,
  },
]);
</script>

<template>
  <nav
    aria-label="Assessment workspace"
    class="overflow-x-auto rounded-xl border border-default bg-default/80 p-1.5 shadow-sm"
  >
    <div class="flex min-w-max items-center gap-1">
      <UButton
        v-for="item in items"
        :key="item.key"
        :to="item.to"
        :icon="item.icon"
        :color="active === item.key ? 'primary' : 'neutral'"
        :variant="active === item.key ? 'soft' : 'ghost'"
        :aria-current="active === item.key ? 'page' : undefined"
      >
        {{ item.label }}
      </UButton>
    </div>
  </nav>
</template>
