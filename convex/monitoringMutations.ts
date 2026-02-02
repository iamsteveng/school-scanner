import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const createMonitoringRun = mutation({
  args: { startedAt: v.number() },
  handler: async (ctx, args) => {
    return ctx.db.insert("monitoring_runs", {
      startedAt: args.startedAt,
      status: "running",
      schoolsChecked: 0,
      pagesFetched: 0,
      changesNew: 0,
      changesUpdated: 0,
      changesNone: 0,
      errors: 0,
    });
  },
});

export const finishMonitoringRun = mutation({
  args: {
    runId: v.id("monitoring_runs"),
    finishedAt: v.number(),
    status: v.string(),
    schoolsChecked: v.number(),
    pagesFetched: v.number(),
    changesNew: v.number(),
    changesUpdated: v.number(),
    changesNone: v.number(),
    errors: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.runId, {
      finishedAt: args.finishedAt,
      status: args.status,
      schoolsChecked: args.schoolsChecked,
      pagesFetched: args.pagesFetched,
      changesNew: args.changesNew,
      changesUpdated: args.changesUpdated,
      changesNone: args.changesNone,
      errors: args.errors,
    });
  },
});

export const insertSchoolPageSnapshot = mutation({
  args: {
    schoolId: v.id("schools"),
    url: v.string(),
    fetchedAt: v.number(),
    statusCode: v.optional(v.number()),
    contentType: v.optional(v.string()),
    contentHash: v.optional(v.string()),
    text: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("school_page_snapshots", args);
  },
});

export const upsertAnnouncementBySchoolAndUrl = mutation({
  args: {
    schoolId: v.id("schools"),
    url: v.string(),
    title: v.string(),
    contentText: v.string(),
    contentHash: v.string(),
    firstSeenAt: v.number(),
    lastSeenAt: v.number(),
    changeType: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("announcements")
      .withIndex("by_school_url", (q) => q.eq("schoolId", args.schoolId).eq("url", args.url))
      .first();

    if (existing) {
      // Keep the earliest firstSeenAt; update the rest.
      await ctx.db.patch(existing._id, {
        title: args.title,
        contentText: args.contentText,
        contentHash: args.contentHash,
        lastSeenAt: args.lastSeenAt,
        changeType: args.changeType,
      });
      return existing._id;
    }

    return ctx.db.insert("announcements", args);
  },
});

export const touchAnnouncement = mutation({
  args: {
    announcementId: v.id("announcements"),
    lastSeenAt: v.number(),
    changeType: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.announcementId, {
      lastSeenAt: args.lastSeenAt,
      changeType: args.changeType,
    });
  },
});

export const patchSchoolWebsiteCheck = mutation({
  args: {
    schoolId: v.id("schools"),
    checkedAt: v.number(),
    statusCode: v.optional(v.number()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.schoolId, {
      websiteLastCheckedAt: args.checkedAt,
      websiteLastStatusCode: args.statusCode,
      websiteLastError: args.error,
      updatedAt: args.checkedAt,
    });
  },
});
