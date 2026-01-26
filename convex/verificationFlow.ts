"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { sendWhatsAppVerification } from "./whatsapp";

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
