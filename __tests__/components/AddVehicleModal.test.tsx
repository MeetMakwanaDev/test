import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AddVehicleModal from "@/components/AddVehicleModal";

const fetchMock = jest.fn();
beforeAll(() => {
  global.fetch = fetchMock as unknown as typeof fetch;
  window.alert = jest.fn();
});
beforeEach(() => {
  fetchMock.mockReset();
});

describe("AddVehicleModal", () => {
  it("renders nothing when closed", () => {
    const { container } = render(
      <AddVehicleModal open={false} onClose={jest.fn()} onAdded={jest.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("shows validation error when the plate is missing", async () => {
    render(<AddVehicleModal open onClose={jest.fn()} onAdded={jest.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /add to stock/i }));
    expect(screen.getByText(/reg plate is required/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows validation error when the model is missing", async () => {
    render(<AddVehicleModal open onClose={jest.fn()} onAdded={jest.fn()} />);
    await userEvent.type(screen.getByPlaceholderText("AB24 XYZ"), "AB24 XYZ");
    await userEvent.click(screen.getByRole("button", { name: /add to stock/i }));
    expect(screen.getByText(/make & model is required/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uppercases the plate as the user types", async () => {
    render(<AddVehicleModal open onClose={jest.fn()} onAdded={jest.fn()} />);
    const plate = screen.getByPlaceholderText("AB24 XYZ") as HTMLInputElement;
    await userEvent.type(plate, "ab24 xyz");
    expect(plate.value).toBe("AB24 XYZ");
  });

  it("POSTs the vehicle and triggers onAdded / onClose on success", async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({ ok: true }),
    } as Response);
    const onAdded = jest.fn();
    const onClose = jest.fn();
    render(<AddVehicleModal open onClose={onClose} onAdded={onAdded} />);

    await userEvent.type(screen.getByPlaceholderText("AB24 XYZ"), "ab24 xyz");
    await userEvent.type(
      screen.getByPlaceholderText("e.g. VW Golf GTI"),
      "VW Golf",
    );
    await userEvent.click(screen.getByRole("button", { name: /add to stock/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/stock");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body["Plate Number"]).toBe("AB24 XYZ");
    expect(body["Make & Model"]).toBe("VW Golf");
    expect(onAdded).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("surfaces the API error message on failure", async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({ error: "write failed" }),
    } as Response);
    render(<AddVehicleModal open onClose={jest.fn()} onAdded={jest.fn()} />);

    await userEvent.type(screen.getByPlaceholderText("AB24 XYZ"), "ab24 xyz");
    await userEvent.type(
      screen.getByPlaceholderText("e.g. VW Golf GTI"),
      "VW Golf",
    );
    await userEvent.click(screen.getByRole("button", { name: /add to stock/i }));

    await waitFor(() =>
      expect(screen.getByText("write failed")).toBeInTheDocument(),
    );
  });

  it("closes when Cancel is clicked", async () => {
    const onClose = jest.fn();
    render(<AddVehicleModal open onClose={onClose} onAdded={jest.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
