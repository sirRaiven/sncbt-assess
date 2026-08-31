export type InstructorAttemptStatus =
  | "not_started"
  | "in_progress"
  | "submitted"
  | "auto_submitted"
  | "locked"
  | "cancelled";

export interface InstructorReportFilters {
  dateFrom: string | null;
  dateTo: string | null;
  classroomId: string | null;
  assessmentId: string | null;
}

export interface InstructorReportOption {
  label: string;
  value: string;
}

export interface InstructorStudentResultRow {
  attemptId: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  studentNumber: string | null;
  email: string | null;
  classroomId: string;
  classroomName: string;
  section: string;
  assessmentId: string;
  assessmentTitle: string;
  subjectCode: string;
  status: InstructorAttemptStatus;
  answeredCount: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  score: number;
  maximumScore: number;
  percentage: number | null;
  startedAt: string | null;
  submittedAt: string | null;
  durationSeconds: number | null;
  submittedReason: string | null;
  requiresExamPermit: boolean;
  examAccessStatus: string | null;
  examAccessReferenceNumber: string | null;
}

export interface InstructorReportsOverview {
  generatedAt: string;
  serverNow: string;
  period: {
    dateFrom: string | null;
    dateTo: string | null;
  };
  options: {
    classrooms: InstructorReportOption[];
    assessments: InstructorReportOption[];
  };
  students: InstructorStudentResultRow[];
}

export interface InstructorReportFunctionResult<T> {
  data: T | null;
  error: string | null;
  code: string | null;
}
