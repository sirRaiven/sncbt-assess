import type {
  AssessmentType,
} from "~/types/assessment";

import type {
  AssessmentScheduleInput,
  AssessmentScheduleItem,
  DeliveryAvailabilityStatus,
  DeliveryClassSummary,
} from "~/types/assessment-delivery";

export type AssessmentAvailabilityStatus =
  DeliveryAvailabilityStatus;

export type AssessmentScheduleClass =
  DeliveryClassSummary;

export type {
  AssessmentScheduleInput,
  AssessmentScheduleItem,
};

export interface InstructorAssessmentScheduleOverview {
  serverNow: string;
  assessment: {
    id: string;
    title: string;
    subjectName: string;
    subjectCode: string;
    status:
      | "draft"
      | "published"
      | "archived";
    assessmentType: AssessmentType;
    questionCount: number;
    totalPoints: number;
    defaultTimeLimitSeconds: number | null;
    defaultLeaderboardEnabled: boolean;
  };
  schedules: AssessmentScheduleItem[];
}
