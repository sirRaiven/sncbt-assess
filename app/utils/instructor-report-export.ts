export interface CsvColumn<T> {
  header: string;
  value:
    (
      row: T,
      index: number,
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
  records?: string | null;
  average?: string | null;
  highest?: string | null;
  generatedAt?: string | null;
}

const SCHOOL_NAME = "ST. NICOLAS COLLEGE OF BUSINESS AND TECHNOLOGY";
const SYSTEM_NAME = "SNCBT ASSESSMENT MANAGEMENT SYSTEM";
const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function neutralizeSpreadsheetFormula(value: string): string {
  // Spreadsheet exports are intended for human viewing. Prefix formula-like
  // values so spreadsheet applications do not execute user-controlled text.
  return /^[=+\-@]/u.test(value)
    ? `'${value}`
    : value;
}

function escapeCsv(value: unknown): string {
  const text =
    value === null || value === undefined
      ? ""
      : neutralizeSpreadsheetFormula(String(value));

  return `"${text.replaceAll('"', '""')}"`;
}

function escapeXml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function downloadBlob(filename: string, blob: Blob): void {
  if (!import.meta.client) return;

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function downloadCsv<T>(
  filename: string,
  columns: CsvColumn<T>[],
  rows: T[],
): void {
  if (!import.meta.client) return;

  const header = columns.map((column) => escapeCsv(column.header)).join(",");
  const body = rows.map((row, rowIndex) =>
    columns
      .map((column) => escapeCsv(column.value(row, rowIndex)))
      .join(","),
  );

  downloadBlob(
    filename,
    new Blob(["\uFEFF", [header, ...body].join("\r\n")], {
      type: "text/csv;charset=utf-8",
    }),
  );
}

export function downloadCsvReport<T>(
  filename: string,
  meta: ReportExportMeta,
  columns: CsvColumn<T>[],
  rows: T[],
): void {
  if (!import.meta.client) return;

  // CSV cannot carry visual styling, but it follows the same report hierarchy
  // as PDF/XLSX: formal heading, selected report scope, then the table.
  const titleLines = [
    escapeCsv(SCHOOL_NAME),
    escapeCsv(SYSTEM_NAME),
    escapeCsv(meta.title.toUpperCase()),
    ...(meta.subtitle ? [escapeCsv(meta.subtitle)] : []),
  ];
  const scopeLines = [
    meta.period ? [escapeCsv("Reporting Period"), escapeCsv(meta.period)].join(",") : null,
    meta.classroom ? [escapeCsv("Class / Section"), escapeCsv(meta.classroom)].join(",") : null,
    meta.assessment ? [escapeCsv("Assessment"), escapeCsv(meta.assessment)].join(",") : null,
  ].filter((line): line is string => Boolean(line));

  const header = columns.map((column) => escapeCsv(column.header)).join(",");
  const body = rows.map((row, rowIndex) =>
    columns
      .map((column) => escapeCsv(column.value(row, rowIndex)))
      .join(","),
  );

  downloadBlob(
    filename,
    new Blob(
      ["\uFEFF", [...titleLines, "", ...scopeLines, "", header, ...body].join("\r\n")],
      { type: "text/csv;charset=utf-8" },
    ),
  );
}

function columnLetter(index: number): string {
  let value = index + 1;
  let output = "";

  while (value > 0) {
    const remainder = (value - 1) % 26;
    output = String.fromCharCode(65 + remainder) + output;
    value = Math.floor((value - 1) / 26);
  }

  return output;
}

function xlsxInlineStringCell(
  reference: string,
  value: unknown,
  styleIndex: number,
): string {
  const safe = neutralizeSpreadsheetFormula(String(value ?? ""));
  return `<c r="${reference}" s="${styleIndex}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(safe)}</t></is></c>`;
}

function createCrc32Table(): Uint32Array {
  const table = new Uint32Array(256);

  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) !== 0
        ? 0xEDB88320 ^ (value >>> 1)
        : value >>> 1;
    }
    table[index] = value >>> 0;
  }

  return table;
}

const CRC32_TABLE = createCrc32Table();

