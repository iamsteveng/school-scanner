import { describe, expect, it, vi } from "vitest";
import { decodeJwtPayload, getCookie } from "../src/lib/session";

describe("session helpers", () => {
  it("decodes jwt payload", () => {
    // header/payload are base64url; signature irrelevant for decoding.
    const token =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
      "eyJzdWIiOiJ1c2VyXzEyMyIsInBob25lIjoiKzg1MjEyMzQ1Njc4IiwiZXhwIjoxMjM0NTZ9." +
      "sig";

    expect(decodeJwtPayload(token)).toEqual({
      sub: "user_123",
      phone: "+85212345678",
      exp: 123456,
    });
  });

  it("reads cookies in browser", () => {
    vi.stubGlobal(
      "document",
      {
        cookie: "a=1; ss_session=hello%20world; b=3",
      } as unknown as Document,
    );

    expect(getCookie("ss_session")).toBe("hello world");
  });
});
