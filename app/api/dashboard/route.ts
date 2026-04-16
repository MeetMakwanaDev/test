import { NextResponse } from "next/server";
import { readTab, rowsToObjects } from "@/lib/xlsx";
import { SHEETS, FrontRow, StockRow, SoldRow } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * `GET /api/dashboard`
 *
 * Aggregates the three workbook tabs (Front Sheet, Stock Data, Sold Stock)
 * and returns them in a single payload for the dashboard landing page.
 * @returns {Promise<Response>} JSON response of the form
 *   `{ monthly: FrontRow[], stock: StockRow[], sold: SoldRow[] }`,
 *   or `{ error: string }` with HTTP 500 on failure.
 */
export async function GET() {
  try {
    const [front, stock, sold] = await Promise.all([
      readTab(SHEETS.front.name, SHEETS.front.headerRow),
      readTab(SHEETS.stock.name, SHEETS.stock.headerRow),
      readTab(SHEETS.sold.name, SHEETS.sold.headerRow),
    ]);

    const monthly = rowsToObjects<FrontRow>(front.headers, front.rows, front.firstDataRow, {
      skipBlank: true,
    });
    const stockRows = rowsToObjects<StockRow>(stock.headers, stock.rows, stock.firstDataRow, {
      skipBlank: true,
    }).filter((r) => (r["Plate Number"] ?? "").trim() !== "");
    const soldRows = rowsToObjects<SoldRow>(sold.headers, sold.rows, sold.firstDataRow, {
      skipBlank: true,
    }).filter((r) => (r["Number Plate reference"] ?? "").trim() !== "");

    return NextResponse.json({ monthly, stock: stockRows, sold: soldRows });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
