import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("@/components/Shell", () => ({
  __esModule: true,
  useSearch: () => ({ query: "", setQuery: jest.fn(), openAddVehicle: jest.fn() }),
}));

import SoldHistoryPage from "@/app/sold/page";

const fetchMock = jest.fn();
beforeAll(() => {
  global.fetch = fetchMock as unknown as typeof fetch;
  window.alert = jest.fn();
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

describe("SoldHistoryPage", () => {
  it("renders rows returned by the API", async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({
        data: [
          {
            rowNumber: 3,
            Month: "2026-04-01",
            "Date Aquired": "2026-03-01",
            "Date Sold": "2026-04-10",
            "Number Plate reference": "XY21 AAA",
            "Make & Model": "VW Golf",
            "SA/Investor Name": "MP",
            "Total Cost": "10000",
            Sold: "12000",
            "Total Profit": "2000",
            "Days to Sell": "40",
            Platfrom: "AutoTrader",
          },
        ],
      }),
    } as Response);

    render(<SoldHistoryPage />);
    expect(await screen.findByText("VW Golf")).toBeInTheDocument();
    expect(screen.getByText("XY21 AAA")).toBeInTheDocument();
    expect(screen.getByText("AutoTrader")).toBeInTheDocument();
  });

  it("shows an error alert when the API returns an error", async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({ error: "bad" }),
    } as Response);
    render(<SoldHistoryPage />);
    expect(await screen.findByText(/Error: bad/i)).toBeInTheDocument();
  });

  it('shows "No sold vehicles." for an empty result', async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({ data: [] }),
    } as Response);
    render(<SoldHistoryPage />);
    expect(await screen.findByText(/No sold vehicles\./i)).toBeInTheDocument();
  });

  it("shows the breakdown alert when Full is clicked", async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({
        data: [
          {
            rowNumber: 3,
            "Number Plate reference": "XY21",
            "Make & Model": "VW Golf",
            "Total Cost": "10000",
            Sold: "12000",
            "Total Profit": "2000",
          },
        ],
      }),
    } as Response);
    render(<SoldHistoryPage />);
    await screen.findByText("VW Golf");
    await userEvent.click(screen.getByRole("button", { name: /^full$/i }));
    expect(window.alert).toHaveBeenCalled();
  });

  it("catches network rejections", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    render(<SoldHistoryPage />);
    expect(await screen.findByText(/Error: offline/i)).toBeInTheDocument();
  });
});
