import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DashboardClient from "../src/app/dashboard/DashboardClient";

const pushMock = vi.fn();
const replaceMock = vi.fn();
const useQueryMock = vi.fn();
const getSessionUserIdMock = vi.fn();
const trackEventMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
}));

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => useQueryMock(...args),
}));

vi.mock("../src/lib/session", () => ({
  getSessionUserId: () => getSessionUserIdMock(),
}));

vi.mock("../src/lib/analytics", () => ({
  trackEvent: (...args: unknown[]) => trackEventMock(...args),
}));

describe("Dashboard edit schools CTA gating", () => {
  beforeEach(() => {
    pushMock.mockReset();
    replaceMock.mockReset();
    useQueryMock.mockReset();
    getSessionUserIdMock.mockReset();
    trackEventMock.mockReset();
    getSessionUserIdMock.mockReturnValue("user_1");
  });

  it("shows upgrade modal for FREE users and routes CTA to /upgrade", async () => {
    const user = userEvent.setup();

    useQueryMock.mockReturnValue({
      user: { plan: "FREE" },
      selection: { schoolIds: ["school_1"] },
      schools: [],
      updates: [],
      userMonitoringStatus: { trackedCount: 1, lastCheckedAt: null },
      monitoring: null,
      sinceCounts: null,
    });

    render(<DashboardClient />);

    await user.click(screen.getByRole("button", { name: /edit schools/i }));

    expect(
      screen.getByRole("heading", { name: /upgrade to edit your schools/i }),
    ).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalledWith("/schools");

    await user.click(screen.getByRole("button", { name: /upgrade to premium/i }));

    expect(trackEventMock).toHaveBeenCalledWith("upgrade_cta_clicked", {
      source: "dashboard_edit_modal",
    });
    expect(pushMock).toHaveBeenCalledWith("/upgrade");
  });

  it("still navigates to /upgrade when tracking throws", async () => {
    const user = userEvent.setup();

    trackEventMock.mockImplementation(() => {
      throw new Error("tracking unavailable");
    });

    useQueryMock.mockReturnValue({
      user: { plan: "FREE" },
      selection: { schoolIds: ["school_1"] },
      schools: [],
      updates: [],
      userMonitoringStatus: { trackedCount: 1, lastCheckedAt: null },
      monitoring: null,
      sinceCounts: null,
    });

    render(<DashboardClient />);

    await user.click(screen.getByRole("button", { name: /edit schools/i }));
    await user.click(screen.getByRole("button", { name: /upgrade to premium/i }));

    expect(trackEventMock).toHaveBeenCalledTimes(1);
    expect(pushMock).toHaveBeenCalledWith("/upgrade");
  });

  it("routes PREMIUM users directly to /schools", async () => {
    const user = userEvent.setup();

    useQueryMock.mockReturnValue({
      user: { plan: "PREMIUM" },
      selection: { schoolIds: ["school_1"] },
      schools: [],
      updates: [],
      userMonitoringStatus: { trackedCount: 1, lastCheckedAt: null },
      monitoring: null,
      sinceCounts: null,
    });

    render(<DashboardClient />);

    await user.click(screen.getByRole("button", { name: /edit schools/i }));

    expect(pushMock).toHaveBeenCalledWith("/schools");
    expect(
      screen.queryByRole("heading", { name: /upgrade to edit your schools/i }),
    ).not.toBeInTheDocument();
  });
});
