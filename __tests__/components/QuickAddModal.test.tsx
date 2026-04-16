import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const pushMock = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

import QuickAddModal from "@/components/QuickAddModal";

describe("QuickAddModal", () => {
  it("renders nothing when open is false", () => {
    const { container } = render(
      <QuickAddModal open={false} onClose={jest.fn()} onAddVehicle={jest.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders all tiles when open", () => {
    render(
      <QuickAddModal open onClose={jest.fn()} onAddVehicle={jest.fn()} />,
    );
    expect(screen.getByText("Quick Add")).toBeInTheDocument();
    expect(screen.getByText("Add Vehicle")).toBeInTheDocument();
    expect(screen.getByText("Sell a Car")).toBeInTheDocument();
    expect(screen.getByText("Scan Receipt")).toBeInTheDocument();
  });

  it("calls onAddVehicle when Add Vehicle tile is clicked", async () => {
    const onAddVehicle = jest.fn();
    render(
      <QuickAddModal open onClose={jest.fn()} onAddVehicle={onAddVehicle} />,
    );
    await userEvent.click(screen.getByRole("button", { name: /add vehicle/i }));
    expect(onAddVehicle).toHaveBeenCalledTimes(1);
  });

  it("navigates to /sell when Sell a Car tile is clicked", async () => {
    const onClose = jest.fn();
    pushMock.mockReset();
    render(
      <QuickAddModal open onClose={onClose} onAddVehicle={jest.fn()} />,
    );
    const sell = screen.getByRole("button", { name: /sell a car/i });
    expect(sell).not.toBeDisabled();
    await userEvent.click(sell);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(pushMock).toHaveBeenCalledWith("/sell");
  });

  it("disables tiles that have no action", () => {
    render(
      <QuickAddModal open onClose={jest.fn()} onAddVehicle={jest.fn()} />,
    );
    expect(screen.getByRole("button", { name: /scan receipt/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /book viewing/i })).toBeDisabled();
  });

  it("closes on the ✕ button", async () => {
    const onClose = jest.fn();
    render(
      <QuickAddModal open onClose={onClose} onAddVehicle={jest.fn()} />,
    );
    await userEvent.click(screen.getByLabelText("Close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes when Escape is pressed", () => {
    const onClose = jest.fn();
    render(
      <QuickAddModal open onClose={onClose} onAddVehicle={jest.fn()} />,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes when the backdrop is clicked", () => {
    const onClose = jest.fn();
    const { container } = render(
      <QuickAddModal open onClose={onClose} onAddVehicle={jest.fn()} />,
    );
    const overlay = container.querySelector(".moverlay") as HTMLElement;
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
