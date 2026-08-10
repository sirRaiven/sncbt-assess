import type {
  AssessmentResultVisibility,
  AssessmentType,
} from "~/types/assessment";

export type DeliveryAvailabilityStatus =
  | "upcoming"
  | "open"
  | "closed"
  | "cancelled";

export type DeliveryAttemptStatus =
  | "not_started"
  | "in_progress"
  | "submitted"
  | "auto_submitted"
  | "locked"
  | "cancelled";

export interface DeliveryClassSummary {
  id: string;
  name: string;
  subjectCode: string;
  section: string;
  schoolYear: string;
  semester: string;
}

export interface AssessmentScheduleInput {
  classroomId: string;
  startsAt: string;
  endsAt: string;
  timeLimitSeconds: number | null;
  showLeaderboard: boolean;
  maxAttempts: number;
}

export interface AssessmentScheduleItem {
  id: string;
  assessmentId: string;
  classroomId: string;
  startsAt: string;
  endsAt: string;
  closedAt: string | null;
  cancelledAt: string | null;
  timeLimitSeconds: number | null;
  showLeaderboard: boolean;
  maxAttempts: number;
  status: DeliveryAvailabilityStatus;
  classroom: DeliveryClassSummary;
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
    defaultTimeLimitSeconds: number | null;
    defaultLeaderboardEnabled: boolean;
  };
  schedules: AssessmentScheduleItem[];
}

export interface DeliveryAttemptSummary {
  id: string;
  status: DeliveryAttemptStatus;
  startedAt: string | null;
  expiresAt: string | null;
  submittedAt: string | null;
  lastActivityAt: string | null;
  currentQuestionIndex: number;
  answeredCount: number;
  questionCount: number;
  totalScore: number;
  maximumScore: number;
  correctCount: number | null;
  wrongCount: number | null;
  unansweredCount: number;
  submittedReason: string | null;
}

export interface StudentAssessmentDelivery {
  assignmentId: string;
  assessmentId: string;
  title: string;
  subjectName: string;
  subjectCode: string;
  assessmentType: AssessmentType;
  instructions: string | null;
  questionCount: number;
  totalPoints: number;
  allowBacktracking: boolean;
  resultVisibility: AssessmentResultVisibility;
  startsAt: string;
  endsAt: string;
  timeLimitSeconds: number | null;
  showLeaderboard: boolean;
  status: DeliveryAvailabilityStatus;
  classroom: DeliveryClassSummary;
  attempt: DeliveryAttemptSummary | null;
  canStart: boolean;
  canResume: boolean;
  canViewResult: boolean;
}

export interface SafeDeliveryOption {
  id: string;
  text: string;
  orderNumber: number;
}

export interface SafeDeliveryQuestion {
  id: string;
  questionType:
    | "multiple_choice"
    | "checkbox";
  questionText: string;
  imageUrl: string | null;
  points: number;
  timeLimitSeconds: number;
  orderNumber: number;
  options: SafeDeliveryOption[];
}

export interface DeliveryQuestionPayload {
  serverNow: string;
  attemptId: string;
  questionIndex: number;
  questionCount: number;
  deadlineAt: string | null;
  firstDeliveredAt: string;
  selectedOptionIds: string[];
  finalized: boolean;
  canGoPrevious: boolean;
  canGoNext: boolean;
  allowBacktracking: boolean;
  question: SafeDeliveryQuestion;
}

export interface SaveDeliveryAnswerResult {
  message: string;
  saved: boolean;
  timedOut: boolean;
  finalized: boolean;
  nextQuestionIndex: number;
  answeredCount: number;
  attemptClosed?: boolean;
}

export interface SubmitDeliveryAttemptResult {
  message: string;
  attemptId: string;
  status:
    | "submitted"
    | "auto_submitted";
  answeredCount: number;
  correctCount: number | null;
  wrongCount: number | null;
  unansweredCount: number;
  score: number | null;
  alreadyCompleted: boolean;
}


export type StudentResultReviewOutcome =
  | "correct"
  | "incorrect"
  | "unanswered"
  | "not_graded";

export interface StudentResultReviewOption {
  id: string;
  text: string;
  orderNumber: number;
  selected: boolean;
  correct: boolean;
}

export interface StudentResultReviewQuestion {
  id: string;
  orderNumber: number;
  questionType:
    | "multiple_choice"
    | "checkbox";
  questionText: string;
  imageUrl: string | null;
  points: number;
  earnedPoints: number | null;
  outcome: StudentResultReviewOutcome;
  options: StudentResultReviewOption[];
  explanation: string | null;
}

export interface StudentResultReview {
  assignmentId: string;
  attemptId: string;
  questions: StudentResultReviewQuestion[];
}

export interface InstructorDeliveryListItem {
  assignmentId: string;
  assessmentId: string;
  title: string;
  subjectCode: string;
  classroom: DeliveryClassSummary;
  startsAt: string;
  endsAt: string;
  status: DeliveryAvailabilityStatus;
  showLeaderboard: boolean;
  classMemberCount: number;
  startedCount: number;
  inProgressCount: number;
  submittedCount: number;
  autoSubmittedCount: number;
  notStartedCount: number;
}

export interface InstructorMonitorStudent {
  studentId: string;
  studentName: string;
  studentNumber: string | null;
  email: string | null;
  attemptId: string | null;
  status: DeliveryAttemptStatus;
  answeredCount: number;
  questionCount: number;
  progressPercent: number;
  score: number;
  maximumScore: number;
  rank: number | null;
  startedAt: string | null;
  expiresAt: string | null;
  submittedAt: string | null;
  lastActivityAt: string | null;
}

export interface InstructorDeliveryMonitor {
  serverNow: string;
  delivery: InstructorDeliveryListItem & {
    instructions: string | null;
    questionCount: number;
    totalPoints: number;
    timeLimitSeconds: number | null;
  };
  summary: {
    classMembers: number;
    started: number;
    inProgress: number;
    submitted: number;
    autoSubmitted: number;
    notStarted: number;
    classAverage: number | null;
    highestScore: number | null;
    lowestScore: number | null;
  };
  students: InstructorMonitorStudent[];
}
