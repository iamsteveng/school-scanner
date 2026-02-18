import {
  aggregateSelectedSchoolUpdates,
  type AggregateSelectedSchoolUpdatesResult,
  type SummaryUpdateRecord,
} from "./summaryAggregation";
import {
  enforceCadence,
  type Plan,
  type SummaryCadence,
} from "./cadencePolicy";

export type SummaryPayload = AggregateSelectedSchoolUpdatesResult;

export type EligibleSummaryGenerationResult = {
  status: "eligible";
  userId: string;
  plan: Plan;
  cadence: SummaryCadence;
  windowStart: number;
  windowEnd: number;
  generatedAt: number;
  selectedSchoolCount: number;
  updatedSchoolCount: number;
  missedSchoolsCount: number;
  totalRelevantUpdates: number;
  summaryPayload: SummaryPayload;
};

export type IneligibleSummaryGenerationResult = {
  status: "ineligible";
  reason: "cadence_mismatch" | "invalid_plan";
  userId: string;
  plan?: string;
  requestedCadence: SummaryCadence;
};

export type ErrorSummaryGenerationResult = {
  status: "error";
  reason: string;
  userId: string;
};

export type SummaryGenerationResult =
  | EligibleSummaryGenerationResult
  | IneligibleSummaryGenerationResult
  | ErrorSummaryGenerationResult;

export type GenerateSummaryForWindowArgs = {
  userId: string;
  planInput: string;
  requestedCadence: SummaryCadence;
  windowStart: number;
  windowEnd: number;
  selectedSchoolIds: string[];
  updates: SummaryUpdateRecord[];
  generatedAt?: number;
};

export function generateSummaryForWindow(
  args: GenerateSummaryForWindowArgs
): SummaryGenerationResult {
  const cadence = enforceCadence(args.planInput, args.requestedCadence);
  if (cadence.status === "ineligible") {
    return {
      status: "ineligible",
      reason: cadence.reason,
      userId: args.userId,
      plan: cadence.plan,
      requestedCadence: cadence.requestedCadence,
    };
  }

  try {
    const summaryPayload = aggregateSelectedSchoolUpdates({
      selectedSchoolIds: args.selectedSchoolIds,
      updates: args.updates,
      windowStart: args.windowStart,
      windowEnd: args.windowEnd,
    });

    const generatedAt = args.generatedAt ?? Date.now();
    return {
      status: "eligible",
      userId: args.userId,
      plan: cadence.plan,
      cadence: cadence.requestedCadence,
      windowStart: args.windowStart,
      windowEnd: args.windowEnd,
      generatedAt,
      selectedSchoolCount: summaryPayload.selectedSchoolCount,
      updatedSchoolCount: summaryPayload.updatedSchoolCount,
      missedSchoolsCount: summaryPayload.missedSchoolsCount,
      totalRelevantUpdates: summaryPayload.totalRelevantUpdates,
      summaryPayload,
    };
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : "summary_generation_failed";
    return {
      status: "error",
      reason,
      userId: args.userId,
    };
  }
}
