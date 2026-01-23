import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

export const noopCron = internalMutation({
  args: { label: v.optional(v.string()) },
  handler: async (_ctx, args) => {
    const label = args.label ?? "scheduled";
    console.log(`cron: ${label}`);
  },
});
