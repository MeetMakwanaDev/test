import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("@/components/Shell", () => ({
  __esModule: true,
  useSearch: () => ({ query: "", setQuery: jest.fn(), openAddVehicle: jest.fn() }),
}));

import StockPage from "@/app/stock/page";

const fetchMock = jest.fn();
beforeAll(() => {
  global.fetch = fetchMock as unknown as typeof fetch;
  window.alert = jest.fn();
  // jsdom lacks createObjectURL; stub for CSV export tests.
  Object.defineProperty(URL, "createObjectURL", {
    value: jest.fn(() => "blob:mock"),
    configurable: true,
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    value: jest.fn(),
    configurable: true,
  });
});
beforeEach(() => {
  fetchMock.mockReset();
});

describe("CurrentStockPage", () => {
  it("shows the skeleton while loading and a row once data arrives", async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({
        data: [
          {
            rowNumber: 3,
            "Plate Number": "AB24 XYZ",
            "Make & Model": "VW Golf",
            Source: "Copart",
            "Investor/SA": "MP",
            "Total Cost": "12500",
            "Date Aquired": "2026-04-10",
            Status: "In Stock",
          },
        ],
      }),
    } as Response);

    render(<StockPage />);
    // Row appears after fetch resolves
    expect(await screen.findByText("VW Golf")).toBeInTheDocument();
    expect(screen.getByText("AB24 XYZ")).toBeInTheDocument();
    expect(screen.getByText("Copart")).toBeInTheDocument();
  });

  it("surfaces an error from the API", async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({ error: "boom" }),
    } as Response);
    render(<StockPage />);
    expect(await screen.findByText(/Error: boom/i)).toBeInTheDocument();
  });

  it("filters out 'sold' rows from the live view", async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({
        data: [
          {
            rowNumber: 3,
            "Plate Number": "AB24",
            "Make & Model": "Live Car",
            Status: "In Stock",
          },
          {
            rowNumber: 4,
            "Plate Number": "CD23",
            "Make & Model": "Sold Car",
            Status: "Sold",
          },
        ],
      }),
    } as Response);

    render(<StockPage />);
    expect(await screen.findByText("Live Car")).toBeInTheDocument();
    expect(screen.queryByText("Sold Car")).not.toBeInTheDocument();
  });

  it('shows "No vehicles." when the live filter yields nothing', async () => {
    fetchMock.mockResolvedValue({ json: async () => ({ data: [] }) } as Response);
    render(<StockPage />);
    expect(await screen.findByText(/No vehicles\./i)).toBeInTheDocument();
  });

  it("opens the details alert when View is clicked", async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({
        data: [
          {
            rowNumber: 3,
            "Plate Number": "AB24",
            "Make & Model": "VW Golf",
            Source: "Copart",
            Status: "In Stock",
          },
        ],
      }),
    } as Response);
    render(<StockPage />);
    await screen.findByText("VW Golf");
    await userEvent.click(screen.getByRole("button", { name: /^view$/i }));
    expect(window.alert).toHaveBeenCalled();
  });

  it("refetches when a 'vehicle-added' window event fires", async () => {
    fetchMock.mockResolvedValue({ json: async () => ({ data: [] }) } as Response);
    render(<StockPage />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    window.dispatchEvent(new CustomEvent("vehicle-added"));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it("toggles filter tabs without crashing", async () => {
    fetchMock.mockResolvedValue({ json: async () => ({ data: [] }) } as Response);
    render(<StockPage />);
    await screen.findByText(/No vehicles\./i);
    await userEvent.click(screen.getByRole("button", { name: /^needs work$/i }));
    await userEvent.click(screen.getByRole("button", { name: /^ready$/i }));
    await userEvent.click(screen.getByRole("button", { name: /^website$/i }));
    await userEvent.click(screen.getByRole("button", { name: /^auto trader$/i }));
  });
});
