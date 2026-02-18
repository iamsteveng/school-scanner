import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildVerificationLink,
  resolveBaseUrl,
  sendWhatsAppMessage,
} from "../convex/whatsapp";

describe("whatsapp dispatch helpers", () => {
  const envSnapshot = {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    from: process.env.TWILIO_WHATSAPP_FROM,
    statusCallback: process.env.TWILIO_STATUS_CALLBACK_URL,
  };

  afterEach(() => {
    process.env.TWILIO_ACCOUNT_SID = envSnapshot.accountSid;
    process.env.TWILIO_AUTH_TOKEN = envSnapshot.authToken;
    process.env.TWILIO_WHATSAPP_FROM = envSnapshot.from;
    process.env.TWILIO_STATUS_CALLBACK_URL = envSnapshot.statusCallback;
    vi.restoreAllMocks();
  });

  it("uses production base URL when dynamic is disabled", () => {
    const baseUrl = resolveBaseUrl({
      allowDynamic: false,
      prodBaseUrl: "https://school-scanner.example.com",
    });
    expect(baseUrl).toBe("https://school-scanner.example.com");
  });

  it("uses client base URL when dynamic is enabled", () => {
    const baseUrl = resolveBaseUrl({
      allowDynamic: true,
      baseUrlFromClient: "https://preview-123.vercel.app/path",
      allowedHosts: [".vercel.app"],
    });
    expect(baseUrl).toBe("https://preview-123.vercel.app");
  });

  it("rejects disallowed base URL hosts", () => {
    expect(() =>
      resolveBaseUrl({
        allowDynamic: true,
        baseUrlFromClient: "https://evil.example.com",
        allowedHosts: [".vercel.app"],
      }),
    ).toThrow("Base URL host is not allowed.");
  });

  it("builds verification link with token", () => {
    const link = buildVerificationLink(
      "https://school-scanner.example.com/",
      "token-123",
    );
    expect(link).toBe("https://school-scanner.example.com/v/token-123");
  });

  it("logs successful sends for delivery messages", async () => {
    process.env.TWILIO_ACCOUNT_SID = "AC123";
    process.env.TWILIO_AUTH_TOKEN = "secret";
    process.env.TWILIO_WHATSAPP_FROM = "whatsapp:+12345678";
    process.env.TWILIO_STATUS_CALLBACK_URL = undefined;

    const runMutation = vi.fn().mockResolvedValue(undefined);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ sid: "SM123" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await sendWhatsAppMessage({
      ctx: { runMutation },
      phone: "+85212345678",
      body: "Daily summary",
      token: "summary_daily_user_1_1_2",
    });

    expect(res.ok).toBe(true);
    expect(res.messageSid).toBe("SM123");
    expect(runMutation).toHaveBeenCalledTimes(1);
    expect(runMutation.mock.calls[0]?.[1]).toMatchObject({
      phone: "+85212345678",
      token: "summary_daily_user_1_1_2",
      status: "sent",
      provider: "twilio",
      messageSid: "SM123",
    });
  });

  it("logs successful sends for weekly delivery messages", async () => {
    process.env.TWILIO_ACCOUNT_SID = "AC123";
    process.env.TWILIO_AUTH_TOKEN = "secret";
    process.env.TWILIO_WHATSAPP_FROM = "whatsapp:+12345678";
    process.env.TWILIO_STATUS_CALLBACK_URL = undefined;

    const runMutation = vi.fn().mockResolvedValue(undefined);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ sid: "SM999" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await sendWhatsAppMessage({
      ctx: { runMutation },
      phone: "+85212345678",
      body: "Weekly summary",
      token: "summary_weekly_user_1_1_7",
    });

    expect(res.ok).toBe(true);
    expect(res.messageSid).toBe("SM999");
    expect(runMutation).toHaveBeenCalledTimes(1);
    expect(runMutation.mock.calls[0]?.[1]).toMatchObject({
      phone: "+85212345678",
      token: "summary_weekly_user_1_1_7",
      status: "sent",
      provider: "twilio",
      messageSid: "SM999",
    });
  });
});
