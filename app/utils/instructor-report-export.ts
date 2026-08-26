export interface CsvColumn<T> {
  header: string;
  value:
    (
      row: T,
    ) =>
      string
      | number
      | boolean
      | null
      | undefined;
}

export interface ReportExportMeta {
  title: string;
  subtitle?: string | null;
  period?: string | null;
  classroom?: string | null;
  assessment?: string | null;
  generatedAt?: string | null;
}

function neutralizeSpreadsheetFormula(
  value: string,
): string {
  // Spreadsheet exports are intended for human viewing.
  // Prefix formula-like cells so spreadsheet apps do not execute them.
  return /^[=+\-@]/u.test(value)
    ? `\t${value}`
    : value;
}

function escapeCsv(
  value: unknown,
): string {
  const text =
    value === null
    || value === undefined
      ? ""
      : neutralizeSpreadsheetFormula(
          String(value),
        );

  return `"${text.replaceAll(
    '"',
    '""',
  )}"`;
}

function formatExportDateTime(
  value:
    | string
    | null
    | undefined,
): string {
  if (!value) {
    return "";
  }

  return new Intl
    .DateTimeFormat(
      "en-PH",
      {
        dateStyle:
          "medium",
        timeStyle:
          "short",
        timeZone:
          "Asia/Manila",
      },
    )
    .format(
      new Date(value),
    );
}

function exportMetaRows(
  meta: ReportExportMeta,
): Array<[
  string,
  string,
]> {
  return [
    [
      "System",
      "SNCBT Assessment Management System",
    ],
    [
      "Report",
      meta.title,
    ],
    ...(meta.subtitle
      ? [[
          "Description",
          meta.subtitle,
        ] as [string, string]]
      : []),
    ...(meta.period
      ? [[
          "Period",
          meta.period,
        ] as [string, string]]
      : []),
    ...(meta.classroom
      ? [[
          "Class / Section",
          meta.classroom,
        ] as [string, string]]
      : []),
    ...(meta.assessment
      ? [[
          "Assessment",
          meta.assessment,
        ] as [string, string]]
      : []),
    ...(meta.generatedAt
      ? [[
          "Generated",
          formatExportDateTime(
            meta.generatedAt,
          ),
        ] as [string, string]]
      : []),
  ];
}

function downloadBlob(
  filename: string,
  blob: Blob,
): void {
  if (!import.meta.client) {
    return;
  }

  const url =
    URL.createObjectURL(
      blob,
    );

  const anchor =
    document.createElement(
      "a",
    );

  anchor.href =
    url;

  anchor.download =
    filename;

  document.body.appendChild(
    anchor,
  );

  anchor.click();

  anchor.remove();

  URL.revokeObjectURL(
    url,
  );
}

export function downloadCsv<T>(
  filename: string,
  columns: CsvColumn<T>[],
  rows: T[],
): void {
  if (!import.meta.client) {
    return;
  }

  const header =
    columns
      .map(
        (column) =>
          escapeCsv(
            column.header,
          ),
      )
      .join(",");

  const body =
    rows.map(
      (row) =>
        columns
          .map(
            (column) =>
              escapeCsv(
                column.value(
                  row,
                ),
              ),
          )
          .join(","),
    );

  const content =
    [
      header,
      ...body,
    ].join("\r\n");

  const blob =
    new Blob(
      [
        "\uFEFF",
        content,
      ],
      {
        type:
          "text/csv;charset=utf-8",
      },
    );

  downloadBlob(
    filename,
    blob,
  );
}

export function downloadCsvReport<T>(
  filename: string,
  meta: ReportExportMeta,
  columns: CsvColumn<T>[],
  rows: T[],
): void {
  if (!import.meta.client) {
    return;
  }

  const metaLines =
    exportMetaRows(meta)
      .map(
        ([
          label,
          value,
        ]) =>
          `${escapeCsv(label)},${escapeCsv(value)}`,
      );

  const header =
    columns
      .map(
        (column) =>
          escapeCsv(
            column.header,
          ),
      )
      .join(",");

  const body =
    rows.map(
      (row) =>
        columns
          .map(
            (column) =>
              escapeCsv(
                column.value(
                  row,
                ),
              ),
          )
          .join(","),
    );

  const content =
    [
      ...metaLines,
      "",
      header,
      ...body,
    ].join("\r\n");

  downloadBlob(
    filename,
    new Blob(
      [
        "\uFEFF",
        content,
      ],
      {
        type:
          "text/csv;charset=utf-8",
      },
    ),
  );
}

