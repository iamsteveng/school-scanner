import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { consumeVerificationTokenHandler } from "./verificationTokens";

export type ConsumeVerificationResult = {
  userId: string;
  phone: string;
  redirectTo: "/schools" | "/dashboard";
};

export async function consumeVerificationLinkHandler(
  ctx: Parameters<typeof consumeVerificationTokenHandler>[0],
  args: { token: string },
): Promise<ConsumeVerificationResult> {
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
