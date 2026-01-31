"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { signJwt } from "./jwt";
import type { ActionCtx } from "./_generated/server";
import type { ConsumeVerificationResult } from "./verificationMutations";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

type ConsumeVerificationLinkResponse = {
  token: string;
  redirectTo: "/schools" | "/dashboard";
};

export const consumeVerificationLinkAction = action({
  args: { token: v.string() },
  handler: async (
    ctx: ActionCtx,
    args: { token: string },
  ): Promise<ConsumeVerificationLinkResponse> => {
    const result: ConsumeVerificationResult = await ctx.runMutation(
      api.verificationMutations.consumeVerificationLink,
      { token: args.token },
    );

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
