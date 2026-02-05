import { v } from "convex/values";
import { query } from "./_generated/server";

export const getUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;
    return {
      _id: user._id,
      phone: user.phone,
      plan: user.plan ?? "FREE",
    };
  },
});
