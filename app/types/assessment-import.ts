import type {
  AssessmentQuestionType,
  QuestionOptionInput,
} from "~/types/question";

export interface ExcelQuestionImportQuestion {
  sourceRowNumber: number;
  questionType: AssessmentQuestionType;
  questionText: string;
  imageUrl: string | null;
  explanation: string | null;
  points: number;
  timeLimitSeconds: number;
  options: QuestionOptionInput[];
}

export interface ExcelQuestionImportPreviewRow {
  id: string;
  sourceRowNumber: number;
  selected: boolean;
  question: ExcelQuestionImportQuestion | null;
  rawQuestionType: string;
  correctAnswerText: string;
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
