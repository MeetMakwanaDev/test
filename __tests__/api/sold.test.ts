/**
 * @jest-environment node
 */

import { NextRequest } from "next/server";

const readTab = jest.fn();
const rowsToObjects = jest.fn();
const appendRow = jest.fn();
const updateRow = jest.fn();
const deleteRow = jest.fn();

jest.mock("@/lib/xlsx", () => ({
  readTab: (...args: unknown[]) => readTab(...args),
  rowsToObjects: (...args: unknown[]) => rowsToObjects(...args),
  appendRow: (...args: unknown[]) => appendRow(...args),
  updateRow: (...args: unknown[]) => updateRow(...args),
  deleteRow: (...args: unknown[]) => deleteRow(...args),
}));

import { GET, POST, PATCH, DELETE } from "@/app/api/sold/route";

function jsonReq(url: string, method: string, body: unknown): NextRequest {
  return new NextRequest(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  readTab.mockReset();
  rowsToObjects.mockReset();
  appendRow.mockReset();
  updateRow.mockReset();
  deleteRow.mockReset();
});

describe("GET /api/sold", () => {
  it("returns rows with a non-empty plate reference", async () => {
    readTab.mockResolvedValue({
      headers: ["Number Plate reference"],
      rows: [],
      firstDataRow: 3,
    });
    rowsToObjects.mockReturnValue([
      { "Number Plate reference": "XY21" },
      { "Number Plate reference": "" },
    ]);
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
  });

  it("returns 500 on read failure", async () => {
    readTab.mockRejectedValue(new Error("boom"));
    const res = await GET();
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "boom" });
  });
});

describe("POST /api/sold", () => {
  it("appends the sold row", async () => {
    appendRow.mockResolvedValue(undefined);
    const req = jsonReq("http://local/api/sold", "POST", {
      "Number Plate reference": "XY21",
      "Customer Name": "Alice",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    const [, values] = appendRow.mock.calls[0];
    expect(values).toEqual(expect.arrayContaining(["XY21", "Alice"]));
  });

  it("returns 500 on write failure", async () => {
    appendRow.mockRejectedValue(new Error("x"));
    const req = jsonReq("http://local/api/sold", "POST", {});
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});

describe("PATCH /api/sold", () => {
  it("updates the given row", async () => {
    updateRow.mockResolvedValue(undefined);
    const req = jsonReq("http://local/api/sold", "PATCH", { rowNumber: 3 });
    const res = await PATCH(req);
    expect(res.status).toBe(200);
    expect(updateRow).toHaveBeenCalledWith(
      expect.any(String),
      3,
      expect.any(Array),
      1,
    );
  });

  it("requires rowNumber", async () => {
    const req = jsonReq("http://local/api/sold", "PATCH", {});
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });

  it("returns 500 on write failure", async () => {
    updateRow.mockRejectedValue(new Error("nope"));
    const req = jsonReq("http://local/api/sold", "PATCH", { rowNumber: 4 });
    const res = await PATCH(req);
    expect(res.status).toBe(500);
  });
});

describe("DELETE /api/sold", () => {
  it("deletes by rowNumber", async () => {
    deleteRow.mockResolvedValue(undefined);
    const req = new NextRequest("http://local/api/sold?rowNumber=11", {
      method: "DELETE",
    });
    const res = await DELETE(req);
    expect(res.status).toBe(200);
    expect(deleteRow).toHaveBeenCalledWith(expect.any(String), 11);
  });

  it("400 when rowNumber is absent", async () => {
    const req = new NextRequest("http://local/api/sold", { method: "DELETE" });
    const res = await DELETE(req);
    expect(res.status).toBe(400);
  });

  it("500 when the library throws", async () => {
    deleteRow.mockRejectedValue(new Error("boom"));
    const req = new NextRequest("http://local/api/sold?rowNumber=11", {
      method: "DELETE",
    });
    const res = await DELETE(req);
    expect(res.status).toBe(500);
  });
});
