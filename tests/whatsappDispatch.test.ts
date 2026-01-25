import { describe, expect, it } from "vitest";
import {
  buildVerificationLink,
  resolveBaseUrl,
} from "../convex/whatsapp";

describe("whatsapp dispatch helpers", () => {
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
});
