"use client";

import { useEffect, useMemo, useState } from "react";
import { FrontRow, StockRow, SoldRow } from "@/lib/types";
import {
  fmtGBP0,
  parseMoney,
  parseSheetDate,
  daysBetween,
  fmtMonth,
} from "@/lib/format";

/**
 * Shape of the JSON payload returned by `GET /api/dashboard`.
 * All fields are optional because an `error` payload may arrive in isolation.
 */
type ApiResp = {
  monthly?: FrontRow[];
  stock?: StockRow[];
  sold?: SoldRow[];
  error?: string;
};

/**
 * Dashboard landing page for DealerOS.
 *
 * Fetches monthly P&L, live stock, and sold-history data from `/api/dashboard`,
 * then derives KPI cards, a monthly-profit bar chart, a "days in stock" list,
 * and a top-profit leaderboard. Shows skeleton/loading and error states as needed.
 * @returns {JSX.Element} Rendered dashboard page.
 */
export default function DashboardPage() {
  const [data, setData] = useState<ApiResp | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dashboard", { cache: "no-store" })
      .then((r) => r.json())
      .then((j: ApiResp) => {
        if (j.error) setErr(j.error);
        else setData(j);
      })
      .catch((e) => setErr((e as Error).message));
  }, []);

  const stats = useMemo(() => {
    if (!data) return null;
    const stock = data.stock ?? [];
    const sold = data.sold ?? [];
    const monthly = (data.monthly ?? []).filter((m) => m.Month && m.Month !== "TOTAL");

    const inStock = stock.filter((s) => {
      const status = (s.Status ?? "").toLowerCase();
      return !status.includes("sold");
    }).length;

    const now = new Date();
    const over60 = stock.filter((s) => {
      const status = (s.Status ?? "").toLowerCase();
      if (status.includes("sold")) return false;
      const d = parseSheetDate(s["Date Aquired"]);
      const days = daysBetween(d, now);
      return days !== null && days > 60;
    }).length;

    const last = monthly[monthly.length - 1];
    const monthlyProfit = last ? parseMoney(last["Total Gross Profit"]) : 0;

    const total = (data.monthly ?? []).find((m) => m.Month === "TOTAL");
    const allTimeProfit = total
      ? parseMoney(total["Total Gross Profit"])
      : sold.reduce((a, v) => a + parseMoney(v["Total Profit"]), 0);

    const carsSoldTotal = total ? parseMoney(total["Cars Sold"]) : sold.length;

    const lastMonthLabel = last ? fmtMonth(last.Month) : "—";
    return { inStock, over60, monthlyProfit, allTimeProfit, carsSoldTotal, lastMonthLabel };
  }, [data]);

  const chartData = useMemo(() => {
    if (!data) return [];
    return (data.monthly ?? [])
      .filter((m) => m.Month && m.Month !== "TOTAL")
      .map((m) => ({
        label: fmtMonth(m.Month),
        profit: parseMoney(m["Total Gross Profit"]),
      }));
  }, [data]);

  const topProfit = useMemo(() => {
    if (!data) return [];
    return [...(data.sold ?? [])]
      .map((s) => ({
        model: s["Make & Model"] || "—",
        plate: s["Number Plate reference"] || "",
        profit: parseMoney(s["Total Profit"]),
      }))
      .filter((x) => x.profit > 0)
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 7);
  }, [data]);

  const daysList = useMemo(() => {
    if (!data) return [];
    const now = new Date();
    return (data.stock ?? [])
      .filter((s) => {
        const status = (s.Status ?? "").toLowerCase();
        return !status.includes("sold");
      })
      .map((s) => {
        const d = parseSheetDate(s["Date Aquired"]);
        return {
          model: s["Make & Model"] || "—",
          plate: s["Plate Number"] || "",
          days: daysBetween(d, now) ?? 0,
          status: s.Status || "—",
        };
      })
      .sort((a, b) => b.days - a.days)
      .slice(0, 10);
  }, [data]);

  const maxProfit = Math.max(1, ...chartData.map((c) => c.profit));
  const dateStr = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  if (err) {
    return (
      <div className="page">
        <div className="alert alt-r">Error loading dashboard: {err}</div>
      </div>
    );
  }

  if (!data || !stats) {
    return (
      <div className="page">
        <div style={{ color: "var(--text3)" }}>Loading dashboard…</div>
      </div>
    );
  }

  return (
    <div className="page">
      <div style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 12 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-.5px" }}>
            SA Motors (TRIAL TASK)
          </div>
          <div style={{ fontSize: 11.5, color: "var(--text3)" }}>{dateStr}</div>
        </div>
      </div>

      {stats.over60 > 0 && (
        <div className="alert alt-a" style={{ marginBottom: 12 }}>
          ⏰ {stats.over60} vehicle{stats.over60 === 1 ? "" : "s"} over 60 days in stock — review pricing or listing.
        </div>
      )}

      <div className="g5" style={{ marginBottom: 13 }}>
        <div className="stat red">
          <div className="sl">In Stock</div>
          <div className="sv">{stats.inStock}</div>
          <div className="ss">Live inventory</div>
        </div>
        <div className="stat green">
          <div className="sl">Monthly Profit</div>
          <div className="sv">{fmtGBP0(stats.monthlyProfit)}</div>
          <div className="ss">{stats.lastMonthLabel}</div>
        </div>
        <div className="stat amber">
          <div className="sl">60+ Days</div>
          <div className="sv">{stats.over60}</div>
          <div className="ss">Aging stock</div>
        </div>
        <div className="stat blue">
          <div className="sl">All-Time Profit</div>
          <div className="sv">{fmtGBP0(stats.allTimeProfit)}</div>
          <div className="ss">Gross, since inception</div>
        </div>
        <div className="stat purple">
          <div className="sl">Cars Sold</div>
          <div className="sv">{stats.carsSoldTotal}</div>
          <div className="ss">Total units</div>
        </div>
      </div>

      <div className="g2" style={{ marginBottom: 13 }}>
        <div className="card">
          <div className="ch">
            <div className="ct">Monthly Gross Profit</div>
          </div>
          <div className="chart-wrap">
            {chartData.map((c, i) => {
              const h = Math.max(3, (c.profit / maxProfit) * 100);
              const color = c.profit > 0 ? "var(--green)" : c.profit < 0 ? "var(--red)" : "var(--s3)";
              return (
                <div className="bc2" key={i} title={`${c.label}: ${fmtGBP0(c.profit)}`}>
                  <div className="bar" style={{ height: `${h}px`, background: color }} />
                  <div className="blbl">{c.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <div className="ch">
            <div className="ct">Quick Actions</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
            <button className="btn btn-green" style={{ padding: 12, flexDirection: "column", gap: 5, fontSize: 12, justifyContent: "center" }}>
              🔑<br /><strong>Sell a Car</strong>
            </button>
            <button className="btn btn-amber" style={{ padding: 12, flexDirection: "column", gap: 5, fontSize: 12, justifyContent: "center" }}>
              📷<br /><strong>Scan Receipt</strong>
            </button>
            <button className="btn btn-b" style={{ padding: 12, flexDirection: "column", gap: 5, fontSize: 12, justifyContent: "center" }}>
              📅<br /><strong>Book Viewing</strong>
            </button>
            <button className="btn btn-g" style={{ padding: 12, flexDirection: "column", gap: 5, fontSize: 12, justifyContent: "center" }}>
              🏦<br /><strong>Banking</strong>
            </button>
          </div>
        </div>
      </div>

      <div className="g2" style={{ marginBottom: 13 }}>
        <div className="card">
          <div className="ch">
            <div className="ct">Stock — Days in Stock</div>
          </div>
          <div style={{ maxHeight: 240, overflowY: "auto" }}>
            {daysList.length === 0 ? (
              <div style={{ color: "var(--text3)", fontSize: 12 }}>No live stock.</div>
            ) : (
              daysList.map((v, i) => {
                const cls = v.days > 60 ? "dw" : v.days > 30 ? "da" : "dg";
                return (
                  <div className="li" key={i}>
                    <div className="lc">
                      <div className="lt">{v.model}</div>
                      <div className="lm">
                        <span className="mono" style={{ color: "var(--blue2)" }}>{v.plate}</span> · {v.status}
                      </div>
                    </div>
                    <div className={cls} style={{ fontSize: 13 }}>{v.days}d</div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="card">
          <div className="ch">
            <div className="ct">Top Profit Cars</div>
          </div>
          {topProfit.length === 0 ? (
            <div style={{ color: "var(--text3)", fontSize: 12 }}>No profit data yet.</div>
          ) : (
            topProfit.map((p, i) => {
              const pct = Math.round((p.profit / (topProfit[0]?.profit || 1)) * 100);
              return (
                <div className="pbar" key={i}>
                  <div style={{ flex: 3, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{p.model}</div>
                    <div className="mono" style={{ fontSize: 10, color: "var(--text3)" }}>{p.plate}</div>
                  </div>
                  <div className="ptrack">
                    <div className="pfill" style={{ width: `${pct}%`, background: "var(--green)" }} />
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--green)", minWidth: 68, textAlign: "right" }}>
                    {fmtGBP0(p.profit)}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="aip">
        <div className="ailabel">✨ AI Snapshot</div>
        <div className="aitext">
          {stats.inStock} live vehicles in stock, {stats.over60} aged over 60 days. Latest month
          ({stats.lastMonthLabel}) gross profit {fmtGBP0(stats.monthlyProfit)}. All-time
          gross profit sits at {fmtGBP0(stats.allTimeProfit)} across {stats.carsSoldTotal} units sold.
        </div>
      </div>
    </div>
  );
}
