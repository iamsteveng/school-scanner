# Task Brief: Phase 2.2 Announcement Scraping / Monitoring Job (Backend)

## Status
- In progress

## Goal
- Detect new or updated school announcements (e.g. open day notices) by periodically fetching school pages.

## Target Outcome
- Scheduled job fetches monitored school pages.
- Diff logic identifies:
  - 🟢 new announcement
  - 🟡 updated announcement
  - 🔘 no change
- Persist results for dashboard + WhatsApp notifications.

## Data Model (proposed)
New tables:
- `school_pages`
  - `schoolId`
  - `url`
  - `lastFetchedAt`
  - `lastStatus`
  - `lastError?`
  - `lastContentHash?`
  - `lastContentText?` (optional; may be large)

- `announcements`
  - `schoolId`
  - `url`
  - `title`
  - `contentText`
  - `contentHash`
  - `publishedAt?` (if detectable)
  - `firstSeenAt`
  - `lastSeenAt`
  - `changeType` (NEW/UPDATED/NO_CHANGE)

- `monitoring_runs`
  - `startedAt`
  - `finishedAt?`
  - `status`
  - `schoolsChecked`
  - `changesNew`
  - `changesUpdated`
  - `changesNone`

## Monitoring Logic (MVP)
- For each monitored school:
  1) Fetch school website URL (or a dedicated “announcements” URL when available)
  2) Extract a clean text snapshot (strip scripts/styles)
  3) Compute hash
  4) Compare to last hash
  5) Record result

## Scheduling
- Convex scheduler job (e.g. every 6 hours initially) to run monitoring.
- Respect rate limits (concurrency cap + per-domain delay).

## Edge Cases
- Site unreachable / blocked / Cloudflare
- Content changes due to timestamps/footer (noise)
- Multiple announcement pages per school

## Verification
- Run job manually in dev:
  - When content changes, NEW/UPDATED flags match expectations.
  - When unchanged, NO_CHANGE recorded.
- Logs show run summary counts.

## Open Questions
1) For MVP, do we monitor only the school’s home page, or do we define per-school announcement URLs?
2) What should be considered “announcement content” vs boilerplate noise?
3) Max number of schools per run and schedule frequency?
