export type AssessmentType =
  | "quiz"
  | "examination"
  | "activity"
  | "practice";

export type AssessmentStatus =
  | "draft"
  | "published"
  | "archived";

export type AssessmentScoringMode =
  | "standard"
  | "speed_bonus";

export type AssessmentResultVisibility =
  | "hidden"
  | "score_only"
  | "score_and_answers";

export interface AssessmentClassroomSummary {
  id: string;
  name: string;
  subjectCode: string;
  section: string;
  schoolYear: string;
  semester: string;
  status: "active" | "archived";
}

export interface Assessment {
  id: string;
  instructor_id: string;
  classroom_id: string;
  source_assessment_id: string | null;
  title: string;
  subject_name: string;
  subject_code: string;
  instructions: string | null;
  assessment_type: AssessmentType;
  status: AssessmentStatus;
  scoring_mode: AssessmentScoringMode;
  randomize_questions: boolean;
  randomize_options: boolean;
  result_visibility: AssessmentResultVisibility;
  leaderboard_enabled: boolean;
  allow_backtracking: boolean;
  overall_time_limit_seconds: number | null;
  question_count: number;
  total_points: number;
  version: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  archived_at: string | null;
}

export interface AssessmentWithClassroom
  extends Assessment {
  classroom: AssessmentClassroomSummary;
}

export interface AssessmentClassOption {
  id: string;
  name: string;
  subjectCode: string;
  section: string;
  schoolYear: string;
  semester: string;
}

export interface AssessmentFormInput {
  classroomId: string;
  title: string;
  subjectName: string;
  subjectCode: string;
  instructions: string | null;
  assessmentType: AssessmentType;
  scoringMode: AssessmentScoringMode;
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  resultVisibility: AssessmentResultVisibility;
  leaderboardEnabled: boolean;
  allowBacktracking: boolean;
  overallTimeLimitMinutes: number | null;
}

export interface StudentPublishedAssessment {
  id: string;
  title: string;
  subjectName: string;
  subjectCode: string;
  instructions: string | null;
  assessmentType: AssessmentType;
  questionCount: number;
  totalPoints: number;
  overallTimeLimitSeconds: number | null;
  publishedAt: string;
}
