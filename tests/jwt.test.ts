import { describe, expect, it } from "vitest";
import { signJwt } from "../convex/jwt";

function base64UrlDecode(input: string) {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (padded.length % 4)) % 4;
  const withPadding = padded + "=".repeat(padLength);
  return Buffer.from(withPadding, "base64").toString("utf-8");
}

describe("jwt signing", () => {
  it("creates a token with the expected payload", () => {
    const token = signJwt("secret", {
      sub: "user_1",
      phone: "+85251234567",
      exp: 1700000000,
    });

    const [, payload] = token.split(".");
    const decoded = JSON.parse(base64UrlDecode(payload));

    expect(decoded.sub).toBe("user_1");
    expect(decoded.phone).toBe("+85251234567");
    expect(decoded.exp).toBe(1700000000);
  });
});
