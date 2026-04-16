"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import QuickAddModal from "./QuickAddModal";
import AddVehicleModal from "./AddVehicleModal";

/**
 * Shared context surface published by {@link Shell}.
 * Consumers get the current search query, a setter, and a function
 * to programmatically open the "Add Vehicle" modal.
 */
type ShellCtx = {
  query: string;
  setQuery: (q: string) => void;
  openAddVehicle: () => void;
};
const Ctx = createContext<ShellCtx>({
  query: "",
  setQuery: () => {},
  openAddVehicle: () => {},
});

/**
 * Hook for page-level components to read the shared search query and
 * trigger the Add Vehicle modal from anywhere inside {@link Shell}.
 * @returns {ShellCtx} The current shell context value.
 */
export function useSearch() {
  return useContext(Ctx);
}

/**
 * Top-level app chrome that wraps every route with the sidebar, topbar,
 * and the Quick Add / Add Vehicle modals.
 *
 * Also owns the shared search query and the sidebar badge counts
 * (fetched from `/api/counts` whenever the pathname changes) and
 * fires a `vehicle-added` window event after a successful add so
 * other pages can refresh.
 * @param {{ children: ReactNode }} props - Props object.
 * @param {ReactNode} props.children - Page content rendered inside the main column.
 * @returns {JSX.Element} The rendered layout tree.
 */
export default function Shell({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState("");
  const [stockBadge, setStockBadge] = useState<string | undefined>(undefined);
  const [soldBadge, setSoldBadge] = useState<string | undefined>(undefined);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [addVehicleOpen, setAddVehicleOpen] = useState(false);
  const pathname = usePathname();

  /**
   * Fetches the latest stock/sold badge counts from `/api/counts`
   * and updates sidebar badges. Called on pathname change and
   * whenever the `vehicle-added` window event fires.
   */
  const refreshCounts = useCallback(() => {
    fetch("/api/counts", { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { stock?: number; sold?: number; error?: string }) => {
        if (j.error) return;
        if (typeof j.stock === "number") setStockBadge(String(j.stock));
        if (typeof j.sold === "number") setSoldBadge(String(j.sold));
      })
      .catch(() => {});
  }, []);

  // Refresh counts on route change
  useEffect(() => {
    refreshCounts();
  }, [pathname, refreshCounts]);

  // Refresh counts whenever a vehicle is added or sold
  useEffect(() => {
    const handler = () => refreshCounts();
    window.addEventListener("vehicle-added", handler);
    return () => window.removeEventListener("vehicle-added", handler);
  }, [refreshCounts]);

  const openAddVehicle = useCallback(() => setAddVehicleOpen(true), []);

  return (
    <Ctx.Provider value={{ query, setQuery, openAddVehicle }}>
      <Sidebar stockBadge={stockBadge} soldBadge={soldBadge} />
      <main className="main">
        <Topbar onSearch={setQuery} onAdd={() => setQuickAddOpen(true)} />
        {children}
      </main>
      <QuickAddModal
        open={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        onAddVehicle={() => {
          setQuickAddOpen(false);
          setAddVehicleOpen(true);
        }}
      />
      <AddVehicleModal
        open={addVehicleOpen}
        onClose={() => setAddVehicleOpen(false)}
        onAdded={() => {
          window.dispatchEvent(new CustomEvent("vehicle-added"));
        }}
      />
    </Ctx.Provider>
  );
}