function crc32(data: Uint8Array): number {
  let crc = 0xFFFFFFFF;
  for (const byte of data) {
    crc = CRC32_TABLE[(crc ^ byte) & 0xFF]! ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function setUint16(view: DataView, offset: number, value: number): void {
  view.setUint16(offset, value, true);
}

function setUint32(view: DataView, offset: number, value: number): void {
  view.setUint32(offset, value >>> 0, true);
}

function zipDateTime(date: Date): { date: number; time: number } {
  const year = Math.max(date.getFullYear(), 1980);
  return {
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
  };
}

interface ZipEntry {
  name: string;
  content: string | Uint8Array;
}

function createStoredZip(entries: ZipEntry[]): Uint8Array {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  const now = zipDateTime(new Date());
  let localOffset = 0;
  let centralSize = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const dataBytes = typeof entry.content === "string"
      ? encoder.encode(entry.content)
      : entry.content;
    const checksum = crc32(dataBytes);

    const local = new Uint8Array(30 + nameBytes.length + dataBytes.length);
    const localView = new DataView(local.buffer);
    setUint32(localView, 0, 0x04034B50);
    setUint16(localView, 4, 20);
    setUint16(localView, 6, 0x0800);
    setUint16(localView, 8, 0);
    setUint16(localView, 10, now.time);
    setUint16(localView, 12, now.date);
    setUint32(localView, 14, checksum);
    setUint32(localView, 18, dataBytes.length);
    setUint32(localView, 22, dataBytes.length);
    setUint16(localView, 26, nameBytes.length);
    setUint16(localView, 28, 0);
    local.set(nameBytes, 30);
    local.set(dataBytes, 30 + nameBytes.length);
    localParts.push(local);

    const central = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(central.buffer);
    setUint32(centralView, 0, 0x02014B50);
    setUint16(centralView, 4, 20);
    setUint16(centralView, 6, 20);
    setUint16(centralView, 8, 0x0800);
    setUint16(centralView, 10, 0);
    setUint16(centralView, 12, now.time);
    setUint16(centralView, 14, now.date);
    setUint32(centralView, 16, checksum);
    setUint32(centralView, 20, dataBytes.length);
    setUint32(centralView, 24, dataBytes.length);
    setUint16(centralView, 28, nameBytes.length);
    setUint16(centralView, 30, 0);
    setUint16(centralView, 32, 0);
    setUint16(centralView, 34, 0);
    setUint16(centralView, 36, 0);
    setUint32(centralView, 38, 0);
    setUint32(centralView, 42, localOffset);
    central.set(nameBytes, 46);
    centralParts.push(central);

    localOffset += local.length;
    centralSize += central.length;
  }

  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  setUint32(endView, 0, 0x06054B50);
  setUint16(endView, 4, 0);
  setUint16(endView, 6, 0);
  setUint16(endView, 8, entries.length);
  setUint16(endView, 10, entries.length);
  setUint32(endView, 12, centralSize);
  setUint32(endView, 16, localOffset);
  setUint16(endView, 20, 0);

  const totalLength = localOffset + centralSize + end.length;
  const output = new Uint8Array(totalLength);
  let offset = 0;

  for (const part of localParts) {
    output.set(part, offset);
    offset += part.length;
  }
  for (const part of centralParts) {
    output.set(part, offset);
    offset += part.length;
  }
  output.set(end, offset);

  return output;
}

function buildXlsxWorksheet<T>(
  meta: ReportExportMeta,
  columns: CsvColumn<T>[],
  rows: T[],
): string {
  const columnCount = Math.max(columns.length, 1);
  const endColumn = columnLetter(columnCount - 1);
  const titleEndRow = meta.subtitle ? 4 : 3;
  const scopeEntries = [
    meta.period ? ["Reporting Period", meta.period] : null,
    meta.classroom ? ["Class / Section", meta.classroom] : null,
    meta.assessment ? ["Assessment", meta.assessment] : null,
  ].filter((entry): entry is [string, string] => Boolean(entry));

  const scopeStartRow = titleEndRow + 2;
  const scopeRows = scopeEntries.map(([label, value], index) => {
    const rowNumber = scopeStartRow + index;
    return `<row r="${rowNumber}" ht="18" customHeight="1">${xlsxInlineStringCell(`A${rowNumber}`, label.toUpperCase(), 4)}${xlsxInlineStringCell(`B${rowNumber}`, value, 6)}</row>`;
  });

  const tableHeaderRow = scopeEntries.length
    ? scopeStartRow + scopeEntries.length + 1
    : titleEndRow + 2;
  const firstDataRow = tableHeaderRow + 1;
  const lastRow = Math.max(firstDataRow + rows.length - 1, tableHeaderRow);

  const titleRows = [
    `<row r="1" ht="24" customHeight="1">${xlsxInlineStringCell("A1", SCHOOL_NAME, 1)}</row>`,
    `<row r="2" ht="18" customHeight="1">${xlsxInlineStringCell("A2", SYSTEM_NAME, 2)}</row>`,
    `<row r="3" ht="23" customHeight="1">${xlsxInlineStringCell("A3", meta.title.toUpperCase(), 3)}</row>`,
    ...(meta.subtitle
      ? [`<row r="4" ht="18" customHeight="1">${xlsxInlineStringCell("A4", meta.subtitle, 4)}</row>`]
      : []),
  ];

  const tableHeaderCells = columns
    .map((column, index) =>
      xlsxInlineStringCell(`${columnLetter(index)}${tableHeaderRow}`, column.header.toUpperCase(), 5),
    )
    .join("");

  const dataRows = rows.map((row, rowIndex) => {
    const rowNumber = firstDataRow + rowIndex;
    const cells = columns.map((column, columnIndex) => {
      const styleIndex = columnIndex === 2 ? 6 : 7;
      return xlsxInlineStringCell(
        `${columnLetter(columnIndex)}${rowNumber}`,
        column.value(row, rowIndex),
        styleIndex,
      );
    }).join("");
    return `<row r="${rowNumber}" ht="18" customHeight="1">${cells}</row>`;
  });

  const mergeRefs = [
    `A1:${endColumn}1`,
    `A2:${endColumn}2`,
    `A3:${endColumn}3`,
    ...(meta.subtitle ? [`A4:${endColumn}4`] : []),
  ];

  const defaultWidths = [6, 18, 34, 14, 27];
  const columnDefinitions = columns.map((_, index) => {
    const width = defaultWidths[index] ?? 18;
    return `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`;
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>
  <dimension ref="A1:${endColumn}${lastRow}"/>
  <sheetViews>
    <sheetView workbookViewId="0" showGridLines="0">
      <pane ySplit="${tableHeaderRow}" topLeftCell="A${firstDataRow}" activePane="bottomLeft" state="frozen"/>
    </sheetView>
  </sheetViews>
  <sheetFormatPr defaultRowHeight="15"/>
  <cols>${columnDefinitions}</cols>
  <sheetData>
    ${titleRows.join("\n    ")}
    ${scopeRows.join("\n    ")}
    <row r="${tableHeaderRow}" ht="22" customHeight="1">${tableHeaderCells}</row>
    ${dataRows.join("\n    ")}
  </sheetData>
  <mergeCells count="${mergeRefs.length}">${mergeRefs.map((ref) => `<mergeCell ref="${ref}"/>`).join("")}</mergeCells>
  <printOptions horizontalCentered="1"/>
  <pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>
  <pageSetup paperSize="9" orientation="portrait" fitToWidth="1" fitToHeight="0"/>
</worksheet>`;
}

function buildXlsxStyles(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="4">
    <font><sz val="10"/><name val="Arial"/><family val="2"/></font>
    <font><b/><sz val="15"/><name val="Arial"/><family val="2"/></font>
    <font><b/><sz val="10"/><name val="Arial"/><family val="2"/></font>
    <font><b/><color rgb="FFFFFFFF"/><sz val="9"/><name val="Arial"/><family val="2"/></font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF22A447"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FF111111"/></left>
      <right style="thin"><color rgb="FF111111"/></right>
      <top style="thin"><color rgb="FF111111"/></top>
      <bottom style="thin"><color rgb="FF111111"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="8">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="3" fillId="2" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;
}

export function createXlsxBlob<T>(
  meta: ReportExportMeta,
  columns: CsvColumn<T>[],
  rows: T[],
): Blob {
  const worksheet = buildXlsxWorksheet(meta, columns, rows);
  const now = new Date().toISOString();

  const files: ZipEntry[] = [
    {
      name: "[Content_Types].xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`,
    },
    {
      name: "_rels/.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`,
    },
    {
      name: "docProps/core.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>${escapeXml(meta.title)}</dc:title>
  <dc:creator>SNCBT Assessment Management System</dc:creator>
  <cp:lastModifiedBy>SNCBT Assessment Management System</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>
</cp:coreProperties>`,
    },
    {
      name: "docProps/app.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>SNCBT Assessment Management System</Application>
</Properties>`,
    },
    {
      name: "xl/workbook.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <bookViews><workbookView xWindow="0" yWindow="0" windowWidth="24000" windowHeight="12000"/></bookViews>
  <sheets><sheet name="Student Results" sheetId="1" r:id="rId1"/></sheets>
</workbook>`,
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,
    },
    {
      name: "xl/styles.xml",
      content: buildXlsxStyles(),
    },
    {
      name: "xl/worksheets/sheet1.xml",
      content: worksheet,
    },
  ];

  return new Blob([createStoredZip(files)], { type: XLSX_MIME });
}

export function downloadExcelReport<T>(
  filename: string,
  meta: ReportExportMeta,
  columns: CsvColumn<T>[],
  rows: T[],
): void {
  if (!import.meta.client) return;

  const normalizedFilename = filename.toLowerCase().endsWith(".xlsx")
    ? filename
    : `${filename.replace(/\.xls$/iu, "")}.xlsx`;

  downloadBlob(normalizedFilename, createXlsxBlob(meta, columns, rows));
}

export function printCurrentReport(
  title = "SNCBT Student Assessment Results",
): void {
  if (!import.meta.client) return;

  const previousTitle = document.title;
  document.title = title;

  const restoreTitle = () => {
    document.title = previousTitle;
    window.removeEventListener("afterprint", restoreTitle);
  };

  window.addEventListener("afterprint", restoreTitle);
  window.print();
}
