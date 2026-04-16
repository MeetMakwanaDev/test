/**
 * @jest-environment node
 */

const readTab = jest.fn();
const rowsToObjects = jest.fn();

jest.mock("@/lib/xlsx", () => ({
  readTab: (...args: unknown[]) => readTab(...args),
  rowsToObjects: (...args: unknown[]) => rowsToObjects(...args),
}));

import { GET } from "@/app/api/dashboard/route";

beforeEach(() => {
  readTab.mockReset();
  rowsToObjects.mockReset();
});

describe("GET /api/dashboard", () => {
  it("aggregates monthly, stock, and sold data in a single JSON payload", async () => {
    readTab.mockResolvedValue({ headers: [], rows: [], firstDataRow: 3 });
    rowsToObjects
      .mockReturnValueOnce([{ Month: "2026-04-01" }])
      .mockReturnValueOnce([
        { "Plate Number": "AB24", Status: "Listed" },
        { "Plate Number": "", Status: "blank" },
      ])
      .mockReturnValueOnce([
        { "Number Plate reference": "XY21" },
        { "Number Plate reference": "" },
      ]);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.monthly).toHaveLength(1);
    expect(body.stock).toHaveLength(1);
    expect(body.sold).toHaveLength(1);
  });

  it("returns a 500 with the error message on failure", async () => {
    readTab.mockRejectedValue(new Error("bad tab"));
    const res = await GET();
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "bad tab" });
  });
});
