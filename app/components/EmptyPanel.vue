<script setup lang="ts">
withDefaults(
  defineProps<{
    icon: string;
    title: string;
    description?: string;
  }>(),
  {
    description: "",
  },
);
</script>

<template>
  <div class="empty-panel-surface rounded-xl border border-dashed border-default bg-elevated/45 px-6 py-10 text-center">
    <div class="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
      <UIcon
        :name="icon"
        class="size-6"
      />
    </div>

    <h3 class="mt-4 font-black text-highlighted">
      {{ title }}
    </h3>

    <p
      v-if="description"
      class="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted"
    >
      {{ description }}
    </p>

    <div
      v-if="$slots.actions"
      class="mt-5 flex flex-wrap justify-center gap-2"
    >
      <slot name="actions" />
    </div>
  </div>
</template>
