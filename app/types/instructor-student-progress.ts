export interface StudentProgressFunctionResult<T> {
  data: T | null;
  error: string | null;
  code: string | null;
}

export interface StudentProgressClassSummary {
  id: string;
  name: string;
  subjectCode: string;
  section: string;
}

export interface StudentProgressClassOption
  extends StudentProgressClassSummary {
  schoolYear: string;
  semester: string;
  studentCount: number;
}

export interface StudentProgressListItem {
  studentId: string;
  name: string;
  studentNumber: string | null;
  avatarUrl: string | null;
  classrooms: StudentProgressClassSummary[];
  assignedCount: number;
  completedCount: number;
  completionRate: number;
  attemptCount: number;
  inProgressCount: number;
  averagePercentage: number | null;
  lastActivityAt: string | null;
}

export interface InstructorStudentProgressOverview {
  generatedAt: string;
  classes: StudentProgressClassOption[];
  students: StudentProgressListItem[];
}

export interface StudentProgressAttempt {
  attemptId: string;
  assessmentId: string;
  assessmentTitle: string;
  subjectCode: string;
  assessmentType: string;
  classroomId: string | null;
  classroomName: string;
  attemptNumber: number;
  source: "scheduled" | "live";
  sourceStatus: string;
  status: string;
  questionCount: number;
  answeredCount: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  score: number;
  maximumScore: number;
  speedBonus: number;
  percentage: number | null;
  startedAt: string | null;
  submittedAt: string | null;
  lastActivityAt: string | null;
  submittedReason: string | null;
}

export interface StudentRecentResponse {
  attemptId: string;
  assessmentTitle: string;
  classroomName: string;
  questionNumber: number | null;
  questionText: string;
  questionType: string;
  responsePreview: string;
  isFinal: boolean;
  isCorrect: boolean | null;
  awardedPoints: number | null;
  speedBonus: number;
  responseSeconds: number;
  activityAt: string;
}

export interface InstructorStudentProgressDetail {
  generatedAt: string;
  student: {
    studentId: string;
    name: string;
    studentNumber: string | null;
    avatarUrl: string | null;
    classrooms: StudentProgressClassSummary[];
  };
  summary: {
    assignedCount: number;
    attemptCount: number;
    completedCount: number;
    inProgressCount: number;
    averagePercentage: number | null;
    lastActivityAt: string | null;
  };
  recentActivity: StudentRecentResponse[];
  attempts: StudentProgressAttempt[];
}

export interface AttemptReviewOption {
  text: string;
  selected: boolean;
  correct: boolean;
}

export interface AttemptReviewQuestion {
  questionId: string;
  number: number;
  type: string;
  text: string;
  imageUrl: string | null;
  points: number;
  timeLimitSeconds: number;
  studentResponse: {
    answered: boolean;
    isFinal: boolean;
    selectedOptions: string[];
    textResponse: string | null;
    booleanResponse: boolean | null;
    answeredAt: string | null;
    responseSeconds: number | null;
  };
  answerKey: {
    correctOptions: string[];
    acceptedAnswers: string[];
    correctBoolean: boolean | null;
    explanation: string | null;
  };
  options: AttemptReviewOption[];
  isCorrect: boolean | null;
  awardedPoints: number | null;
  speedBonus: number;
  timedOut: boolean;
  finalizedAt: string | null;
}

export interface InstructorAttemptReview {
  generatedAt: string;
  student: {
    studentId: string;
    name: string;
    studentNumber: string | null;
    avatarUrl: string | null;
  };
  assessment: {
    assessmentId: string;
    title: string;
    subjectCode: string;
    assessmentType: string;
    questionCount: number;
    totalPoints: number;
  };
  classroom: {
    id: string;
    name: string;
    section: string;
  } | null;
  attempt: {
    attemptId: string;
    attemptNumber: number;
    status: string;
    source: "scheduled" | "live";
    answeredCount: number;
    correctCount: number;
    wrongCount: number;
    unansweredCount: number;
    score: number;
    maximumScore: number;
    speedBonus: number;
    percentage: number | null;
    startedAt: string | null;
    submittedAt: string | null;
    lastActivityAt: string | null;
    submittedReason: string | null;
  };
  questions: AttemptReviewQuestion[];
}
