# Task Brief: Phase 2.2a AI Event Extraction (Zeabur) + Normalized Events Table (Backend)

## Status
- Not started

## Goal
- Turn scraped announcement/page content into **structured, event-oriented** records suitable for dashboard + WhatsApp summaries.
- Call an AI API via **Zeabur** so we can compare performance across different models/providers.

## Success Criteria
- New Convex `events` table exists and stores normalized event fields.
- Monitoring pipeline triggers AI extraction for NEW/UPDATED content and upserts `events`.
- At least 1–2 real school announcements produce correct values for:
  - registration open date
  - registration deadline
  - event date
  - quota
  - target student year(s)
  - target admission year
- Manual command(s) exist to run extraction for a single URL/snapshot.

## Event-Oriented Data Model
New table: `events`
- `schoolId: Id<"schools">`
- `sourceUrl: string`
- `sourceContentHash: string`
- `title: string`
- `eventAt?: number` (timestamp)
- `registrationOpenAt?: number`
- `registrationCloseAt?: number`
- `quota?: number`
- `targetStudentYears?: string[]` (e.g. ["P6", "K3"])
- `targetAdmissionYear?: string` (e.g. "2026-2027")
- `language?: "zh" | "en" | "mixed"`
- `confidence?: number` (0..1)
- `rawExtractJson?: string` (store full model JSON for debugging)
- `extractionNotes?: string`
- `createdAt: number`
- `updatedAt: number`

(We can extend later for location, contact, fee, etc.)

## Zeabur AI API Assumptions
We’ll treat Zeabur as a proxy that supports:
- choosing a model (e.g. via `model` param)
- returning a JSON response

Convex env vars (names TBD):
- `ZEABUR_AI_BASE_URL`
- `ZEABUR_AI_API_KEY`
- `ZEABUR_AI_MODEL`

## Backend (Convex) Functions
- `aiActions.extractEventsFromText` (action)
  - input: `{ schoolId, sourceUrl, contentText, contentHash }`
  - output: `{ events: EventExtract[], confidence, raw }`

- `eventMutations.upsertEventsFromExtract` (mutation)
  - upsert by `{ schoolId, sourceUrl, eventAt?, title? }` (final key TBD)

- `monitoringActions.runMonitoringOnceAction` integration:
  - after NEW/UPDATED detection, call extraction + upsert.

## Testing / Verification
- Unit tests for parsing/normalization helpers (date parsing, quota parsing, etc.).
- Manual test:
  - Run monitoring on a known school with an open-day announcement and confirm rows in `events`.

## Open Questions
1) Upsert key: should we key by `sourceUrl + title + eventAt`, or by a deterministic `eventHash`?
2) Should we store multiple events per source page, or 1 page → 1 event?
3) Date parsing: should we store timezone explicitly (HK) or assume Asia/Hong_Kong?
