# Task Brief: Phase 1.4 Verification Link Handling (/v/:token) (Backend)

## Status
- Completed

## Goal
- Validate verification links and create a verified session.

## Success Criteria
- Valid token creates a verified session.
- Token is single-use and invalid after consumption.
- New user redirects to `/schools`.
- Existing user redirects to `/dashboard`.

## User Flow / UX Notes
- User taps WhatsApp link and lands on `/v/:token` page (handled by frontend in 1.5).
- Backend validates and returns next-step routing info.

## Data + Auth Assumptions
- `verification_tokens` table is source of truth.
- Phone number is used to identify existing vs new user (exact matching on E.164).
- Session mechanism is a signed JWT (30-day TTL) returned from backend.
- Verification creates a `users` record if missing.
- Requires `JWT_SECRET` in Convex env.

## Backend (Convex) Functions
- Mutation `consumeVerificationLink` consumes token and upserts user.
- Action `consumeVerificationLinkAction` signs JWT and returns redirect.

## Frontend Components / Pages
- `/v/:token` page will call backend and redirect (handled in 1.5).

## Edge Cases + Error Handling
- Expired token.
- Token already used.
- Invalid token.
- Phone number not found / missing.

## Analytics Events
- `verification_token_consumed` (optional).
- `verification_token_failed` with reason.

## Testing / Verification
- Unit tests must be added (or updated) for new behavior.
- Verification passes only if all unit tests pass.
- New user → `/schools`.
- Existing user → `/dashboard`.
- Token invalid after use.

## Open Questions
- None.
