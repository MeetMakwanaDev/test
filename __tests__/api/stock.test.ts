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

import { GET, POST, PATCH, DELETE } from "@/app/api/stock/route";

/** Builds a minimal NextRequest with a JSON body. */
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

describe("GET /api/stock", () => {
  it("returns rows with a non-empty plate and forwards headers", async () => {
    readTab.mockResolvedValue({
      headers: ["Plate Number"],
      rows: [],
      firstDataRow: 3,
    });
    rowsToObjects.mockReturnValue([
      { "Plate Number": "AB24" },
      { "Plate Number": "" },
      { "Plate Number": "CD23" },
    ]);
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(2);
    expect(body.headers).toEqual(["Plate Number"]);
  });

  it("returns 500 on read failure", async () => {
    readTab.mockRejectedValue(new Error("boom"));
    const res = await GET();
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "boom" });
  });
});

describe("POST /api/stock", () => {
  it("appends a row built from the request body", async () => {
    appendRow.mockResolvedValue(undefined);
    const req = jsonReq("http://local/api/stock", "POST", {
      "Plate Number": "AB24 XYZ",
      "Make & Model": "VW Golf",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(appendRow).toHaveBeenCalledTimes(1);
    const [, values] = appendRow.mock.calls[0];
    expect(Array.isArray(values)).toBe(true);
    expect((values as string[])[0]).toBe("");
    expect(values).toEqual(expect.arrayContaining(["AB24 XYZ", "VW Golf"]));
  });

  it("returns 500 if appendRow rejects", async () => {
    appendRow.mockRejectedValue(new Error("write fail"));
    const req = jsonReq("http://local/api/stock", "POST", { "Plate Number": "X" });
    const res = await POST(req);
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "write fail" });
  });
});

describe("PATCH /api/stock", () => {
  it("updates the given rowNumber", async () => {
    updateRow.mockResolvedValue(undefined);
    const req = jsonReq("http://local/api/stock", "PATCH", {
      rowNumber: 7,
      "Plate Number": "NEW",
    });
    const res = await PATCH(req);
    expect(res.status).toBe(200);
    expect(updateRow).toHaveBeenCalledWith(
      expect.any(String),
      7,
      expect.any(Array),
      1,
    );
  });

  it("returns 400 when rowNumber is missing", async () => {
    const req = jsonReq("http://local/api/stock", "PATCH", { "Plate Number": "X" });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "rowNumber required" });
    expect(updateRow).not.toHaveBeenCalled();
  });

  it("returns 500 when updateRow rejects", async () => {
    updateRow.mockRejectedValue(new Error("patch fail"));
    const req = jsonReq("http://local/api/stock", "PATCH", { rowNumber: 5 });
    const res = await PATCH(req);
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "patch fail" });
  });
});

describe("DELETE /api/stock", () => {
  it("deletes the row identified by the rowNumber query param", async () => {
    deleteRow.mockResolvedValue(undefined);
    const req = new NextRequest("http://local/api/stock?rowNumber=9", {
      method: "DELETE",
    });
    const res = await DELETE(req);
    expect(res.status).toBe(200);
    expect(deleteRow).toHaveBeenCalledWith(expect.any(String), 9);
  });

  it("returns 400 when rowNumber is missing", async () => {
    const req = new NextRequest("http://local/api/stock", { method: "DELETE" });
    const res = await DELETE(req);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "rowNumber required" });
  });

  it("returns 500 when deleteRow rejects", async () => {
    deleteRow.mockRejectedValue(new Error("del fail"));
    const req = new NextRequest("http://local/api/stock?rowNumber=3", {
      method: "DELETE",
    });
    const res = await DELETE(req);
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "del fail" });
  });
});
