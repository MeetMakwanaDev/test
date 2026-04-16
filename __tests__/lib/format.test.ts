import {
  parseMoney,
  fmtGBP,
  fmtGBP0,
  fmtDate,
  fmtMonth,
  parseSheetDate,
  daysBetween,
} from "@/lib/format";

describe("parseMoney", () => {
  it("parses a pound-formatted string with commas", () => {
    expect(parseMoney("£1,250.00")).toBe(1250);
  });

  it("returns a number input unchanged", () => {
    expect(parseMoney(42.5)).toBe(42.5);
  });

  it("returns 0 for null/undefined/blank/dash", () => {
    expect(parseMoney(null)).toBe(0);
    expect(parseMoney(undefined)).toBe(0);
    expect(parseMoney("")).toBe(0);
    expect(parseMoney("   ")).toBe(0);
    expect(parseMoney("-")).toBe(0);
    expect(parseMoney("—")).toBe(0);
  });

  it("returns 0 when the value cannot be parsed", () => {
    expect(parseMoney("abc")).toBe(0);
  });

  it("handles dollar sign and whitespace", () => {
    expect(parseMoney("$ 12,500.50")).toBe(12500.5);
  });
});

describe("fmtGBP / fmtGBP0", () => {
  it("formats with default 2 decimals", () => {
    expect(fmtGBP(1250)).toBe("£1,250.00");
  });

  it("formats with the given decimal count", () => {
    expect(fmtGBP(1250, 0)).toBe("£1,250");
  });

  it("fmtGBP0 is a zero-decimal shortcut", () => {
    expect(fmtGBP0(9999.49)).toBe("£9,999");
  });

  it("handles 0 and negatives", () => {
    expect(fmtGBP(0)).toBe("£0.00");
    expect(fmtGBP(-500)).toBe("£-500.00");
  });
});

describe("parseSheetDate", () => {
  it("parses ISO-8601 dates", () => {
    const d = parseSheetDate("2026-04-15");
    expect(d).toBeInstanceOf(Date);
    expect(d!.getUTCFullYear()).toBe(2026);
    expect(d!.getUTCMonth()).toBe(3);
    expect(d!.getUTCDate()).toBe(15);
  });

  it("parses DD-MMM-YYYY dates", () => {
    const d = parseSheetDate("05-Apr-2026");
    expect(d).toBeInstanceOf(Date);
    expect(d!.getUTCFullYear()).toBe(2026);
    expect(d!.getUTCMonth()).toBe(3);
    expect(d!.getUTCDate()).toBe(5);
  });

  it("parses M/D/YYYY dates", () => {
    const d = parseSheetDate("4/15/2026");
    expect(d).toBeInstanceOf(Date);
    expect(d!.getUTCMonth()).toBe(3);
    expect(d!.getUTCDate()).toBe(15);
  });

  it("returns null for empty, dash, or junk input", () => {
    expect(parseSheetDate("")).toBeNull();
    expect(parseSheetDate("-")).toBeNull();
    expect(parseSheetDate("—")).toBeNull();
    expect(parseSheetDate("not a date")).toBeNull();
  });
});

describe("fmtDate", () => {
  it('formats as "D MMM YY"', () => {
    expect(fmtDate("2026-04-15")).toBe("15 Apr 26");
  });

  it('returns "—" for blank input', () => {
    expect(fmtDate("")).toBe("—");
    expect(fmtDate("—")).toBe("—");
  });
});

describe("fmtMonth", () => {
  it('formats a parseable date as "MMM-YY"', () => {
    expect(fmtMonth("2026-04-01")).toBe("Apr-26");
  });

  it("passes through an unparseable non-empty string", () => {
    expect(fmtMonth("TOTAL")).toBe("TOTAL");
  });

  it('returns "—" for empty input', () => {
    expect(fmtMonth("")).toBe("—");
    expect(fmtMonth("   ")).toBe("—");
  });
});

describe("daysBetween", () => {
  it("returns whole-day difference for b > a", () => {
    const a = new Date(Date.UTC(2026, 3, 1));
    const b = new Date(Date.UTC(2026, 3, 15));
    expect(daysBetween(a, b)).toBe(14);
  });

  it("returns a negative value when b < a", () => {
    const a = new Date(Date.UTC(2026, 3, 15));
    const b = new Date(Date.UTC(2026, 3, 14));
    expect(daysBetween(a, b)).toBe(-1);
  });

  it("returns null if either date is null", () => {
    expect(daysBetween(null, new Date())).toBeNull();
    expect(daysBetween(new Date(), null)).toBeNull();
    expect(daysBetween(null, null)).toBeNull();
  });
});
