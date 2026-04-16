"use client";

import { useState, useEffect } from "react";

/** Props accepted by {@link AddVehicleModal}. */
type Props = {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
};

/** Dropdown options for the "Source" field (matches values used in the sheet). */
const SOURCES = [
  "Copart",
  "Motorway",
  "Carwow",
  "Facebook",
  "Private",
  "Part Exchange",
  "BCA",
];
/** Dropdown options for the "Investor/SA" field. */
const INVESTORS = [
  "MP",
  "James",
  "Daniel",
  "Joseph",
  "Jeff",
  "Adam",
  "Anthony",
  "Leonardo",
  "SA",
];

/** Default form state used on first render and after a successful submit. */
const initial = {
  plate: "",
  model: "",
  price: "",
  source: "Copart",
  investor: "MP",
  recon: "",
  notes: "",
};

/**
 * Modal form for adding a new vehicle to Current Stock.
 *
 * Collects plate, make/model, prices, source, investor, and free-text notes,
 * derives total cost and today's month/date, then POSTs to `/api/stock`.
 * Closes on Escape/backdrop/✕, locks page scroll while open, and invokes
 * `onAdded` after a successful save so callers can refresh their data.
 * @param {Props} props - Props.
 * @param {boolean} props.open - Whether the modal is visible.
 * @param {() => void} props.onClose - Called when the user dismisses the modal.
 * @param {() => void} props.onAdded - Called after the new vehicle is successfully persisted.
 * @returns {JSX.Element | null} The modal, or null when `open` is false.
 */
export default function AddVehicleModal({ open, onClose, onAdded }: Props) {
  const [form, setForm] = useState(initial);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setForm(initial);
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  /**
   * Immutably updates a single form field by key.
   * @template K
   * @param {K} k - Field name (a key of {@link initial}).
   * @param {string} v - New string value.
   * @returns {void}
   */
  const update = <K extends keyof typeof initial>(k: K, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  /**
   * Validates required fields, builds the Stock-row payload, and POSTs it
   * to `/api/stock`. On success, notifies the parent via `onAdded` and closes
   * the modal; on failure, surfaces the error message inline.
   * @returns {Promise<void>} Resolves once the network round-trip finishes.
   */
  const submit = async () => {
    setErr(null);
    if (!form.plate.trim()) return setErr("Reg plate is required.");
    if (!form.model.trim()) return setErr("Make & Model is required.");

    setSubmitting(true);
    const today = new Date();
    const iso = today.toISOString().slice(0, 10);
    const monthIso = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1),
    )
      .toISOString()
      .slice(0, 10);
    const price = parseFloat(form.price) || 0;
    const recon = parseFloat(form.recon) || 0;
    const total = price + recon;
    const isPx = form.source === "Part Exchange";

    const body = {
      Month: monthIso,
      "Date Aquired": iso,
      "Plate Number": form.plate.trim().toUpperCase(),
      "Make & Model": form.model.trim(),
      "Investor/SA": form.investor,
      Source: form.source,
      "PX Value": isPx ? String(price) : "",
      Price: price ? String(price) : "",
      "Reconditioning costs": recon ? String(recon) : "",
      "Total Cost": total ? String(total) : "",
      Sold: "",
      Profit: "",
      Status: form.notes.trim(),
    };

    try {
      const res = await fetch("/api/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json();
      if (j.error) {
        setErr(j.error);
        setSubmitting(false);
        setForm(initial);
        return;
      }
      onAdded();
      onClose();
      setForm(initial);
    } catch (e) {
      setErr((e as Error).message);
      setSubmitting(false);
    } finally {
      setForm(initial);
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="moverlay open"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal">
        <div className="mh">
          <div className="mt">Add Vehicle</div>
          <button className="mclose" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {err && <div className="alert alt-r">{err}</div>}

        <div className="g2">
          <div className="fg">
            <label className="fl">Reg Plate</label>
            <input
              className="fi fi-reg"
              placeholder="AB24 XYZ"
              value={form.plate}
              onChange={(e) => update("plate", e.target.value.toUpperCase())}
            />
          </div>
          <div className="fg">
            <label className="fl">Make &amp; Model</label>
            <input
              className="fi"
              placeholder="e.g. VW Golf GTI"
              value={form.model}
              onChange={(e) => update("model", e.target.value)}
            />
          </div>
        </div>

        <div className="g2">
          <div className="fg">
            <label className="fl">Purchase Price (£)</label>
            <input
              className="fi"
              type="number"
              placeholder="0.00"
              value={form.price}
              onChange={(e) => update("price", e.target.value)}
            />
          </div>
          <div className="fg">
            <label className="fl">Source</label>
            <select
              className="fs"
              value={form.source}
              onChange={(e) => update("source", e.target.value)}
            >
              {SOURCES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="g2">
          <div className="fg">
            <label className="fl">Investor</label>
            <select
              className="fs"
              value={form.investor}
              onChange={(e) => update("investor", e.target.value)}
            >
              {INVESTORS.map((i) => (
                <option key={i}>{i}</option>
              ))}
            </select>
          </div>
          <div className="fg">
            <label className="fl">Recon Cost (£)</label>
            <input
              className="fi"
              type="number"
              placeholder="0.00"
              value={form.recon}
              onChange={(e) => update("recon", e.target.value)}
            />
          </div>
        </div>

        <div className="fg">
          <label className="fl">Notes / Status</label>
          <textarea
            className="fta"
            placeholder="Prep notes, status..."
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
          />
        </div>

        <div style={{ display: "flex", gap: 7, justifyContent: "flex-end" }}>
          <button
            className="btn btn-g"
            onClick={() => {
              setForm(initial);
              setSubmitting(false);
              onClose();
            }}
            disabled={submitting}
          >
            Cancel
          </button>
          <button className="btn btn-p" onClick={submit} disabled={submitting}>
            {submitting ? "Adding…" : "Add to Stock"}
          </button>
        </div>
      </div>
    </div>
  );
}
