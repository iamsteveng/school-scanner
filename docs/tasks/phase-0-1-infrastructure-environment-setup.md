# Task Brief: Phase 0.1 Infrastructure & Environment Setup (Backend)

## Status
- Completed

## Goal
- Prepare the infra setup steps and artifacts so Phase 0.2 can complete Convex + Vercel wiring without blockers.

## Success Criteria
- Infra docs exist and are ready to execute once the Next.js app exists.
- Required env vars are enumerated.
- Setup checklist is clear and actionable.

## User Flow / UX Notes
- N/A (infrastructure)

## Data + Auth Assumptions
- Convex is the system of record for auth + DB.
- Next.js app uses Convex client and auth integration.

## Backend (Convex) Functions
- N/A for this task (Convex code comes after app scaffold).

## Frontend Components / Pages
- N/A (infrastructure)

## Edge Cases + Error Handling
- Missing or mismatched Convex URLs between environments.
- Secrets not set in one environment.

## Analytics Events
- N/A

## Testing / Verification
- Verify `docs/infra/ENV_VARS.md` and `docs/infra/SETUP_CHECKLIST.md` exist and are complete.
- Confirm Phase 0.2 will execute Convex initialization and Vercel setup.

## Open Questions
- Single Vercel project with preview + production (confirmed).
- Domains TBD.
- No Convex project exists yet; initialize a new one.
- Secrets deferred to later phases.
