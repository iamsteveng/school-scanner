import { describe, expect, it } from "vitest";
import {
  getPreviousUtcDayWindow,
  isDailyPremiumCandidate,
} from "../convex/jobs";

describe("daily premium scheduler helpers", () => {
  it("accepts only verified PREMIUM users", () => {
    expect(
      isDailyPremiumCandidate({
        plan: "PREMIUM",
        verifiedAt: Date.now(),
      }),
    ).toBe(true);

    expect(
      isDailyPremiumCandidate({
        plan: "FREE",
        verifiedAt: Date.now(),
      }),
    ).toBe(false);

    expect(
      isDailyPremiumCandidate({
        plan: "PREMIUM",
      }),
    ).toBe(false);
  });

  it("builds the previous UTC day as an inclusive 24-hour window", () => {
    const nowMs = Date.UTC(2026, 1, 18, 10, 30, 0);
    const window = getPreviousUtcDayWindow(nowMs);
    expect(window.windowStart).toBe(Date.UTC(2026, 1, 17, 0, 0, 0, 0));
    expect(window.windowEnd).toBe(Date.UTC(2026, 1, 17, 23, 59, 59, 999));
  });
});
