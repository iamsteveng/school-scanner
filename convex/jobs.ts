import { v } from "convex/values";
import { internalAction, internalMutation } from "./_generated/server";
import { api } from "./_generated/api";

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
    // Run the public action from an internal cron entrypoint.
    return await ctx.runAction(api.monitoringActions.runMonitoringOnceAction, {
      limitSchools: args.limitSchools,
      limitPagesPerSchool: args.limitPagesPerSchool,
    });
  },
});
