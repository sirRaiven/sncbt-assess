export type InstructorReportSection =
  | "classes"
  | "assessments"
  | "students"
  | "questions";

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

export interface InstructorReportSummary {
  classesInReport: number;
  assessmentDeliveries: number;
  expectedSubmissions: number;
  studentsStarted: number;
  completedAttempts: number;
  autoSubmittedAttempts: number;
  completionRate: number;
  averagePercentage: number | null;
  highestPercentage: number | null;
}

export interface InstructorClassPerformanceRow {
  id: string;
  name: string;
  subjectCode: string;
  section: string;
  schoolYear: string;
  semester: string;
  status: string;
  activeStudents: number;
  deliveryCount: number;
  expectedSubmissions: number;
  startedAttempts: number;
  completedAttempts: number;
  autoSubmittedAttempts: number;
  completionRate: number;
  averagePercentage: number | null;
  highestPercentage: number | null;
  lowestPercentage: number | null;
  averageDurationSeconds: number | null;
}

export interface InstructorAssessmentPerformanceRow {
  id: string;
  title: string;
  subjectName: string;
  subjectCode: string;
  assessmentType: string;
  status: string;
  questionCount: number;
  totalPoints: number;
  deliveryCount: number;
  classCount: number;
  expectedSubmissions: number;
  startedAttempts: number;
  completedAttempts: number;
  autoSubmittedAttempts: number;
  completionRate: number;
  averageScore: number | null;
  averagePercentage: number | null;
  highestPercentage: number | null;
  lowestPercentage: number | null;
  averageDurationSeconds: number | null;
  lastDeliveryAt: string | null;
}

export interface InstructorStudentResultRow {
  attemptId: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
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
}

export interface InstructorQuestionAnalysisRow {
  questionId: string;
  assessmentId: string;
  assessmentTitle: string;
  subjectCode: string;
  orderNumber: number;
  questionType: string;
  questionText: string;
  points: number;
  attemptsPresented: number;
  answeredCount: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  accuracyPercentage: number | null;
  averagePoints: number | null;
  averageResponseSeconds: number | null;
}

export interface InstructorReportsOverview {
  generatedAt: string;
  serverNow: string;
  period: {
    dateFrom: string | null;
    dateTo: string | null;
  };
  summary: InstructorReportSummary;
  options: {
    classrooms: InstructorReportOption[];
    assessments: InstructorReportOption[];
  };
  classes: InstructorClassPerformanceRow[];
  assessments: InstructorAssessmentPerformanceRow[];
  students: InstructorStudentResultRow[];
  questions: InstructorQuestionAnalysisRow[];
}

export interface InstructorAssessmentReportClassRow {
  classroomId: string;
  classroomName: string;
  subjectCode: string;
  section: string;
  schoolYear: string;
  semester: string;
  deliveryCount: number;
  activeStudents: number;
  expectedSubmissions: number;
  startedAttempts: number;
  completedAttempts: number;
  completionRate: number;
  averagePercentage: number | null;
  highestPercentage: number | null;
  lowestPercentage: number | null;
}

export interface InstructorAssessmentDetailedReport {
  generatedAt: string;
  assessment: {
    id: string;
    title: string;
    subjectName: string;
    subjectCode: string;
    assessmentType: string;
    status: string;
    questionCount: number;
    totalPoints: number;
  };
  summary: {
    classCount: number;
    deliveryCount: number;
    expectedSubmissions: number;
    startedAttempts: number;
    completedAttempts: number;
    autoSubmittedAttempts: number;
    completionRate: number;
    averageScore: number | null;
    averagePercentage: number | null;
    highestPercentage: number | null;
    lowestPercentage: number | null;
    averageDurationSeconds: number | null;
  };
  classes: InstructorAssessmentReportClassRow[];
  students: InstructorStudentResultRow[];
  questions: InstructorQuestionAnalysisRow[];
}

export interface InstructorReportFunctionResult<T> {
  data: T | null;
  error: string | null;
  code: string | null;
}
