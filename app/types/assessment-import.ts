import type {
  AssessmentQuestionType,
  QuestionOptionInput,
} from "~/types/question";

// Legacy/browser-preview import types are intentionally retained because the
// workbook parser utility and older import action still use them.
export interface ExcelQuestionImportQuestion {
  sourceRowNumber: number;
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

export interface ExcelQuestionImportPreviewRow {
  id: string;
  sourceRowNumber: number;
  selected: boolean;
  question: ExcelQuestionImportQuestion | null;
  rawQuestionType: string;
  correctAnswerText: string;
  acceptedAnswerText: string;
  errors: string[];
}

export interface ExcelQuestionImportPreview {
  fileName: string;
  fileSizeBytes: number;
  worksheetName: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  rows: ExcelQuestionImportPreviewRow[];
}

export interface ExcelQuestionImportResult {
  message: string;
  assessmentId: string;
  importedCount: number;
  questionIds: string[];
}

export type AssessmentImportStatus =
  | "ready"
  | "committed"
  | "cancelled"
  | "failed";

export interface AssessmentImport {
  id: string;
  assessment_id: string;
  instructor_id: string;
  original_filename: string;
  file_size_bytes: number;
  status: AssessmentImportStatus;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  imported_rows: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  expires_at: string;
}

export interface AssessmentImportNormalizedOption {
  text: string;
  isCorrect: boolean;
}

export interface AssessmentImportNormalizedQuestion {
  questionText: string;
  questionType: AssessmentQuestionType | null;
  imageUrl: string | null;
  explanation: string | null;
  points: number;
  timeLimitSeconds: number;
  options: AssessmentImportNormalizedOption[];
  correctAnswerText: string;
  acceptedAnswers: string[];
  acceptedAnswerText: string;
  correctBoolean: boolean | null;
}

export interface AssessmentImportRow {
  id: string;
  import_id: string;
  source_row_number: number;
  normalized_data: AssessmentImportNormalizedQuestion;
  validation_errors: string[];
  is_valid: boolean;
  is_excluded: boolean;
  created_at?: string;
}

export interface AssessmentImportPreviewResult {
  assessmentImport: AssessmentImport;
  rows: AssessmentImportRow[];
  message?: string;
}

export interface AssessmentImportValidationResult
  extends AssessmentImportPreviewResult {
  message: string;
}

export interface AssessmentImportCommitResult {
  importedRows: number;
  assessmentId: string;
  message: string;
}

export interface AssessmentImportCancelResult {
  message: string;
}
