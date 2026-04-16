/**
 * @jest-environment node
 */

import { NextRequest } from "next/server";

const appendRow = jest.fn();
const updateRow = jest.fn();

jest.mock("@/lib/xlsx", () => ({
  appendRow: (...args: unknown[]) => appendRow(...args),
  updateRow: (...args: unknown[]) => updateRow(...args),
}));

import { POST } from "@/app/api/sell/route";

function jsonReq(body: unknown): NextRequest {
  return new NextRequest("http://local/api/sell", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  appendRow.mockReset();
  updateRow.mockReset();
});

describe("POST /api/sell", () => {
  it("appends to Sold Stock and marks the stock row as Sold", async () => {
    appendRow.mockResolvedValue(undefined);
    updateRow.mockResolvedValue(undefined);

    const req = jsonReq({
      stockRowNumber: 5,
      "Number Plate reference": "AB24 XYZ",
      "Make & Model": "VW Golf",
      Sold: "12000",
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });

    // Should append to Sold Stock
    expect(appendRow).toHaveBeenCalledTimes(1);
    expect(appendRow.mock.calls[0][0]).toBe("Sold Stock");

    // Should mark stock row: col 12 = sale price, col 14 = "Sold"
    expect(updateRow).toHaveBeenCalledTimes(2);
    expect(updateRow).toHaveBeenCalledWith("Stock Data", 5, ["12000"], 12);
    expect(updateRow).toHaveBeenCalledWith("Stock Data", 5, ["Sold"], 14);
  });

  it("returns 400 when stockRowNumber is missing", async () => {
    const req = jsonReq({ "Number Plate reference": "AB24" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "stockRowNumber is required" });
    expect(appendRow).not.toHaveBeenCalled();
    expect(updateRow).not.toHaveBeenCalled();
  });

  it("returns 500 when appendRow fails", async () => {
    appendRow.mockRejectedValue(new Error("write fail"));
    const req = jsonReq({ stockRowNumber: 3 });
    const res = await POST(req);
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "write fail" });
  });

  it("returns 500 when updateRow fails", async () => {
    appendRow.mockResolvedValue(undefined);
    updateRow.mockRejectedValue(new Error("update fail"));
    const req = jsonReq({ stockRowNumber: 3, Sold: "5000" });
    const res = await POST(req);
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "update fail" });
  });

  it("builds the sold row values from SOLD_COLUMNS order", async () => {
    appendRow.mockResolvedValue(undefined);
    updateRow.mockResolvedValue(undefined);

    const req = jsonReq({
      stockRowNumber: 7,
      Month: "2026-04-01",
      "Number Plate reference": "XY21",
      "Make & Model": "BMW 320d",
      "Total Profit": "2000",
      Sold: "15000",
    });
    await POST(req);

    const soldValues = appendRow.mock.calls[0][1] as string[];
    // SOLD_COLUMNS[0] = "Month"
    expect(soldValues[0]).toBe("2026-04-01");
    // SOLD_COLUMNS[2] = "Number Plate reference"
    expect(soldValues[2]).toBe("XY21");
    // SOLD_COLUMNS[3] = "Make & Model"
    expect(soldValues[3]).toBe("BMW 320d");
  });
});
