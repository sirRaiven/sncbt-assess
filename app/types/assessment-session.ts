export type LiveSessionMode =
  | "student_paced"
  | "teacher_led";

export type AssessmentSessionStatus =
  | "lobby"
  | "active"
  | "ended"
  | "cancelled";

export type SessionParticipantStatus =
  | "waiting"
  | "active"
  | "finished"
  | "left"
  | "removed";

export interface SessionAssessmentSummary {
  id: string;
  title: string;
  subjectCode: string;
  assessmentType: string;
  questionCount: number;
  totalPoints: number;
  instructions: string | null;
}

export interface SessionClassroomSummary {
  id: string;
  name: string;
  subjectCode: string;
  section: string;
  schoolYear: string;
  semester: string;
}

export interface AssessmentSession {
  id: string;
  assessment_id: string;
  classroom_id: string;
  instructor_id: string;
  assessment_version: number;
  session_code: string;
  session_mode: LiveSessionMode;
  status: AssessmentSessionStatus;
  allow_late_join: boolean;
  show_leaderboard: boolean;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  ended_at: string | null;
  cancelled_at: string | null;
}

export interface SessionParticipantStudent {
  id: string;
  name: string;
  email: string | null;
  studentNumber: string | null;
}

export interface SessionParticipant {
  id: string;
  session_id: string;
  student_id: string;
  status: SessionParticipantStatus;
  joined_at: string;
  activated_at: string | null;
  finished_at: string | null;
  left_at: string | null;
  removed_at: string | null;
  created_at: string;
  updated_at: string;
  student: SessionParticipantStudent;
}

export interface ParticipantCounts {
  waiting: number;
  active: number;
  finished: number;
  left: number;
  removed: number;
}

export interface InstructorSessionItem {
  session: AssessmentSession;
  assessment: SessionAssessmentSummary;
  classroom: SessionClassroomSummary;
  participantCounts: ParticipantCounts;
}

export interface InstructorSessionDetail
  extends InstructorSessionItem {
  participants: SessionParticipant[];
}

export interface StudentSessionDetail {
  session: AssessmentSession;
  assessment: SessionAssessmentSummary;
  classroom: SessionClassroomSummary;
  instructor: {
    id: string;
    name: string;
  };
  participant: Omit<
    SessionParticipant,
    "student"
  >;
}

export interface SessionAssessmentOption {
  id: string;
  title: string;
  subjectCode: string;
  assessmentType: string;
  questionCount: number;
  totalPoints: number;
  assignedClassroomIds: string[];
}

export interface SessionClassroomOption
  extends SessionClassroomSummary {
  activeMemberCount: number;
}

export interface SessionCreationOptions {
  assessments: SessionAssessmentOption[];
  classrooms: SessionClassroomOption[];
  openSessionId: string | null;
}
