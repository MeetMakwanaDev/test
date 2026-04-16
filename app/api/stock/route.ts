import { NextRequest, NextResponse } from "next/server";
import { appendRow, deleteRow, readTab, rowsToObjects, updateRow } from "@/lib/xlsx";
import { SHEETS, STOCK_COLUMNS, StockRow } from "@/lib/types";

export const dynamic = "force-dynamic";

const tab = SHEETS.stock.name;
const headerRow = SHEETS.stock.headerRow;

/**
 * Projects a partial {@link StockRow} request body onto the column-ordered
 * string array expected by the XLSX writer. The leading empty string accounts
 * for the blank column-A spacer in the Stock Data tab.
 * @param {Partial<StockRow>} body - Fields supplied by the client.
 * @returns {string[]} Values aligned to {@link STOCK_COLUMNS} for writing to the sheet.
 */
function rowFromBody(body: Partial<StockRow>): string[] {
  const out: string[] = [""];
  for (const col of STOCK_COLUMNS) {
    out.push(((body as Record<string, unknown>)[col] ?? "").toString());
  }
  return out;
}

/**
 * `GET /api/stock`
 *
 * Returns every populated row on the Stock Data tab, filtered to rows that
 * carry a non-empty "Plate Number".
 * @returns {Promise<Response>} JSON response of the form
 *   `{ data: StockRow[], headers: string[] }`, or `{ error }` with HTTP 500.
 */
export async function GET() {
  try {
    const { headers, rows, firstDataRow } = await readTab(tab, headerRow);
    const all = rowsToObjects<StockRow>(headers, rows, firstDataRow, { skipBlank: true });
    const data = all.filter((r) => (r["Plate Number"] ?? "").trim() !== "");
    return NextResponse.json({ data, headers });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/**
 * `POST /api/stock`
 *
 * Appends a new vehicle record to the Stock Data tab.
 * @param {NextRequest} req - Request whose JSON body is a `Partial<StockRow>`.
 * @returns {Promise<Response>} `{ ok: true }` on success or `{ error }` with HTTP 500.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<StockRow>;
    await appendRow(tab, rowFromBody(body));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/**
 * `PATCH /api/stock`
 *
 * Updates an existing stock row identified by its `rowNumber`.
 * @param {NextRequest} req - Request whose JSON body is `Partial<StockRow> & { rowNumber: number }`.
 * @returns {Promise<Response>} `{ ok: true }` on success, `{ error }` with HTTP 400 if
 *   `rowNumber` is missing, or HTTP 500 on other failures.
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<StockRow> & { rowNumber: number };
    if (!body.rowNumber) {
      return NextResponse.json({ error: "rowNumber required" }, { status: 400 });
    }
    await updateRow(tab, body.rowNumber, rowFromBody(body), 1);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/**
 * `DELETE /api/stock?rowNumber={n}`
 *
 * Removes a single stock row from the Stock Data tab.
 * @param {NextRequest} req - Request carrying a numeric `rowNumber` query param.
 * @returns {Promise<Response>} `{ ok: true }` on success, `{ error }` with HTTP 400
 *   when `rowNumber` is missing, or HTTP 500 on other failures.
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rowNumber = parseInt(searchParams.get("rowNumber") ?? "", 10);
    if (!rowNumber) return NextResponse.json({ error: "rowNumber required" }, { status: 400 });
    await deleteRow(tab, rowNumber);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
