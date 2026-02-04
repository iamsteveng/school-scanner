# Task Brief: Phase 3.3 School Search & Selection UI (/schools) (Frontend)

## Status
- In progress

## Goal
- Build the onboarding UI on `/schools` where a user can:
  - search schools
  - filter schools
  - select schools (checkbox list)
  - see a selection counter
  - save selections (“開始監察”)

## Success Criteria
- Search + filters call `schools.listSchools` and render results.
- Selection counter updates correctly.
- Free user cannot exceed 5 selected.
- Free user cannot edit after first save (locked until upgrade).
- Save calls `userSelections.saveForUser` and shows success state.

## UX Notes
- Simple mobile-first list UI.
- Provide clear locked state messaging for Free users.

## Data + Auth Assumptions
- We need a `userId` in the browser to call `userSelections.*`.
- Current backend issues a JWT in `verificationActions.consumeVerificationLinkAction` with `sub=userId`.
- MVP approach: store the JWT on verification, and decode the JWT payload client-side to get `userId`.

## Implementation Plan
1) Persist session JWT on `/v/[token]` success (e.g. localStorage).
2) Add client helper to decode JWT payload and extract `sub`.
3) `/schools` page:
   - Search input + filter controls
   - Use `useQuery(api.schools.listSchools, {...})` for result list
   - Manage `selectedSchoolIds` state, enforce max 5 on Free
   - Load existing selection via `useQuery(api.userSelections.getForUser, { userId })`
   - Save via `useMutation(api.userSelections.saveForUser, { userId, schoolIds })`
   - If lockedAt exists + plan is FREE, disable editing + show upgrade CTA (stub)

## Open Questions
- Where should we store the session JWT: localStorage, cookie, or both?
- Should `/schools` UI be Chinese-first (labels like “開始監察”) or bilingual?
- How should we populate filter options (static lists vs derive from dataset)?
