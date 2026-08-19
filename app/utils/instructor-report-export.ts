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

function neutralizeSpreadsheetFormula(
  value: string,
): string {
  // CSV exports are intended for human viewing in spreadsheet apps.
  // Prefix formula-like cells with a tab so Excel does not execute them.
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

export function printCurrentReport():
  void {
  if (!import.meta.client) {
    return;
  }

  window.print();
}
