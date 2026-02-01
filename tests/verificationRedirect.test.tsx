import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import VerifyTokenPage from "../src/app/v/[token]/page";

const replaceMock = vi.fn();
const useActionMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
  useSearchParams: () => ({
    get: () => null,
  }),
}));

vi.mock("convex/react", () => ({
  useAction: (...args: unknown[]) => useActionMock(...args),
}));

describe("/v/[token] verification redirect", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    useActionMock.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("shows loading state and redirects on success", async () => {
    vi.mocked(console.error).mockClear();
    const actionMock = vi.fn().mockResolvedValue({
      token: "session-token",
      redirectTo: "/schools",
    });
    useActionMock.mockReturnValue(actionMock);

    render(<VerifyTokenPage params={{ token: "valid-token" }} />);

    expect(
      screen.getByText(/checking your verification link/i),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(actionMock).toHaveBeenCalledWith({ token: "valid-token" });
    });

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/schools");
    });
  });

  it("renders error UI and retry CTA on failure", async () => {
    vi.mocked(console.error).mockClear();
    const actionMock = vi
      .fn()
      .mockRejectedValue(new Error("Invalid token."));
    useActionMock.mockReturnValue(actionMock);

    render(<VerifyTokenPage params={{ token: "bad-token" }} />);

    expect(
      await screen.findByText(/couldn't verify that link/i),
    ).toBeInTheDocument();

    const retryLink = screen.getByRole("link", {
      name: /request a new link/i,
    });
    expect(retryLink).toHaveAttribute("href", "/start");
  });
});
