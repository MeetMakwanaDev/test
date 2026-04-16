import path from "node:path";
import ExcelJS from "exceljs";
import { SHEETS } from "./types";

/** Absolute path to the master workbook that backs the app's reads and writes. */
const FILE_PATH = path.join(process.cwd(), "app", "data", "Master_Spreadsheet_TRIAL_sanitised.xlsx");

/**
 * Loads the master workbook from disk into an ExcelJS instance.
 * @returns {Promise<ExcelJS.Workbook>} Parsed workbook ready for read/write.
 */
async function loadWorkbook(): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(FILE_PATH);
  return wb;
}

/**
 * Persists an in-memory workbook back to the master XLSX file on disk.
 * @param {ExcelJS.Workbook} wb - Workbook instance containing pending mutations.
 * @returns {Promise<void>} Resolves once the file has been written.
 */
async function saveWorkbook(wb: ExcelJS.Workbook): Promise<void> {
  await wb.xlsx.writeFile(FILE_PATH);
}

/**
 * Normalises an ExcelJS cell value to a plain string.
 * Handles primitives, Dates, formula results, rich text, and hyperlinks.
 * @param {ExcelJS.CellValue} value - Raw cell value from ExcelJS.
 * @returns {string} Stringified representation, or "" for null/undefined/unknown shapes.
 */
function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (typeof value === "object") {
    const v = value as { result?: ExcelJS.CellValue; text?: string; richText?: { text: string }[]; hyperlink?: string };
    if ("result" in v && v.result !== undefined) return cellToString(v.result as ExcelJS.CellValue);
    if (Array.isArray(v.richText)) return v.richText.map((r) => r.text).join("");
    if (typeof v.text === "string") return v.text;
    if (typeof v.hyperlink === "string") return v.hyperlink;
  }
  return "";
}

/**
 * Extracts every cell in a row as a string array.
 * @param {ExcelJS.Row} row - Row to read from.
 * @param {number} colCount - Number of columns to extract (1-indexed through colCount).
 * @returns {string[]} Left-to-right array of stringified cell values.
 */
function rowValues(row: ExcelJS.Row, colCount: number): string[] {
  const out: string[] = [];
  for (let j = 1; j <= colCount; j++) {
    out.push(cellToString(row.getCell(j).value));
  }
  return out;
}

/**
 * Reads an entire worksheet tab and returns its headers plus data rows.
 * @param {string} tabName - Exact tab name inside the workbook (see {@link SHEETS}).
 * @param {number} headerRow - 1-indexed row number containing column headers.
 * @returns {Promise<{ headers: string[]; rows: string[][]; firstDataRow: number }>}
 *   `headers` are column names, `rows` are data rows below the header,
 *   and `firstDataRow` is the 1-indexed sheet row at which data begins.
 * @throws Error if the worksheet is not found in the workbook.
 */
export async function readTab(
  tabName: string,
  headerRow: number
): Promise<{ headers: string[]; rows: string[][]; firstDataRow: number }> {
  const wb = await loadWorkbook();
  const ws = wb.getWorksheet(tabName);
  if (!ws) throw new Error(`Worksheet not found: ${tabName}`);
  const colCount = ws.columnCount;
  const headers = rowValues(ws.getRow(headerRow), colCount);
  const rows: string[][] = [];
  for (let i = headerRow + 1; i <= ws.rowCount; i++) {
    rows.push(rowValues(ws.getRow(i), colCount));
  }
  return { headers, rows, firstDataRow: headerRow + 1 };
}

/**
 * Converts raw header/row arrays into an array of typed objects keyed by header name.
 * Each returned object also carries a `rowNumber` field pointing back to the sheet row.
 * @template T - Object shape for a single row (e.g. `StockRow`, `SoldRow`).
 * @param {string[]} headers - Column headers from the sheet; blank headers are skipped.
 * @param {string[][]} rows - 2-D array of raw cell strings.
 * @param {number} firstDataRow - 1-indexed row number where `rows[0]` lives in the sheet.
 * @param {{ skipBlank?: boolean; leadingOffset?: number }} [opts] - Optional controls:
 *   `skipBlank` drops rows where every field is empty;
 *   `leadingOffset` shifts the row-to-header alignment when the sheet has leading blank columns.
 * @returns {(T & { rowNumber: number })[]} Array of header-keyed objects with sheet row metadata.
 */
export function rowsToObjects<T extends Record<string, unknown>>(
  headers: string[],
  rows: string[][],
  firstDataRow: number,
  opts?: { skipBlank?: boolean; leadingOffset?: number }
): (T & { rowNumber: number })[] {
  const leadOffset = opts?.leadingOffset ?? 0;
  const out: (T & { rowNumber: number })[] = [];
  rows.forEach((row, i) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, j) => {
      if (!h) return;
      obj[h] = (row[j + leadOffset] ?? "").toString();
    });
    const isBlank = Object.values(obj).every((v) => !v || !v.trim());
    if (opts?.skipBlank && isBlank) return;
    out.push({ ...(obj as T), rowNumber: firstDataRow + i });
  });
  return out;
}

