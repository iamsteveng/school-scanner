import { v } from "convex/values";
import { query } from "./_generated/server";

export const getDashboardForUser = query({
  args: {
    userId: v.id("users"),
    limitUpdates: v.optional(v.number()),
    sinceAt: v.optional(v.number()),
    perSchoolLimit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const limitUpdates = Math.max(1, Math.min(200, args.limitUpdates ?? 50));
    const perSchoolLimit = Math.max(1, Math.min(20, args.perSchoolLimit ?? 5));

    const selection = await ctx.db
      .query("user_school_selections")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();

    const schoolIds = selection?.schoolIds ?? [];

    const schools = await Promise.all(schoolIds.map((id) => ctx.db.get(id)));
    const schoolById = new Map(
      schools
        .filter((s): s is NonNullable<typeof s> => !!s)
        .map((s) => [s._id, s]),
    );

    const updates: Array<
      | {
          kind: "announcement";
          schoolId: string;
          schoolNameZh: string;
          schoolNameEn: string;
          title: string;
          url: string;
          changeType: string;
          at: number;
        }
      | {
          kind: "event";
          schoolId: string;
          schoolNameZh: string;
          schoolNameEn: string;
          title: string;
          sourceUrl: string;
          at: number;
          eventAt?: number;
          registrationOpenAt?: number;
          registrationCloseAt?: number;
          quota?: number;
          targetAdmissionYear?: string;
          confidence?: number;
        }
    > = [];

    for (const schoolId of schoolIds) {
      const school = schoolById.get(schoolId);
      if (!school) continue;

      const anns = await ctx.db
        .query("announcements")
        .withIndex("by_school", (q) => q.eq("schoolId", schoolId))
        .order("desc")
        .take(perSchoolLimit);

      for (const a of anns) {
        updates.push({
          kind: "announcement",
          schoolId: String(a.schoolId),
          schoolNameZh: school.nameZh,
          schoolNameEn: school.nameEn,
          title: a.title,
          url: a.url,
          changeType: a.changeType,
          at: a.lastSeenAt,
        });
      }

      const evs = await ctx.db
        .query("events")
        .withIndex("by_school", (q) => q.eq("schoolId", schoolId))
        .order("desc")
        .take(perSchoolLimit);

      const now = Date.now();
      for (const e of evs) {
        const effectiveAt =
          typeof e.eventAt === "number"
            ? e.eventAt
            : typeof e.registrationCloseAt === "number"
              ? e.registrationCloseAt
              : null;

        // Only show future events (or unknown-dated events) on the dashboard.
        if (effectiveAt !== null && effectiveAt < now) {
          continue;
        }

        updates.push({
          kind: "event",
          schoolId: String(e.schoolId),
          schoolNameZh: school.nameZh,
          schoolNameEn: school.nameEn,
          title: e.title,
          sourceUrl: e.sourceUrl,
          at: e.updatedAt,
          eventAt: e.eventAt,
          registrationOpenAt: e.registrationOpenAt,
          registrationCloseAt: e.registrationCloseAt,
          quota: e.quota,
          targetAdmissionYear: e.targetAdmissionYear,
          confidence: e.confidence,
        });
      }
    }

    updates.sort((a, b) => b.at - a.at);
    const limited = updates.slice(0, limitUpdates);

    const sinceAt = args.sinceAt;
    const sinceCounts =
      sinceAt !== undefined
        ? {
            total: limited.filter((u) => u.at >= sinceAt).length,
            announcements: limited.filter(
              (u) => u.kind === "announcement" && u.at >= sinceAt,
            ).length,
            events: limited.filter((u) => u.kind === "event" && u.at >= sinceAt)
              .length,
          }
        : null;

    const latestMonitoringRun = await ctx.db
      .query("monitoring_runs")
      .order("desc")
      .take(1);

    // "Last checked" should reflect monitoring freshness for the user's selected schools.
    // Use the per-school websiteLastCheckedAt (set by monitoring) rather than snapshots,
    // because we may not snapshot every school on every run.
    const lastCheckedAt = Math.max(
      0,
      ...schools
        .filter((s): s is NonNullable<typeof s> => !!s)
        .map((s) => (typeof s.websiteLastCheckedAt === "number" ? s.websiteLastCheckedAt : 0)),
    );

    return {
      ok: true,
      user: {
        id: user._id,
        phone: user.phone,
        plan: user.plan ?? "FREE",
      },
      selection: selection
        ? {
            schoolIds: selection.schoolIds,
            lockedAt: selection.lockedAt ?? null,
            updatedAt: selection.updatedAt,
          }
        : null,
      schools: schools.filter((s): s is NonNullable<typeof s> => !!s),
      monitoring: latestMonitoringRun[0] ?? null,
      userMonitoringStatus: {
        trackedCount: schoolIds.length,
        lastCheckedAt: lastCheckedAt > 0 ? lastCheckedAt : null,
      },
      updates: limited,
      sinceCounts,
    };
  },
});
