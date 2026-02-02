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
We’ll use a **hybrid** pipeline:

### 1) Deterministic crawl + snapshot
- For each monitored school:
  1) Fetch the school’s canonical website URL.
  2) If it’s missing/wrong/unreachable, record a “bad URL” signal for follow-up.
  3) Perform lightweight discovery:
     - follow obvious nav links (e.g. “News/最新消息/Announcements/Events”)
     - try sitemap/robots where present
     - capture PDFs linked from likely news pages
  4) Save snapshots (HTML→text + hash; PDFs→text + hash).

### 2) AI-assisted extraction/classification
- Use an AI model (via Codex CLI) to:
  - pick likely announcement links/pages from fetched content
  - classify items as open-day / admissions-related vs irrelevant
  - normalize extracted items into a structured announcement record

### 3) Diff + change detection
- Compare item hashes against prior run:
  - new item → 🟢 NEW
  - changed item → 🟡 UPDATED
  - unchanged → 🔘 NO_CHANGE

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
1) For MVP, do we monitor only the school’s home page first, or do we store a dedicated `announcementsUrl` per school once discovered?
2) Should we prioritize Chinese pages (最新消息) over English when both exist?
3) Max number of schools per run and schedule frequency?
4) Do we want to store “bad URL” flags directly on the `schools` table (e.g. `websiteStatus`, `websiteLastCheckedAt`)?
