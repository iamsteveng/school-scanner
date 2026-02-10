import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";

export const logAutoFix = internalMutation({
  args: {
    schoolId: v.id("schools"),
    oldWebsiteUrl: v.optional(v.string()),
    newWebsiteUrl: v.optional(v.string()),
    oldAnnouncementsUrl: v.optional(v.string()),
    newAnnouncementsUrl: v.optional(v.string()),
    confidence: v.number(),
    reason: v.optional(v.string()),
    model: v.string(),
    baseUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.insert("url_audit_fixes", {
      ...args,
      createdAt: now,
    });
  },
});

export const listRecentFixes = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(200, args.limit ?? 50));
    // No index on createdAt yet; dataset should stay small. Add an index later if needed.
    const rows = await ctx.db.query("url_audit_fixes").order("desc").take(limit);
    return rows;
  },
});
