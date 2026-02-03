import { v } from "convex/values";
import { internalMutation, mutation } from "./_generated/server";

export const setPlan = internalMutation({
  args: { userId: v.id("users"), plan: v.union(v.literal("FREE"), v.literal("PREMIUM")) },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    await ctx.db.patch(args.userId, {
      plan: args.plan,
      updatedAt: Date.now(),
    });

    return { ok: true };
  },
});

export const backfillDefaultPlans = internalMutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    let updated = 0;
    const now = Date.now();
    for (const user of users) {
      if (!user.plan) {
        await ctx.db.patch(user._id, { plan: "FREE", updatedAt: now });
        updated++;
      }
    }
    return { updated };
  },
});

// Optional public mutation for dev/testing environments.
// In production we should remove or gate it.
export const setPlanDev = mutation({
  args: { userId: v.id("users"), plan: v.union(v.literal("FREE"), v.literal("PREMIUM")) },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    await ctx.db.patch(args.userId, {
      plan: args.plan,
      updatedAt: Date.now(),
    });

    return { ok: true };
  },
});
