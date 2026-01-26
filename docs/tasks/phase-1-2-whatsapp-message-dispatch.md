# Task Brief: Phase 1.2 WhatsApp Message Dispatch (Backend)

## Status
- Completed

## Goal
- Send WhatsApp verification links and log send status.

## Success Criteria
- WhatsApp message received with valid link.
- Failed sends are logged.

## User Flow / UX Notes
- Triggered after user requests verification.

## Data + Auth Assumptions
- Phone numbers in E.164 format (or normalized before send).

## Backend (Convex) Functions
- Mutation/action to send verification WhatsApp message.
- Logging mechanism for send attempts.

## Frontend Components / Pages
- None (backend task).

## Edge Cases + Error Handling
- Provider API errors or timeouts.
- Invalid phone number format.

## Analytics Events
- None (placeholder; consider later).

## Testing / Verification
- Unit tests must be added (or updated) for new behavior.
- Verification passes only if all unit tests pass.
- Send success path logged.
- Send failure path logged.

## Open Questions
- Resolved: use Twilio for WhatsApp dispatch.
- Resolved: credentials stored in Convex env vars.
- Resolved: base URL uses production domain in production; otherwise uses client origin (Option A).
