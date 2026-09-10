<script setup lang="ts">
definePageMeta({
  layout: "instructor",
});

const route = useRoute();

const requestedAssessmentId =
  typeof route.query.assessmentId === "string"
    ? route.query.assessmentId.trim()
    : "";

const assessmentId =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    .test(requestedAssessmentId)
    ? requestedAssessmentId
    : null;

await navigateTo(
  assessmentId
    ? `/instructor/assessments/${assessmentId}/assign`
    : "/instructor/sessions",
  {
    replace: true,
  },
);
</script>

<template>
  <div />
</template>
