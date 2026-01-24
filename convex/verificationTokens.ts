import { mutation } from "./_generated/server";
import { v } from "convex/values";

const TEN_MINUTES_MS = 10 * 60 * 1000;

export const createVerificationToken = mutation({
  args: { phone: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("verification_tokens")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .collect();

    await Promise.all(
      existing.map((doc) =>
        ctx.db.patch(doc._id, {
          usedAt: now,
        }),
      ),
    );

    const token = crypto.randomUUID();
    const expiresAt = now + TEN_MINUTES_MS;

    await ctx.db.insert("verification_tokens", {
      token,
      phone: args.phone,
      createdAt: now,
      expiresAt,
    });

    return { token, expiresAt };
  },
});

export const consumeVerificationToken = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();
    const tokenDoc = await ctx.db
      .query("verification_tokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (!tokenDoc) {
      throw new Error("Invalid token.");
    }

    if (tokenDoc.usedAt) {
      throw new Error("Token already used.");
    }

    if (tokenDoc.expiresAt < now) {
      throw new Error("Token expired.");
    }

    await ctx.db.patch(tokenDoc._id, { usedAt: now });

    return { phone: tokenDoc.phone };
  },
});
