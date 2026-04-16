"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

/**
 * Single entry in the sidebar navigation.
 * `badge.color` maps to the CSS badge classes: r=red, g=green, a=amber, b=blue.
 * `disabled` routes render as non-navigable buttons ("out of scope" placeholders).
 */
type Item = {
  href: string;
  label: string;
  icon: ReactNode;
  badge?: { text: string; color: "r" | "g" | "a" | "b" };
  disabled?: boolean;
};

/** Grouping for a labelled block of sidebar items (e.g. "Stock", "Finance"). */
type Section = { label: string; items: Item[] };

const ICONS: Record<string, ReactNode> = {
  grid: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  box: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d="M3 7l9-4 9 4v10l-9 4-9-4V7z" />
    </svg>
  ),
  check: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  deliver: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d="M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h11a2 2 0 012 2v3" />
      <rect x="9" y="11" width="14" height="10" rx="2" />
    </svg>
  ),
  service: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d="M9 12h6M9 16h6M9 8h6M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
    </svg>
  ),
  clock: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  ),
  shield: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  calendar: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  ),
  tasks: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d="M9 12l2 2 4-4" />
      <rect x="3" y="4" width="18" height="18" rx="2" />
    </svg>
  ),
  alert: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  pound: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
    </svg>
  ),
  doc: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  ),
  bank: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
    </svg>
  ),
  person: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="8" r="4" />
      <path d="M20 21a8 8 0 10-16 0" />
    </svg>
  ),
  people: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  ),
  percent: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d="M9 14l6-6M9 9h.01M15 15h.01M22 12A10 10 0 112 12a10 10 0 0120 0z" />
    </svg>
  ),
  chart: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d="M18 20V10M12 20V4M6 20v-6" />
    </svg>
  ),
  globe: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
    </svg>
  ),
  ig: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
    </svg>
  ),
};

const SECTIONS: Section[] = [
  {
    label: "Overview",
    items: [{ href: "/", label: "Dashboard", icon: ICONS.grid }],
  },
  {
    label: "Stock",
    items: [
      {
        href: "/stock",
        label: "Current Stock",
        icon: ICONS.box,
        badge: { text: "0", color: "g" },
      },
      {
        href: "/sold",
        label: "Sold History",
        icon: ICONS.check,
        badge: { text: "0", color: "g" },
      },
      {
        href: "#collections",
        label: "Collections & Deliveries",
        icon: ICONS.deliver,
        disabled: true,
      },
      {
        href: "#service",
        label: "Service History",
        icon: ICONS.service,
        disabled: true,
      },
      {
        href: "#mot",
        label: "MOT Tracker",
        icon: ICONS.clock,
        disabled: true,
        badge: { text: "0", color: "r" },
      },
      {
        href: "#insurance",
        label: "Insurance & SORN",
        icon: ICONS.shield,
        disabled: true,
      },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        href: "#viewings",
        label: "Viewings",
        icon: ICONS.calendar,
        disabled: true,
        badge: { text: "0", color: "b" },
      },
      {
        href: "/sell",
        label: "Sell a Car 🔑",
        icon: ICONS.check,
      },
      {
        href: "#tasks",
        label: "Tasks",
        icon: ICONS.tasks,
        disabled: true,
        badge: { text: "4", color: "r" },
      },
      {
        href: "#fines",
        label: "Fines & Penalties",
        icon: ICONS.alert,
        disabled: true,
        badge: { text: "0", color: "a" },
      },
    ],
  },
  {
    label: "Finance",
    items: [
      {
        href: "#expenses",
        label: "Finance Log",
        icon: ICONS.pound,
        disabled: true,
      },
      {
        href: "#receipts",
        label: "Receipts & AI Scan",
        icon: ICONS.doc,
        disabled: true,
        badge: { text: "NEW", color: "a" },
      },
      {
        href: "#banking",
        label: "Routes & Planning",
        icon: ICONS.bank,
        disabled: true,
      },
      {
        href: "#invoices",
        label: "Investor Invoices",
        icon: ICONS.doc,
        disabled: true,
      },
      {
        href: "#investors",
        label: "Investor Ledger",
        icon: ICONS.person,
        disabled: true,
      },
      {
        href: "#wages",
        label: "Staff & Wages",
        icon: ICONS.people,
        disabled: true,
      },
      {
        href: "#vat",
        label: "VAT Tracker",
        icon: ICONS.percent,
        disabled: true,
      },
    ],
  },
  {
    label: "Intelligence",
    items: [
      {
        href: "#reports",
        label: "Reports & Analytics",
        icon: ICONS.chart,
        disabled: true,
      },
    ],
  },
  {
    label: "Listings & Media",
    items: [
      {
        href: "#autotrader",
        label: "Auto Trader",
        icon: ICONS.globe,
        disabled: true,
        badge: { text: "0", color: "b" },
      },
      {
        href: "#instagram",
        label: "Instagram",
        icon: ICONS.ig,
        disabled: true,
        badge: { text: "0", color: "a" },
      },
    ],
  },
];

/**
 * Left-hand sidebar navigation.
 *
 * Renders a fixed logo block, grouped navigation sections, and a footer card.
 * Live badge counts for `/stock` and `/sold` are injected from props so the
 * parent ({@link Shell}) can fetch them once and share across renders.
 * @param {{ stockBadge?: string; soldBadge?: string }} props - Props.
 * @param {string} [props.stockBadge] - Count displayed next to "Current Stock".
 * @param {string} [props.soldBadge] - Count displayed next to "Sold History".
 * @returns {JSX.Element} The rendered sidebar.
 */
export default function Sidebar({
  stockBadge,
  soldBadge,
}: {
  stockBadge?: string;
  soldBadge?: string;
}) {
  const pathname = usePathname();

  /**
   * Returns true when `href` matches the active pathname (exactly at "/",
   * otherwise as a prefix). Hash-only links always return false.
   * @param {string} href - Nav item href.
   * @returns {boolean} Whether this item should render as active.
   */
  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    if (href.startsWith("#")) return false;
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <aside className="sidebar" id="sidebar">
      <div className="slogo">
        <div className="slogo-txt">
          SA Motors (TRIAL TASK)
          <br />
          DealerOS v4
        </div>
      </div>
      <nav className="snav">
        {SECTIONS.map((section) => (
          <div className="sg" key={section.label}>
            <div className="sg-lbl">{section.label}</div>
            {section.items.map((it) => {
              const active = isActive(it.href);
              const badgeText =
                it.href === "/stock"
                  ? (stockBadge ?? it.badge?.text)
                  : it.href === "/sold"
                    ? (soldBadge ?? it.badge?.text)
                    : it.badge?.text;

              const content = (
                <>
                  {it.icon}
                  {it.label}
                  {badgeText !== undefined && badgeText !== "" && it.badge && (
                    <span className={`nb ${it.badge.color}`}>{badgeText}</span>
                  )}
                </>
              );

              if (it.disabled) {
                return (
                  <button
                    key={it.label}
                    type="button"
                    className="ni"
                    style={{ opacity: 0.55, cursor: "not-allowed" }}
                    onClick={(e) => e.preventDefault()}
                    title="Out of scope for this build"
                  >
                    {content}
                  </button>
                );
              }

              return (
                <Link
                  key={it.label}
                  href={it.href}
                  className={`ni${active ? " active" : ""}`}
                >
                  {content}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="sfooter">
        <div className="user-row">
          <div className="av">SA</div>
          <div>
            <div className="uname">SA Motors (TRIAL TASK) London</div>
            <div className="urole">Owner · Full Access</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
