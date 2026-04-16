"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Props accepted by {@link QuickAddModal}. */
type Props = {
  open: boolean;
  onClose: () => void;
  onAddVehicle: () => void;
};

/** One tile in the Quick Add grid. */
type Tile = {
  icon: string;
  label: string;
  variant: "default" | "green" | "amber" | "blue";
  iconColor?: string;
  enabled?: boolean;
  action?: () => void;
};

/**
 * Quick Add modal surfaced from the topbar "+ Add" button.
 *
 * Presents a grid of shortcut tiles. "Add Vehicle" and "Sell a Car" are
 * enabled; the rest are placeholders for future flows.
 * Closes on Escape, backdrop click, or the ✕ button, and locks page scroll while open.
 * @param {Props} props - Props.
 * @param {boolean} props.open - Whether the modal is visible.
 * @param {() => void} props.onClose - Called when the user dismisses the modal.
 * @param {() => void} props.onAddVehicle - Called when the user picks "Add Vehicle".
 * @returns {JSX.Element | null} The modal, or null when `open` is false.
 */
export default function QuickAddModal({ open, onClose, onAddVehicle }: Props) {
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const tiles: Tile[] = [
    { icon: "🚗", label: "Add Vehicle", variant: "default", iconColor: "var(--accent2)", enabled: true, action: onAddVehicle },
    { icon: "🔑", label: "Sell a Car", variant: "green", enabled: true, action: () => { onClose(); router.push("/sell"); } },
    { icon: "📸", label: "Scan Receipt", variant: "amber" },
    { icon: "📅", label: "Book Viewing", variant: "blue" },
    { icon: "⚠️", label: "Log Fine", variant: "default", iconColor: "var(--amber)" },
    { icon: "💰", label: "Log Cost", variant: "default", iconColor: "var(--purple)" },
  ];

  return (
    <div
      className="moverlay open"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="mh">
          <div className="mt">Quick Add</div>
          <button className="mclose" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="qa-grid">
          {tiles.map((t) => (
            <button
              key={t.label}
              type="button"
              className={`qa-btn qa-${t.variant}`}
              disabled={!t.enabled}
              onClick={t.action}
            >
              <span
                className="qa-icon"
                style={t.iconColor ? { color: t.iconColor } : undefined}
              >
                {t.icon}
              </span>
              <span className="qa-label">{t.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
