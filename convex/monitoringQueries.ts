import { query } from "./_generated/server";
import { v } from "convex/values";

export const getSchoolsForMonitoring = query({
  args: { limit: v.number() },
  handler: async (ctx, args) => {
    return ctx.db.query("schools").take(args.limit);
  },
});

export const getLatestSnapshotHash = query({
  args: { schoolId: v.id("schools"), url: v.string() },
  handler: async (ctx, args) => {
    const prev = await ctx.db
      .query("school_page_snapshots")
      .withIndex("by_school_url", (q) => q.eq("schoolId", args.schoolId).eq("url", args.url))
      .order("desc")
      .first();

    return { contentHash: prev?.contentHash };
  },
});

export const getAnnouncementBySchoolAndUrl = query({
  args: { schoolId: v.id("schools"), url: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("announcements")
      .withIndex("by_school_url", (q) => q.eq("schoolId", args.schoolId).eq("url", args.url))
      .first();
  },
});
