import { v } from "convex/values";
import { action } from "./_generated/server";

// Manual / dev helper: run extraction for a single announcement row.
export const extractFromAnnouncement: ReturnType<typeof action> = action({
  args: {
    announcementId: v.id("announcements"),
  },
  handler: async (ctx, args) => {
    const { api } = await import("./_generated/api");

    const row = await ctx.runQuery(api.monitoringQueries.getAnnouncementById, {
      announcementId: args.announcementId,
    });

    if (!row) {
      throw new Error("Announcement not found");
    }

    const extract = await ctx.runAction(api.aiActions.extractEventsFromText, {
      schoolId: row.schoolId,
      sourceUrl: row.url,
      contentText: row.contentText,
      contentHash: row.contentHash,
    });

    const rawJson = (() => {
      try {
        return JSON.stringify(extract.raw ?? null);
      } catch {
        return undefined;
      }
    })();

    const extractEvents = (extract.events ?? []).map((ev: Record<string, unknown>) => ({
      ...ev,
      rawExtractJson: rawJson,
    }));

    if (extractEvents.length > 0) {
      await ctx.runMutation(api.eventMutations.upsertEventsFromExtract, {
        schoolId: row.schoolId,
        sourceUrl: row.url,
        sourceContentHash: row.contentHash,
        events: extractEvents,
        overallConfidence: typeof extract.confidence === "number" ? extract.confidence : undefined,
        raw: rawJson,
      });
    }

    return {
      ok: true,
      provider: extract.provider,
      extractedCount: extractEvents.length,
    };
  },
});
