import { describe, expect, it } from "vitest";
import {
  createStripeCheckoutSessionRequest,
  enforceCheckoutEligibility,
  resolveActiveStripePriceId,
} from "../convex/billingCheckout";

describe("billing checkout", () => {
  it("uses configured active stripe price id", () => {
    const priceId = resolveActiveStripePriceId({
      STRIPE_ACTIVE_PRICE_ID: "price_active_123",
    });
    expect(priceId).toBe("price_active_123");
  });

  it("throws when active stripe price id is missing", () => {
    expect(() => resolveActiveStripePriceId({})).toThrow(
      "Missing STRIPE_ACTIVE_PRICE_ID.",
    );
  });

  it("creates stripe checkout session and returns hosted url", async () => {
    const fetchMock: typeof fetch = (async (_input, init) => {
      expect(init?.method).toBe("POST");
      expect(init?.headers).toMatchObject({
        Authorization: "Bearer sk_test_123",
        "Content-Type": "application/x-www-form-urlencoded",
      });
      const body = init?.body as URLSearchParams;
      expect(body.get("mode")).toBe("subscription");
      expect(body.get("line_items[0][price]")).toBe("price_active_123");
      expect(body.get("success_url")).toBe(
        "https://school-scanner.example.com/billing/success",
      );
      expect(body.get("cancel_url")).toBe(
        "https://school-scanner.example.com/upgrade?canceled=1",
      );
      return {
        ok: true,
        json: async () => ({
          id: "cs_test_123",
          url: "https://checkout.stripe.com/c/pay/cs_test_123",
        }),
      } as Response;
    }) as typeof fetch;

    const result = await createStripeCheckoutSessionRequest({
      secretKey: "sk_test_123",
      priceId: "price_active_123",
      userId: "user_123",
      successUrl: "https://school-scanner.example.com/billing/success",
      cancelUrl: "https://school-scanner.example.com/upgrade?canceled=1",
      fetchImpl: fetchMock,
    });

    expect(result).toEqual({
      ok: true,
      sessionId: "cs_test_123",
      checkoutUrl: "https://checkout.stripe.com/c/pay/cs_test_123",
    });
  });

  it("allows verified FREE users to create checkout sessions", () => {
    const result = enforceCheckoutEligibility({
      plan: "FREE",
      verifiedAt: Date.now(),
    });
    expect(result).toBeNull();
  });

  it("blocks active PREMIUM users with typed ineligible reason", () => {
    const result = enforceCheckoutEligibility({
      plan: "PREMIUM",
      verifiedAt: Date.now(),
    });
    expect(result).toEqual({
      ok: false,
      code: "ineligible",
      reason: "already_premium_active",
      message: "User already has an active premium plan.",
    });
  });

  it("blocks unverified users with typed ineligible reason", () => {
    const result = enforceCheckoutEligibility({
      plan: "FREE",
    });
    expect(result).toEqual({
      ok: false,
      code: "ineligible",
      reason: "user_not_verified",
      message: "User must complete verification before checkout.",
    });
  });
});
