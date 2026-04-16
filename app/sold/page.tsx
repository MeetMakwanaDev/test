"use client";

import { useEffect, useMemo, useState } from "react";
import { SoldRow, SOLD_COLUMNS } from "@/lib/types";
import { fmtGBP, fmtGBP0, parseMoney, fmtDate, fmtMonth } from "@/lib/format";
import { useSearch } from "@/components/Shell";

/**
 * Sold History page.
 *
 * Loads every row from `/api/sold`, lets the user filter by month or free-text
 * search (via the shared search context), and renders a full sales ledger
 * with per-row breakdown and CSV export.
 * @returns {JSX.Element} Rendered sold-history page.
 */
export default function SoldHistoryPage() {
  const [rows, setRows] = useState<SoldRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState<string>("");
  const { query } = useSearch();

  useEffect(() => {
    fetch("/api/sold", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (j.error) setErr(j.error);
        else setRows((j.data || []).reverse());
      })
      .catch((e) => setErr((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const months = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => r.Month && set.add(r.Month));
    return Array.from(set);
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (month && r.Month !== month) return false;
      if (!q) return true;
      const hay = `${r["Number Plate reference"]} ${r["Make & Model"]} ${r["SA/Investor Name"]} ${r["Customer Name"]} ${r.Platfrom}`.toLowerCase();
      return hay.includes(q);
    });
  }, [rows, month, query]);

  /**
   * Serialises the currently filtered rows to CSV and triggers a browser download.
   * File name is stamped with today's date, e.g. `sold-history-2026-04-15.csv`.
   * @returns {void}
   */
  const exportCSV = () => {
    const cols = SOLD_COLUMNS.filter((c) => c);
    const header = cols.join(",");
    const lines = filtered.map((r) =>
      cols.map((c) => `"${((r as Record<string, unknown>)[c] ?? "").toString().replace(/"/g, '""').trim()}"`).join(",")
    );
    const csv = [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sold-history-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /**
   * Pops an alert dialog summarising every money/date/customer field for one sold row.
   * @param {SoldRow} r - Row representing a single completed sale.
   * @returns {void}
   */
  const showBreakdown = (r: SoldRow) => {
    const cost = parseMoney(r["Total Cost"]);
    const sold = parseMoney(r.Sold);
    const profit = parseMoney(r["Total Profit"]);
    const invProfit = parseMoney(r["Investor Profit"]);
    const saProfit = parseMoney(r["SA Profit"]);
    const partEx = parseMoney(r["Part Ex"]);
    const lines = [
      r["Make & Model"] || "—",
      r["Number Plate reference"] || "—",
      "",
      `Month: ${fmtMonth(r.Month)}`,
      `Date acquired: ${fmtDate(r["Date Aquired"])}`,
      `Date sold: ${fmtDate(r["Date Sold"])}`,
      `Days to sell: ${r["Days to Sell"] || "—"}`,
      "",
      `Cost: ${fmtGBP(cost)}`,
      `Sold: ${fmtGBP(sold)}`,
      partEx ? `Part Ex: ${fmtGBP(partEx)}` : null,
      `Profit: ${fmtGBP(profit)}`,
      "",
      `Investor: ${r["SA/Investor Name"] || "—"}`,
      r["SA/Investor Profit Share"] ? `Investor share: ${r["SA/Investor Profit Share"]}` : null,
      invProfit ? `Investor profit: ${fmtGBP(invProfit)}` : null,
      saProfit ? `SA profit: ${fmtGBP(saProfit)}` : null,
      "",
      r["Customer Name"] ? `Customer: ${r["Customer Name"]}` : null,
      r["Contact info"] ? `Contact: ${r["Contact info"]}` : null,
      r["Invoice Number"] ? `Invoice #: ${r["Invoice Number"]}` : null,
      r.Warranty ? `Warranty: ${r.Warranty}` : null,
    ].filter((x) => x !== null);
    alert(lines.join("\n"));
  };

  return (
    <div className="page">
      <div className="sh">
        <div className="stitle">Sold History</div>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          <select
            className="fi"
            style={{ width: "auto", padding: "5px 9px", fontSize: 11.5 }}
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          >
            <option value="">All Months</option>
            {months.map((m) => (
              <option key={m} value={m}>{fmtMonth(m)}</option>
            ))}
          </select>
          <button className="btn btn-g btn-sm" onClick={exportCSV}>📊 Export</button>
        </div>
      </div>

      <div className="card">
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>Month</th>
                <th>Vehicle</th>
                <th>Plate</th>
                <th>Date Acquired</th>
                <th>Date Sold</th>
                <th>Source</th>
                <th>Days</th>
                <th>Cost</th>
                <th>Sold</th>
                <th>Profit</th>
                <th>Investor</th>
                <th>Breakdown</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={`sk-${i}`} className="sk-row">
                    <td><span className="sk" style={{ width: "70%" }} /></td>
                    <td>
                      <div className="sk-stack">
                        <span className="sk" style={{ width: "80%" }} />
                        <span className="sk sk-sm" style={{ width: "50%" }} />
                      </div>
                    </td>
                    <td><span className="sk" style={{ width: "65%" }} /></td>
                    <td><span className="sk" style={{ width: "70%" }} /></td>
                    <td><span className="sk" style={{ width: "70%" }} /></td>
                    <td><span className="sk" style={{ width: "55%" }} /></td>
                    <td><span className="sk" style={{ width: "40%" }} /></td>
                    <td><span className="sk" style={{ width: "60%" }} /></td>
                    <td><span className="sk" style={{ width: "60%" }} /></td>
                    <td><span className="sk sk-lg" style={{ width: "65%" }} /></td>
                    <td><span className="sk" style={{ width: "55%" }} /></td>
                    <td><span className="sk" style={{ width: 42, height: 22, borderRadius: 6 }} /></td>
                  </tr>
                ))
              ) : err ? (
                <tr><td colSpan={12}><div className="alert alt-r">Error: {err}</div></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={12} style={{ color: "var(--text3)" }}>No sold vehicles.</td></tr>
              ) : (
                filtered.map((r) => {
                  const profit = parseMoney(r["Total Profit"]);
                  const cost = parseMoney(r["Total Cost"]);
                  const sold = parseMoney(r.Sold);
                  const days = parseMoney(r["Days to Sell"]);
                  return (
                    <tr key={r.rowNumber}>
                      <td style={{ color: "var(--text3)" }}>{fmtMonth(r.Month)}</td>
                      <td>
                        <div className="tdm">{r["Make & Model"] || "—"}</div>
                        <div style={{ fontSize: 10.5, color: "var(--text3)" }}>
                          {fmtDate(r["Date Aquired"])}
                        </div>
                      </td>
                      <td className="mono" style={{ color: "var(--blue2)" }}>
                        {r["Number Plate reference"] || "—"}
                      </td>
                      <td>{fmtDate(r["Date Aquired"])}</td>
                      <td>{fmtDate(r["Date Sold"])}</td>
                      <td>{r.Platfrom || "—"}</td>
                      <td>{days ? `${days}d` : "0d"}</td>
                      <td>{cost ? fmtGBP0(cost) : "—"}</td>
                      <td>{sold ? fmtGBP0(sold) : "—"}</td>
                      <td
                        style={{
                          fontWeight: 700,
                          color: profit >= 0 ? "var(--green)" : "var(--red)",
                        }}
                      >
                        {profit ? fmtGBP(profit) : "—"}
                      </td>
                      <td>{r["SA/Investor Name"] || "SA"}</td>
                      <td>
                        <button
                          className="btn btn-g btn-xs"
                          type="button"
                          onClick={() => showBreakdown(r)}
                        >
                          Full
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
