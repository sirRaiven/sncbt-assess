<script setup lang="ts">
const props = defineProps<{
  status: string;
}>();

const color = computed(() => {
  const status =
    props.status.toLowerCase();

  if (
    /active|published|completed|approved|online|valid|finished/.test(
      status,
    )
  ) {
    return "success";
  }

  if (
    /pending|draft|waiting|paused|lobby/.test(
      status,
    )
  ) {
    return "warning";
  }

  if (
    /live|answering|progress|student.paced|teacher.led/.test(
      status,
    )
  ) {
    return "info";
  }

  if (
    /suspended|rejected|failed|offline|unsupported|removed|cancelled/.test(
      status,
    )
  ) {
    return "error";
  }

  return "neutral";
});
</script>

<template>
  <UBadge
    :color="color"
    variant="soft"
    class="capitalize"
  >
    {{
      status
        .replaceAll("_", " ")
    }}
  </UBadge>
</template>
