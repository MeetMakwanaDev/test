import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

let pathname = "/";
jest.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push: jest.fn() }),
}));

const fetchMock = jest.fn();

import Shell, { useSearch } from "@/components/Shell";

beforeAll(() => {
  global.fetch = fetchMock as unknown as typeof fetch;
});
beforeEach(() => {
  pathname = "/";
  fetchMock.mockReset();
});

describe("Shell", () => {
  it("fetches sidebar counts on mount and surfaces them to Sidebar", async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({ stock: 3, sold: 5 }),
    } as Response);

    render(
      <Shell>
        <div>content</div>
      </Shell>,
    );

    expect(fetchMock).toHaveBeenCalledWith("/api/counts", { cache: "no-store" });
    await waitFor(() => {
      expect(screen.getByText("3")).toBeInTheDocument();
      expect(screen.getByText("5")).toBeInTheDocument();
    });
    expect(screen.getByText("content")).toBeInTheDocument();
  });

  it("swallows fetch errors silently and still renders children", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    render(
      <Shell>
        <div>still here</div>
      </Shell>,
    );
    expect(await screen.findByText("still here")).toBeInTheDocument();
  });

  it("exposes query state and openAddVehicle via useSearch", async () => {
    fetchMock.mockResolvedValue({ json: async () => ({}) } as Response);

    function Probe() {
      const { query, setQuery, openAddVehicle } = useSearch();
      return (
        <div>
          <div data-testid="q">{query}</div>
          <button onClick={() => setQuery("golf")}>set</button>
          <button onClick={openAddVehicle}>open</button>
        </div>
      );
    }

    render(
      <Shell>
        <Probe />
      </Shell>,
    );

    expect(screen.getByTestId("q").textContent).toBe("");
    await userEvent.click(screen.getByText("set"));
    expect(screen.getByTestId("q").textContent).toBe("golf");

    await userEvent.click(screen.getByText("open"));
    expect(screen.getByText("Add Vehicle")).toBeInTheDocument();
  });

  it("dispatches a 'vehicle-added' window event after a successful add", async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({ ok: true }),
    } as Response);

    const listener = jest.fn();
    window.addEventListener("vehicle-added", listener);

    function Opener() {
      const { openAddVehicle } = useSearch();
      return <button onClick={openAddVehicle}>open</button>;
    }

    render(
      <Shell>
        <Opener />
      </Shell>,
    );

    await userEvent.click(screen.getByText("open"));
    await userEvent.type(screen.getByPlaceholderText("AB24 XYZ"), "ab24 xyz");
    await userEvent.type(
      screen.getByPlaceholderText("e.g. VW Golf GTI"),
      "VW Golf",
    );

    await act(async () => {
      await userEvent.click(screen.getByRole("button", { name: /add to stock/i }));
    });

    await waitFor(() => expect(listener).toHaveBeenCalled());
    window.removeEventListener("vehicle-added", listener);
  });

  it("refreshes sidebar counts when vehicle-added event fires", async () => {
    // Initial fetch returns stock:2, sold:1
    fetchMock.mockResolvedValue({
      json: async () => ({ stock: 2, sold: 1 }),
    } as Response);

    render(
      <Shell>
        <div>child</div>
      </Shell>,
    );

    await waitFor(() => {
      expect(screen.getByText("2")).toBeInTheDocument();
      expect(screen.getByText("1")).toBeInTheDocument();
    });

    // Now update the mock to return new counts
    fetchMock.mockResolvedValue({
      json: async () => ({ stock: 3, sold: 2 }),
    } as Response);

    // Fire vehicle-added event (simulates add or sell)
    act(() => {
      window.dispatchEvent(new CustomEvent("vehicle-added"));
    });

    await waitFor(() => {
      expect(screen.getByText("3")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
    });
  });

  it("useSearch returns default no-op values outside the provider", () => {
    let captured: ReturnType<typeof useSearch> | null = null;
    function Probe() {
      captured = useSearch();
      return null;
    }
    render(<Probe />);
    expect(captured).not.toBeNull();
    expect(typeof captured!.setQuery).toBe("function");
    expect(typeof captured!.openAddVehicle).toBe("function");
    expect(captured!.query).toBe("");
    // Calling the no-op shouldn't throw
    captured!.setQuery("x");
    captured!.openAddVehicle();
  });
});
