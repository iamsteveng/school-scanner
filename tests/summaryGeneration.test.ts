import { describe, expect, it } from "vitest";
import { generateSummaryForWindow } from "../shared/summaryGeneration";
import type { SummaryUpdateRecord } from "../shared/summaryAggregation";

describe("summary generation entrypoint helper", () => {
  const baseArgs = {
    userId: "user_1",
    planInput: "FREE",
    requestedCadence: "weekly" as const,
    windowStart: 100,
    windowEnd: 200,
    selectedSchoolIds: ["school_a", "school_b"],
    generatedAt: 123456,
  };

  it("enforces tier/cadence matrix via entrypoint", () => {
    const cases = [
      { planInput: "FREE", requestedCadence: "daily" as const, status: "ineligible" as const, reason: "cadence_mismatch" as const },
      { planInput: "FREE", requestedCadence: "weekly" as const, status: "eligible" as const },
      { planInput: "PREMIUM", requestedCadence: "weekly" as const, status: "ineligible" as const, reason: "cadence_mismatch" as const },
      { planInput: "PREMIUM", requestedCadence: "daily" as const, status: "eligible" as const },
    ];

    for (const c of cases) {
      const result = generateSummaryForWindow({
        ...baseArgs,
        planInput: c.planInput,
        requestedCadence: c.requestedCadence,
        updates: [],
      });

      expect(result.status).toBe(c.status);
      if (c.status === "ineligible") {
        expect(result.status).toBe("ineligible");
        if (result.status === "ineligible") {
          expect(result.reason).toBe(c.reason);
        }
      }
    }
  });

  it("returns eligible output with scheduler metadata and payload", () => {
    const updates: SummaryUpdateRecord[] = [
      { schoolId: "school_a", updateId: "event_1", at: 150 },
      { schoolId: "school_a", updateId: "event_1", at: 150 }, // duplicate
      { schoolId: "school_b", updateId: "event_2", at: 199 },
      { schoolId: "school_x", updateId: "event_9", at: 160 }, // unselected
    ];

    const result = generateSummaryForWindow({ ...baseArgs, updates });

    expect(result.status).toBe("eligible");
    if (result.status !== "eligible") return;
    expect(result.plan).toBe("FREE");
    expect(result.cadence).toBe("weekly");
    expect(result.windowStart).toBe(100);
    expect(result.windowEnd).toBe(200);
    expect(result.generatedAt).toBe(123456);
    expect(result.selectedSchoolCount).toBe(2);
    expect(result.updatedSchoolCount).toBe(2);
    expect(result.missedSchoolsCount).toBe(0);
    expect(result.totalRelevantUpdates).toBe(2);
    expect(result.summaryPayload.missedSchoolsMessage).toBeNull();
  });

  it("returns ineligible for cadence mismatch with typed reason", () => {
    const result = generateSummaryForWindow({
      ...baseArgs,
      requestedCadence: "daily",
      updates: [],
    });

    expect(result).toEqual({
      status: "ineligible",
      reason: "cadence_mismatch",
      userId: "user_1",
      plan: "FREE",
      requestedCadence: "daily",
    });
  });

  it("returns ineligible for invalid plan with typed reason", () => {
    const result = generateSummaryForWindow({
      ...baseArgs,
      planInput: "ENTERPRISE",
      updates: [],
    });

    expect(result).toEqual({
      status: "ineligible",
      reason: "invalid_plan",
      userId: "user_1",
      plan: "ENTERPRISE",
      requestedCadence: "weekly",
    });
  });

  it("handles no selected schools and no updates gracefully", () => {
    const result = generateSummaryForWindow({
      ...baseArgs,
      selectedSchoolIds: [],
      updates: [],
    });

    expect(result.status).toBe("eligible");
    if (result.status !== "eligible") return;
    expect(result.selectedSchoolCount).toBe(0);
    expect(result.updatedSchoolCount).toBe(0);
    expect(result.missedSchoolsCount).toBe(0);
    expect(result.totalRelevantUpdates).toBe(0);
    expect(result.summaryPayload.missedSchoolsMessage).toBeNull();
  });

  it("returns error status when summary window is invalid", () => {
    const result = generateSummaryForWindow({
      ...baseArgs,
      windowStart: 201,
      windowEnd: 200,
      updates: [],
    });

    expect(result.status).toBe("error");
    if (result.status !== "error") return;
    expect(result.reason).toContain("windowStart must be <= windowEnd");
  });
});
