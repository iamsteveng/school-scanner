"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";

const STRIPE_CHECKOUT_URL = "https://api.stripe.com/v1/checkout/sessions";
const CHECKOUT_SUCCESS_PATH = "/billing/success";
const CHECKOUT_CANCEL_PATH = "/upgrade?canceled=1";

export type CreateCheckoutSessionSuccessResult = {
  ok: true;
  sessionId: string;
  checkoutUrl: string;
};

export type CreateCheckoutSessionIneligibleReason =
  | "user_not_found"
  | "user_not_verified"
  | "already_premium_active";

export type CreateCheckoutSessionIneligibleResult = {
  ok: false;
  code: "ineligible";
  reason: CreateCheckoutSessionIneligibleReason;
  message: string;
};

export type CreateCheckoutSessionResult =
  | CreateCheckoutSessionSuccessResult
  | CreateCheckoutSessionIneligibleResult;

type CheckoutEligibilityUser = {
  plan: "FREE" | "PREMIUM";
  verifiedAt?: number;
};

type EnvConfig = Record<string, string | undefined>;

export function resolveActiveStripePriceId(
  env: EnvConfig = process.env,
): string {
  const priceId = env.STRIPE_ACTIVE_PRICE_ID;
  if (!priceId) {
    throw new Error("Missing STRIPE_ACTIVE_PRICE_ID.");
  }
  return priceId;
}

function resolveStripeSecretKey(env: EnvConfig = process.env): string {
  const secretKey = env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY.");
  }
  return secretKey;
}

function resolveAppBaseUrl(env: EnvConfig = process.env): string {
  const raw = env.APP_BASE_URL_PROD;
  if (!raw) {
    throw new Error("Missing APP_BASE_URL_PROD.");
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("APP_BASE_URL_PROD must be a valid URL.");
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("APP_BASE_URL_PROD must use http or https.");
  }

  return `${parsed.protocol}//${parsed.host}`;
}

export async function createStripeCheckoutSessionRequest(options: {
  secretKey: string;
  priceId: string;
  userId: string;
  successUrl: string;
  cancelUrl: string;
  fetchImpl?: typeof fetch;
}): Promise<CreateCheckoutSessionSuccessResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const params = new URLSearchParams({
    mode: "subscription",
    "line_items[0][price]": options.priceId,
    "line_items[0][quantity]": "1",
    success_url: options.successUrl,
    cancel_url: options.cancelUrl,
    client_reference_id: options.userId,
  });

  const response = await fetchImpl(STRIPE_CHECKOUT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Stripe Checkout session creation failed: ${errorText}`);
  }

  const payload = (await response.json()) as { id?: string; url?: string };
  if (!payload.id || !payload.url) {
    throw new Error("Stripe Checkout response missing id or url.");
  }

  return {
    ok: true,
    sessionId: payload.id,
    checkoutUrl: payload.url,
  };
}

export function enforceCheckoutEligibility(
  user: CheckoutEligibilityUser | null,
): CreateCheckoutSessionIneligibleResult | null {
  if (!user) {
    return {
      ok: false,
      code: "ineligible",
      reason: "user_not_found",
      message: "User not found.",
    };
  }

  if (typeof user.verifiedAt !== "number") {
    return {
      ok: false,
      code: "ineligible",
      reason: "user_not_verified",
      message: "User must complete verification before checkout.",
    };
  }

  if (user.plan === "PREMIUM") {
    return {
      ok: false,
      code: "ineligible",
      reason: "already_premium_active",
      message: "User already has an active premium plan.",
    };
  }

  return null;
}

export const createCheckoutSession = action({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.runQuery(api.usersQueries.getUser, {
      userId: args.userId,
    });
    const ineligibleResult = enforceCheckoutEligibility(user);
    if (ineligibleResult) {
      return ineligibleResult;
    }

    const secretKey = resolveStripeSecretKey();
    const priceId = resolveActiveStripePriceId();
    const baseUrl = resolveAppBaseUrl();

    return await createStripeCheckoutSessionRequest({
      secretKey,
      priceId,
      userId: args.userId,
      successUrl: `${baseUrl}${CHECKOUT_SUCCESS_PATH}`,
      cancelUrl: `${baseUrl}${CHECKOUT_CANCEL_PATH}`,
    });
  },
});
