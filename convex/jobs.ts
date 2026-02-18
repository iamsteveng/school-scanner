import { v } from "convex/values";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { api, internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { sendWhatsAppMessage } from "./whatsapp";

export type DailyPremiumCandidate = {
  userId: Id<"users">;
  phone: string;
  plan: Doc<"users">["plan"];
  verifiedAt?: number;
};

export function isDailyPremiumCandidate(user: {
  plan?: "FREE" | "PREMIUM";
  verifiedAt?: number;
}): boolean {
  return user.plan === "PREMIUM" && typeof user.verifiedAt === "number";
}

export function getPreviousUtcDayWindow(nowMs: number): {
  windowStart: number;
  windowEnd: number;
} {
  const now = new Date(nowMs);
  const startOfTodayUtc = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  const windowEnd = startOfTodayUtc - 1;
  const windowStart = windowEnd - (24 * 60 * 60 * 1000 - 1);
  return { windowStart, windowEnd };
}

function formatDailySummaryMessage(args: {
  windowStart: number;
  windowEnd: number;
  updatedSchoolCount: number;
  totalRelevantUpdates: number;
  missedSchoolsCount: number;
}): string {
  const windowStartIso = new Date(args.windowStart).toISOString().slice(0, 10);
  const windowEndIso = new Date(args.windowEnd).toISOString().slice(0, 10);
  return [
    `School Scanner daily summary (${windowStartIso} to ${windowEndIso} UTC)`,
    `Updated schools: ${args.updatedSchoolCount}`,
    `Relevant updates: ${args.totalRelevantUpdates}`,
    `Selected schools without updates: ${args.missedSchoolsCount}`,
  ].join("\n");
}

export const listDailyPremiumCandidates = internalQuery({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<DailyPremiumCandidate[]> => {
    const users = await ctx.db.query("users").collect();
    const candidates: DailyPremiumCandidate[] = [];

    for (const user of users) {
      if (!isDailyPremiumCandidate(user)) {
        continue;
      }
      candidates.push({
        userId: user._id,
        phone: user.phone,
        plan: user.plan,
        verifiedAt: user.verifiedAt,
      });
      if (args.limit && candidates.length >= args.limit) {
        break;
      }
    }

    return candidates;
  },
});

export const noopCron = internalMutation({
  args: { label: v.optional(v.string()) },
  handler: async (_ctx, args) => {
    const label = args.label ?? "scheduled";
    console.log(`cron: ${label}`);
  },
});

// NOTE: Explicit type annotation avoids a Next.js/TS circular inference issue when typechecking
// Convex internal action definitions inside the Next.js app repo.
export const monitoringCron: ReturnType<typeof internalAction> = internalAction({
  args: {
    limitSchools: v.optional(v.number()),
    limitPagesPerSchool: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Daily kickoff: reset paging cursor so batch cron can sweep all schools.
    await ctx.runMutation(internal.monitoringState.ensureState, {});
    await ctx.runMutation(internal.monitoringState.startNewDailyRun, {});

    // Also run one batch immediately (optional) so we don't wait 10 mins for the first tick.
    return await ctx.runAction(api.monitoringBatchActions.runMonitoringBatchAction, {
      cursor: undefined,
      limitSchools: args.limitSchools ?? 25,
      limitPagesPerSchool: args.limitPagesPerSchool,
    });
  },
});

export const monitoringBatchCron: ReturnType<typeof internalAction> = internalAction({
  args: {
    limitSchools: v.optional(v.number()),
    limitPagesPerSchool: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.monitoringState.ensureState, {});
    const state = await ctx.runQuery(api.monitoringState.getState, {});
    if (!state?.running) {
      return { ok: true, skipped: true };
    }

    const result = await ctx.runAction(api.monitoringBatchActions.runMonitoringBatchAction, {
      cursor: state.cursor,
      limitSchools: args.limitSchools ?? 25,
      limitPagesPerSchool: args.limitPagesPerSchool,
    });

    if (result && typeof result === "object") {
      const r = result as Record<string, unknown>;
      const cursorOut = typeof r.cursorOut === "string" ? r.cursorOut : undefined;
      const isDone = !!r.isDone;
      await ctx.runMutation(internal.monitoringState.updateAfterBatch, {
        cursor: cursorOut,
        isDone,
      });
    }

    return result;
  },
});

export const monthlySchoolSeedRefreshCron: ReturnType<typeof internalAction> =
  internalAction({
    args: {},
    handler: async (ctx) => {
      return await ctx.runMutation(internal.schools.refreshPrimarySchoolsFromSeed, {
        wipeExisting: true,
      });
    },
  });

export const continuousUrlAuditCron: ReturnType<typeof internalAction> = internalAction({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.urlAuditState.ensureState, {});
    return await ctx.runAction(api.websiteAuditActions.runContinuousUrlAuditBatch, {
      limit: args.limit,
      staleDays: 30,
    });
  },
});

export const runDailyPremiumSummaryDelivery: ReturnType<typeof internalAction> =
  internalAction({
    args: {
      windowStart: v.optional(v.number()),
      windowEnd: v.optional(v.number()),
      limitUsers: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
      const nowMs = Date.now();
      const defaultWindow = getPreviousUtcDayWindow(nowMs);
      const windowStart = args.windowStart ?? defaultWindow.windowStart;
      const windowEnd = args.windowEnd ?? defaultWindow.windowEnd;

      const candidates = await ctx.runQuery(
        internal.jobs.listDailyPremiumCandidates,
        { limit: args.limitUsers },
      );

      let sent = 0;
      let skipped = 0;
      let failed = 0;
      for (const candidate of candidates) {
        try {
          const summary = await ctx.runAction(
            internal.summaryGeneration.generateSummaryInternal,
            {
              userId: candidate.userId,
              cadence: "daily",
              windowStart,
              windowEnd,
            },
          );

          if (summary.status !== "eligible") {
            skipped += 1;
            continue;
          }

          const token = `summary_daily_${candidate.userId}_${windowStart}_${windowEnd}`;
          await sendWhatsAppMessage({
            ctx,
            phone: candidate.phone,
            token,
            body: formatDailySummaryMessage({
              windowStart,
              windowEnd,
              updatedSchoolCount: summary.updatedSchoolCount,
              totalRelevantUpdates: summary.totalRelevantUpdates,
              missedSchoolsCount: summary.missedSchoolsCount,
            }),
          });
          sent += 1;
        } catch (error) {
          failed += 1;
          console.error("daily premium summary send failed", {
            userId: candidate.userId,
            error: error instanceof Error ? error.message : "unknown_error",
          });
        }
      }

      return {
        cadence: "daily" as const,
        windowStart,
        windowEnd,
        attempted: candidates.length,
        sent,
        skipped,
        failed,
      };
    },
  });
