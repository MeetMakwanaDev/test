/**
 * Google Sheet ID that backs the DealerOS workbook.
 * Kept here so client and server code share a single source of truth.
 */
export const SHEET_ID = "1W3GzB4_5_-YthFm2xLoFdELHuVHVU_Bo0rAZb9-vT_c";

/**
 * Metadata for each worksheet tab in the workbook.
 * `name` matches the tab label in the XLSX file, `headerRow` is the 1-indexed
 * row that contains column headers (rows above are title/spacer rows).
 */
export const SHEETS = {
  front: { name: "Front Sheet", headerRow: 3 },
  stock: { name: "Stock Data", headerRow: 2 },
  sold: { name: "Sold Stock", headerRow: 2 },
} as const;

/**
 * Ordered list of column headers for the "Stock Data" tab.
 * Used for CSV export and when mapping form fields to spreadsheet columns.
 */
export const STOCK_COLUMNS = [
  "Month",
  "Date Aquired",
  "Plate Number",
  "Make & Model",
  "Investor/SA",
  "Source",
  "PX Value",
  "Price",
  "Reconditioning costs",
  "Total Cost",
  "Sold",
  "Profit",
  "Status",
] as const;

/**
 * Ordered list of column headers for the "Sold Stock" tab.
 * The empty string entry represents a deliberately blank spacer column in the sheet.
 */
export const SOLD_COLUMNS = [
  "Month",
  "Date Aquired",
  "Number Plate reference",
  "Make & Model",
  "SA/Investor Name",
  "Total Cost",
  "Sold",
  "Part Ex",
  "SA/Investor Profit Share",
  "Total Profit",
  "Investor Profit",
  "SA Profit",
  "Date Listed",
  "Date Sold",
  "Days to Sell",
  "Platfrom",
  "",
  "Invoice Number",
  "Customer Name",
  "Contact info",
  "Warranty",
  "AutoGuard Number",
] as const;

/**
 * Ordered list of column headers for the "Front Sheet" (monthly summary) tab.
 */
export const FRONT_COLUMNS = [
  "Month",
  "Cars Sold",
  "Total Revenue",
  "Total Gross Profit",
  "Company Expenses",
  "Total SA Gross Profit",
  "Investor Net Profit",
  "Investor Expense",
  "Company Fuel Costs",
  "Other Money In",
  "Other Money Out",
  "Net Profit Exc Investor",
  "Net Exc Investor",
  "Notes",
] as const;

/**
 * Single row of the "Stock Data" tab, representing one vehicle in live inventory.
 * All fields are kept as strings because values arrive raw from the XLSX file.
 * `rowNumber` is the 1-indexed worksheet row, used for PATCH/DELETE operations.
 */
export type StockRow = {
  rowNumber: number;
  Month: string;
  "Date Aquired": string;
  "Plate Number": string;
  "Make & Model": string;
  "Investor/SA": string;
  Source: string;
  "PX Value": string;
  Price: string;
  "Reconditioning costs": string;
  "Total Cost": string;
  Sold: string;
  Profit: string;
  Status: string;
};

/**
 * Single row of the "Sold Stock" tab, representing one completed sale.
 * `rowNumber` is the 1-indexed worksheet row, used for PATCH/DELETE operations.
 */
export type SoldRow = {
  rowNumber: number;
  Month: string;
  "Date Aquired": string;
  "Number Plate reference": string;
  "Make & Model": string;
  "SA/Investor Name": string;
  "Total Cost": string;
  Sold: string;
  "Part Ex": string;
  "SA/Investor Profit Share": string;
  "Total Profit": string;
  "Investor Profit": string;
  "SA Profit": string;
  "Date Listed": string;
  "Date Sold": string;
  "Days to Sell": string;
  Platfrom: string;
  "Invoice Number": string;
  "Customer Name": string;
  "Contact info": string;
  Warranty: string;
  "AutoGuard Number": string;
};

/**
 * Single row of the "Front Sheet" tab — one month of aggregated P&L data
 * (plus a "TOTAL" row used for all-time figures).
 * `rowNumber` is the 1-indexed worksheet row.
 */
export type FrontRow = {
  rowNumber: number;
  Month: string;
  "Cars Sold": string;
  "Total Revenue": string;
  "Total Gross Profit": string;
  "Company Expenses": string;
  "Total SA Gross Profit": string;
  "Investor Net Profit": string;
  "Investor Expense": string;
  "Company Fuel Costs": string;
  "Other Money In": string;
  "Other Money Out": string;
  "Net Profit Exc Investor": string;
  "Net Exc Investor": string;
  Notes: string;
};
