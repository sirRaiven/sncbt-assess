<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    password: string;
    confirmPassword?: string;
    showMatch?: boolean;
  }>(),
  {
    confirmPassword:
      "",
    showMatch:
      false,
  },
);

const requirements =
  computed(
    () => [
      {
        label:
          "At least 8 characters",
        met:
          props.password.length
          >= 8,
      },
      {
        label:
          "One uppercase letter",
        met:
          /[A-Z]/.test(
            props.password,
          ),
      },
      {
        label:
          "One lowercase letter",
        met:
          /[a-z]/.test(
            props.password,
          ),
      },
      {
        label:
          "One number",
        met:
          /\d/.test(
            props.password,
          ),
      },
    ],
  );

const passwordsMatch =
  computed(
    () =>
      props.confirmPassword
        .length > 0
      && props.password
        === props.confirmPassword,
  );
</script>

<template>
  <div class="rounded-xl border border-default bg-elevated/50 p-4">
    <div class="flex items-start gap-3">
      <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <UIcon
          name="i-lucide-shield-check"
          class="size-4"
        />
      </div>

      <div class="min-w-0 flex-1">
        <p class="text-sm font-bold text-highlighted">
          Password requirements
        </p>

        <div class="mt-3 grid gap-2 sm:grid-cols-2">
          <div
            v-for="item in requirements"
            :key="item.label"
            class="flex items-center gap-2 text-xs"
            :class="
              item.met
                ? 'text-success'
                : 'text-muted'
            "
          >
            <UIcon
              :name="
                item.met
                  ? 'i-lucide-circle-check'
                  : 'i-lucide-circle'
              "
              class="size-3.5 shrink-0"
            />

            <span>
              {{ item.label }}
            </span>
          </div>

          <div
            v-if="showMatch"
            class="flex items-center gap-2 text-xs"
            :class="
              passwordsMatch
                ? 'text-success'
                : 'text-muted'
            "
          >
            <UIcon
              :name="
                passwordsMatch
                  ? 'i-lucide-circle-check'
                  : 'i-lucide-circle'
              "
              class="size-3.5 shrink-0"
            />

            <span>
              Passwords match
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
