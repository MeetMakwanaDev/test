/**
 * Parses a loosely-formatted monetary value into a plain number.
 * Strips currency symbols (£, $), thousand separators, and whitespace, and
 * maps common "empty" markers (null, undefined, "-", "—") to 0.
 * @param {string | number | null | undefined} raw - Raw value pulled from the spreadsheet or user input.
 * @returns {number} Parsed amount, or 0 when the value is blank or unparseable.
 * @example
 * parseMoney("£1,250.00"); // 1250
 * parseMoney("—");          // 0
 */
export function parseMoney(raw: string | number | null | undefined): number {
  if (raw === null || raw === undefined) return 0;
  if (typeof raw === "number") return raw;
  const s = String(raw).trim();
  if (!s || s === "-" || s === "—") return 0;
  const cleaned = s.replace(/[£$,\s]/g, "").replace(/^-$/, "0");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

/**
 * Formats a number as a GBP currency string using UK locale grouping.
 * @param {number} n - Amount to format.
 * @param {number} [decimals=2] - Number of fractional digits to display.
 * @returns {string} Formatted string prefixed with "£".
 * @example
 * fmtGBP(1250);      // "£1,250.00"
 * fmtGBP(1250, 0);   // "£1,250"
 */
export function fmtGBP(n: number, decimals = 2): string {
  return `£${n.toLocaleString("en-GB", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

/**
 * Formats a number as a whole-pound GBP string (no decimals).
 * Convenience wrapper around {@link fmtGBP}.
 * @param {number} n - Amount to format.
 * @returns {string} Formatted string prefixed with "£".
 */
export function fmtGBP0(n: number): string {
  return fmtGBP(n, 0);
}

/** Short month labels, indexed 0–11 (Jan–Dec), used by the date formatters. */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Formats a spreadsheet date string as "D MMM YY" (e.g. "5 Apr 26").
 * @param {string} raw - Date value from the sheet (ISO, dd-MMM-yyyy, or m/d/yyyy).
 * @returns {string} Human-readable date, or "—" when the value is missing/invalid.
 */
export function fmtDate(raw: string): string {
  const d = parseSheetDate(raw);
  if (!d) return "—";
  const yy = String(d.getUTCFullYear()).slice(-2);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${yy}`;
}

/**
 * Formats a spreadsheet date string as a short month label "MMM-YY" (e.g. "Apr-26").
 * Falls back to the raw string if parsing fails, or "—" when empty.
 * @param {string} raw - Date value from the sheet.
 * @returns {string} Month-year label, the original string, or "—".
 */
export function fmtMonth(raw: string): string {
  if (!raw) return "—";
  const s = String(raw).trim();
  if (!s) return "—";
  const d = parseSheetDate(s);
  if (!d) return s;
  const yy = String(d.getUTCFullYear()).slice(-2);
  return `${MONTHS[d.getUTCMonth()]}-${yy}`;
}

/**
 * Parses a spreadsheet date string into a UTC {@link Date}.
 * Accepts ISO-8601 (`YYYY-MM-DD`), `DD-MMM-YYYY`, and `M/D/YYYY` formats.
 * @param {string} raw - Raw date cell value.
 * @returns {Date | null} Parsed date, or null for empty or unrecognised input.
 */
export function parseSheetDate(raw: string): Date | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s || s === "-" || s === "—") return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  const ddmmm = s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (ddmmm) return new Date(Date.UTC(parseInt(ddmmm[3]), MONTHS.indexOf(ddmmm[2]), parseInt(ddmmm[1])));
  const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) return new Date(Date.UTC(parseInt(mdy[3]), parseInt(mdy[1]) - 1, parseInt(mdy[2])));
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Returns the number of whole days between two dates (b - a).
 * @param {Date | null} a - Earlier date (e.g. date acquired).
 * @param {Date | null} b - Later date (e.g. today).
 * @returns {number | null} Whole-day difference, or null if either input is null.
 */
export function daysBetween(a: Date | null, b: Date | null): number | null {
  if (!a || !b) return null;
  return Math.floor((b.getTime() - a.getTime()) / 86400000);
}
