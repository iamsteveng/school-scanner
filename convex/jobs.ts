import { v } from "convex/values";
import { internalAction, internalMutation } from "./_generated/server";
import { api, internal } from "./_generated/api";

export const noopCron = internalMutation({
  args: { label: v.optional(v.string()) },
  handler: async (_ctx, args) => {
    const label = args.label ?? "scheduled";
    console.log(`cron: ${label}`);
  },
});

// NOTE: Explicit type annotation avoids a Next.js/TS circular inference issue when typechecking
// Convex internal action definitions inside the Next.js app repo.
export const monitoringCron: ReturnType<typeof internalAction> = internalAction({
  args: {
    limitSchools: v.optional(v.number()),
    limitPagesPerSchool: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Daily kickoff: reset paging cursor so batch cron can sweep all schools.
    await ctx.runMutation(internal.monitoringState.ensureState, {});
    await ctx.runMutation(internal.monitoringState.startNewDailyRun, {});

    // Also run one batch immediately (optional) so we don't wait 10 mins for the first tick.
    return await ctx.runAction(api.monitoringBatchActions.runMonitoringBatchAction, {
      cursor: undefined,
      limitSchools: args.limitSchools ?? 25,
      limitPagesPerSchool: args.limitPagesPerSchool,
    });
  },
});

export const monitoringBatchCron: ReturnType<typeof internalAction> = internalAction({
  args: {
    limitSchools: v.optional(v.number()),
    limitPagesPerSchool: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.monitoringState.ensureState, {});
    const state = await ctx.runQuery(api.monitoringState.getState, {});
    if (!state?.running) {
      return { ok: true, skipped: true };
    }

    const result = await ctx.runAction(api.monitoringBatchActions.runMonitoringBatchAction, {
      cursor: state.cursor,
      limitSchools: args.limitSchools ?? 25,
      limitPagesPerSchool: args.limitPagesPerSchool,
    });

    if (result && typeof result === "object") {
      const r = result as Record<string, unknown>;
      const cursorOut = typeof r.cursorOut === "string" ? r.cursorOut : undefined;
      const isDone = !!r.isDone;
      await ctx.runMutation(internal.monitoringState.updateAfterBatch, {
        cursor: cursorOut,
        isDone,
      });
    }

    return result;
  },
});

export const monthlySchoolSeedRefreshCron: ReturnType<typeof internalAction> =
  internalAction({
    args: {},
    handler: async (ctx) => {
      return await ctx.runMutation(internal.schools.refreshPrimarySchoolsFromSeed, {
        wipeExisting: true,
      });
    },
  });

export const continuousUrlAuditCron: ReturnType<typeof internalAction> = internalAction({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.urlAuditState.ensureState, {});
    return await ctx.runAction(api.websiteAuditActions.runContinuousUrlAuditBatch, {
      limit: args.limit,
      staleDays: 30,
    });
  },
});
