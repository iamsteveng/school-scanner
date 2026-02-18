import { describe, expect, it, vi } from "vitest";
import type { Id } from "../convex/_generated/dataModel";
import {
  isDeliverablePhone,
  processSummaryDeliveryCandidates,
} from "../convex/jobs";

function candidate(args: {
  userId: string;
  phone: string;
  verifiedAt?: number;
}): { userId: Id<"users">; phone: string; verifiedAt?: number } {
  return {
    userId: args.userId as Id<"users">,
    phone: args.phone,
    verifiedAt: args.verifiedAt,
  };
}

describe("scheduler delivery processing", () => {
  it("skips and logs inactive or non-deliverable candidates", async () => {
    const generateSummary = vi.fn();
    const sendMessage = vi.fn();
    const logSkip = vi.fn().mockResolvedValue(undefined);
    const logFailure = vi.fn().mockResolvedValue(undefined);

    const result = await processSummaryDeliveryCandidates({
      cadence: "daily",
      windowStart: 1000,
      windowEnd: 2000,
      candidates: [
        candidate({
          userId: "u1",
          phone: "+85212345678",
        }),
        candidate({
          userId: "u2",
          phone: "12345",
          verifiedAt: 123,
        }),
      ],
      generateSummary,
      sendMessage,
      logSkip,
      logFailure,
    });

    expect(result).toEqual({
      attempted: 2,
      sent: 0,
      skipped: 2,
      failed: 0,
    });
    expect(generateSummary).not.toHaveBeenCalled();
    expect(sendMessage).not.toHaveBeenCalled();
    expect(logSkip).toHaveBeenCalledTimes(2);
    expect(logSkip.mock.calls[0]?.[0]).toMatchObject({
      reason: "inactive_unverified",
    });
    expect(logSkip.mock.calls[1]?.[0]).toMatchObject({
      reason: "invalid_phone",
    });
  });

  it("continues processing when one candidate fails", async () => {
    const generateSummary = vi
      .fn()
      .mockRejectedValueOnce(new Error("provider down"))
      .mockResolvedValueOnce({ status: "ineligible", reason: "no_updates" })
      .mockResolvedValueOnce({
        status: "eligible",
        updatedSchoolCount: 1,
        totalRelevantUpdates: 2,
        missedSchoolsCount: 0,
      });
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    const logSkip = vi.fn().mockResolvedValue(undefined);
    const logFailure = vi.fn().mockResolvedValue(undefined);

    const result = await processSummaryDeliveryCandidates({
      cadence: "weekly",
      windowStart: 1000,
      windowEnd: 2000,
      candidates: [
        candidate({
          userId: "u1",
          phone: "+85211111111",
          verifiedAt: 111,
        }),
        candidate({
          userId: "u2",
          phone: "+85222222222",
          verifiedAt: 222,
        }),
        candidate({
          userId: "u3",
          phone: "+85233333333",
          verifiedAt: 333,
        }),
      ],
      generateSummary,
      sendMessage,
      logSkip,
      logFailure,
    });

    expect(result).toEqual({
      attempted: 3,
      sent: 1,
      skipped: 1,
      failed: 1,
    });
    expect(logFailure).toHaveBeenCalledTimes(1);
    expect(logFailure.mock.calls[0]?.[0]).toMatchObject({
      reason: "provider down",
    });
    expect(logSkip).toHaveBeenCalledTimes(1);
    expect(logSkip.mock.calls[0]?.[0]).toMatchObject({
      reason: "no_updates",
    });
    expect(sendMessage).toHaveBeenCalledTimes(1);
  });

  it("validates phone format with E.164-like rules", () => {
    expect(isDeliverablePhone("+85212345678")).toBe(true);
    expect(isDeliverablePhone(" +85212345678 ")).toBe(true);
    expect(isDeliverablePhone("12345678")).toBe(false);
    expect(isDeliverablePhone("+85-212345678")).toBe(false);
  });
});
