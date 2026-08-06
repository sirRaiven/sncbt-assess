<script setup lang="ts">
type LogoSize =
  | "xs"
  | "sm"
  | "md"
  | "lg"
  | "xl";

const props = withDefaults(
  defineProps<{
    size?: LogoSize;
    alt?: string;
    eager?: boolean;
  }>(),
  {
    size:
      "md",
    alt:
      "St. Nicolas College of Business and Technology logo",
    eager:
      false,
  },
);

const sizeClass =
  computed(
    () => ({
      xs:
        "size-8",
      sm:
        "size-10",
      md:
        "size-12",
      lg:
        "size-16",
      xl:
        "size-24 sm:size-28",
    })[props.size],
  );
</script>

<template>
  <span
    class="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white p-0.5 shadow-sm ring-1 ring-slate-200/90 dark:ring-white/15"
    :class="sizeClass"
  >
    <img
      src="/images/sncbt-logo.png"
      :alt="alt"
      width="1024"
      height="1024"
      class="h-full w-full object-contain"
      :loading="
        eager
          ? 'eager'
          : 'lazy'
      "
      :fetchpriority="
        eager
          ? 'high'
          : 'auto'
      "
      decoding="async"
    >
  </span>
</template>
