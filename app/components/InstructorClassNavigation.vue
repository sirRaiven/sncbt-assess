<script setup lang="ts">
const props = defineProps<{
  classroomId: string;
  active: "assessments" | "students";
  studentCount: number;
  pendingCount?: number;
}>();

const pendingCount = computed(
  () => Math.max(0, props.pendingCount || 0),
);
</script>

<template>
  <nav
    aria-label="Class navigation"
    class="flex flex-wrap items-center gap-1 rounded-xl border border-default bg-default/70 p-1.5"
  >
    <UButton
      :to="`/instructor/classes/${classroomId}`"
      :color="active === 'assessments' ? 'primary' : 'neutral'"
      :variant="active === 'assessments' ? 'soft' : 'ghost'"
      icon="i-lucide-clipboard-list"
      :aria-current="active === 'assessments' ? 'page' : undefined"
    >
      Assessments
    </UButton>

    <UButton
      :to="`/instructor/classes/${classroomId}/students`"
      :color="active === 'students' ? 'primary' : 'neutral'"
      :variant="active === 'students' ? 'soft' : 'ghost'"
      icon="i-lucide-users"
      :aria-current="active === 'students' ? 'page' : undefined"
      :aria-label="`Students, ${studentCount} enrolled${pendingCount ? `, ${pendingCount} pending` : ''}`"
    >
      Students

      <UBadge
        color="neutral"
        variant="soft"
        size="sm"
      >
        {{ studentCount }}
      </UBadge>

      <UBadge
        v-if="pendingCount"
        color="warning"
        variant="soft"
        size="sm"
      >
        {{ pendingCount }} pending
      </UBadge>
    </UButton>
  </nav>
</template>
