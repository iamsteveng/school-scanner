import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

// DANGEROUS: wipes derived data created by scheduled jobs during development.
// Use only when you intentionally want to reset monitoring/audit/event outputs.
export const wipeCronGeneratedData = internalMutation({
  args: { confirm: v.literal("WIPE_CRON_DATA") },
  handler: async (ctx) => {
    // Delete in a safe order (children first).
    const schoolPageSnapshots = await ctx.db.query("school_page_snapshots").collect();
    for (const row of schoolPageSnapshots) await ctx.db.delete(row._id);

    const announcements = await ctx.db.query("announcements").collect();
    for (const row of announcements) await ctx.db.delete(row._id);

    const events = await ctx.db.query("events").collect();
    for (const row of events) await ctx.db.delete(row._id);

    const monitoringRuns = await ctx.db.query("monitoring_runs").collect();
    for (const row of monitoringRuns) await ctx.db.delete(row._id);

    const urlAuditFixes = await ctx.db.query("url_audit_fixes").collect();
    for (const row of urlAuditFixes) await ctx.db.delete(row._id);

    const urlAuditState = await ctx.db.query("url_audit_state").collect();
    for (const row of urlAuditState) await ctx.db.delete(row._id);

    // Reset school audit/monitoring fields so the next cron run repopulates cleanly.
    const schools = await ctx.db.query("schools").collect();
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
        updatedAt: Date.now(),
      });
    }

    return {
      ok: true,
      deleted: {
        school_page_snapshots: schoolPageSnapshots.length,
        announcements: announcements.length,
        events: events.length,
        monitoring_runs: monitoringRuns.length,
        url_audit_fixes: urlAuditFixes.length,
        url_audit_state: urlAuditState.length,
        schools_patched: schools.length,
      },
    };
  },
});
