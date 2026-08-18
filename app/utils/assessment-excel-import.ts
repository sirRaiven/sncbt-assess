import readExcelFile from "read-excel-file/browser";

import type {
  ExcelQuestionImportPreview,
  ExcelQuestionImportPreviewRow,
  ExcelQuestionImportQuestion,
} from "~/types/assessment-import";

import type {
  AssessmentQuestionType,
  QuestionOptionInput,
} from "~/types/question";

type ExcelCell =
  | string
  | number
  | boolean
  | Date
  | null;

interface ExcelWorkbookSheet {
  sheet: string;
  data: ExcelCell[][];
}

const MAX_FILE_SIZE_BYTES =
  5 * 1024 * 1024;

const MAX_IMPORT_ROWS = 200;
const WORKSHEET_NAME = "Create a Quiz";

const headerAliases = {
  questionText: [
    "question text",
    "question",
  ],
  questionType: [
    "question type",
    "type",
  ],
  option1: [
    "option 1",
    "answer 1",
  ],
  option2: [
    "option 2",
    "answer 2",
  ],
  option3: [
    "option 3",
    "answer 3",
  ],
  option4: [
    "option 4",
    "answer 4",
  ],
  option5: [
    "option 5",
    "answer 5",
  ],
  correctAnswer: [
    "correct answer",
    "correct answers",
  ],
  acceptedAnswers: [
    "accepted text answer(s)",
    "accepted text answers",
    "accepted answers",
    "accepted answer",
  ],
  timeInSeconds: [
    "time in seconds",
    "time",
    "time seconds",
  ],
  imageLink: [
    "image link",
    "image url",
  ],
  explanation: [
    "answer explanation",
    "explanation",
  ],
} as const;

type HeaderKey =
  keyof typeof headerAliases;

