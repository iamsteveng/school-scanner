# Environment Variables

This file tracks required env vars for local development, Vercel preview, and Vercel production.

## Core (Phase 0)
- `NEXT_PUBLIC_CONVEX_URL` (from Convex dashboard)
- `CONVEX_DEPLOYMENT` (Convex deployment name, for CI and tooling)

## Later Phases (placeholders)
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_ID`
- `WHATSAPP_PROVIDER_API_KEY`
- `POSTHOG_API_KEY`

## WhatsApp (Twilio)
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_WHATSAPP_FROM` (e.g., `whatsapp:+14155238886`)
- `TWILIO_STATUS_CALLBACK_URL` (Convex http endpoint for status webhooks)
- `APP_BASE_URL_PROD` (production domain for verification links)
- `ALLOW_DYNAMIC_BASE_URL` (`true` to allow preview/base URL from client)
- `ALLOWED_BASE_URL_HOSTS` (comma-separated allow-list, e.g. `.vercel.app,localhost`)

## Auth
- `JWT_SECRET`
