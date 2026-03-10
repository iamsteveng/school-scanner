import { query } from "./_generated/server";
import { v } from "convex/values";

export const listLatestSnapshotsForSchool = query({
  args: { schoolId: v.id("schools"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 5;
    const rows = await ctx.db
      .query("school_page_snapshots")
      .withIndex("by_school", (q) => q.eq("schoolId", args.schoolId))
      .order("desc")
      .take(limit);

    return Promise.all(
      rows.map(async (row) => ({
        ...row,
        contentUrl: row.contentStorageId ? await ctx.storage.getUrl(row.contentStorageId) : null,
      })),
    );
  },
});

// NOTE:
// Monitoring runs live in `monitoringActions.runMonitoringOnceAction` because fetch() is only
// available inside Convex actions.
