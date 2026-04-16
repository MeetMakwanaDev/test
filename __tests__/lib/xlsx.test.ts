/**
 * Unit tests for lib/xlsx.ts.
 *
 * We mock ExcelJS so no real file I/O happens. The fake workbook keeps an
 * in-memory grid of cell values and records every writeFile call so we can
 * assert persistence behaviour.
 */

type CellVal = string | number | Date | null | undefined | Record<string, unknown>;

type FakeCell = { value: CellVal };
type FakeRow = {
  getCell: (col: number) => FakeCell;
  commit: () => void;
};

type FakeWorksheet = {
  columnCount: number;
  rowCount: number;
  getRow: (r: number) => FakeRow;
  spliceRows: (start: number, count: number) => void;
};

interface FakeWorkbook {
  xlsx: {
    readFile: jest.Mock<Promise<void>, [string]>;
    writeFile: jest.Mock<Promise<void>, [string]>;
  };
  getWorksheet: jest.Mock<FakeWorksheet | undefined, [string]>;
}

/** Creates a FakeWorksheet backed by a 2-D grid of cells (1-indexed). */
function makeSheet(grid: CellVal[][]): FakeWorksheet {
  const colCount = Math.max(0, ...grid.map((r) => r.length));
  const rowCount = grid.length;
  return {
    columnCount: colCount,
    rowCount,
    getRow(r: number): FakeRow {
      return {
        getCell(c: number): FakeCell {
          if (!grid[r - 1]) grid[r - 1] = [];
          return {
            get value() {
              return grid[r - 1][c - 1];
            },
            set value(v: CellVal) {
              grid[r - 1][c - 1] = v;
            },
          };
        },
        commit() {},
      };
    },
    spliceRows(start: number, count: number) {
      grid.splice(start - 1, count);
    },
  };
}

let fakeSheet: FakeWorksheet;
let writeFileMock: jest.Mock<Promise<void>, [string]>;

jest.mock("exceljs", () => {
  const Workbook = jest.fn().mockImplementation(() => {
    const wb: FakeWorkbook = {
      xlsx: {
        readFile: jest.fn().mockResolvedValue(undefined),
        writeFile: writeFileMock,
      },
      getWorksheet: jest.fn((name: string) => {
        if (name === "Missing") return undefined;
        return fakeSheet;
      }),
    };
    return wb;
  });
  return { __esModule: true, default: { Workbook }, Workbook };
});

import {
  readTab,
  rowsToObjects,
  appendRow,
  updateRow,
  deleteRow,
} from "@/lib/xlsx";

beforeEach(() => {
  writeFileMock = jest.fn().mockResolvedValue(undefined);
});

describe("readTab", () => {
  it("extracts headers and rows below the header row", async () => {
    fakeSheet = makeSheet([
      ["Title", "", ""],
      ["Month", "Plate", "Price"],
      ["Apr-26", "AB24 XYZ", 9999],
      ["Mar-26", "CD23 ABC", 1500],
    ]);
    const { headers, rows, firstDataRow } = await readTab("Stock Data", 2);
    expect(headers).toEqual(["Month", "Plate", "Price"]);
    expect(rows).toEqual([
      ["Apr-26", "AB24 XYZ", "9999"],
      ["Mar-26", "CD23 ABC", "1500"],
    ]);
    expect(firstDataRow).toBe(3);
  });

  it("coerces rich text, formula-result, hyperlink, and Date cells to strings", async () => {
    const date = new Date("2026-04-15T00:00:00Z");
    fakeSheet = makeSheet([
      ["Col A", "Col B", "Col C", "Col D"],
      [
        { richText: [{ text: "Hello " }, { text: "World" }] },
        { result: 42 },
        { hyperlink: "https://example.com" },
        date,
      ],
    ]);
    const { rows } = await readTab("Stock Data", 1);
    expect(rows[0][0]).toBe("Hello World");
    expect(rows[0][1]).toBe("42");
    expect(rows[0][2]).toBe("https://example.com");
    expect(rows[0][3]).toBe(date.toISOString());
  });

  it("throws when the worksheet is missing", async () => {
    fakeSheet = makeSheet([["x"]]);
    await expect(readTab("Missing", 1)).rejects.toThrow(
      "Worksheet not found: Missing",
    );
  });
});

