export type AssessmentQuestionType =
  | "multiple_choice"
  | "checkbox"
  | "fill_blank"
  | "true_false"
  | "true_false_correction";

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
  accepted_answers: string[];
  correct_boolean: boolean | null;
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
  acceptedAnswers: string[];
  correctBoolean: boolean | null;
}

export function assessmentQuestionTypeLabel(
  type: AssessmentQuestionType,
): string {
  switch (type) {
    case "multiple_choice":
      return "Multiple Choice";
    case "checkbox":
      return "Checkbox";
    case "fill_blank":
      return "Fill in the Blanks";
    case "true_false":
      return "True or False";
    case "true_false_correction":
      return "True or False + Correction";
  }
}

export function isChoiceQuestionType(
  type: AssessmentQuestionType,
): boolean {
  return (
    type === "multiple_choice"
    || type === "checkbox"
  );
}

export function isTrueFalseQuestionType(
  type: AssessmentQuestionType,
): boolean {
  return (
    type === "true_false"
    || type === "true_false_correction"
  );
}
