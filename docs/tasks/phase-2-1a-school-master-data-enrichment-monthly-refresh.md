# Task Brief: Phase 2.1a School Master Data Enrichment + Monthly Refresh (Backend)

## Status
- In progress

## Goal
- Extend the `schools` dataset with additional metadata useful for filtering and map display.
- Establish a monthly refresh workflow so the dataset stays current.

## Scope (from EDB “School Location and Information” CSV)
Add fields:
- 男女校 (co-ed/gender): `SEARCH01_EN`, `SEARCH01_TC`
- District EN/TC: `SEARCH03_EN`, `SEARCH03_TC`
- Religion EN/TC: `NSEARCH01_EN`, `NSEARCH01_TC`
- Geo coords: `LATITUDE`, `LONGITUDE`
- Optional but useful: Address EN/TC: `ADDRESS_EN`, `ADDRESS_TC`

## Data Model (Convex)
Update `schools` table to include:
- `districtEn`, `districtZh`
- `genderEn?`, `genderZh?`
- `religionEn?`, `religionZh?`
- `addressEn?`, `addressZh?`
- `latitude?`, `longitude?`
- `sourceLastUpdate?`

Indexes:
- Update district-related indexes to use `districtEn`.

## Seed / Refresh
Current seed file (generated):
- `data/seed/hk_primary_schools_seed.json`

Plan:
1) Update build script to output the new fields from the CSV.
2) Update Convex seed mutation to accept the enriched schema.
3) Monthly refresh:
   - Preferred: external monthly job (cron/CI) runs build script, commits updated seed JSON (or stores in S3 later), then calls Convex to upsert.
   - Alternative: Convex scheduled job reads committed JSON snapshot (requires bundling data with the function).

## Verification
- Schools can be filtered by district/type.
- A sample of records shows gender + religion fields populated.
- Lat/long present and plausible (HK bounds).
- Monthly refresh procedure documented and repeatable.

## Open Questions
- Upsert strategy: unique by websiteUrl if present else (nameEn + districtEn)?
- Should we store religion/gender as normalized enums or keep raw strings for now?
