import { NextRequest, NextResponse } from "next/server";
import { appendRow, deleteRow, readTab, rowsToObjects, updateRow } from "@/lib/xlsx";
import { SHEETS, SOLD_COLUMNS, SoldRow } from "@/lib/types";

export const dynamic = "force-dynamic";

const tab = SHEETS.sold.name;
const headerRow = SHEETS.sold.headerRow;

/**
 * Projects a partial {@link SoldRow} request body onto the column-ordered
 * string array expected by the XLSX writer. Missing fields become empty strings.
 * @param {Partial<SoldRow>} body - Fields supplied by the client.
 * @returns {string[]} Values aligned to {@link SOLD_COLUMNS} for writing to the sheet.
 */
function rowFromBody(body: Partial<SoldRow>): string[] {
  return SOLD_COLUMNS.map((col) =>
    col ? ((body as Record<string, unknown>)[col] ?? "").toString() : ""
  );
}

/**
 * `GET /api/sold`
 *
 * Returns every populated row on the Sold Stock tab, filtered to rows that
 * carry a non-empty "Number Plate reference".
 * @returns {Promise<Response>} JSON response of the form
 *   `{ data: SoldRow[], headers: string[] }`, or `{ error }` with HTTP 500.
 */
export async function GET() {
  try {
    const { headers, rows, firstDataRow } = await readTab(tab, headerRow);
    const all = rowsToObjects<SoldRow>(headers, rows, firstDataRow, { skipBlank: true });
    const data = all.filter((r) => (r["Number Plate reference"] ?? "").trim() !== "");
    return NextResponse.json({ data, headers });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/**
 * `POST /api/sold`
 *
 * Appends a new sold-vehicle record to the Sold Stock tab.
 * @param {NextRequest} req - Request whose JSON body is a `Partial<SoldRow>`.
 * @returns {Promise<Response>} `{ ok: true }` on success or `{ error }` with HTTP 500.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<SoldRow>;
    await appendRow(tab, rowFromBody(body));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/**
 * `PATCH /api/sold`
 *
 * Updates an existing sold row identified by its `rowNumber`.
 * @param {NextRequest} req - Request whose JSON body is `Partial<SoldRow> & { rowNumber: number }`.
 * @returns {Promise<Response>} `{ ok: true }` on success, `{ error }` with HTTP 400 if
 *   `rowNumber` is missing, or HTTP 500 on other failures.
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<SoldRow> & { rowNumber: number };
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
 * `DELETE /api/sold?rowNumber={n}`
 *
 * Removes a single sold row from the Sold Stock tab.
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
