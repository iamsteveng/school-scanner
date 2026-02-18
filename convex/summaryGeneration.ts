import { v } from "convex/values";
import { action, internalAction, internalQuery } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { ActionCtx } from "./_generated/server";
import { generateSummaryForWindow } from "../shared/summaryGeneration";
import type { SummaryCadence } from "../shared/cadencePolicy";

type SummaryInputRecord = {
  userId: string;
  planInput: string;
  selectedSchoolIds: string[];
  updates: {
    schoolId: string;
    updateId: string;
    at: number;
  }[];
};

type GenerateSummaryArgs = {
  userId: Id<"users">;
  cadence: SummaryCadence;
  windowStart: number;
  windowEnd: number;
};

export const getSummaryGenerationInputs = internalQuery({
  args: {
    userId: v.id("users"),
    windowStart: v.number(),
    windowEnd: v.number(),
  },
  handler: async (ctx, args): Promise<SummaryInputRecord | null> => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    const selection = await ctx.db
      .query("user_school_selections")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();

    const selectedSchoolIds = selection?.schoolIds ?? [];
    const selectedSchoolIdsAsStrings = selectedSchoolIds.map((id) =>
      id.toString()
    );

    const updates: SummaryInputRecord["updates"] = [];
    for (const schoolId of selectedSchoolIds) {
      const events = await ctx.db
        .query("events")
        .withIndex("by_school", (q) => q.eq("schoolId", schoolId))
        .collect();

      for (const event of events) {
        if (event.updatedAt < args.windowStart || event.updatedAt > args.windowEnd) {
          continue;
        }
        updates.push({
          schoolId: schoolId.toString(),
          updateId: event.eventHash,
          at: event.updatedAt,
        });
      }
    }

    return {
      userId: args.userId.toString(),
      planInput: user.plan ?? "FREE",
      selectedSchoolIds: selectedSchoolIdsAsStrings,
      updates,
    };
  },
});

async function runSummaryGeneration(ctx: ActionCtx, args: GenerateSummaryArgs) {
  const { internal } = await import("./_generated/api");
  const inputs = await ctx.runQuery(
    internal.summaryGeneration.getSummaryGenerationInputs,
    {
      userId: args.userId,
      windowStart: args.windowStart,
      windowEnd: args.windowEnd,
    }
  );

  if (!inputs) {
    return {
      status: "error" as const,
      reason: "user_not_found",
      userId: args.userId.toString(),
    };
  }

  return generateSummaryForWindow({
    userId: inputs.userId,
    planInput: inputs.planInput,
    requestedCadence: args.cadence,
    windowStart: args.windowStart,
    windowEnd: args.windowEnd,
    selectedSchoolIds: inputs.selectedSchoolIds,
    updates: inputs.updates,
  });
}

// Scheduler-facing public action (for manual invocations and tooling).
export const generateSummary: ReturnType<typeof action> = action({
  args: {
    userId: v.id("users"),
    cadence: v.union(v.literal("daily"), v.literal("weekly")),
    windowStart: v.number(),
    windowEnd: v.number(),
  },
  handler: async (ctx, args) => {
    return await runSummaryGeneration(ctx, args);
  },
});

// Internal scheduler entrypoint for Phase 5.2 jobs/crons.
export const generateSummaryInternal: ReturnType<typeof internalAction> =
  internalAction({
    args: {
      userId: v.id("users"),
      cadence: v.union(v.literal("daily"), v.literal("weekly")),
      windowStart: v.number(),
      windowEnd: v.number(),
    },
    handler: async (ctx, args) => {
      return await runSummaryGeneration(ctx, args);
    },
  });
