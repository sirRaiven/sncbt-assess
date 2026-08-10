<script setup lang="ts">
definePageMeta({
  layout:
    "student",
  middleware:
    ["student"],
});

const route =
  useRoute();

const assignmentId =
  computed(
    () =>
      String(
        route.params.id,
      ),
  );

await navigateTo(
  `/student/assessments/${assignmentId.value}/instructions`,
  {
    replace:
      true,
  },
);
</script>

<template>
  <div />
</template>
