export type ArchiveSection =
  | "classes"
  | "assessments"
  | "sessions";

export type ArchivedSessionStatus =
  | "closed"
  | "cancelled";

export interface ArchivedAssessmentItem {
  id: string;
  title: string;
  subjectCode: string;
  assessmentType: string;
  questionCount: number;
  totalPoints: number;
  archivedAt: string | null;
  updatedAt: string;
  linkedSessionCount: number;
  assignedClassCount: number;
}

export interface ArchivedSessionItem {
  id: string;
  status: ArchivedSessionStatus;
  assessmentId: string;
  assessmentTitle: string;
  subjectCode: string;
  classroomId: string;
  classroomName: string;
  section: string;
  classMemberCount: number;
  startedCount: number;
  completedCount: number;
  inProgressCount: number;
  notStartedCount: number;
  startsAt: string;
  endsAt: string;
  cancelledAt: string | null;
  closedAt: string;
  archivedAt: string;
}

export interface InstructorArchiveOverview {
  generatedAt: string;
  summary: {
    archivedAssessments: number;
    archivedSessions: number;
    totalRecords: number;
  };
  assessments: ArchivedAssessmentItem[];
  sessions: ArchivedSessionItem[];
}
