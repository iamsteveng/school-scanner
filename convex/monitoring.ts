import { query } from "./_generated/server";
import { v } from "convex/values";

export const listLatestSnapshotsForSchool = query({
  args: { schoolId: v.id("schools"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 5;
    return ctx.db
      .query("school_page_snapshots")
      .withIndex("by_school", (q) => q.eq("schoolId", args.schoolId))
      .order("desc")
      .take(limit);
  },
});

// NOTE:
// Monitoring runs live in `monitoringActions.runMonitoringOnceAction` because fetch() is only
// available inside Convex actions.
