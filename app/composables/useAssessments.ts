import type {
  Assessment,
  AssessmentClassOption,
  AssessmentCreateInput,
  AssessmentDetailsInput,
  AssessmentWithClassroom,
  StudentPublishedAssessment,
} from "~/types/assessment";

import type {
  InstructorDeliveryListItem,
} from "~/types/assessment-delivery";

import {
  parseUserFacingFunctionError,
} from "~/utils/user-facing-error";

interface FunctionResult<T> {
  data: T | null;
  error: string | null;
  code: string | null;
}

interface MessageResponse {
  message: string;
}

export function useAssessments() {
  const supabase = useSupabaseClient();

  async function parseFunctionError(
    error: unknown,
  ): Promise<{
    message: string;
    code: string | null;
  }> {
    return await parseUserFacingFunctionError(
      error,
      "We couldn't complete the assessment action right now. Please try again.",
    );
  }

  async function invoke<T>(
    action: string,
    payload?: Record<string, unknown>,
  ): Promise<FunctionResult<T>> {
    try {
      const {
        data,
        error,
      } = await supabase.functions.invoke<T>(
        "assessments",
        {
          body: payload
            ? {
                action,
                payload,
              }
            : {
                action,
              },
        },
      );

      if (error) {
        const parsed =
          await parseFunctionError(
            error,
          );

        return {
          data: null,
          error: parsed.message,
          code: parsed.code,
        };
      }

      return {
        data,
        error: null,
        code: null,
      };
    } catch (error) {
      const parsed =
        await parseFunctionError(
          error,
        );

      return {
        data: null,
        error: parsed.message,
        code: parsed.code,
      };
    }
  }

  async function loadScheduledAssignments(): Promise<
    InstructorDeliveryListItem[] | null
  > {
    try {
      const {
        data,
        error,
      } = await supabase.functions.invoke<{
        serverNow: string;
        deliveries: InstructorDeliveryListItem[];
      }>(
        "assessment-delivery",
        {
          body: {
            action: "list-instructor-deliveries",
          },
        },
      );

      if (error || !data) {
        return null;
      }

      return data.deliveries ?? [];
    } catch {
      return null;
    }
  }

  function mergeScheduledClassrooms(
    assessments: AssessmentWithClassroom[],
    deliveries: InstructorDeliveryListItem[] | null,
  ): AssessmentWithClassroom[] {
    if (!deliveries) {
      return assessments;
    }

    const deliveryMap = new Map<
      string,
      Map<string, AssessmentWithClassroom["assignedClassrooms"][number]>
    >();

    for (const delivery of deliveries) {
      let classroomMap = deliveryMap.get(
        delivery.assessmentId,
      );

      if (!classroomMap) {
        classroomMap = new Map();
        deliveryMap.set(
          delivery.assessmentId,
          classroomMap,
        );
      }

      classroomMap.set(
        delivery.classroom.id,
        {
          id: delivery.classroom.id,
          name: delivery.classroom.name,
          subjectCode: delivery.classroom.subjectCode,
          section: delivery.classroom.section,
          schoolYear: delivery.classroom.schoolYear,
          semester: delivery.classroom.semester,
          // Scheduled deliveries are created only for valid classes.
          // Keep the legacy summary shape expected by assessment UI.
          status: "active",
        },
      );
    }

    return assessments.map(
      (assessment) => {
        const merged = new Map(
          assessment.assignedClassrooms.map(
            (classroom) => [
              classroom.id,
              classroom,
            ],
          ),
        );

        for (
          const [classroomId, classroom]
          of deliveryMap.get(assessment.id)
            ?? []
        ) {
          merged.set(
            classroomId,
            classroom,
          );
        }

        return {
          ...assessment,
          assignedClassrooms: Array.from(
            merged.values(),
          ),
        };
      },
    );
  }

  async function listClassOptions() {
    return await invoke<{
      classes: AssessmentClassOption[];
    }>(
      "list-class-options",
    );
  }

  async function listInstructorAssessments() {
    const result = await invoke<{
      assessments: AssessmentWithClassroom[];
    }>(
      "list-instructor-assessments",
    );

    if (
      result.error
      || !result.data
    ) {
      return result;
    }

    const deliveries =
      await loadScheduledAssignments();

    return {
      ...result,
      data: {
        assessments:
          mergeScheduledClassrooms(
            result.data.assessments,
            deliveries,
          ),
      },
    };
  }

  async function getInstructorAssessment(
    assessmentId: string,
  ) {
    const result = await invoke<{
      assessment: AssessmentWithClassroom;
    }>(
      "get-instructor-assessment",
      {
        assessmentId,
      },
    );

    if (
      result.error
      || !result.data
    ) {
      return result;
    }

    const deliveries =
      await loadScheduledAssignments();

    const mergedAssessments =
      mergeScheduledClassrooms(
        [result.data.assessment],
        deliveries,
      );

    return {
      ...result,
      data: {
        assessment:
          mergedAssessments[0]
          ?? result.data.assessment,
      },
    };
  }

  async function createAssessment(
    input: AssessmentCreateInput,
  ) {
    return await invoke<
      MessageResponse & {
        assessment: AssessmentWithClassroom;
      }
    >(
      "create-assessment",
      {
        ...input,
        // Kept only for compatibility with the current Edge Function
        // contract. Whole-assessment duration is no longer configurable.
        overallTimeLimitMinutes:
          null,
      },
    );
  }

  async function updateAssessment(
    assessmentId: string,
    input: AssessmentDetailsInput,
  ) {
    return await invoke<
      MessageResponse & {
        assessment: AssessmentWithClassroom;
      }
    >(
      "update-assessment",
      {
        assessmentId,
        ...input,
        // Keep the deprecated whole-assessment duration disabled.
        overallTimeLimitMinutes:
          null,
      },
    );
  }

  async function setAssessmentAssignments(
    assessmentId: string,
    classroomIds: string[],
  ) {
    return await invoke<
      MessageResponse & {
        assessment: AssessmentWithClassroom;
      }
    >(
      "set-assessment-assignments",
      {
        assessmentId,
        classroomIds,
      },
    );
  }

  async function publishAssessment(
    assessmentId: string,
  ) {
    return await invoke<
      MessageResponse & {
        assessment: Assessment;
      }
    >(
      "publish-assessment",
      {
        assessmentId,
      },
    );
  }

  async function returnAssessmentToDraft(
    assessmentId: string,
  ) {
    return await invoke<
      MessageResponse & {
        assessment: Assessment;
        createdRevision: boolean;
        sourceAssessmentId: string | null;
      }
    >(
      "return-to-draft",
      {
        assessmentId,
      },
    );
  }

  async function archiveAssessment(
    assessmentId: string,
  ) {
    return await invoke<
      MessageResponse & {
        assessment: Assessment;
      }
    >(
      "archive-assessment",
      {
        assessmentId,
      },
    );
  }

  async function restoreAssessment(
    assessmentId: string,
  ) {
    return await invoke<
      MessageResponse & {
        assessment: Assessment;
      }
    >(
      "restore-assessment",
      {
        assessmentId,
      },
    );
  }

  async function duplicateAssessment(
    assessmentId: string,
  ) {
    return await invoke<
      MessageResponse & {
        assessment: Assessment;
      }
    >(
      "duplicate-assessment",
      {
        assessmentId,
      },
    );
  }

  async function listStudentClassAssessments(
    classroomId: string,
  ) {
    return await invoke<{
      assessments: StudentPublishedAssessment[];
    }>(
      "list-student-class-assessments",
      {
        classroomId,
      },
    );
  }

  return {
    listClassOptions,
    listInstructorAssessments,
    getInstructorAssessment,
    createAssessment,
    updateAssessment,
    setAssessmentAssignments,
    publishAssessment,
    returnAssessmentToDraft,
    archiveAssessment,
    restoreAssessment,
    duplicateAssessment,
    listStudentClassAssessments,
  };
}
