export type StudentAccessGrantType = "make_up" | "second_chance";
export type StudentAccessGrantStatus = "upcoming" | "open" | "expired";

export interface StudentAccessAttemptSummary {
  id: string;
  status: string;
  attemptNumber: number;
  startedAt: string | null;
  submittedAt: string | null;
  score: number;
  maximumScore: number;
}

export interface StudentAccessGrantSummary {
  id: string;
  type: StudentAccessGrantType;
  startsAt: string;
  endsAt: string;
  reason: string | null;
  status: StudentAccessGrantStatus;
}

export interface AssessmentStudentAccessRow {
  studentId: string;
  studentName: string;
  studentNumber: string | null;
  attemptsUsed: number;
  latestAttempt: StudentAccessAttemptSummary | null;
  grant: StudentAccessGrantSummary | null;
  canGrant: boolean;
  grantKind: StudentAccessGrantType;
}

export interface AssessmentStudentAccessOverview {
  serverNow: string;
  assignment: {
    id: string;
    assessmentId: string;
    assessmentTitle: string;
    classroomId: string;
    classroomName: string;
    subjectCode: string;
    section: string;
    startsAt: string;
    endsAt: string;
    status: "upcoming" | "open" | "closed" | "cancelled";
  };
  students: AssessmentStudentAccessRow[];
  message?: string;
}
