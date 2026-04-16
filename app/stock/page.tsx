"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { StockRow, STOCK_COLUMNS } from "@/lib/types";
import {
  fmtGBP,
  fmtGBP0,
  parseMoney,
  parseSheetDate,
  daysBetween,
  fmtDate,
} from "@/lib/format";
import { useSearch } from "@/components/Shell";

/** Tab filter values for the Current Stock page. */
type Filter = "all" | "website" | "autotrader" | "needs" | "ready";

/**
 * Classifies a raw status string into a coarse "what's left to do" badge.
 *
 * `bg` = green (nothing outstanding), `ba` = amber (needs work),
 * `bk` = black (sold).
 * @param {string} status - Free-form status text from the Stock sheet.
 * @returns {{ badge: "bg" | "ba" | "bk"; label: string; sub: string }}
 *   Visual badge key, short label, and original status passed through as sub-text.
 */
function leftToDo(status: string): {
  badge: "bg" | "ba" | "bk";
  label: string;
  sub: string;
} {
  const s = (status ?? "").toLowerCase().trim();
  if (!s) return { badge: "bg", label: "Nothing left", sub: "In Stock" };
  if (s === "sold" || s.includes("sold"))
    return { badge: "bk", label: "Sold", sub: status };
  if (
    s === "listed" ||
    s === "on sale" ||
    s === "ready to list" ||
    s === "ready"
  ) {
    return { badge: "bg", label: "Nothing left", sub: "In Stock" };
  }
  if (
    /(need|fix|prep|order|wait|recover|body|engine|tyre|mot|repair|charlie|courtesy)/i.test(
      s,
    )
  ) {
    return { badge: "ba", label: "Needs work", sub: status };
  }
  if (s.startsWith("listed")) {
    return { badge: "ba", label: "Needs work", sub: status };
  }
  return { badge: "bg", label: "Nothing left", sub: status };
}

/**
 * Current Stock page.
 *
 * Fetches live stock from `/api/stock`, excludes rows flagged as sold, and
 * exposes filter tabs (All / Website / Auto Trader / Needs work / Ready),
 * free-text search (via the shared Shell context), CSV export, and a
 * quick-add vehicle flow. Reloads when the global `vehicle-added` event fires.
 * @returns {JSX.Element} Rendered current-stock page.
 */
