import { v } from "convex/values";
import { mutation } from "./_generated/server";

function stableHash(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

export const upsertEventsFromExtract = mutation({
  args: {
    schoolId: v.id("schools"),
    sourceUrl: v.string(),
    sourceContentHash: v.string(),
    events: v.array(
      v.object({
        title: v.string(),
        eventAt: v.optional(v.number()),
        registrationOpenAt: v.optional(v.number()),
        registrationCloseAt: v.optional(v.number()),
        quota: v.optional(v.number()),
        targetStudentYears: v.optional(v.array(v.string())),
        targetAdmissionYear: v.optional(v.string()),
        language: v.optional(v.union(v.literal("zh"), v.literal("en"), v.literal("mixed"))),
        confidence: v.optional(v.number()),
        rawExtractJson: v.optional(v.string()),
        extractionNotes: v.optional(v.string()),
      }),
    ),
    overallConfidence: v.optional(v.number()),
    raw: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const results: { eventHash: string; created: boolean; updated: boolean }[] = [];

    for (const e of args.events.slice(0, 10)) {
      const eventHash = stableHash(
        [
          args.schoolId,
          args.sourceUrl,
          args.sourceContentHash,
          e.title.trim().toLowerCase(),
          e.eventAt != null ? String(e.eventAt) : "",
        ].join("|"),
      );

      const existing = await ctx.db
        .query("events")
        .withIndex("by_event_hash", (q) => q.eq("eventHash", eventHash))
        .unique();

      const row = {
        schoolId: args.schoolId,
        sourceUrl: args.sourceUrl,
        sourceContentHash: args.sourceContentHash,
        eventHash,
        title: e.title.trim().slice(0, 200),
        eventAt: e.eventAt,
        registrationOpenAt: e.registrationOpenAt,
        registrationCloseAt: e.registrationCloseAt,
        quota: e.quota,
        targetStudentYears: e.targetStudentYears,
        targetAdmissionYear: e.targetAdmissionYear,
        language: e.language,
        confidence: e.confidence ?? args.overallConfidence,
        rawExtractJson: e.rawExtractJson ?? args.raw,
        extractionNotes: e.extractionNotes,
        updatedAt: now,
      };

      if (!existing) {
        await ctx.db.insert("events", {
          ...row,
          createdAt: now,
        });
        results.push({ eventHash, created: true, updated: false });
      } else {
        await ctx.db.patch(existing._id, row);
        results.push({ eventHash, created: false, updated: true });
      }
    }

    return { ok: true, count: results.length, results };
  },
});
