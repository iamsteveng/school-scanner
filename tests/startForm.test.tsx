import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import StartForm from "../src/app/start/StartForm";

describe("StartForm", () => {
  it("disables submit until terms accepted and phone valid", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<StartForm onSubmit={onSubmit} getBaseUrl={() => "https://test"} />);

    const submitButton = screen.getByRole("button", {
      name: /send verification link/i,
    });

    expect(submitButton).toBeDisabled();

    await user.type(
      screen.getByPlaceholderText(/enter number/i),
      "1234567",
    );
    expect(submitButton).toBeDisabled();

    await user.click(screen.getByRole("checkbox"));
    expect(submitButton).toBeEnabled();
  });

  it("keeps submit disabled for invalid phone number", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<StartForm onSubmit={onSubmit} getBaseUrl={() => "https://test"} />);

    await user.click(screen.getByRole("checkbox"));
    await user.type(screen.getByPlaceholderText(/enter number/i), "12");
    expect(
      screen.getByRole("button", { name: /send verification link/i }),
    ).toBeDisabled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits with full phone number and shows success", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<StartForm onSubmit={onSubmit} getBaseUrl={() => "https://test"} />);

    await user.type(
      screen.getByPlaceholderText(/enter number/i),
      "62875094",
    );
    await user.click(screen.getByRole("checkbox"));
    await user.click(
      screen.getByRole("button", { name: /send verification link/i }),
    );

    expect(onSubmit).toHaveBeenCalledWith({
      phone: "+85262875094",
      baseUrl: "https://test",
    });
    expect(
      await screen.findByText(/message sent/i),
    ).toBeInTheDocument();
  });
});
