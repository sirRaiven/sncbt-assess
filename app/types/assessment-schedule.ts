import type {
  AssessmentType,
  AssessmentResultVisibility,
} from "~/types/assessment";

export type AssessmentAvailabilityStatus =
  | "scheduled"
  | "open"
  | "closed"
  | "cancelled";

export interface AssessmentScheduleClass {
  id: string;
  name: string;
  subjectCode: string;
  section: string;
  schoolYear: string;
  semester: string;
}

export interface AssessmentScheduleItem {
  id: string;
  assessmentId: string;
  classroomId: string;
  startsAt: string;
  endsAt: string;
  closedAt: string | null;
  cancelledAt: string | null;
  status: AssessmentAvailabilityStatus;
  classroom: AssessmentScheduleClass;
}

export interface AssessmentScheduleInput {
  classroomId: string;
  startsAt: string;
  endsAt: string;
}

export interface InstructorAssessmentScheduleOverview {
  serverNow: string;
  assessment: {
    id: string;
    title: string;
    subjectName: string;
    subjectCode: string;
    status: "draft" | "published" | "archived";
    assessmentType: AssessmentType;
    questionCount: number;
    totalPoints: number;
  };
  schedules: AssessmentScheduleItem[];
}

export interface StudentScheduledAssessment {
  assignmentId: string;
  assessmentId: string;
  title: string;
  subjectName: string;
  subjectCode: string;
  assessmentType: AssessmentType;
  instructions: string | null;
  questionCount: number;
  totalPoints: number;
  overallTimeLimitSeconds: number | null;
  resultVisibility: AssessmentResultVisibility;
  startsAt: string;
  endsAt: string;
  closedAt: string | null;
  cancelledAt: string | null;
  status: AssessmentAvailabilityStatus;
  classroom: AssessmentScheduleClass;
  canBegin: boolean;
}

export interface StudentAssessmentScheduleDetail {
  serverNow: string;
  assignment: StudentScheduledAssessment;
}
