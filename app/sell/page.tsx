"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { StockRow } from "@/lib/types";
import {
  fmtGBP,
  fmtGBP0,
  parseMoney,
  parseSheetDate,
  daysBetween,
  fmtDate,
} from "@/lib/format";

/** Investor names available in the sale form dropdown. */
const INVESTORS = ["MP", "James", "Daniel", "Joseph", "Jeff", "Adam", "Anthony", "Leonardo", "SA"];

/** Investor profit-share percentage options for the sale form. */
const SHARE_OPTIONS = [
  { label: "30%", value: 30 },
  { label: "40%", value: 40 },
  { label: "50%", value: 50 },
  { label: "25%", value: 25 },
  { label: "20%", value: 20 },
  { label: "0% (SA Only)", value: 0 },
];

/**
 * Returns today's date as an ISO string (YYYY-MM-DD).
 * @returns {string} Today in ISO format.
 */
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Sell a Car page — three-step vehicle sale flow.
 *
 * Step 1: Search for a vehicle by registration plate from live stock.
 * Step 2: Enter sale details (price, investor, share %, date) with a live
 *         profit calculation panel.
 * Step 3: Generate an investor invoice, which marks the stock row as "Sold"
 *         and appends a new row to the Sold Stock tab via `POST /api/sell`.
 *         Fires a `vehicle-added` window event so sidebar counts and stock
 *         pages refresh immediately.
 * @returns {JSX.Element} Rendered sell-a-car page.
 */
