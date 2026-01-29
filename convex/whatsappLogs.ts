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

export const updateWhatsAppStatus = internalMutation({
  args: {
    messageSid: v.string(),
    status: v.string(),
    errorCode: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    to: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("whatsapp_message_logs")
      .withIndex("by_message_sid", (q) => q.eq("messageSid", args.messageSid))
      .unique();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        status: args.status,
        errorCode: args.errorCode,
        errorMessage: args.errorMessage,
        statusUpdatedAt: now,
      });
      return;
    }

    await ctx.db.insert("whatsapp_message_logs", {
      phone: args.to ?? "",
      token: "status_callback",
      status: args.status,
      provider: "twilio",
      createdAt: now,
      errorCode: args.errorCode,
      errorMessage: args.errorMessage,
      statusUpdatedAt: now,
      messageSid: args.messageSid,
    });
  },
});
