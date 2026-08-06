<script setup lang="ts">
const props = defineProps<{
  status: string;
}>();

const normalizedStatus =
  computed(
    () =>
      props.status
        .trim()
        .toLowerCase(),
  );

const color =
  computed(
    () => {
      const status =
        normalizedStatus.value;

      if (
        /active|published|completed|approved|online|valid|open|submitted|finished/.test(
          status,
        )
      ) {
        return "success";
      }

      if (
        /pending|draft|waiting|paused|upcoming|auto_submitted|auto-submitted/.test(
          status,
        )
      ) {
        return "warning";
      }

      if (
        /live|answering|progress|in_progress|student_paced|teacher_led/.test(
          status,
        )
      ) {
        return "info";
      }

      if (
        /suspended|rejected|failed|offline|unsupported|cancelled|removed|locked/.test(
          status,
        )
      ) {
        return "error";
      }

      return "neutral";
    },
  );

const label =
  computed(
    () =>
      props.status
        .replaceAll(
          "_",
          " ",
        ),
  );
</script>

<template>
  <UBadge
    :color="color"
    variant="soft"
    class="capitalize"
  >
    {{ label }}
  </UBadge>
</template>
