/**
 * @jest-environment node
 */

const readTab = jest.fn();
const rowsToObjects = jest.fn();

jest.mock("@/lib/xlsx", () => ({
  readTab: (...args: unknown[]) => readTab(...args),
  rowsToObjects: (...args: unknown[]) => rowsToObjects(...args),
}));

import { GET } from "@/app/api/counts/route";

beforeEach(() => {
  readTab.mockReset();
  rowsToObjects.mockReset();
});

describe("GET /api/counts", () => {
  it("returns live-stock count (excluding 'sold' statuses) and sold-row count", async () => {
    readTab.mockResolvedValue({
      headers: [],
      rows: [],
      firstDataRow: 3,
    });
    rowsToObjects
      .mockReturnValueOnce([
        { "Plate Number": "AB24 XYZ", Status: "In Stock" },
        { "Plate Number": "CD23 ABC", Status: "Listed" },
        { "Plate Number": "EF22 DEF", Status: "Sold" },
        { "Plate Number": "", Status: "blank row" },
      ])
      .mockReturnValueOnce([
        { "Number Plate reference": "XY21 AAA" },
        { "Number Plate reference": "XY21 BBB" },
        { "Number Plate reference": "" },
      ]);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ stock: 2, sold: 2 });
  });

  it("returns a 500 and error message when readTab throws", async () => {
    readTab.mockRejectedValue(new Error("disk broken"));
    const res = await GET();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: "disk broken" });
  });

  it("handles empty stock and sold tabs", async () => {
    readTab.mockResolvedValue({ headers: [], rows: [], firstDataRow: 3 });
    rowsToObjects.mockReturnValue([]);
    const res = await GET();
    expect(await res.json()).toEqual({ stock: 0, sold: 0 });
  });
});
