import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const router = httpRouter();

async function computeTwilioSignature(
  url: string,
  params: Record<string, string>,
  authToken: string,
) {
  const sortedKeys = Object.keys(params).sort();
  const data = sortedKeys.reduce(
    (acc, key) => `${acc}${key}${params[key]}`,
    url,
  );
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(authToken),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  const bytes = new Uint8Array(signature);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

router.route({
  path: "/twilio/status",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (!authToken) {
      return new Response("Missing TWILIO_AUTH_TOKEN", { status: 500 });
    }

    const signature = request.headers.get("x-twilio-signature") ?? "";
    const body = await request.text();
    const params = new URLSearchParams(body);
    const payload: Record<string, string> = {};
    for (const [key, value] of params.entries()) {
      payload[key] = value;
    }

    const computed = await computeTwilioSignature(
      request.url,
      payload,
      authToken,
    );
    const messageSid = payload.MessageSid;
    const status = payload.MessageStatus ?? payload.SmsStatus ?? "unknown";
    const errorCode = payload.ErrorCode ? Number(payload.ErrorCode) : undefined;
    const errorMessage = payload.ErrorMessage || undefined;
    const to = payload.To?.replace(/^whatsapp:/i, "") ?? undefined;
    const signatureValid = Boolean(signature) && computed === signature;

    await ctx.runMutation(internal.whatsappLogs.logWhatsAppWebhook, {
      receivedAt: Date.now(),
      messageSid,
      status,
      errorCode,
      errorMessage,
      to,
      signatureValid,
      requestUrl: request.url,
      rawBody: body,
    });

    if (!signatureValid) {
      return new Response("Invalid signature", { status: 403 });
    }

    if (!messageSid) {
      return new Response("Missing MessageSid", { status: 400 });
    }

    await ctx.runMutation(internal.whatsappLogs.updateWhatsAppStatus, {
      messageSid,
      status,
      errorCode,
      errorMessage,
      to,
    });

    return new Response("ok", { status: 200 });
  }),
});

export default router;
