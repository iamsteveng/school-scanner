"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";

const DEFAULT_ALLOWED_HOSTS = ["localhost", "127.0.0.1", ".vercel.app"];

export function resolveBaseUrl(options: {
  allowDynamic: boolean;
  prodBaseUrl?: string;
  baseUrlFromClient?: string;
  allowedHosts?: string[];
}): string {
  const { allowDynamic, prodBaseUrl, baseUrlFromClient } = options;
  const allowedHosts = options.allowedHosts ?? DEFAULT_ALLOWED_HOSTS;

  if (allowDynamic) {
    if (!baseUrlFromClient) {
      throw new Error("Missing base URL for verification link.");
    }
    const parsed = parseUrl(baseUrlFromClient);
    if (!isAllowedHost(parsed.hostname, allowedHosts)) {
      throw new Error("Base URL host is not allowed.");
    }
    return normalizeBaseUrl(parsed);
  }

  if (!prodBaseUrl) {
    throw new Error("Production base URL is not configured.");
  }
  return normalizeBaseUrl(parseUrl(prodBaseUrl));
}

export function buildVerificationLink(baseUrl: string, token: string): string {
  const normalized = normalizeBaseUrl(parseUrl(baseUrl));
  return `${normalized}/v/${token}`;
}

function parseUrl(value: string): URL {
  try {
    return new URL(value);
  } catch {
    throw new Error("Invalid base URL.");
  }
}

function normalizeBaseUrl(url: URL): string {
  const protocol = url.protocol.toLowerCase();
  if (protocol !== "https:" && protocol !== "http:") {
    throw new Error("Base URL protocol must be http or https.");
  }
  return `${protocol}//${url.host}`;
}

function isAllowedHost(hostname: string, allowedHosts: string[]): boolean {
  const lower = hostname.toLowerCase();
  return allowedHosts.some((allowed) => {
    const rule = allowed.toLowerCase().trim();
    if (!rule) {
      return false;
    }
    if (rule.startsWith(".")) {
      return lower.endsWith(rule);
    }
    return lower === rule;
  });
}

export const sendVerificationWhatsApp = action({
  args: {
    phone: v.string(),
    token: v.string(),
    baseUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const allowDynamic = process.env.ALLOW_DYNAMIC_BASE_URL === "true";
    const prodBaseUrl = process.env.APP_BASE_URL_PROD;
    const allowedHosts = process.env.ALLOWED_BASE_URL_HOSTS?.split(",").map(
      (host) => host.trim(),
    );

    const resolvedBaseUrl = resolveBaseUrl({
      allowDynamic,
      prodBaseUrl,
      baseUrlFromClient: args.baseUrl,
      allowedHosts,
    });

    const verificationLink = buildVerificationLink(
      resolvedBaseUrl,
      args.token,
    );

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_WHATSAPP_FROM;

    if (!accountSid || !authToken || !from) {
      throw new Error("Twilio credentials are not configured.");
    }

    const to = args.phone.startsWith("whatsapp:")
      ? args.phone
      : `whatsapp:${args.phone}`;

    const body = `Your verification link: ${verificationLink}`;

    try {
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${Buffer.from(
              `${accountSid}:${authToken}`,
            ).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            To: to,
            From: from,
            Body: body,
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        await ctx.runMutation(internal.whatsappLogs.logWhatsAppSend, {
          phone: args.phone,
          token: args.token,
          status: "failed",
          provider: "twilio",
          error: errorText,
        });
        throw new Error("Failed to send WhatsApp message.");
      }

      const payload = (await response.json()) as { sid?: string };
      await ctx.runMutation(internal.whatsappLogs.logWhatsAppSend, {
        phone: args.phone,
        token: args.token,
        status: "sent",
        provider: "twilio",
        messageSid: payload.sid,
      });

      return { ok: true };
    } catch (error) {
      if (error instanceof Error) {
        await ctx.runMutation(internal.whatsappLogs.logWhatsAppSend, {
          phone: args.phone,
          token: args.token,
          status: "failed",
          provider: "twilio",
          error: error.message,
        });
      }
      throw error;
    }
  },
});
