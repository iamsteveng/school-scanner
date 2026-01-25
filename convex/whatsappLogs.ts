import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

export const logWhatsAppSend = internalMutation({
  args: {
    phone: v.string(),
    token: v.string(),
    status: v.string(),
    provider: v.string(),
    error: v.optional(v.string()),
    messageSid: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("whatsapp_message_logs", {
      phone: args.phone,
      token: args.token,
      status: args.status,
      provider: args.provider,
      createdAt: Date.now(),
      error: args.error,
      messageSid: args.messageSid,
    });
  },
});
