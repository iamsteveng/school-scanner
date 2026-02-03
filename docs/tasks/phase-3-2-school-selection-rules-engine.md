# Task Brief: Phase 3.2 School Selection Rules Engine (Backend)

## Status
- Completed

## Goal
- Persist each user’s selected schools.
- Enforce Free vs Premium constraints:
  - Free: max 5 schools; selection becomes locked after first save.
  - Premium: can edit selections any time.

## Success Criteria
- Free user cannot select more than 5 schools.
- Free user cannot edit selections after first save.
- Premium user can edit selections repeatedly.
- Unit tests cover rule enforcement logic.

## Data + Auth Assumptions
- For now, backend functions accept a `userId` argument (no Convex auth wiring yet).
- User plan is stored on `users.plan` (Option B): `FREE | PREMIUM`.

## Data Model
- Extend `users` with:
  - `plan: "FREE" | "PREMIUM"` (default `FREE`)
- New table: `user_school_selections`
  - `userId: Id<"users">` (unique)
  - `schoolIds: Id<"schools">[]`
  - `lockedAt?: number` (set on first save for Free users)
  - `createdAt: number`
  - `updatedAt: number`

## Backend (Convex) Functions
- `userSelections.getForUser` (query): returns current selection record for a user.
- `userSelections.saveForUser` (mutation): validates and saves school IDs based on plan.
- `users.setPlan` (internal mutation): admin/dev helper to set a user to PREMIUM.

## Edge Cases
- Unknown userId → error.
- Unknown/invalid school IDs → error.
- Duplicates in `schoolIds` should be de-duped.

## Testing / Verification
- Unit tests verify:
  - Free limit (5)
  - Free lock behavior
  - Premium edit behavior

## Open Questions
- When we wire real auth, should we derive `userId` from session/JWT instead of passing it from the client?
