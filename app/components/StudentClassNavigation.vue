<script setup lang="ts">
const props = defineProps<{
  classroomId: string;
  active:
    | "assessments"
    | "classmates";
  classmateCount: number;
}>();

const classmateCount =
  computed(
    () =>
      Math.max(
        0,
        props.classmateCount
        || 0,
      ),
  );
</script>

<template>
  <nav
    aria-label="Class navigation"
    class="flex flex-wrap items-center gap-1 rounded-xl border border-primary/10 bg-gradient-to-r from-primary/10 via-primary/5 to-default/80 p-1.5 shadow-sm shadow-primary/5 backdrop-blur-sm dark:border-primary/15 dark:from-primary/15 dark:via-primary/5 dark:to-default/70"
  >
    <UButton
      :to="`/student/classes/${classroomId}`"
      :color="active === 'assessments' ? 'primary' : 'neutral'"
      :variant="active === 'assessments' ? 'soft' : 'ghost'"
      icon="i-lucide-clipboard-check"
      :aria-current="active === 'assessments' ? 'page' : undefined"
    >
      Assignments
    </UButton>

    <UButton
      :to="{
        path:
          `/student/classes/${classroomId}`,
        query: {
          view:
            'classmates',
        },
      }"
      :color="active === 'classmates' ? 'primary' : 'neutral'"
      :variant="active === 'classmates' ? 'soft' : 'ghost'"
      icon="i-lucide-users"
      :aria-current="active === 'classmates' ? 'page' : undefined"
      :aria-label="`Classmates, ${classmateCount} other students`"
    >
      Classmates

      <UBadge
        color="neutral"
        variant="soft"
        size="sm"
      >
        {{ classmateCount }}
      </UBadge>
    </UButton>
  </nav>
</template>
