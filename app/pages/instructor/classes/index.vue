<script setup lang="ts">
definePageMeta({
    layout: "instructor",
});
</script>

<template>
  <FeaturePage
    eyebrow="Classroom management"
    title="My classes"
    description="Organize subjects, sections, students, and assigned assessments."
    action-label="Create Class"
    action-to="/instructor/classes/create"
    action-icon="i-lucide-plus"
   />
</template>
