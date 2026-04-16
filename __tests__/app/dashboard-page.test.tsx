import { render, screen, waitFor } from "@testing-library/react";
import DashboardPage from "@/app/page";

const fetchMock = jest.fn();
beforeAll(() => {
  global.fetch = fetchMock as unknown as typeof fetch;
});
beforeEach(() => {
  fetchMock.mockReset();
});

describe("DashboardPage", () => {
  it("shows a loading placeholder while data is in flight", () => {
    fetchMock.mockReturnValue(new Promise(() => {}));
    render(<DashboardPage />);
    expect(screen.getByText(/Loading dashboard/i)).toBeInTheDocument();
  });

  it("surfaces the API error via an alert", async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({ error: "boom" }),
    } as Response);
    render(<DashboardPage />);
    expect(await screen.findByText(/Error loading dashboard: boom/i))
      .toBeInTheDocument();
  });

  it("renders KPI cards and derived stats from a successful response", async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({
        monthly: [
          {
            Month: "2026-03-01",
            "Cars Sold": "3",
            "Total Gross Profit": "1500",
          },
          { Month: "TOTAL", "Cars Sold": "30", "Total Gross Profit": "20000" },
        ],
        stock: [
          { "Plate Number": "AB24", Status: "In Stock", "Date Aquired": "2026-04-10" },
          { "Plate Number": "CD23", Status: "Sold", "Date Aquired": "2026-01-01" },
          { "Plate Number": "EF22", Status: "Listed", "Date Aquired": "2025-01-01" },
        ],
        sold: [
          {
            "Make & Model": "VW Golf",
            "Number Plate reference": "XY21",
            "Total Profit": "2000",
          },
        ],
      }),
    } as Response);

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("In Stock")).toBeInTheDocument();
    });

    expect(screen.getByText("All-Time Profit")).toBeInTheDocument();
    expect(screen.getByText("Cars Sold")).toBeInTheDocument();
    expect(screen.getByText("VW Golf")).toBeInTheDocument();
    // The over-60 alert should appear (EF22 is over a year old)
    expect(screen.getByText(/over 60 days in stock/i)).toBeInTheDocument();
  });

  it("catches a network rejection and shows the error alert", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    render(<DashboardPage />);
    expect(await screen.findByText(/Error loading dashboard: offline/i))
      .toBeInTheDocument();
  });
});
