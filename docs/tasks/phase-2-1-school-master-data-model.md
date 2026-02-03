# Task Brief: Phase 2.1 School Master Data Model (Backend)

## Status
- Completed

## Progress
- Identified an official seed source for HK primary schools via data.gov.hk / CSDI.
- Added a script to download/normalize those datasets into a seed JSON file.

## Goal
- Create a canonical `schools` dataset in Convex that can be filtered by level/type/district and used by onboarding + monitoring.

## Success Criteria
- `schools` table exists with required fields.
- Can query schools with filters (level/type/district) and (optional) name search.
- Data can be seeded in a repeatable way.

## Data Model
Table: `schools`
- `nameEn`: string
- `nameZh`: string
- `level`: string (e.g. kindergarten / primary / secondary)
- `type`: string (e.g. govt / aided / dss / private)
- `district`: string
- `websiteUrl`: string
- `createdAt`: number (ms)
- `updatedAt`: number (ms)

Indexes (initial)
- `by_level`: [level]
- `by_type`: [type]
- `by_district`: [district]
- `by_level_type_district`: [level, type, district]

## API / Queries
- `schools:listSchools` (query)
  - inputs: `{ level?: string; type?: string; district?: string; q?: string }`
  - behavior: apply filters; optional substring match on `nameEn`/`nameZh` for small datasets.

## Seeding
- Add a `schools:seedSchools` mutation restricted to dev/admin usage.
- Initial seed can be a small placeholder dataset until you provide a canonical CSV/source.

## Edge Cases
- Missing website URL.
- Duplicate schools (same name) — decide uniqueness rule.

## Testing / Verification
- Run `seedSchools` and confirm non-zero schools.
- Query by each filter independently and combined.

## Open Questions
1) What is the source of truth for the initial seed list (CSV, Notion, manual list)?
2) Standard enums:
   - Allowed `level` values?
   - Allowed `type` values?
   - District list normalization?
3) Uniqueness: should we enforce unique `websiteUrl` or `(nameEn, district)`?
