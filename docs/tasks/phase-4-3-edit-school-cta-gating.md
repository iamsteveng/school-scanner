# Task Brief: Phase 4.3 Edit School CTA Gating (Frontend + Backend)

## Status
- Completed

## Goal
Enforce Premium upsell at the dashboard edit entry point so Free users cannot edit saved schools after lock, while Premium users retain normal edit access.

## Final Implementation Summary
- **Backend gate:** `saveForUser`/`saveForUserInternal` enforces plan-based edit lock and returns typed mutation outcomes.
  - Free + locked edit attempt returns `{ ok: false, code: "UPGRADE_REQUIRED", message }`
  - Premium edit returns `{ ok: true, code: "OK" }`
- **Frontend dashboard gating:** `/dashboard` Edit Schools CTA branches by user plan.
  - Free users: opens upgrade modal (no direct entry to editable school selection flow)
  - Premium users: routes directly to `/schools`
- **Upgrade CTA behavior:** upgrade modal CTA routes to `/upgrade` and tracks analytics event.
- **Analytics:** emits `upgrade_cta_clicked` with `{ source: "dashboard_edit_modal" }`; tracking is wrapped so failures do not block navigation.

## Backend (Convex) Details
- Server-side protection lives in the selection mutation path (cannot be bypassed by direct mutation calls).
- Typed result contract used for frontend-safe branching:
  - `OK`
  - `FREE_LIMIT_EXCEEDED`
  - `UPGRADE_REQUIRED`

## Frontend UX Details
- Dashboard free-plan edit path uses modal copy/actions:
  - `Not now` closes modal
  - `Upgrade to Premium` navigates to `/upgrade`
- Added minimal `/upgrade` page route so CTA always has a valid destination.

## Analytics Events
- Event: `upgrade_cta_clicked`
- Trigger: click on dashboard Free-plan upgrade CTA in edit modal
- Payload: `{ source: "dashboard_edit_modal" }`

## Test Evidence
Commands run:
- `npm run test`
- `npx tsc --noEmit`
- `npm run build` *(with `NEXT_PUBLIC_CONVEX_URL` set)*

Phase 4.3 coverage includes:
- Backend lock-bypass prevention and premium edit success (`tests/userSelections.test.ts`)
- Dashboard Free modal gating + Premium edit path + analytics emission (`tests/dashboardEditCtaGating.test.tsx`)
- Documentation checklist coverage (`tests/phase43DocsChecklist.test.ts`)

## PR Summary (ready to paste)
**What changed**
- Enforced server-side typed gating for school selection edits (`UPGRADE_REQUIRED` for locked Free edits).
- Gated Dashboard `Edit Schools` CTA with upgrade modal for Free users; Premium users continue to `/schools`.
- Added upgrade CTA analytics event (`upgrade_cta_clicked`) from dashboard modal.
- Added/updated backend + frontend + docs checklist tests.

**Why**
- Prevent Free users from bypassing edit lock via direct backend calls.
- Provide clear, actionable upsell UX at the exact edit decision point.
- Give reviewers explicit test and visual proof for Phase 4.3 acceptance criteria.

**Test commands + results**
- `npm run test` ✅
- `npx tsc --noEmit` ✅
- `npm run build` ✅

## Visual Proof (attach in PR)
Attach these dashboard artifacts to the PR and embed them in the description:
- Free flow: upgrade modal shown from `/dashboard` edit CTA
  - `free-edit-upgrade-modal.png`
- Premium flow: edit entry routes to `/schools`
  - `premium-edit-entry.png`
- Optional walkthrough clip
  - `dashboard-edit-gating.gif`

> Reviewer note: ensure both Free and Premium paths are visible in the PR before merge.
