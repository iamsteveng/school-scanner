import { query } from "./_generated/server";
import { v } from "convex/values";

export const getSchoolsForMonitoring = query({
  args: { limit: v.number(), q: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const limit = args.limit;
    const q = args.q?.trim().toLowerCase();

    // If searching, scan a bigger slice (no full-text index yet).
    const scanLimit = q ? Math.max(limit, 5000) : limit;
    const schools = await ctx.db.query("schools").take(scanLimit);

    if (!q) return schools.slice(0, limit);

    return schools
      .filter((s) => s.nameEn.toLowerCase().includes(q) || s.nameZh.toLowerCase().includes(q))
      .slice(0, limit);
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

export const listSchoolsNeedingWebsiteReview = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    const all = await ctx.db.query("schools").take(5000);
    return all
      .filter((s) => s.needsWebsiteReview)
      .sort((a, b) => (b.websiteLastCheckedAt ?? 0) - (a.websiteLastCheckedAt ?? 0))
      .slice(0, limit);
  },
});