function escapeHtml(
  value: unknown,
): string {
  return String(
    value
    ?? "",
  )
    .replaceAll(
      "&",
      "&amp;",
    )
    .replaceAll(
      "<",
      "&lt;",
    )
    .replaceAll(
      ">",
      "&gt;",
    )
    .replaceAll(
      '"',
      "&quot;",
    );
}

export function downloadExcelReport<T>(
  filename: string,
  meta: ReportExportMeta,
  columns: CsvColumn<T>[],
  rows: T[],
): void {
  if (!import.meta.client) {
    return;
  }

  const safeColumnSpan =
    Math.max(
      columns.length,
      1,
    );

  const metaTableRows =
    exportMetaRows(meta)
      .map(
        ([
          label,
          value,
        ]) => `
          <tr>
            <th style="text-align:left;width:150px">${escapeHtml(label)}</th>
            <td colspan="${Math.max(safeColumnSpan - 1, 1)}">${escapeHtml(value)}</td>
          </tr>`,
      )
      .join("");

  const headerCells =
    columns
      .map(
        (column) =>
          `<th>${escapeHtml(column.header)}</th>`,
      )
      .join("");

  const bodyRows =
    rows
      .map(
        (row) => `
          <tr>
            ${columns
              .map(
                (column) => {
                  const rawValue =
                    column.value(row);

                  const value =
                    rawValue === null
                    || rawValue === undefined
                      ? ""
                      : neutralizeSpreadsheetFormula(
                          String(rawValue),
                        );

                  return `<td>${escapeHtml(value)}</td>`;
                },
              )
              .join("")}
          </tr>`,
      )
      .join("");

  const workbook = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="UTF-8">
  <!--[if gte mso 9]>
  <xml>
    <x:ExcelWorkbook>
      <x:ExcelWorksheets>
        <x:ExcelWorksheet>
          <x:Name>Student Results</x:Name>
          <x:WorksheetOptions>
            <x:DisplayGridlines/>
            <x:Selected/>
          </x:WorksheetOptions>
        </x:ExcelWorksheet>
      </x:ExcelWorksheets>
    </x:ExcelWorkbook>
  </xml>
  <![endif]-->
  <style>
    body { font-family: Arial, sans-serif; font-size: 11pt; color: #111827; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #94a3b8; padding: 6px 8px; vertical-align: top; }
    th { background: #e2e8f0; font-weight: 700; }
    .report-title { font-size: 16pt; font-weight: 700; text-align: center; border: 0; }
    .report-subtitle { text-align: center; border: 0; color: #475569; }
    .spacer td { border: 0; height: 10px; }
  </style>
</head>
<body>
  <table>
    <tr>
      <td class="report-title" colspan="${safeColumnSpan}">SNCBT Assessment Management System</td>
    </tr>
    <tr>
      <td class="report-title" colspan="${safeColumnSpan}">${escapeHtml(meta.title)}</td>
    </tr>
    ${meta.subtitle
      ? `<tr><td class="report-subtitle" colspan="${safeColumnSpan}">${escapeHtml(meta.subtitle)}</td></tr>`
      : ""}
    <tr class="spacer"><td colspan="${safeColumnSpan}"></td></tr>
    ${metaTableRows}
    <tr class="spacer"><td colspan="${safeColumnSpan}"></td></tr>
    <tr>${headerCells}</tr>
    ${bodyRows}
  </table>
</body>
</html>`;

  downloadBlob(
    filename,
    new Blob(
      [
        "\uFEFF",
        workbook,
      ],
      {
        type:
          "application/vnd.ms-excel;charset=utf-8",
      },
    ),
  );
}

export function printCurrentReport():
  void {
  if (!import.meta.client) {
    return;
  }

  window.print();
}
