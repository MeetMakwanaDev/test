"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/** Pathname → display title map for the topbar heading. */
const TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/stock": "Current Stock",
  "/sold": "Sold History",
  "/sell": "Sell a Car",
};

/**
 * Persistent top navigation bar.
 *
 * Shows the current page title, a debounced-on-keystroke search input
 * (clears when the user navigates to a new route), and a Quick-Add button.
 * @param {{ onSearch?: (q: string) => void; onAdd?: () => void }} props - Props.
 * @param {(q: string) => void} [props.onSearch] - Invoked with the search query on every keystroke and on route change.
 * @param {() => void} [props.onAdd] - Invoked when the "+ Add" button is clicked.
 * @returns {JSX.Element} The rendered topbar.
 */
export default function Topbar({
  onSearch,
  onAdd,
}: {
  onSearch?: (q: string) => void;
  onAdd?: () => void;
}) {
  const pathname = usePathname();
  const [q, setQ] = useState("");

  useEffect(() => {
    setQ("");
    onSearch?.("");
  }, [pathname, onSearch]);

  const title = TITLES[pathname] ?? "DealerOS";

  return (
    <div className="topbar">
      <button className="menu-btn" aria-label="Menu">
        <svg width="19" height="19" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M3 12h18M3 6h18M3 18h18" />
        </svg>
      </button>
      <div className="tb-title">{title}</div>
      <div className="tb-right">
        <div className="sbar">
          <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search plate or model..."
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              onSearch?.(e.target.value);
            }}
          />
        </div>
        <button className="btn btn-p btn-sm" type="button" onClick={onAdd}>
          + Add
        </button>
      </div>
    </div>
  );
}
