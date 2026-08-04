<script setup lang="ts">
const route = useRoute();

await navigateTo(
  `/instructor/assessments/${String(
    route.params.id,
  )}/settings`,
  {
    redirectCode: 302,
  },
);
</script>

<template>
  <div />
</template>
