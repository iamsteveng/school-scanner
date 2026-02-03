# Task Brief: Phase 1.5 Verification Redirect Handling (Frontend)

## Status
- Completed

## Goal
- Provide a smooth, reliable frontend verification flow for `/v/:token`.

## Acceptance Checks (must be verifiable)
- Loading state renders immediately on `/v/:token` (no blank screen) and remains visible until the verification call resolves.
  - Verify by visiting `/v/test-token` and confirming the loading UI appears before redirect or error.
- Valid token for **new user** redirects to `/schools`.
  - Verify with a backend-issued token for a new phone number and confirm the browser lands on `/schools`.
- Valid token for **existing user** redirects to `/dashboard`.
  - Verify with a backend-issued token for an already-verified phone number and confirm the browser lands on `/dashboard`.
- Invalid/expired/used token shows a friendly error screen (no blank screen) with a clear CTA that links to `/start`.
  - Verify by reusing a token or using a bogus token and confirm the error UI and CTA are visible.
- Frontend tests cover redirect success and error-state rendering for `/v/:token`.
  - Verify via `npm test` (Vitest) with passing results.

## UX Notes
- Keep the page minimal, calm, and polished.
- Avoid exposing raw backend error strings.

## Dependencies / Assumptions
- Backend action `consumeVerificationLinkAction` exists and returns `{ token, redirectTo }`.
- `redirectTo` is either `/schools` (new user) or `/dashboard` (existing user).

## Out of Scope
- Persisting sessions beyond storing the verification result.
- Auth guards for `/schools` or `/dashboard`.
