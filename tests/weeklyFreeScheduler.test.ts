import { describe, expect, it } from "vitest";
import { getPreviousUtcWeekWindow, isWeeklyFreeCandidate } from "../convex/jobs";

describe("weekly free scheduler helpers", () => {
  it("accepts only verified FREE users", () => {
    expect(
      isWeeklyFreeCandidate({
        plan: "FREE",
        verifiedAt: Date.now(),
      }),
    ).toBe(true);

    expect(
      isWeeklyFreeCandidate({
        plan: "PREMIUM",
        verifiedAt: Date.now(),
      }),
    ).toBe(false);

    expect(
      isWeeklyFreeCandidate({
        plan: "FREE",
      }),
    ).toBe(false);
  });

  it("builds the previous UTC week as an inclusive 7-day window", () => {
    const nowMs = Date.UTC(2026, 1, 18, 10, 30, 0);
    const window = getPreviousUtcWeekWindow(nowMs);
    expect(window.windowStart).toBe(Date.UTC(2026, 1, 11, 0, 0, 0, 0));
    expect(window.windowEnd).toBe(Date.UTC(2026, 1, 17, 23, 59, 59, 999));
  });
});
