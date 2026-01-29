"use node";

import { v } from "convex/values";
import { action, mutation } from "./_generated/server";
import { api } from "./_generated/api";
import { sendWhatsAppVerification } from "./whatsapp";
import { consumeVerificationTokenHandler } from "./verificationTokens";
import { signJwt } from "./jwt";

export const startVerification = action({
  args: {
    phone: v.string(),
    baseUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { token } = await ctx.runMutation(
      api.verificationTokens.createVerificationToken,
      { phone: args.phone },
    );

    await sendWhatsAppVerification({
      ctx,
      phone: args.phone,
      token,
      baseUrl: args.baseUrl,
    });

    return { ok: true };
  },
});

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export async function consumeVerificationLinkHandler(
  ctx: Parameters<typeof consumeVerificationTokenHandler>[0],
  args: { token: string },
): Promise<{
  userId: string;
  phone: string;
  redirectTo: "/schools" | "/dashboard";
}> {
  const now = Date.now();
  const { phone } = await consumeVerificationTokenHandler(ctx, {
    token: args.token,
  });

  const existingUser = await ctx.db
    .query("users")
    .withIndex("by_phone", (q) => q.eq("phone", phone))
    .unique();

  let userId = existingUser?._id;
  const isNewUser = !existingUser;

  if (existingUser) {
    await ctx.db.patch(existingUser._id, {
      updatedAt: now,
      verifiedAt: now,
    });
  } else {
    userId = await ctx.db.insert("users", {
      phone,
      createdAt: now,
      updatedAt: now,
      verifiedAt: now,
    });
  }

  return {
    userId: userId!,
    phone,
    redirectTo: isNewUser ? "/schools" : "/dashboard",
  };
}

export const consumeVerificationLink = mutation({
  args: { token: v.string() },
  handler: consumeVerificationLinkHandler,
});

export const consumeVerificationLinkAction = action({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const result = await ctx.runMutation(api.verificationFlow.consumeVerificationLink, {
      token: args.token,
    });

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("Missing JWT_SECRET.");
    }

    const token = signJwt(secret, {
      sub: result.userId,
      phone: result.phone,
      exp: Math.floor((Date.now() + SESSION_TTL_MS) / 1000),
    });

    return { token, redirectTo: result.redirectTo };
  },
});
