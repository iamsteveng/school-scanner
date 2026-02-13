import { v } from "convex/values";
import { action } from "./_generated/server";

// A thin wrapper that runs monitoring for a paged slice of schools.
// We keep the heavy logic in monitoringActions.runMonitoringOnceAction for now.
export const runMonitoringBatchAction: ReturnType<typeof action> = action({
  args: {
    cursor: v.optional(v.string()),
    limitSchools: v.optional(v.number()),
    limitPagesPerSchool: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { api } = await import("./_generated/api");

    const limitSchools = Math.max(1, Math.min(50, args.limitSchools ?? 25));

    const page = await ctx.runQuery(api.schools.listSchoolsPaged, {
      cursor: args.cursor,
      limit: limitSchools,
    });

    // Reuse the existing monitoring logic by calling it with an explicit school list.

    const result = await ctx.runAction(api.monitoringActions.runMonitoringOnceAction, {
      limitSchools: limitSchools,
      limitPagesPerSchool: args.limitPagesPerSchool,
      schoolIds: page.page.map((s) => s._id),
    });

    return {
      ok: true,
      cursorIn: args.cursor ?? null,
      cursorOut: page.cursor,
      isDone: page.isDone,
      batch: {
        limitSchools,
        monitoring: result,
      },
    };
  },
});
