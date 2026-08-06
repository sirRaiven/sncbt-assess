export type DashboardAttentionTone =
  | "warning"
  | "info"
  | "success"
  | "neutral"
  | "error";

export interface DashboardProfileSummary {
  id: string;
  displayName: string;
  firstName: string;
  identifier: string | null;
}

export interface DashboardAcademicContext {
  schoolYear: string;
  semester: string;
}

export interface InstructorDashboardSummary {
  activeClasses: number;
  enrolledStudents: number;
  publishedAssessments: number;
  draftAssessments: number;
  pendingMemberships: number;
  hasOpenSession: boolean;
}

export interface InstructorDashboardSession {
  id: string;
  sessionCode: string;
  status: "lobby" | "active";
  sessionMode:
    | "student_paced"
    | "teacher_led";
  assessmentTitle: string;
  subjectCode: string;
  classroomName: string;
  section: string;
  participantCount: number;
  waitingCount: number;
  activeCount: number;
  finishedCount: number;
  allowLateJoin: boolean;
  showLeaderboard: boolean;
  createdAt: string;
  startedAt: string | null;
}

export interface InstructorDashboardAssessmentClass {
  id: string;
  name: string;
  subjectCode: string;
  section: string;
}

export interface InstructorDashboardAssessment {
  id: string;
  title: string;
  subjectCode: string;
  assessmentType: string;
  status:
    | "draft"
    | "published"
    | "archived";
  questionCount: number;
  totalPoints: number;
  assignedClassCount: number;
  assignedClasses: InstructorDashboardAssessmentClass[];
  updatedAt: string;
}

export interface InstructorDashboardClass {
  id: string;
  name: string;
  subjectCode: string;
  section: string;
  schoolYear: string;
  semester: string;
  activeStudents: number;
  pendingRequests: number;
}

export interface DashboardAttentionItem {
  id: string;
  title: string;
  description: string;
  count: number;
  icon: string;
  tone: DashboardAttentionTone;
  href: string;
  actionLabel: string;
}

export interface InstructorDashboardOverview {
  role: "instructor";
  generatedAt: string;
  profile: DashboardProfileSummary;
  academicContext: DashboardAcademicContext | null;
  summary: InstructorDashboardSummary;
  openSession: InstructorDashboardSession | null;
  recentAssessments: InstructorDashboardAssessment[];
  classes: InstructorDashboardClass[];
  attentionItems: DashboardAttentionItem[];
}

export interface StudentDashboardSummary {
  joinedClasses: number;
  pendingClassRequests: number;
  availableAssessments: number;
  hasOpenSession: boolean;
}

export interface StudentDashboardSession {
  id: string;
  sessionCode: string;
  status: "lobby" | "active";
  sessionMode:
    | "student_paced"
    | "teacher_led";
  participantStatus:
    | "waiting"
    | "active"
    | "finished"
    | "left"
    | "removed";
  assessmentTitle: string;
  subjectCode: string;
  classroomName: string;
  section: string;
  instructorName: string;
  joinedAt: string;
  startedAt: string | null;
}

export interface StudentDashboardClass {
  membershipId: string;
  classroomId: string;
  name: string;
  subjectCode: string;
  section: string;
  schoolYear: string;
  semester: string;
  instructorName: string;
  publishedAssessmentCount: number;
}

export interface StudentDashboardAssessment {
  assessmentId: string;
  classroomId: string;
  title: string;
  subjectCode: string;
  assessmentType: string;
  questionCount: number;
  totalPoints: number;
  classroomName: string;
  section: string;
  publishedAt: string | null;
}

export interface StudentPendingClassRequest {
  membershipId: string;
  classroomId: string;
  name: string;
  subjectCode: string;
  section: string;
  instructorName: string;
  requestedAt: string;
}

export interface StudentDashboardOverview {
  role: "student";
  generatedAt: string;
  profile: DashboardProfileSummary;
  summary: StudentDashboardSummary;
  openSession: StudentDashboardSession | null;
  joinedClasses: StudentDashboardClass[];
  availableAssessments: StudentDashboardAssessment[];
  pendingMemberships: StudentPendingClassRequest[];
}

export type DashboardOverview =
  | InstructorDashboardOverview
  | StudentDashboardOverview;
