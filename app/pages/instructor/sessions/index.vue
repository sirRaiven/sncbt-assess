<script setup lang="ts">
definePageMeta({
    layout: "instructor",
});
</script>

<template>
  <FeaturePage
    eyebrow="Live assessment delivery"
    title="Live sessions"
    description="Host a new assessment or review completed sessions."
    action-label="Start New Session"
    action-to="/instructor/sessions/create"
    action-icon="i-lucide-radio-tower"
   />
</template>
