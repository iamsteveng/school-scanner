# Task Brief: Phase 4.1 Dashboard Data Aggregation API (Backend)

## Status
- Completed

## Goal
Provide a single backend API that returns everything the `/dashboard` UI needs in one call.

## Target Outcome
A Convex query that returns:
- user plan + identity basics
- selected schools summary
- monitoring health/status
- latest updates feed (announcements + events)
- optional “since you last checked” counts

## Proposed API
Query: `dashboardQueries.getDashboardForUser`

Inputs:
- `userId: Id<"users">`
- `limitUpdates?: number` (default 50)
- `perSchoolLimit?: number` (default 5)
- `sinceAt?: number` (optional timestamp used to compute “since last checked” counts)

Output:
- `user { id, phone, plan }`
- `selection { schoolIds, lockedAt, updatedAt } | null`
- `schools[]` (basic school records for selected schools)
- `monitoring` (latest `monitoring_runs` row)
- `updates[]` merged + sorted feed:
  - announcement updates from `announcements` (by `lastSeenAt`)
  - event updates from `events` (by `updatedAt`)
- `sinceCounts | null`

## Success Criteria
- Query works for:
  - user with no selection (returns empty feed)
  - user with selections (returns merged feed)
- Feed is sorted descending by update time
- Can cap returned rows via `limitUpdates`

## Notes
- This is an aggregation layer only. UI work happens in Phase 4.2.
- “Since last checked” can be passed from the client initially; later we can persist a `lastDashboardSeenAt` on the user.