describe("rowsToObjects", () => {
  const headers = ["Month", "Plate", "Price"];

  it("maps rows onto header-keyed objects with row numbers", () => {
    const out = rowsToObjects<{
      Month: string;
      Plate: string;
      Price: string;
    }>(headers, [["Apr-26", "AB24", "9999"]], 3);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      Month: "Apr-26",
      Plate: "AB24",
      Price: "9999",
      rowNumber: 3,
    });
  });

  it("skips entirely blank rows when skipBlank is true", () => {
    const out = rowsToObjects(
      headers,
      [
        ["Apr-26", "AB24", "9999"],
        ["", "", ""],
        ["Mar-26", "CD23", "1500"],
      ],
      3,
      { skipBlank: true },
    );
    expect(out).toHaveLength(2);
    expect(out.map((r) => r.rowNumber)).toEqual([3, 5]);
  });

  it("ignores blank header columns", () => {
    const out = rowsToObjects(
      ["A", "", "B"],
      [["x", "SKIP", "y"]],
      1,
    );
    expect(out[0]).toEqual({ A: "x", B: "y", rowNumber: 1 });
  });

  it("applies a leading offset when the sheet has spacer columns", () => {
    const out = rowsToObjects(
      ["Col"],
      [["IGNORED", "real"]],
      1,
      { leadingOffset: 1 },
    );
    expect(out[0].Col).toBe("real");
  });
});

describe("appendRow", () => {
  it("appends after the last populated row", async () => {
    fakeSheet = makeSheet([
      ["Title"],
      ["Month", "Plate"],
      ["Apr-26", "AB24"],
    ]);
    await appendRow("Stock Data", ["May-26", "EF25"], 2);
    expect(fakeSheet.getRow(4).getCell(1).value).toBe("May-26");
    expect(fakeSheet.getRow(4).getCell(2).value).toBe("EF25");
    expect(writeFileMock).toHaveBeenCalledTimes(1);
  });

  it("coerces numeric and ISO-date strings to the correct types", async () => {
    fakeSheet = makeSheet([["Month", "Price", "Date"], ["", "", ""]]);
    await appendRow("Stock Data", ["", "1500", "2026-04-15"], 1);
    expect(fakeSheet.getRow(2).getCell(1).value).toBe("");
    expect(fakeSheet.getRow(2).getCell(2).value).toBe(1500);
    expect(fakeSheet.getRow(2).getCell(3).value).toBeInstanceOf(Date);
  });

  it("falls back to the first row after headers when the sheet is empty", async () => {
    fakeSheet = makeSheet([["Header"]]);
    await appendRow("Stock Data", ["first"], 1);
    expect(fakeSheet.getRow(2).getCell(1).value).toBe("first");
  });

  it("throws when the worksheet is missing", async () => {
    fakeSheet = makeSheet([["x"]]);
    await expect(appendRow("Missing", ["x"])).rejects.toThrow(
      "Worksheet not found: Missing",
    );
  });
});

describe("updateRow", () => {
  it("writes values into the requested row starting at startCol", async () => {
    fakeSheet = makeSheet([
      ["Month", "Plate", "Price"],
      ["Apr-26", "AB24", "9999"],
    ]);
    await updateRow("Stock Data", 2, ["NEW_PLATE", "1234"], 2);
    expect(fakeSheet.getRow(2).getCell(1).value).toBe("Apr-26");
    expect(fakeSheet.getRow(2).getCell(2).value).toBe("NEW_PLATE");
    expect(fakeSheet.getRow(2).getCell(3).value).toBe(1234);
    expect(writeFileMock).toHaveBeenCalledTimes(1);
  });

  it("throws when the worksheet is missing", async () => {
    fakeSheet = makeSheet([["x"]]);
    await expect(updateRow("Missing", 1, ["x"])).rejects.toThrow(
      "Worksheet not found: Missing",
    );
  });
});

describe("deleteRow", () => {
  it("splices the given row out and saves", async () => {
    fakeSheet = makeSheet([
      ["Month", "Plate"],
      ["Apr-26", "AB24"],
      ["May-26", "EF25"],
    ]);
    await deleteRow("Stock Data", 2);
    expect(fakeSheet.getRow(2).getCell(2).value).toBe("EF25");
    expect(writeFileMock).toHaveBeenCalledTimes(1);
  });

  it("throws when the worksheet is missing", async () => {
    fakeSheet = makeSheet([["x"]]);
    await expect(deleteRow("Missing", 1)).rejects.toThrow(
      "Worksheet not found: Missing",
    );
  });
});
