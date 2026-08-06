<script setup lang="ts">
import type {
  AssessmentClassOption,
} from "~/types/assessment";

const props = withDefaults(
  defineProps<{
    modelValue: string[];
    classes: AssessmentClassOption[];
    loading?: boolean;
    disabled?: boolean;
  }>(),
  {
    loading: false,
    disabled: false,
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: string[]];
}>();

const selectedCount = computed(
  () => props.modelValue.length,
);

function isSelected(
  classroomId: string,
): boolean {
  return props.modelValue.includes(
    classroomId,
  );
}

function toggleClass(
  classroomId: string,
): void {
  if (props.disabled) {
    return;
  }

  if (isSelected(classroomId)) {
    emit(
      "update:modelValue",
      props.modelValue.filter(
        (id) => id !== classroomId,
      ),
    );

    return;
  }

  emit(
    "update:modelValue",
    [
      ...props.modelValue,
      classroomId,
    ],
  );
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p class="font-semibold text-highlighted">
          Class availability
        </p>

        <p class="mt-1 text-sm leading-6 text-muted">
          Select any classes that may access this assessment after it is published.
        </p>
      </div>

      <UBadge
        :color="selectedCount > 0 ? 'primary' : 'neutral'"
        variant="soft"
      >
        {{
          selectedCount > 0
            ? `${selectedCount} selected`
            : "Assessment Library"
        }}
      </UBadge>
    </div>

    <UAlert
      v-if="loading"
      color="neutral"
      variant="soft"
      title="Loading active classes"
      description="Please wait while your class list is prepared."
    />

    <UAlert
      v-else-if="classes.length === 0"
      color="info"
      variant="soft"
      title="No active classes yet"
      description="You can still save the assessment in My Assessment Library and assign it after creating a class."
    />

    <div
      v-else
      class="grid gap-3 lg:grid-cols-2"
    >
      <button
        v-for="classroom in classes"
        :key="classroom.id"
        type="button"
        role="checkbox"
        :aria-checked="isSelected(classroom.id)"
        :disabled="disabled"
        class="flex items-start gap-3 rounded-xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-60"
        :class="
          isSelected(classroom.id)
            ? 'border-primary bg-primary/5 ring-3 ring-primary/10'
            : 'border-default hover:border-primary/40 hover:bg-elevated'
        "
        @click="toggleClass(classroom.id)"
      >
        <span
          class="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border"
          :class="
            isSelected(classroom.id)
              ? 'border-primary bg-primary text-white'
              : 'border-default bg-default text-transparent'
          "
        >
          <UIcon
            name="i-lucide-check"
            class="size-4"
          />
        </span>

        <span class="min-w-0 flex-1">
          <span class="block font-bold text-highlighted">
            {{ classroom.subjectCode }}
            ·
            {{ classroom.section }}
          </span>

          <span class="mt-1 block text-sm text-muted">
            {{ classroom.name }}
          </span>

          <span class="mt-2 block text-xs text-muted">
            {{ classroom.schoolYear }}
            ·
            {{ classroom.semester }}
          </span>
        </span>
      </button>
    </div>

    <div class="rounded-xl border border-default bg-elevated p-4">
      <div class="flex items-start gap-3">
        <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <UIcon
            name="i-lucide-library"
            class="size-4"
          />
        </div>

        <div>
          <p class="font-semibold text-highlighted">
            Reusable assessment
          </p>

          <p class="mt-1 text-sm leading-6 text-muted">
            No class selection is required. An unassigned assessment remains private in your library until you assign it to one or more classes.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
