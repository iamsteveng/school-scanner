# Task Brief: Phase 4.2 Dashboard UI (/dashboard) (Frontend)

## Status
- In progress

## Goal
Build the `/dashboard` UI that shows monitoring status and the latest updates (announcements + events) for the user’s selected schools.

## Dependencies
- Phase 4.1 aggregation query: `dashboardQueries:getDashboardForUser`
- Session cookie JWT (`jwt_token`) decoded client-side to obtain `userId` (MVP)

## UX Requirements (MVP)
- If user is not verified (no session), redirect to `/start`
- If user has no saved school selection, redirect to `/schools`
- Show:
  - plan (FREE/PREMIUM)
  - monitoring last run summary
  - list of selected schools
  - merged updates feed with links to source
- Optional (MVP): “Since last visit” counts using client localStorage timestamp.

## Success Criteria
- `/dashboard` renders without blank screens.
- Redirect logic works for:
  - no session → `/start`
  - no selection → `/schools`
  - selection exists → dashboard content
- Updates feed shows both announcements and events (when present) and is sorted by time.

## Notes
- Security: userId is derived client-side from the JWT payload. Later we should move to server-side validation / Convex auth.
