# Task Brief: Phase 1.1a Backend Unit Test CI (Backend)

## Goal
- Ensure backend unit tests run on CI for every PR and main push.

## Success Criteria
- CI runs on PRs and main branch.
- Backend unit tests pass in CI.

## User Flow / UX Notes
- N/A.

## Data + Auth Assumptions
- N/A.

## Backend (Convex) Functions
- N/A.

## Frontend Components / Pages
- N/A.

## Edge Cases + Error Handling
- CI should fail fast on test failures.

## Analytics Events
- N/A.

## Testing / Verification
- Unit tests must be added (or updated) for new behavior.
- Verification passes only if all unit tests pass.

## Open Questions
- Resolved: GitHub Actions as CI provider.
- Resolved: run both `npm test` and `npm run lint`.
