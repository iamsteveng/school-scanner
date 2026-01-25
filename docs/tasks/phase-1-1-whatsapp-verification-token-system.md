# Task Brief: Phase 1.1 WhatsApp Verification Token System (Backend)

## Status
- Completed

## Goal
- Implement secure, single-use, time-limited verification tokens mapped to phone numbers.

## Success Criteria
- Token expires after 10 minutes.
- Token cannot be reused.
- Invalid token is rejected.

## User Flow / UX Notes
- Tokens back verification links like `/v/:token` (frontend handles UX in later tasks).

## Data + Auth Assumptions
- Phone numbers stored as strings (E.164 normalized in later tasks).
- No user auth required to request a token.

## Backend (Convex) Functions
- Mutation to create a token for a phone number.
- Mutation to consume/validate a token (marks used, returns phone).

## Frontend Components / Pages
- None (backend task).

## Edge Cases + Error Handling
- Token expired.
- Token already used.
- Token not found.

## Analytics Events
- None (placeholder; consider later).

## Testing / Verification
- Unit tests:
  - Create token, then consume succeeds.
  - Second consume fails.
  - Consume after 10 minutes fails.
- Verification passes only if all unit tests pass.

## Open Questions
- Resolved: store token in plaintext, UUID format.
- Resolved: invalidate previous tokens for the same phone on create.