/**
 * Coerces a string or number to the most appropriate Excel cell type.
 * Numeric strings become numbers, ISO-dates become Date objects, everything else stays a string.
 * @param {string | number} v - Value to be written to a cell.
 * @returns {string | number | Date} Value typed for ExcelJS.
 */
function coerceWriteValue(v: string | number): string | number | Date {
  if (typeof v === "number") return v;
  const s = v.trim();
  if (s === "") return "";
  if (/^-?\d+(\.\d+)?$/.test(s)) return parseFloat(s);
  const isoDate = /^\d{4}-\d{2}-\d{2}(T|$)/;
  if (isoDate.test(s)) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d;
  }
  return s;
}

/**
 * Finds the last non-empty row number in a worksheet, scanning upwards from the bottom.
 * Used to decide where to append a new row so we don't leave gaps after trailing blank rows.
 * @param {ExcelJS.Worksheet} ws - Worksheet to inspect.
 * @param {number} headerRow - Header row — the search never crosses above this line.
 * @returns {number} 1-indexed row number of the last populated row, or `headerRow` if none.
 */
function lastDataRowNumber(ws: ExcelJS.Worksheet, headerRow: number): number {
  const colCount = ws.columnCount;
  for (let i = ws.rowCount; i > headerRow; i--) {
    const row = ws.getRow(i);
    for (let j = 1; j <= colCount; j++) {
      const s = cellToString(row.getCell(j).value).trim();
      if (s !== "") return i;
    }
  }
  return headerRow;
}

/**
 * Appends a new row of values to the end of a worksheet and persists the workbook.
 * @param {string} tabName - Target worksheet tab name.
 * @param {(string | number)[]} values - Cell values in column order (A, B, C, ...).
 * @param {number} [headerRow] - Optional override for the header row; inferred from {@link SHEETS} when omitted.
 * @returns {Promise<void>} Resolves after the file has been written.
 * @throws Error if the worksheet cannot be found.
 */
export async function appendRow(
  tabName: string,
  values: (string | number)[],
  headerRow?: number
): Promise<void> {
  const wb = await loadWorkbook();
  const ws = wb.getWorksheet(tabName);
  if (!ws) throw new Error(`Worksheet not found: ${tabName}`);
  const header = headerRow ?? resolveHeaderRow(tabName);
  const target = lastDataRowNumber(ws, header) + 1;
  const row = ws.getRow(target);
  values.forEach((v, i) => {
    row.getCell(i + 1).value = coerceWriteValue(v);
  });
  row.commit();
  await saveWorkbook(wb);
}

/**
 * Looks up the configured header row for a given tab name in {@link SHEETS}.
 * @param {string} tabName - Worksheet tab name.
 * @returns {number} Header row number, or 1 if the tab is not registered.
 */
function resolveHeaderRow(tabName: string): number {
  for (const key of Object.keys(SHEETS) as (keyof typeof SHEETS)[]) {
    if (SHEETS[key].name === tabName) return SHEETS[key].headerRow;
  }
  return 1;
}

/**
 * Overwrites the cells of an existing worksheet row, starting at a given column.
 * @param {string} tabName - Target worksheet tab name.
 * @param {number} rowNumber - 1-indexed row number to update.
 * @param {(string | number)[]} values - New values to write, in left-to-right order.
 * @param {number} [startCol=1] - 1-indexed column at which to start writing.
 * @returns {Promise<void>} Resolves after the file has been written.
 * @throws Error if the worksheet cannot be found.
 */
export async function updateRow(
  tabName: string,
  rowNumber: number,
  values: (string | number)[],
  startCol = 1
): Promise<void> {
  const wb = await loadWorkbook();
  const ws = wb.getWorksheet(tabName);
  if (!ws) throw new Error(`Worksheet not found: ${tabName}`);
  const row = ws.getRow(rowNumber);
  values.forEach((v, i) => {
    row.getCell(startCol + i).value = coerceWriteValue(v);
  });
  row.commit();
  await saveWorkbook(wb);
}

/**
 * Deletes a single row from a worksheet, shifting later rows up, and saves the file.
 * @param {string} tabName - Target worksheet tab name.
 * @param {number} rowNumber - 1-indexed row number to remove.
 * @returns {Promise<void>} Resolves after the file has been written.
 * @throws Error if the worksheet cannot be found.
 */
export async function deleteRow(tabName: string, rowNumber: number): Promise<void> {
  const wb = await loadWorkbook();
  const ws = wb.getWorksheet(tabName);
  if (!ws) throw new Error(`Worksheet not found: ${tabName}`);
  ws.spliceRows(rowNumber, 1);
  await saveWorkbook(wb);
}

export { SHEETS };
