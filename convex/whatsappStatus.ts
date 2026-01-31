"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

const LOOKBACK_MS = 24 * 60 * 60 * 1000;

export const syncTwilioStatuses = internalAction({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (!accountSid || !authToken) {
      throw new Error("Twilio credentials are not configured.");
    }

    const recent = await ctx.runQuery(internal.whatsappLogs.listRecentMessageLogs, {
      limit: args.limit ?? 50,
    });

    const cutoff = Date.now() - LOOKBACK_MS;
    const pending = recent.filter(
      (log) =>
        typeof log.messageSid === "string" &&
        !log.statusUpdatedAt &&
        log.createdAt >= cutoff,
    );

    for (const log of pending) {
      if (!log.messageSid) {
        continue;
      }
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages/${log.messageSid}.json`,
        {
          headers: {
            Authorization: `Basic ${Buffer.from(
              `${accountSid}:${authToken}`,
            ).toString("base64")}`,
          },
        },
      );

      if (!response.ok) {
        continue;
      }

      const payload = (await response.json()) as {
        status?: string;
        error_code?: number | null;
        error_message?: string | null;
        to?: string;
      };

      await ctx.runMutation(internal.whatsappLogs.updateWhatsAppStatus, {
        messageSid: log.messageSid,
        status: payload.status ?? "unknown",
        errorCode: payload.error_code ?? undefined,
        errorMessage: payload.error_message ?? undefined,
        to: payload.to?.replace(/^whatsapp:/i, ""),
      });
    }
  },
});
