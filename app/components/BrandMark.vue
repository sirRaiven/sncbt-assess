<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    inverse?: boolean;
    compact?: boolean;
  }>(),
  {
    inverse:
      false,
    compact:
      false,
  },
);
</script>

<template>
  <div class="flex min-w-0 items-center gap-3">
    <InstitutionLogo
      size="md"
      :alt="
        props.compact
          ? 'St. Nicolas College of Business and Technology'
          : ''
      "
      eager
    />

    <div
      v-if="!props.compact"
      class="min-w-0"
    >
      <p
        class="truncate font-black tracking-tight"
        :class="
          props.inverse
            ? 'text-white'
            : 'text-highlighted'
        "
      >
        SNCBT Assess
      </p>

      <p
        class="truncate text-[11px]"
        :class="
          props.inverse
            ? 'text-slate-300'
            : 'text-muted'
        "
      >
        Assessment Classroom Management
      </p>
    </div>
  </div>
</template>