function normalizeText(
  value: unknown,
): string {
  return String(
    value ?? "",
  )
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeHeader(
  value: unknown,
): string {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findHeaderIndex(
  headers: string[],
  key: HeaderKey,
): number {
  const aliases =
    headerAliases[key];

  return headers.findIndex(
    (header) =>
      aliases.some(
        (alias) =>
          alias === header,
      ),
  );
}

function isEmptyRow(
  row: ExcelCell[],
): boolean {
  return row.every(
    (cell) =>
      normalizeText(cell) === "",
  );
}

function parseQuestionType(
  value: string,
): AssessmentQuestionType | null {
  const normalized =
    value
      .toLowerCase()
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  if (
    [
      "multiple choice",
      "mcq",
      "single choice",
      "single select",
    ].includes(normalized)
  ) {
    return "multiple_choice";
  }

  if (
    [
      "checkbox",
      "check box",
      "multiple select",
      "multiple response",
      "multiple answer",
    ].includes(normalized)
  ) {
    return "checkbox";
  }

  if (
    [
      "fill in the blanks",
      "fill in the blank",
      "fill blank",
      "fill blanks",
      "short answer",
    ].includes(normalized)
  ) {
    return "fill_blank";
  }

  if (
    [
      "true or false",
      "true false",
      "tf",
      "t f",
    ].includes(normalized)
  ) {
    return "true_false";
  }

  if (
    [
      "true or false + correction",
      "true false + correction",
      "true or false correction",
      "true false correction",
      "true or false with correction",
      "true false with correction",
    ].includes(normalized)
  ) {
    return "true_false_correction";
  }

  return null;
}

function parseCorrectIndexes(
  value: string,
): number[] {
  const tokens =
    value
      .toUpperCase()
      .split(/[;,|/\s]+/)
      .map(
        (token) =>
          token.trim(),
      )
      .filter(Boolean);

  const indexes =
    tokens.map(
      (token) => {
        if (/^[1-5]$/.test(token)) {
          return Number(token);
        }

        if (/^[A-E]$/.test(token)) {
          return (
            token.charCodeAt(0)
            - 64
          );
        }

        return Number.NaN;
      },
    );

  return [
    ...new Set(indexes),
  ];
}

function parseBooleanAnswer(
  value: string,
): boolean | null {
  const normalized =
    value.trim().toLowerCase();

  if (["true", "t", "1", "yes"].includes(normalized)) {
    return true;
  }

  if (["false", "f", "0", "no"].includes(normalized)) {
    return false;
  }

  return null;
}

function parseAcceptedAnswers(
  value: string,
): string[] {
  const values = value
    .split(/[|\n]+/)
    .map((answer) =>
      answer
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean);

  const seen = new Set<string>();

  return values.filter((answer) => {
    const normalized =
      answer.toLowerCase();

    if (seen.has(normalized)) {
      return false;
    }

    seen.add(normalized);
    return true;
  });
}

function parseTimeLimit(
  value: ExcelCell | undefined,
  errors: string[],
): number {
  const text =
    normalizeText(value);

  if (!text) {
    return 30;
  }

  const numberValue =
    Number(text);

  if (
    !Number.isInteger(numberValue)
    || numberValue < 5
    || numberValue > 3600
  ) {
    errors.push(
      "Time in seconds must be a whole number from 5 to 3,600.",
    );

    return 30;
  }

  return numberValue;
}

function parseImageUrl(
  value: ExcelCell | undefined,
  errors: string[],
): string | null {
  const text =
    normalizeText(value);

  if (!text) {
    return null;
  }

  try {
    const url =
      new URL(text);

    if (
      url.protocol !== "http:"
      && url.protocol !== "https:"
    ) {
      throw new Error(
        "Unsupported protocol",
      );
    }

    if (text.length > 2000) {
      errors.push(
        "Image Link must not exceed 2,000 characters.",
      );
    }

    return text;
  } catch {
    errors.push(
      "Image Link must be a valid HTTP or HTTPS URL.",
    );

    return null;
  }
}

function buildQuestionRow(
  row: ExcelCell[],
  sourceRowNumber: number,
  indexes: Record<HeaderKey, number>,
): ExcelQuestionImportPreviewRow {
  const errors: string[] = [];

  const questionText =
    normalizeText(
      row[indexes.questionText],
    );

  const rawQuestionType =
    normalizeText(
      row[indexes.questionType],
    );

  const questionType =
    parseQuestionType(
      rawQuestionType,
    );

  const correctAnswerText =
    normalizeText(
      row[indexes.correctAnswer],
    );

  const acceptedAnswerText =
    indexes.acceptedAnswers >= 0
      ? normalizeText(
          row[indexes.acceptedAnswers],
        )
      : "";

  if (!questionText) {
    errors.push(
      "Question Text is required.",
    );
  } else if (
    questionText.length > 1000
  ) {
    errors.push(
      "Question Text must not exceed 1,000 characters.",
    );
  }

  if (!questionType) {
    errors.push(
      "Question Type must be Multiple Choice, Checkbox, Fill in the Blanks, True or False, or True or False + Correction.",
    );
  }

  const optionIndexes = [
    indexes.option1,
    indexes.option2,
    indexes.option3,
    indexes.option4,
    indexes.option5,
  ];

  const optionTexts =
    optionIndexes.map(
      (index) =>
        index >= 0
          ? normalizeText(row[index])
          : "",
    );

  let encounteredEmpty = false;
  let hasOptionGap = false;

  for (const optionText of optionTexts) {
    if (!optionText) {
      encounteredEmpty = true;
      continue;
    }

    if (encounteredEmpty) {
      hasOptionGap = true;
    }
  }

  const filledOptions =
    optionTexts.filter(Boolean);

  const isChoiceQuestion =
    questionType === "multiple_choice"
    || questionType === "checkbox";

  let correctIndexes: number[] = [];
  let correctBoolean: boolean | null = null;
  let acceptedAnswers =
    parseAcceptedAnswers(
      acceptedAnswerText,
    );

  if (isChoiceQuestion) {
    if (hasOptionGap) {
      errors.push(
        "Answer options must be continuous. Do not leave an empty option before another filled option.",
      );
    }

    if (filledOptions.length < 2) {
      errors.push(
        "Add at least two answer options.",
      );
    }

    for (const optionText of filledOptions) {
      if (optionText.length > 500) {
        errors.push(
          "Each answer option must not exceed 500 characters.",
        );
        break;
      }
    }

    const normalizedOptions =
      filledOptions.map(
        (option) =>
          option.toLowerCase(),
      );

    if (
      new Set(normalizedOptions).size
      !== normalizedOptions.length
    ) {
      errors.push(
        "Answer options must not contain duplicate text.",
      );
    }

    correctIndexes =
      parseCorrectIndexes(
        correctAnswerText,
      );

    if (!correctAnswerText) {
      errors.push(
        "Correct Answer is required.",
      );
    } else if (
      correctIndexes.some(
        (index) =>
          !Number.isInteger(index),
      )
    ) {
      errors.push(
        "Correct Answer must use option numbers 1–5 or letters A–E.",
      );
    } else if (
      correctIndexes.some(
        (index) =>
          index < 1
          || index > filledOptions.length,
      )
    ) {
      errors.push(
        "Correct Answer refers to an option that is empty or does not exist.",
      );
    }

    if (
      questionType === "multiple_choice"
      && correctIndexes.length !== 1
    ) {
      errors.push(
        "Multiple Choice requires exactly one correct answer.",
      );
    }

    if (
      questionType === "checkbox"
      && correctIndexes.length < 1
    ) {
      errors.push(
        "Checkbox requires at least one correct answer.",
      );
    }

    acceptedAnswers = [];
  } else {
    if (filledOptions.length > 0) {
      errors.push(
        "Leave Option 1 through Option 5 empty for this question type.",
      );
    }

    if (questionType === "fill_blank") {
      if (
        acceptedAnswers.length === 0
        && correctAnswerText
      ) {
        acceptedAnswers = [
          correctAnswerText,
        ];
      }

      if (acceptedAnswers.length < 1) {
        errors.push(
          "Fill in the Blanks requires at least one Accepted Text Answer. Separate alternatives with |.",
        );
      }
    }

    if (
      questionType === "true_false"
      || questionType === "true_false_correction"
    ) {
      correctBoolean =
        parseBooleanAnswer(
          correctAnswerText,
        );

      if (correctBoolean === null) {
        errors.push(
          "Correct Answer must be True or False for this question type.",
        );
      }
    }

    if (
      questionType === "true_false_correction"
      && correctBoolean === false
      && acceptedAnswers.length < 1
    ) {
      errors.push(
        "When the correct answer is False, add the expected correction in Accepted Text Answer(s). Separate alternatives with |.",
      );
    }

    if (
      questionType === "true_false"
      || (
        questionType === "true_false_correction"
        && correctBoolean === true
      )
    ) {
      acceptedAnswers = [];
    }
  }

  if (acceptedAnswers.length > 10) {
    errors.push(
      "A question can contain at most ten accepted text answers.",
    );
  }

  if (
    acceptedAnswers.some(
      (answer) => answer.length > 500,
    )
  ) {
    errors.push(
      "Each accepted text answer must not exceed 500 characters.",
    );
  }

  const timeLimitSeconds =
    parseTimeLimit(
      indexes.timeInSeconds >= 0
        ? row[indexes.timeInSeconds]
        : undefined,
      errors,
    );

  const imageUrl =
    parseImageUrl(
      indexes.imageLink >= 0
        ? row[indexes.imageLink]
        : undefined,
      errors,
    );

  const explanation =
    indexes.explanation >= 0
      ? normalizeText(
          row[indexes.explanation],
        )
      : "";

  if (explanation.length > 2000) {
    errors.push(
      "Answer explanation must not exceed 2,000 characters.",
    );
  }

  const options: QuestionOptionInput[] =
    isChoiceQuestion
      ? filledOptions.map(
          (text, index) => ({
            text,
            isCorrect:
              correctIndexes.includes(
                index + 1,
              ),
          }),
        )
      : [];

  const question:
    ExcelQuestionImportQuestion | null =
      questionType
      && errors.length === 0
        ? {
            sourceRowNumber,
            questionType,
            questionText,
            imageUrl,
            explanation:
              explanation || null,
            points: 1,
            timeLimitSeconds,
            options,
            acceptedAnswers,
            correctBoolean,
          }
        : null;

  return {
    id:
      `row-${sourceRowNumber}`,
    sourceRowNumber,
    selected:
      question !== null,
    question,
    rawQuestionType,
    correctAnswerText,
    acceptedAnswerText,
    errors,
  };
}

export function validateAssessmentWorkbookFile(
  file: File,
): string | null {
  if (
    !file.name
      .toLowerCase()
      .endsWith(".xlsx")
  ) {
    return "Only .xlsx workbooks are supported.";
  }

  if (file.size < 1) {
    return "The selected workbook is empty.";
  }

  if (
    file.size > MAX_FILE_SIZE_BYTES
  ) {
    return "The workbook must not exceed 5 MB.";
  }

  return null;
}

export async function parseAssessmentQuestionWorkbook(
  file: File,
): Promise<ExcelQuestionImportPreview> {
  const fileValidation =
    validateAssessmentWorkbookFile(file);

  if (fileValidation) {
    throw new Error(fileValidation);
  }

  const workbookSheets =
    await readExcelFile(file) as ExcelWorkbookSheet[];

  const worksheet =
    workbookSheets.find(
      (sheet) =>
        sheet.sheet
          .trim()
          .toLowerCase()
        === WORKSHEET_NAME.toLowerCase(),
    );

  if (!worksheet) {
    throw new Error(
      `The workbook must contain a worksheet named ${WORKSHEET_NAME}.`,
    );
  }

  if (worksheet.data.length < 3) {
    throw new Error(
      "The Create a Quiz worksheet does not contain question rows.",
    );
  }

  const normalizedHeaders =
    worksheet.data[0].map(
      normalizeHeader,
    );

  const indexes = {
    questionText:
      findHeaderIndex(
        normalizedHeaders,
        "questionText",
      ),
    questionType:
      findHeaderIndex(
        normalizedHeaders,
        "questionType",
      ),
    option1:
      findHeaderIndex(
        normalizedHeaders,
        "option1",
      ),
    option2:
      findHeaderIndex(
        normalizedHeaders,
        "option2",
      ),
    option3:
      findHeaderIndex(
        normalizedHeaders,
        "option3",
      ),
    option4:
      findHeaderIndex(
        normalizedHeaders,
        "option4",
      ),
    option5:
      findHeaderIndex(
        normalizedHeaders,
        "option5",
      ),
    correctAnswer:
      findHeaderIndex(
        normalizedHeaders,
        "correctAnswer",
      ),
    acceptedAnswers:
      findHeaderIndex(
        normalizedHeaders,
        "acceptedAnswers",
      ),
    timeInSeconds:
      findHeaderIndex(
        normalizedHeaders,
        "timeInSeconds",
      ),
    imageLink:
      findHeaderIndex(
        normalizedHeaders,
        "imageLink",
      ),
    explanation:
      findHeaderIndex(
        normalizedHeaders,
        "explanation",
      ),
  } satisfies Record<HeaderKey, number>;

  const requiredHeaders: Array<{
    key: HeaderKey;
    label: string;
  }> = [
    {
      key: "questionText",
      label: "Question Text",
    },
    {
      key: "questionType",
      label: "Question Type",
    },
    {
      key: "option1",
      label: "Option 1",
    },
    {
      key: "option2",
      label: "Option 2",
    },
    {
      key: "correctAnswer",
      label: "Correct Answer",
    },
    {
      key: "acceptedAnswers",
      label: "Accepted Text Answer(s)",
    },
  ];

  const missingHeaders =
    requiredHeaders
      .filter(
        (header) =>
          indexes[header.key] < 0,
      )
      .map(
        (header) =>
          header.label,
      );

  if (missingHeaders.length > 0) {
    throw new Error(
      `Missing required column${missingHeaders.length > 1 ? "s" : ""}: ${missingHeaders.join(", ")}.`,
    );
  }

  const dataRows =
    worksheet.data
      .slice(2)
      .map(
        (row, index) => ({
          row,
          sourceRowNumber:
            index + 3,
        }),
      )
      .filter(
        (entry) =>
          !isEmptyRow(entry.row),
      );

  if (dataRows.length < 1) {
    throw new Error(
      "No question rows were found. Add questions beginning on row 3.",
    );
  }

  if (
    dataRows.length > MAX_IMPORT_ROWS
  ) {
    throw new Error(
      `A workbook can contain at most ${MAX_IMPORT_ROWS} question rows.`,
    );
  }

  const rows =
    dataRows.map(
      (entry) =>
        buildQuestionRow(
          entry.row,
          entry.sourceRowNumber,
          indexes,
        ),
    );

  const validRows =
    rows.filter(
      (row) =>
        row.question !== null,
    ).length;

  return {
    fileName:
      file.name,
    fileSizeBytes:
      file.size,
    worksheetName:
      worksheet.sheet,
    totalRows:
      rows.length,
    validRows,
    invalidRows:
      rows.length - validRows,
    rows,
  };
}
