export type ArchiveSection =
  | "classes"
  | "assessments"
  | "sessions";

export type ArchivedSessionStatus =
  | "ended"
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
  sessionCode: string;
  status: ArchivedSessionStatus;
  assessmentId: string;
  assessmentTitle: string;
  subjectCode: string;
  classroomId: string;
  classroomName: string;
  section: string;
  participantCount: number;
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
  cancelledAt: string | null;
  closedAt: string;
}

export interface InstructorArchiveOverview {
  generatedAt: string;
  summary: {
    archivedAssessments: number;
    closedSessions: number;
    blockedAssessments: number;
    totalRecords: number;
  };
  assessments: ArchivedAssessmentItem[];
  sessions: ArchivedSessionItem[];
}
