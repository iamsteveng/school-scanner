# Task Brief: Phase 3.1 School Search API (Backend)

## Status
- Completed

## Goal
- Provide a fast, filterable API for school search used by the `/schools` onboarding UI.

## Success Criteria
- Can filter by `level`, `type`, `district` (combinable).
- Can search by Chinese or English name.
- Returns stable, predictable ordering and respects a `limit`.
- Unit tests cover the filtering + search behavior.

## User Flow / UX Notes
- User types a query (English or Chinese) and optionally applies filters.
- Results update quickly and show the matching schools.

## Data + Auth Assumptions
- Read-only query; public access is OK for MVP.
- `schools` table includes enriched metadata from Phase 2.1a.

## Backend (Convex) Functions
### Query: `schools.listSchools`
**Inputs**
- `q?`: string (substring match against `nameEn` and `nameZh`)
- `level?`: string
- `type?`: string
- `district?`: string (districtEn, back-compat)
- `districtZh?`: string
- `limit?`: number (default 200)

**Behavior**
- Use the most selective available index (districtEn only):
  - `by_level_type_district`
  - else `by_district`
  - else `by_level`
  - else `by_type`
- If `districtZh` is provided (without `district`), filter in-memory.
- If `q` is present, return results sorted by a simple relevance score:
  1) exact match
  2) prefix match
  3) substring match (earlier occurrence wins)
  Then tie-break by `nameEn`.

### (Optional) Improvements
- Add a dedicated search index / tokenized search later if we hit performance limits.
- Add a `districtZh` filter input if the UI uses Chinese district labels.

## Frontend Components / Pages
- No frontend changes in this task (Phase 3.3 will consume it).

## Edge Cases + Error Handling
- Normalize inputs (trim + casing) to avoid filter misses.
- Large scans if `q` is present; cap scan size to avoid expensive queries.

## Analytics Events
- Not required for MVP.

## Testing / Verification
- Add unit tests verifying:
  - filter combinations return expected set
  - `q` matches both `nameEn` and `nameZh`
  - `limit` respected
  - ordering stable (define the rule)

## Open Questions
1) Should `q` be **substring** match (current) or **prefix** match?
2) What is the desired ordering? (e.g., `nameEn` asc, `district` then name, or relevance-first when `q` is set)
3) Should the API accept `districtZh` as a filter, or should UI always pass `districtEn`?
