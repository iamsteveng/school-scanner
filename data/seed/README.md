# Seed data

## HK Primary Schools (official sources)

The seed dataset can be built from official sources published via data.gov.hk / CSDI.

- Dataset family: **"School Location and Information"** (Education Bureau)
- This repo uses **primary schools** subsets for MVP.

Build locally:

```bash
node scripts/buildPrimarySchoolsSeed.mjs
```

This generates:
- `data/seed/hk_primary_schools_seed.json`

Sources (CSDI static downloads; each is a ZIP containing one CSV):
- Aided Primary Schools
- Government Primary Schools
- Private Primary Schools
- Direct Subsidy Scheme Primary Schools
- English Schools Foundation (Primary)
- International Schools (Primary)

Note: the upstream datasets include many more columns (address, coordinates, etc.).
Our Convex `schools` table currently stores only the minimal subset.
