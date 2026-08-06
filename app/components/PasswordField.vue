<script setup lang="ts">
defineOptions({
  inheritAttrs: false,
});

const model = defineModel<string>({
  default: "",
});

const props = withDefaults(
  defineProps<{
    autocomplete?: string;
    icon?: string;
    placeholder?: string;
    size?:
      | "xs"
      | "sm"
      | "md"
      | "lg"
      | "xl";
    disabled?: boolean;
  }>(),
  {
    autocomplete:
      "current-password",
    icon:
      "i-lucide-lock-keyhole",
    placeholder:
      "Enter your password",
    size:
      "lg",
    disabled:
      false,
  },
);

const isVisible =
  ref(false);

const capsLockOn =
  ref(false);

const inputType =
  computed(
    () =>
      isVisible.value
        ? "text"
        : "password",
  );

const toggleLabel =
  computed(
    () =>
      isVisible.value
        ? "Hide password"
        : "Show password",
  );

const toggleIcon =
  computed(
    () =>
      isVisible.value
        ? "i-lucide-eye-off"
        : "i-lucide-eye",
  );

function updateCapsLock(
  event: KeyboardEvent,
): void {
  capsLockOn.value =
    event.getModifierState(
      "CapsLock",
    );
}

function hideCapsLockNotice(): void {
  capsLockOn.value =
    false;
}
</script>

<template>
  <div class="w-full space-y-2">
    <UInput
      v-model="model"
      v-bind="$attrs"
      :type="inputType"
      :size="props.size"
      :icon="props.icon"
      :placeholder="props.placeholder"
      :autocomplete="props.autocomplete"
      :disabled="props.disabled"
      class="w-full"
      autocapitalize="none"
      autocorrect="off"
      spellcheck="false"
      :ui="{
        trailing:
          'pe-1',
      }"
      @keydown="updateCapsLock"
      @keyup="updateCapsLock"
      @blur="hideCapsLockNotice"
    >
      <template #trailing>
        <UTooltip :text="toggleLabel">
          <UButton
            type="button"
            color="neutral"
            variant="ghost"
            size="sm"
            square
            :icon="toggleIcon"
            :aria-label="toggleLabel"
            :aria-pressed="isVisible"
            :disabled="props.disabled"
            @click="
              isVisible =
                !isVisible
            "
          />
        </UTooltip>
      </template>
    </UInput>

    <p
      v-if="capsLockOn"
      class="flex items-center gap-1.5 text-xs font-medium text-warning"
      role="status"
      aria-live="polite"
    >
      <UIcon
        name="i-lucide-triangle-alert"
        class="size-3.5"
      />

      Caps Lock is on.
    </p>
  </div>
</template>
