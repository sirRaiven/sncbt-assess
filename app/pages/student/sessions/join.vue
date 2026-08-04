<script setup lang="ts">
definePageMeta({
    layout: "student",
});
</script>

<template>
  <FeaturePage
    eyebrow="Live assessment"
    title="Join a session"
    description="Enter the six-digit code shown by your instructor."
    action-label="Join Session"
    action-to="/student/sessions/demo/lobby"
    action-icon="i-lucide-log-in"
   />
</template>