export default function SellCarPage() {
  // Step 1 — search
  const [reg, setReg] = useState("");
  const [vehicle, setVehicle] = useState<StockRow | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState("");

  // Step 2 — sale details
  const [salePrice, setSalePrice] = useState("");
  const [investor, setInvestor] = useState("MP");
  const [sharePct, setSharePct] = useState(30);
  const [saleDate, setSaleDate] = useState(todayISO);

  // Step 3 — invoice
  const [invoiceHtml, setInvoiceHtml] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState("");

  const invoiceRef = useRef<HTMLDivElement>(null);

  /* ── Derived values ── */
  const totalCost = vehicle ? parseMoney(vehicle["Total Cost"]) : 0;
  const salePriceNum = parseFloat(salePrice) || 0;
  const grossProfit = salePriceNum - totalCost;
  const investorProfit = grossProfit * sharePct / 100;
  const saProfit = grossProfit - investorProfit;
  const daysInStock = useMemo(() => {
    if (!vehicle) return 0;
    const d = parseSheetDate(vehicle["Date Aquired"]);
    return daysBetween(d, new Date()) ?? 0;
  }, [vehicle]);

  /* ── Step 1: Find vehicle ── */
  const searchVehicle = useCallback(async () => {
    const q = reg.trim().toUpperCase();
    if (q.length < 3) return;
    setSearching(true);
    setSearchErr("");
    setVehicle(null);
    setInvoiceHtml("");
    try {
      const res = await fetch("/api/stock", { cache: "no-store" });
      const j = await res.json();
      if (j.error) { setSearchErr(j.error); return; }
      const rows: StockRow[] = j.data ?? [];
      const match = rows.find((r) => {
        const plate = (r["Plate Number"] ?? "").replace(/\s/g, "").toUpperCase();
        const search = q.replace(/\s/g, "");
        return plate === search;
      });
      if (!match) {
        setSearchErr("Vehicle not found in current stock.");
        return;
      }
      if ((match.Status ?? "").toLowerCase().includes("sold")) {
        setSearchErr("This vehicle is already marked as sold.");
        return;
      }
      setVehicle(match);
      setInvestor(match["Investor/SA"] || "MP");
      setSaleDate(todayISO());
      setSalePrice("");
    } catch (e) {
      setSearchErr((e as Error).message);
    } finally {
      setSearching(false);
    }
  }, [reg]);

  /* ── Step 3: Generate invoice & move stock→sold ── */
  const generateInvoice = useCallback(async () => {
    if (!vehicle) return;
    if (!salePriceNum) { setSubmitErr("Enter the sale price."); return; }
    setSubmitting(true);
    setSubmitErr("");

    const plate = vehicle["Plate Number"];
    const model = vehicle["Make & Model"];
    const invNum = plate.replace(/\s/g, "") + "-" + Date.now().toString(36).toUpperCase();
    const purchasePrice = parseMoney(vehicle.Price) || totalCost;
    const reconCost = parseMoney(vehicle["Reconditioning costs"]);
    const monthIso = new Date(Date.UTC(
      new Date(saleDate).getUTCFullYear(),
      new Date(saleDate).getUTCMonth(), 1,
    )).toISOString().slice(0, 10);

    // Build printable invoice HTML
    let costRows = `<tr><td>Car Price</td><td style="text-align:right">${fmtGBP(purchasePrice)}</td></tr>`;
    if (reconCost > 0) {
      costRows += `<tr><td>Reconditioning &amp; Fees</td><td style="text-align:right">${fmtGBP(reconCost)}</td></tr>`;
    }

    const html = `<div class="inv-wrap"><div class="inv-top"><div><div style="font-size:18px;font-weight:800;color:#e31c1c;">SA Motors (TRIAL TASK)</div><div class="inv-addr-text">Company Registration Number 15699982<br>Suite RA01<br>64 Nile Street<br>N1 7SR<br>London, United Kingdom<br>07440 603950</div></div><div><div class="inv-big-title">INVOICE</div><div class="inv-meta-block"><strong>DATE:</strong>&nbsp;&nbsp;&nbsp;&nbsp;${fmtDate(saleDate)}<br><strong>INVOICE #</strong>&nbsp;&nbsp;${invNum}<br><strong>FOR:</strong>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${model} - ${plate}</div></div></div><table class="inv-table"><thead><tr><th>VEHICLE COST BREAKDOWN</th><th style="text-align:right">AMOUNT</th></tr></thead><tbody>${costRows}<tr class="row-total"><td><strong>TOTAL EXPENSES</strong></td><td style="text-align:right"><strong>${fmtGBP(totalCost)}</strong></td></tr></tbody></table><table class="inv-table"><thead><tr><th>SALE</th><th style="text-align:right">AMOUNT</th></tr></thead><tbody><tr><td>Purchase Price (Total Cost In)</td><td style="text-align:right">${fmtGBP(totalCost)}</td></tr><tr><td>Sale Price</td><td style="text-align:right">${fmtGBP(salePriceNum)}</td></tr><tr class="row-profit"><td><strong>TOTAL PROFIT</strong></td><td style="text-align:right"><strong>${fmtGBP(grossProfit)}</strong></td></tr><tr class="row-investor"><td><strong>INVESTOR ${sharePct}% PROFIT (${investor})</strong></td><td style="text-align:right"><strong>${fmtGBP(investorProfit)}</strong></td></tr></tbody></table><div class="inv-footer">All profits have been sent to the investor&apos;s bank account and the remaining capital has been added to their investing balance<br>If you have any questions concerning this invoice, Contact SA Motors (TRIAL TASK), 07440 603950, Admin@MPMotorsLondon.co.uk<br><br><strong>THANK YOU FOR YOUR BUSINESS!</strong></div></div>`;

    // POST to /api/sell — moves stock→sold
    try {
      const body = {
        stockRowNumber: vehicle.rowNumber,
        Month: monthIso,
        "Date Aquired": vehicle["Date Aquired"],
        "Number Plate reference": plate,
        "Make & Model": model,
        "SA/Investor Name": investor,
        "Total Cost": String(totalCost),
        Sold: String(salePriceNum),
        "Part Ex": vehicle["PX Value"] || "",
        "SA/Investor Profit Share": `${sharePct}%`,
        "Total Profit": String(grossProfit),
        "Investor Profit": String(investorProfit),
        "SA Profit": String(saProfit),
        "Date Listed": vehicle["Date Aquired"],
        "Date Sold": saleDate,
        "Days to Sell": String(daysInStock),
        Platfrom: vehicle.Source || "",
        "Invoice Number": invNum,
        "Customer Name": "",
        "Contact info": "",
        Warranty: "",
        "AutoGuard Number": "",
      };
      const res = await fetch("/api/sell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json();
      if (j.error) { setSubmitErr(j.error); setSubmitting(false); return; }

      setInvoiceHtml(html);
      window.dispatchEvent(new CustomEvent("vehicle-added"));
      setTimeout(() => invoiceRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (e) {
      setSubmitErr((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }, [vehicle, salePriceNum, totalCost, grossProfit, investorProfit, saProfit, investor, sharePct, saleDate, daysInStock]);

  /* ── Print ── */
  const printInvoice = useCallback(() => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>SA Motors Invoice</title><style>body{font-family:Arial,sans-serif;margin:20px;background:#fff;}.inv-wrap{max-width:800px;margin:0 auto;font-size:12px;color:#111;line-height:1.5;}.inv-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:22px;}.inv-big-title{font-size:38px;font-weight:200;color:#333;letter-spacing:3px;margin-bottom:6px;}.inv-addr-text{font-size:10.5px;color:#444;line-height:1.8;margin-top:6px;}.inv-meta-block{text-align:right;font-size:11.5px;line-height:2;}.inv-table{width:100%;border-collapse:collapse;margin-bottom:13px;}th{background:#f0f0f0;padding:8px 11px;font-size:10.5px;font-weight:700;text-transform:uppercase;border:1px solid #ccc;text-align:left;}td{padding:7px 11px;border:1px solid #ddd;font-size:11.5px;color:#222;}.row-total td{background:#e8e8e8;font-weight:800;font-size:12.5px;}.row-profit td{background:#111;color:#fff;font-weight:800;font-size:13px;}.row-investor td{background:#1a3a1a;color:#4ade80;font-weight:800;font-size:12.5px;}.inv-footer{text-align:center;font-size:10px;color:#888;margin-top:14px;border-top:1px solid #ddd;padding-top:11px;line-height:1.8;}@media print{body{margin:0;}}</style></head><body>${invoiceHtml}</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 500);
  }, [invoiceHtml]);

  return (
    <div className="page">
      <div className="sh">
        <div className="stitle">🔑 Sell a Car — Generate Investor Invoice</div>
      </div>

      {/* Quick Guide */}
      <div className="aip">
        <div className="ailabel">🔑 Quick Guide</div>
        <div className="aitext">
          Search reg → confirm details → enter sale price → generate SA Motors (TRIAL TASK)
          invoice. The invoice includes your logo, full cost breakdown, profit calculation,
          and investor share. Print or PDF to send directly to investor.
        </div>
      </div>

      {/* ═══ STEP 1: Find Vehicle ═══ */}
      <div className="card" style={{ marginBottom: 13 }}>
        <div className="ch"><div className="ct">Step 1 — Find Vehicle</div></div>
        <div style={{ display: "flex", gap: 8, marginBottom: 13 }}>
          <input
            className="fi fi-reg"
            placeholder="Enter Reg Plate..."
            style={{ maxWidth: 230, fontSize: 17 }}
            value={reg}
            onChange={(e) => setReg(e.target.value.toUpperCase())}
            onKeyDown={(e) => { if (e.key === "Enter") searchVehicle(); }}
          />
          <button
            className="btn btn-p"
            onClick={searchVehicle}
            disabled={searching}
          >
            {searching ? "..." : "Find"}
          </button>
        </div>

        {searchErr && <div className="alert alt-r">{searchErr}</div>}

        {vehicle && (
          <div>
            {/* Vehicle summary */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 11 }}>
              <div style={{ fontSize: 28 }}>🚗</div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>{vehicle["Make & Model"]}</div>
                <div className="mono" style={{ color: "var(--text3)" }}>{vehicle["Plate Number"]}</div>
              </div>
              <div style={{ marginLeft: "auto", textAlign: "right" }}>
                <div style={{ fontSize: 10, color: "var(--text3)" }}>Total Cost In</div>
                <div style={{ fontSize: 19, fontWeight: 800, color: "var(--amber)" }}>
                  {fmtGBP0(totalCost)}
                </div>
              </div>
            </div>
            {/* Investor / Source / Days */}
            <div className="g3">
              <div>
                <div className="fl">Investor</div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{vehicle["Investor/SA"] || "SA"}</div>
              </div>
              <div>
                <div className="fl">Source</div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{vehicle.Source || "—"}</div>
              </div>
              <div>
                <div className="fl">Days in Stock</div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{daysInStock} days</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══ STEP 2: Sale Details ═══ */}
      {vehicle && !invoiceHtml && (
        <div className="card" style={{ marginBottom: 13 }}>
          <div className="ch"><div className="ct">Step 2 — Sale Details</div></div>
          <div className="g2">
            <div className="fg">
              <label className="fl">Sale Price (£)</label>
              <input
                className="fi"
                type="number"
                placeholder="e.g. 12050"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
              />
            </div>
            <div className="fg">
              <label className="fl">Investor</label>
              <select
                className="fs"
                value={investor}
                onChange={(e) => setInvestor(e.target.value)}
              >
                {INVESTORS.map((i) => <option key={i}>{i}</option>)}
              </select>
            </div>
          </div>
          <div className="g2">
            <div className="fg">
              <label className="fl">Investor Share %</label>
              <select
                className="fs"
                value={sharePct}
                onChange={(e) => setSharePct(parseInt(e.target.value))}
              >
                {SHARE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="fg">
              <label className="fl">Sale Date</label>
              <input
                className="fi"
                type="date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
              />
            </div>
          </div>

          {/* Live Calculation */}
          <div style={{
            background: "var(--s2)",
            border: "1px solid var(--border)",
            borderRadius: "var(--rs)",
            padding: 13,
            marginBottom: 13,
          }}>
            <div className="sl" style={{ marginBottom: 9 }}>Live Calculation</div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 12.5 }}>
              <span style={{ color: "var(--text3)" }}>Sale Price</span>
              <span style={{ fontWeight: 700 }}>{salePriceNum ? fmtGBP(salePriceNum) : "—"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 12.5 }}>
              <span style={{ color: "var(--text3)" }}>Total Cost</span>
              <span style={{ fontWeight: 700, color: "var(--amber)" }}>{fmtGBP(totalCost)}</span>
            </div>
            <div style={{ height: 1, background: "var(--border)", margin: "7px 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 13 }}>
              <span style={{ fontWeight: 700 }}>Gross Profit</span>
              <span style={{
                fontWeight: 800,
                fontSize: 15,
                color: salePriceNum ? (grossProfit >= 0 ? "var(--green)" : "var(--red)") : "var(--text)",
              }}>
                {salePriceNum ? fmtGBP(grossProfit) : "—"}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
              <span style={{ color: "var(--text3)" }}>Investor Share ({sharePct}%)</span>
              <span style={{ fontWeight: 700, color: "var(--purple)" }}>
                {salePriceNum ? fmtGBP(investorProfit) : "—"}
              </span>
            </div>
          </div>

          {submitErr && <div className="alert alt-r" style={{ marginBottom: 10 }}>{submitErr}</div>}

          <button
            className="btn btn-p"
            style={{ width: "100%", padding: 11, fontSize: 14 }}
            onClick={generateInvoice}
            disabled={submitting}
          >
            {submitting ? "Processing..." : "✅ Generate SA Motors (TRIAL TASK) Invoice"}
          </button>
        </div>
      )}

      {/* ═══ STEP 3: Invoice Output ═══ */}
      {invoiceHtml && (
        <div ref={invoiceRef}>
          <div className="alert alt-g" style={{ marginBottom: 13 }}>
            Sale completed — vehicle moved from Current Stock to Sold History.
          </div>
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div className="ch" style={{ padding: "13px 17px", borderBottom: "1px solid var(--border)" }}>
              <div className="ct">SA Motors (TRIAL TASK) Investor Invoice — Ready</div>
              <button className="btn btn-g btn-sm" onClick={printInvoice}>
                🖨️ Print / PDF
              </button>
            </div>
            <div style={{ padding: 14 }}>
              <div dangerouslySetInnerHTML={{ __html: invoiceHtml }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
