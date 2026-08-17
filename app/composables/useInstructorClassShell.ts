import {
  inject,
  provide,
  type ComputedRef,
  type InjectionKey,
  type Ref,
} from "vue";

import type {
  InstructorClassroom,
} from "~/types/classroom";

export interface InstructorClassShellContext {
  classroomId: ComputedRef<string>;
  classroom: Ref<InstructorClassroom | null>;
  isLoading: Ref<boolean>;
  errorMessage: Ref<string>;
  refreshClass: () => Promise<void>;
}

const instructorClassShellKey:
  InjectionKey<InstructorClassShellContext> =
    Symbol("instructor-class-shell");

export function provideInstructorClassShell(
  context: InstructorClassShellContext,
): void {
  provide(
    instructorClassShellKey,
    context,
  );
}

export function useInstructorClassShell(): InstructorClassShellContext {
  const context = inject(
    instructorClassShellKey,
  );

  if (!context) {
    throw new Error(
      "Instructor class workspace is unavailable.",
    );
  }

  return context;
}
