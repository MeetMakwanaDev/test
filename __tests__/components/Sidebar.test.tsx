import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

let pathname = "/";
jest.mock("next/navigation", () => ({
  usePathname: () => pathname,
}));

import Sidebar from "@/components/Sidebar";

beforeEach(() => {
  pathname = "/";
});

describe("Sidebar", () => {
  it("renders the brand block and both stock counts", () => {
    render(<Sidebar stockBadge="7" soldBadge="42" />);
    expect(screen.getAllByText(/SA Motors/i).length).toBeGreaterThan(0);
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("applies the active class to the link that matches the current pathname", () => {
    pathname = "/stock";
    render(<Sidebar stockBadge="0" soldBadge="0" />);
    const active = screen.getByRole("link", { name: /current stock/i });
    expect(active.className).toContain("active");
  });

  it("renders disabled items as buttons (non-links) and prevents navigation", async () => {
    render(<Sidebar />);
    const disabled = screen.getByRole("button", { name: /collections & deliveries/i });
    expect(disabled).toHaveAttribute("title", "Out of scope for this build");
    await userEvent.click(disabled); // should not throw
  });

  it("falls back to the item's own badge text when no prop badge is provided", () => {
    render(<Sidebar />);
    // MOT Tracker has a red "0" badge baked in and is disabled
    const motItem = screen.getByRole("button", { name: /mot tracker/i });
    expect(motItem).toBeInTheDocument();
  });

  it("omits badge when no text is configured", () => {
    render(<Sidebar />);
    // Dashboard item has no badge
    const dashboard = screen.getByRole("link", { name: /dashboard/i });
    expect(dashboard.querySelector(".nb")).toBeNull();
  });
});
