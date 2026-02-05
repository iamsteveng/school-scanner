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
- E2E access-control + redirect behavior for `/schools` is verified (see E2E test plan below).

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

## E2E Test Plan (Step-by-step)

### Assumptions / Notes
- `/schools` is an authenticated page.
- Auth state is represented by a JWT cookie.
- “Has selected school subscription before” means a `userSelections` record exists for the user (typically `schoolIds.length > 0`, and/or `lockedAt` is set).
- Redirect targets:
  - Not signed in → redirect to `/start`
  - Signed in + no selection → stay on `/schools`
  - Signed in + selection exists → redirect to `/dashboard`

### Pre-test setup (common)
1. Confirm the Vercel preview/base URL under test.
2. Prepare two test phone numbers:
   - User A: signed in, no selection
   - User B: signed in, has selection
3. Ensure we can obtain a valid JWT cookie for each user (via `/start` → verify link `/v/<token>`).
4. Ensure selection state:
   - User A: no `userSelections` record exists (or `schoolIds` empty).
   - User B: `userSelections` exists with at least 1–2 `schoolIds`.

---

### Scenario 1 — New user (not signed in) cannot access `/schools`
**Goal:** verify `/schools` is protected.

Steps:
1. Open a fresh browser context (incognito / cleared cookies).
2. Navigate directly to `GET /schools`.

Expected:
- Redirected to `/start`.
- `/start` UI is visible (phone input + send verification link button).
- No school list UI is shown.
- (Optional) No JWT cookie is present.

---

### Scenario 2 — Signed-in user, no selection, can access `/schools`
**Goal:** verify signed-in + no selection can use `/schools`.

Preconditions:
- JWT cookie present (User A is signed in).
- `userSelections.getForUser` returns null (or an empty selection if supported).

Steps:
1. Navigate to `GET /schools`.
2. Observe page loads.
3. Verify selection state/CTA:
   - With 0 selected, “開始監察 (Start monitoring)” is disabled.
4. Select 1 school.

Expected:
- Stays on `/schools` (no redirect).
- School list is visible.
- Selection counter updates from `0/5` → `1/5`.
- “開始監察” becomes enabled (assuming 1+ selections is sufficient).

---

### Scenario 3 — Signed-in user, existing selection, cannot access `/schools`
**Goal:** verify `/schools` redirects to dashboard once selection exists.

Preconditions:
- JWT cookie present (User B is signed in).
- `userSelections.getForUser` returns a record with `schoolIds.length > 0` (and/or `lockedAt` set).

Steps:
1. Navigate to `GET /schools`.

Expected:
- Redirected to `/dashboard`.
- Dashboard UI loads.
- `/schools` UI is not visible.

---

### Recommended additional E2E scenarios (quality)

#### Scenario 4 — Type filter filters results
Steps:
1. User A on `/schools`.
2. Set Type = “資助 (Aided)”.
Expected:
- Results update and reflect `type=AIDED`.

#### Scenario 5 — District filter filters results
Steps:
1. User A on `/schools`.
2. Set District = e.g. “灣仔區 (Wan Chai)”.
Expected:
- Results update and reflect selected district.

#### Scenario 6 — Search filters and ranks results
Steps:
1. User A on `/schools`.
2. Search for a known substring (EN or ZH).
Expected:
- Results shrink to matching schools; top results are most relevant.

#### Scenario 7 — Selection limit enforcement (max 5)
Steps:
1. User A on `/schools`.
2. Try selecting 6 schools.
Expected:
- 6th selection is blocked OR UI shows validation; behavior should be explicitly defined.

#### Scenario 8 — Persist selection then re-access `/schools`
Steps:
1. User A selects 2 schools and saves.
2. Navigate away.
3. Visit `GET /schools` again.
Expected:
- Redirected to `/dashboard`.

## Requirements Clarified (from Steve)
1. Session cookie name is **`jwt_token`** and it is **not HttpOnly**.
2. API calls should also support passing the JWT via **`Authorization: Bearer <token>`**.
3. PREMIUM users will have **another page** to edit school selection (so `/schools` access rules do not need to support editing for PREMIUM).
4. Empty selection is **not** saved to the database.

## Open Questions (remaining)
1. **Definition of “has selection”:** confirm redirect to `/dashboard` should happen when **any** `userSelections` record exists for the user (since empty selection isn’t saved).
2. **Redirect destination:** should “blocked from `/schools`” always go to `/dashboard` (current plan), or are there cases where we should show a locked state on `/schools` instead?

- Where should we store the session JWT: localStorage, cookie, or both?
- Should `/schools` UI be Chinese-first (labels like “開始監察”) or bilingual?
- How should we populate filter options (static lists vs derive from dataset)?
