import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

// DANGEROUS: development-only cleanup helpers.
// Convex has a per-function read limit (bytes). To stay under it, we delete in small batches
// and only operate on ONE table per invocation.

type TableName =
  | "school_page_snapshots"
  | "announcements"
  | "events"
  | "monitoring_runs"
  | "url_audit_fixes"
  | "url_audit_state";

export const wipeTableBatch = internalMutation({
  args: {
    confirm: v.literal("WIPE_CRON_DATA"),
    table: v.union(
      v.literal("school_page_snapshots"),
      v.literal("announcements"),
      v.literal("events"),
      v.literal("monitoring_runs"),
      v.literal("url_audit_fixes"),
      v.literal("url_audit_state"),
    ),
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const batchSize = Math.max(1, Math.min(20, args.batchSize ?? 5));

    // Read only a handful of full documents to stay under Convex read byte limits.
    const batch = await ctx.db
      .query(args.table as TableName)
      .order("desc")
      .take(batchSize);

    for (const row of batch) {
      await ctx.db.delete(row._id);
    }

    return {
      ok: true,
      table: args.table,
      deleted: batch.length,
      done: batch.length < batchSize,
      batchSize,
    };
  },
});

export const resetSchoolsAuditMonitoringFields = internalMutation({
  args: { confirm: v.literal("WIPE_CRON_DATA") },
  handler: async (ctx) => {
    // Schools dataset is currently small; patch in a single pass.
    const schools = await ctx.db.query("schools").take(5000);
    const now = Date.now();

    for (const s of schools) {
      await ctx.db.patch(s._id, {
        announcementsUrl: undefined,
        websiteLastCheckedAt: undefined,
        websiteLastStatusCode: undefined,
        websiteLastError: undefined,
        websiteConfidence: undefined,
        websiteValidationReasons: undefined,
        websiteSuggestedAnnouncementUrls: undefined,
        needsWebsiteReview: undefined,
        auditStatus: undefined,
        auditLastCheckedAt: undefined,
        updatedAt: now,
      });
    }

    return { ok: true, schoolsPatched: schools.length };
  },
});
