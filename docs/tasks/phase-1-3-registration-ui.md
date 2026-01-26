# Task Brief: Phase 1.3 Registration UI (/start) (Frontend)

## Goal
- Let users submit a WhatsApp number to request verification.

## Success Criteria
- Country code selector (+852 default).
- Phone input validation.
- Terms checkbox.
- CTA triggers backend request.
- Success state shown after submit.

## User Flow / UX Notes
- User picks country code, enters number, accepts terms, submits.
- Display success state on send; display error on failure.

## Data + Auth Assumptions
- Phone numbers are sent in E.164 format.
- Backend handles token creation + WhatsApp dispatch.

## Backend (Convex) Functions
- Action to start verification (create token + send WhatsApp).

## Frontend Components / Pages
- `/start` page.

## Edge Cases + Error Handling
- Invalid number format.
- Missing terms acceptance.
- Backend send failure.

## Analytics Events
- None (placeholder; consider later).

## Testing / Verification
- Unit tests must be added (or updated) for new behavior.
- Verification passes only if all unit tests pass.
- Invalid numbers rejected.
- CTA disabled until terms checked.
- Success state shown after submit.

## Open Questions
- Confirm terms copy.