export default function CurrentStockPage() {
  const [rows, setRows] = useState<StockRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const { query, openAddVehicle } = useSearch();

  const load = useCallback(() => {
    fetch("/api/stock", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (j.error) setErr(j.error);
        else setRows((j.data || []).reverse());
      })
      .catch((e) => setErr((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const handler = () => load();
    window.addEventListener("vehicle-added", handler);
    return () => window.removeEventListener("vehicle-added", handler);
  }, [load]);

  const liveRows = useMemo(
    () => rows.filter((r) => !(r.Status ?? "").toLowerCase().includes("sold")),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return liveRows.filter((r) => {
      const ltd = leftToDo(r.Status);
      const status = (r.Status ?? "").toLowerCase();
      if (filter === "ready" && ltd.label !== "Nothing left") return false;
      if (filter === "needs" && ltd.label !== "Needs work") return false;
      if (filter === "website" && !status.includes("website")) return false;
      if (
        filter === "autotrader" &&
        !/auto\s*trader|autotrader|\bat\b/.test(status)
      )
        return false;
      if (!q) return true;
      const hay =
        `${r["Plate Number"]} ${r["Make & Model"]} ${r.Source} ${r["Investor/SA"]}`.toLowerCase();
      return hay.includes(q);
    });
  }, [liveRows, filter, query]);

  const now = new Date();

  /**
   * Serialises the current filtered stock rows to CSV and triggers a download.
   * File is named `current-stock-YYYY-MM-DD.csv`.
   * @returns {void}
   */
  const exportCSV = () => {
    const header = STOCK_COLUMNS.join(",");
    const lines = filtered.map((r) =>
      STOCK_COLUMNS.map(
        (c) =>
          `"${((r as Record<string, unknown>)[c] ?? "").toString().replace(/"/g, '""').trim()}"`,
      ).join(","),
    );
    const csv = [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `current-stock-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /**
   * Pops an alert dialog showing the full detail (costs, dates, status) for a stock row.
   * @param {StockRow} r - Row representing a single vehicle in inventory.
   * @returns {void}
   */
  const showDetails = (r: StockRow) => {
    const acq = parseSheetDate(r["Date Aquired"]);
    const days = daysBetween(acq, now);
    const lines = [
      r["Make & Model"] || "—",
      r["Plate Number"] || "—",
      "",
      `Source: ${r.Source || "—"}`,
      `Investor: ${r["Investor/SA"] || "—"}`,
      `Date acquired: ${fmtDate(r["Date Aquired"])}`,
      `Days in stock: ${days !== null ? days + "d" : "—"}`,
      `Purchase: ${fmtGBP(parseMoney(r.Price))}`,
      `Recon: ${fmtGBP(parseMoney(r["Reconditioning costs"]))}`,
      `Total cost: ${fmtGBP(parseMoney(r["Total Cost"]))}`,
      `Status: ${r.Status || "—"}`,
    ];
    alert(lines.join("\n"));
  };

  return (
    <div className="page">
      <div className="sh">
        <div className="stitle">
          Current Stock{" "}
          <span
            style={{ fontSize: 12, color: "var(--text3)", fontWeight: 400 }}
          >
            {filtered.length} vehicles
          </span>
        </div>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          <button className="btn btn-g btn-sm" onClick={exportCSV}>
            📊 CSV
          </button>
          <button className="btn btn-amber btn-sm" type="button">
            💸 Log Cost
          </button>
          <button
            className="btn btn-p btn-sm"
            type="button"
            onClick={openAddVehicle}
          >
            + Add Vehicle
          </button>
        </div>
      </div>

      <div className="tabs">
        {(
          [
            ["all", "All"],
            ["website", "Website"],
            ["autotrader", "Auto Trader"],
            ["needs", "Needs work"],
            ["ready", "Ready"],
          ] as [Filter, string][]
        ).map(([f, label]) => (
          <button
            key={f}
            className={`tab${filter === f ? " active" : ""}`}
            onClick={() => setFilter(f)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="tw">
          <table>
            <colgroup>
              <col className="sm:w-[16%]" />
              <col className="sm:w-[9%]" />
              <col className="sm:w-[9%]" />
              <col className="sm:w-[8%]" />
              <col className="sm:w-[9%]" />
              <col className="sm:w-[5%]" />
              <col className="sm:w-[8%]" />
              <col className="sm:w-[9%]" />
              <col className="sm:w-[14%]" />
              <col className="sm:w-[13%]" />
            </colgroup>
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Plate</th>
                <th>Source</th>
                <th>Investor</th>
                <th>Total Cost</th>
                <th>Days</th>
                <th>Website</th>
                <th>Auto Trader</th>
                <th>Left to do</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={`sk-${i}`} className="sk-row">
                    <td>
                      <div className="sk-stack">
                        <span className="sk" style={{ width: "78%" }} />
                        <span className="sk sk-sm" style={{ width: "45%" }} />
                      </div>
                    </td>
                    <td><span className="sk" style={{ width: "70%" }} /></td>
                    <td><span className="sk" style={{ width: "60%" }} /></td>
                    <td><span className="sk" style={{ width: "55%" }} /></td>
                    <td><span className="sk" style={{ width: "70%" }} /></td>
                    <td><span className="sk" style={{ width: "40%" }} /></td>
                    <td><span className="sk sk-pill" style={{ width: "70%" }} /></td>
                    <td><span className="sk sk-pill" style={{ width: "70%" }} /></td>
                    <td>
                      <div className="sk-stack">
                        <span className="sk sk-pill" style={{ width: "75%" }} />
                        <span className="sk sk-sm" style={{ width: "60%" }} />
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 4 }}>
                        <span className="sk" style={{ width: 26, height: 22, borderRadius: 6 }} />
                        <span className="sk" style={{ width: 26, height: 22, borderRadius: 6 }} />
                        <span className="sk" style={{ width: 42, height: 22, borderRadius: 6 }} />
                      </div>
                    </td>
                  </tr>
                ))
              ) : err ? (
                <tr>
                  <td colSpan={10}>
                    <div className="alert alt-r">Error: {err}</div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ color: "var(--text3)" }}>
                    No vehicles.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const acq = parseSheetDate(r["Date Aquired"]);
                  const days = daysBetween(acq, now);
                  const totalCost = parseMoney(r["Total Cost"]);
                  const ltd = leftToDo(r.Status);

                  return (
                    <tr key={r.rowNumber}>
                      <td>
                        <div className="tdm">{r["Make & Model"] || "—"}</div>
                        <div style={{ fontSize: 10.5, color: "var(--text3)" }}>
                          {fmtDate(r["Date Aquired"])}
                        </div>
                      </td>
                      <td className="mono">{r["Plate Number"] || "—"}</td>
                      <td>{r.Source || "—"}</td>
                      <td>{r["Investor/SA"] || "—"}</td>
                      <td className="tdm">{fmtGBP0(totalCost)}</td>
                      <td>
                        <span>
                          {days !== null ? `${days}d` : "—"}
                        </span>
                      </td>
                      <td>
                        <span className="badge bk">Not live</span>
                      </td>
                      <td>
                        <span className="badge bk">Not live</span>
                      </td>
                      <td>
                        <span className={`badge ${ltd.badge}`}>
                          {ltd.label}
                        </span>
                        <div
                          style={{
                            fontSize: 10.5,
                            color: "var(--text3)",
                            marginTop: 3,
                          }}
                        >
                          {ltd.sub}
                        </div>
                      </td>
                      <td>
                        <div
                          style={{
                            display: "flex",
                            gap: 4,
                            alignItems: "center",
                          }}
                        >
                          <button
                            className="btn btn-g btn-xs"
                            type="button"
                            title="Photos"
                            style={{ padding: "4px 7px" }}
                          >
                            📸
                          </button>
                          <button
                            className="btn btn-b btn-xs"
                            type="button"
                            title="Auto Trader"
                            style={{ padding: "4px 7px", fontWeight: 800 }}
                          >
                            AT
                          </button>
                          <button
                            className="btn btn-g btn-xs"
                            type="button"
                            onClick={() => showDetails(r)}
                          >
                            View
                          </button>
                        </div>
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
