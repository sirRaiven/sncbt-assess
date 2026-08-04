export type AssessmentQuestionType =
  | "multiple_choice"
  | "checkbox";

export interface AssessmentQuestionOption {
  id: string;
  question_id: string;
  option_text: string;
  order_number: number;
  is_correct: boolean;
  created_at: string;
  updated_at: string;
}

export interface AssessmentQuestion {
  id: string;
  assessment_id: string;
  question_type: AssessmentQuestionType;
  question_text: string;
  image_url: string | null;
  explanation: string | null;
  points: number;
  time_limit_seconds: number;
  order_number: number;
  created_at: string;
  updated_at: string;
  options: AssessmentQuestionOption[];
}

export interface QuestionOptionInput {
  text: string;
  isCorrect: boolean;
}

export interface QuestionEditorInput {
  questionType: AssessmentQuestionType;
  questionText: string;
  imageUrl: string | null;
  explanation: string | null;
  points: number;
  timeLimitSeconds: number;
  options: QuestionOptionInput[];
}
