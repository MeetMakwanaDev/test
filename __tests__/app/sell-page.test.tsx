import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("next/navigation", () => ({
  usePathname: () => "/sell",
  useRouter: () => ({ push: jest.fn() }),
}));

import SellCarPage from "@/app/sell/page";

const fetchMock = jest.fn();
beforeAll(() => {
  global.fetch = fetchMock as unknown as typeof fetch;
  window.alert = jest.fn();
});
beforeEach(() => {
  fetchMock.mockReset();
});

const STOCK_RESPONSE = {
  data: [
    {
      rowNumber: 5,
      "Plate Number": "AB24 XYZ",
      "Make & Model": "VW Golf",
      "Investor/SA": "MP",
      Source: "Copart",
      Price: "9000",
      "Reconditioning costs": "1000",
      "Total Cost": "10000",
      "Date Aquired": "2026-01-01",
      Status: "In Stock",
      "PX Value": "",
    },
  ],
};

describe("SellCarPage", () => {
  it("renders the title and quick guide", () => {
    fetchMock.mockReturnValue(new Promise(() => {}));
    render(<SellCarPage />);
    expect(screen.getByText(/Sell a Car — Generate Investor Invoice/i)).toBeInTheDocument();
    expect(screen.getByText(/Quick Guide/i)).toBeInTheDocument();
  });

  it("searches for a vehicle by plate and shows details", async () => {
    fetchMock.mockResolvedValue({
      json: async () => STOCK_RESPONSE,
    } as Response);

    render(<SellCarPage />);
    await userEvent.type(screen.getByPlaceholderText("Enter Reg Plate..."), "AB24XYZ");
    await userEvent.click(screen.getByRole("button", { name: "Find" }));

    expect(await screen.findByText("VW Golf")).toBeInTheDocument();
    expect(screen.getByText("AB24 XYZ")).toBeInTheDocument();
    expect(screen.getByText("Copart")).toBeInTheDocument();
  });

  it("shows an error when vehicle is not found", async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({ data: [] }),
    } as Response);

    render(<SellCarPage />);
    await userEvent.type(screen.getByPlaceholderText("Enter Reg Plate..."), "NOTFOUND");
    await userEvent.click(screen.getByRole("button", { name: "Find" }));

    expect(await screen.findByText(/not found in current stock/i)).toBeInTheDocument();
  });

  it("shows live calculation as sale price is entered", async () => {
    fetchMock.mockResolvedValue({
      json: async () => STOCK_RESPONSE,
    } as Response);

    render(<SellCarPage />);
    await userEvent.type(screen.getByPlaceholderText("Enter Reg Plate..."), "AB24XYZ");
    await userEvent.click(screen.getByRole("button", { name: "Find" }));
    await screen.findByText("VW Golf");

    await userEvent.type(screen.getByPlaceholderText("e.g. 12050"), "15000");

    // Gross profit = 15000 - 10000 = 5000
    expect(screen.getByText("£5,000.00")).toBeInTheDocument();
  });

  it("validates that sale price is required before generating invoice", async () => {
    fetchMock.mockResolvedValue({
      json: async () => STOCK_RESPONSE,
    } as Response);

    render(<SellCarPage />);
    await userEvent.type(screen.getByPlaceholderText("Enter Reg Plate..."), "AB24XYZ");
    await userEvent.click(screen.getByRole("button", { name: "Find" }));
    await screen.findByText("VW Golf");

    await userEvent.click(screen.getByRole("button", { name: /Generate SA Motors/i }));

    expect(screen.getByText(/Enter the sale price/i)).toBeInTheDocument();
  });

  it("generates invoice and shows success on valid submission", async () => {
    // First call: /api/stock for search; Second call: /api/sell for submission
    fetchMock
      .mockResolvedValueOnce({ json: async () => STOCK_RESPONSE } as Response)
      .mockResolvedValueOnce({ json: async () => ({ ok: true }) } as Response);

    const listener = jest.fn();
    window.addEventListener("vehicle-added", listener);

    render(<SellCarPage />);
    await userEvent.type(screen.getByPlaceholderText("Enter Reg Plate..."), "AB24XYZ");
    await userEvent.click(screen.getByRole("button", { name: "Find" }));
    await screen.findByText("VW Golf");

    await userEvent.type(screen.getByPlaceholderText("e.g. 12050"), "15000");
    await userEvent.click(screen.getByRole("button", { name: /Generate SA Motors/i }));

    await waitFor(() => {
      expect(screen.getByText(/Sale completed/i)).toBeInTheDocument();
    });

    // Invoice is rendered
    expect(screen.getByText(/Investor Invoice — Ready/i)).toBeInTheDocument();
    // vehicle-added event fired for sidebar refresh
    expect(listener).toHaveBeenCalled();
    window.removeEventListener("vehicle-added", listener);
  });

  it("surfaces API error from /api/sell", async () => {
    fetchMock
      .mockResolvedValueOnce({ json: async () => STOCK_RESPONSE } as Response)
      .mockResolvedValueOnce({ json: async () => ({ error: "disk full" }) } as Response);

    render(<SellCarPage />);
    await userEvent.type(screen.getByPlaceholderText("Enter Reg Plate..."), "AB24XYZ");
    await userEvent.click(screen.getByRole("button", { name: "Find" }));
    await screen.findByText("VW Golf");

    await userEvent.type(screen.getByPlaceholderText("e.g. 12050"), "12000");
    await userEvent.click(screen.getByRole("button", { name: /Generate SA Motors/i }));

    await waitFor(() => {
      expect(screen.getByText("disk full")).toBeInTheDocument();
    });
  });
});
