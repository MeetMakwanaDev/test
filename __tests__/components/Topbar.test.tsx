import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

let pathname = "/";
jest.mock("next/navigation", () => ({
  usePathname: () => pathname,
}));

import Topbar from "@/components/Topbar";

beforeEach(() => {
  pathname = "/";
});

describe("Topbar", () => {
  it('renders the "Dashboard" title on the root route', () => {
    render(<Topbar />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("maps known pathnames to friendly titles", () => {
    pathname = "/stock";
    render(<Topbar />);
    expect(screen.getByText("Current Stock")).toBeInTheDocument();
  });

  it('falls back to "DealerOS" for unknown paths', () => {
    pathname = "/whatever";
    render(<Topbar />);
    expect(screen.getByText("DealerOS")).toBeInTheDocument();
  });

  it("invokes onSearch on every keystroke", async () => {
    const onSearch = jest.fn();
    render(<Topbar onSearch={onSearch} />);
    const input = screen.getByPlaceholderText("Search plate or model...");
    await userEvent.type(input, "golf");
    // First call during initial effect ("") + 4 keystrokes
    expect(onSearch).toHaveBeenLastCalledWith("golf");
    expect(onSearch.mock.calls.length).toBeGreaterThanOrEqual(5);
  });

  it("invokes onAdd when the + Add button is clicked", async () => {
    const onAdd = jest.fn();
    render(<Topbar onAdd={onAdd} />);
    await userEvent.click(screen.getByRole("button", { name: /\+ add/i }));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it("does not crash when onSearch/onAdd are omitted", async () => {
    render(<Topbar />);
    await userEvent.type(
      screen.getByPlaceholderText("Search plate or model..."),
      "x",
    );
    await userEvent.click(screen.getByRole("button", { name: /\+ add/i }));
  });
});
