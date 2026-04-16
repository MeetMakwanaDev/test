import { NextRequest, NextResponse } from "next/server";
import { appendRow, updateRow } from "@/lib/xlsx";
import { SHEETS, SOLD_COLUMNS } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * `POST /api/sell`
 *
 * Processes a vehicle sale: appends a row to Sold Stock and marks the
 * Stock Data row as "Sold" (instead of deleting it, which would break
 * shared formulas in the sheet). The Current Stock page already filters
 * out rows whose Status contains "sold", so the vehicle disappears from view.
 *
 * Expects a JSON body with all sold-row fields plus `stockRowNumber`.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const stockRowNumber = body.stockRowNumber as number;
    const soldPrice = (body.Sold ?? "").toString();

    if (!stockRowNumber) {
      return NextResponse.json(
        { error: "stockRowNumber is required" },
        { status: 400 },
      );
    }

    // Build the sold row values in column order
    const soldValues: string[] = SOLD_COLUMNS.map((col) =>
      col ? ((body as Record<string, unknown>)[col] ?? "").toString() : "",
    );

    // 1. Append to Sold Stock (bottom of the sheet)
    await appendRow(SHEETS.sold.name, soldValues);

    // 2. Mark the stock row as sold instead of deleting it.
    //    Stock Data layout (with spacer col A):
    //      Col L (12) = "Sold" amount
    //      Col M (13) = "Profit" ← has shared formulas, do NOT touch
    //      Col N (14) = "Status"
    //    Two targeted writes that skip column M to preserve formulas.
    await updateRow(SHEETS.stock.name, stockRowNumber, [soldPrice], 12);
    await updateRow(SHEETS.stock.name, stockRowNumber, ["Sold"], 14);

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }
}
