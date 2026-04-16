import { NextResponse } from "next/server";
import { readTab, rowsToObjects } from "@/lib/xlsx";
import { SHEETS, StockRow, SoldRow } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * `GET /api/counts`
 *
 * Returns the badge counts displayed in the sidebar: the number of live
 * (unsold) stock rows and the number of completed sales.
 * @returns {Promise<Response>} JSON response of the form
 *   `{ stock: number, sold: number }`, or `{ error: string }` with HTTP 500 on failure.
 */
export async function GET() {
  try {
    const [stock, sold] = await Promise.all([
      readTab(SHEETS.stock.name, SHEETS.stock.headerRow),
      readTab(SHEETS.sold.name, SHEETS.sold.headerRow),
    ]);

    const stockRows = rowsToObjects<StockRow>(stock.headers, stock.rows, stock.firstDataRow, {
      skipBlank: true,
    }).filter((r) => (r["Plate Number"] ?? "").trim() !== "");
    const soldRows = rowsToObjects<SoldRow>(sold.headers, sold.rows, sold.firstDataRow, {
      skipBlank: true,
    }).filter((r) => (r["Number Plate reference"] ?? "").trim() !== "");

    const liveStock = stockRows.filter(
      (r) => !(r.Status ?? "").toLowerCase().includes("sold")
    ).length;

    return NextResponse.json({ stock: liveStock, sold: soldRows.length });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
