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

  if (existingUser) {
    await ctx.db.patch(existingUser._id, {
      updatedAt: now,
      verifiedAt: now,
    });
  } else {
    userId = await ctx.db.insert("users", {
      phone,
      plan: "FREE",
      createdAt: now,
      updatedAt: now,
      verifiedAt: now,
    });
  }

  // Redirect rule:
  // - If the user has already saved a school selection, go to dashboard.
  // - Otherwise, go to /schools to complete onboarding.
  const selection = await ctx.db
    .query("user_school_selections")
    .withIndex("by_user", (q) => q.eq("userId", userId!))
    .unique();

  const hasSelection = !!selection && selection.schoolIds.length > 0;

  return {
    userId: userId!,
    phone,
    redirectTo: hasSelection ? "/dashboard" : "/schools",
  };
}

export const consumeVerificationLink = mutation({
  args: { token: v.string() },
  handler: consumeVerificationLinkHandler,
});
