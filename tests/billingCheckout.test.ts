import { describe, expect, it } from "vitest";
import {
  buildCheckoutRedirectUrls,
  createStripeCheckoutSessionRequest,
  enforceCheckoutDebounceAttempt,
  enforceCheckoutEligibility,
  releaseCheckoutDebounceAttempt,
  resolveCheckoutRedirectUrls,
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
      expect(body.get("metadata[internal_user_id]")).toBe("user_123");
      expect(body.get("metadata[plan_context]")).toBe("premium_subscription");
      expect(body.get("metadata[source]")).toBe("upgrade_page");
      expect(body.get("subscription_data[metadata][internal_user_id]")).toBe(
        "user_123",
      );
      expect(body.get("subscription_data[metadata][plan_context]")).toBe(
        "premium_subscription",
      );
      expect(body.get("subscription_data[metadata][source]")).toBe(
        "upgrade_page",
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

  it("builds fixed checkout redirect paths from base url", () => {
    const urls = buildCheckoutRedirectUrls(
      "https://school-scanner.example.com",
    );
    expect(urls).toEqual({
      successUrl: "https://school-scanner.example.com/billing/success",
      cancelUrl: "https://school-scanner.example.com/upgrade?canceled=1",
    });
  });

  it("normalizes APP_BASE_URL_PROD and preserves fixed redirect contract", () => {
    const urls = resolveCheckoutRedirectUrls({
      APP_BASE_URL_PROD:
        "https://school-scanner.example.com/app?utm_source=test#fragment",
    });
    expect(urls).toEqual({
      successUrl: "https://school-scanner.example.com/billing/success",
      cancelUrl: "https://school-scanner.example.com/upgrade?canceled=1",
    });
  });

  it("throws when APP_BASE_URL_PROD is missing", () => {
    expect(() => resolveCheckoutRedirectUrls({})).toThrow(
      "Missing APP_BASE_URL_PROD.",
    );
  });

  it("throws when APP_BASE_URL_PROD uses unsupported protocol", () => {
    expect(() =>
      resolveCheckoutRedirectUrls({
        APP_BASE_URL_PROD: "ftp://school-scanner.example.com",
      }),
    ).toThrow("APP_BASE_URL_PROD must use http or https.");
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

  it("allows first checkout attempt and debounces rapid duplicate requests", () => {
    const state = new Map<string, number>();
    const firstResult = enforceCheckoutDebounceAttempt({
      userId: "user_123",
      nowMs: 1_000,
      state,
      windowMs: 10_000,
    });
    expect(firstResult).toBeNull();

    const secondResult = enforceCheckoutDebounceAttempt({
      userId: "user_123",
      nowMs: 4_000,
      state,
      windowMs: 10_000,
    });
    expect(secondResult).toEqual({
      ok: false,
      code: "debounced",
      reason: "duplicate_rapid_attempt",
      message: "Checkout already started. Please wait before retrying.",
      retryAfterMs: 7_000,
    });
  });

  it("allows checkout after debounce window elapses", () => {
    const state = new Map<string, number>();
    enforceCheckoutDebounceAttempt({
      userId: "user_123",
      nowMs: 1_000,
      state,
      windowMs: 10_000,
    });

    const result = enforceCheckoutDebounceAttempt({
      userId: "user_123",
      nowMs: 12_000,
      state,
      windowMs: 10_000,
    });
    expect(result).toBeNull();
  });

  it("releases debounce lock after failed checkout attempt", () => {
    const state = new Map<string, number>();
    enforceCheckoutDebounceAttempt({
      userId: "user_123",
      nowMs: 1_000,
      state,
      windowMs: 10_000,
    });

    releaseCheckoutDebounceAttempt("user_123", state);

    const result = enforceCheckoutDebounceAttempt({
      userId: "user_123",
      nowMs: 1_001,
      state,
      windowMs: 10_000,
    });
    expect(result).toBeNull();
  });
});
