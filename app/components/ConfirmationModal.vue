<script setup lang="ts">
const open = defineModel<boolean>(
  "open",
  {
    default: false,
  },
);

withDefaults(
  defineProps<{
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    confirmColor?:
      | "primary"
      | "success"
      | "warning"
      | "error"
      | "neutral";
    icon?: string;
    loading?: boolean;
    dismissible?: boolean;
  }>(),
  {
    confirmLabel:
      "Continue",
    cancelLabel:
      "Cancel",
    confirmColor:
      "primary",
    icon:
      "i-lucide-circle-help",
    loading:
      false,
    dismissible:
      true,
  },
);

const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();

function cancel(): void {
  if (!open.value) {
    return;
  }

  open.value =
    false;

  emit("cancel");
}

function confirm(): void {
  emit("confirm");
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="title"
    :description="description"
    :dismissible="
      dismissible
      && !loading
    "
    :close="
      !loading
    "
    :ui="{
      content:
        'sm:max-w-lg',
      header:
        'border-b border-default',
      footer:
        'justify-end border-t border-default',
    }"
  >
    <template #body>
      <div class="flex items-start gap-4">
        <div
          class="flex size-11 shrink-0 items-center justify-center rounded-xl"
          :class="{
            'bg-primary/10 text-primary':
              confirmColor === 'primary',
            'bg-success/10 text-success':
              confirmColor === 'success',
            'bg-warning/10 text-warning':
              confirmColor === 'warning',
            'bg-error/10 text-error':
              confirmColor === 'error',
            'bg-elevated text-muted':
              confirmColor === 'neutral',
          }"
        >
          <UIcon
            :name="icon"
            class="size-5"
          />
        </div>

        <div class="min-w-0">
          <p class="text-sm font-bold text-highlighted">
            Review before continuing
          </p>

          <p class="mt-1 text-sm leading-6 text-muted">
            {{ description }}
          </p>

          <slot />
        </div>
      </div>
    </template>

    <template #footer>
      <UButton
        color="neutral"
        variant="outline"
        :disabled="loading"
        @click="cancel"
      >
        {{ cancelLabel }}
      </UButton>

      <UButton
        :color="confirmColor"
        :loading="loading"
        @click="confirm"
      >
        {{ confirmLabel }}
      </UButton>
    </template>
  </UModal>
</template>
