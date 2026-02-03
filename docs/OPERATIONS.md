# Operations (Runbook) — School Scanner

This document lists the main operational tasks for running and maintaining the School Scanner system.

## Architecture (high level)
- **Frontend**: Next.js (Vercel)
- **Backend**: Convex (DB + functions + scheduler)
- **Scheduled jobs**: Convex cron (plus optional GitHub Actions for seed refresh PRs)

---

## Local development

### Prereqs
- Node.js (match repo toolchain; CI uses Node 20)
- `npm`
- Convex CLI (via `npx convex ...`)

### Install
```bash
npm ci
```

### Run Next.js locally
```bash
npm run dev
# http://localhost:3000
```

### Run Convex dev (watch)
```bash
npx convex dev
```

### One-shot Convex typecheck/push
```bash
npx convex dev --once
```

### Tests + lint
```bash
npm test
npm run lint
```

---

## Environments & configuration

### Local env vars
- App env vars: `.env.local`
- Convex env vars: managed via Convex dashboard / CLI

Docs:
- `docs/infra/ENV_VARS.md`
- `docs/infra/SETUP_CHECKLIST.md`

---

## Core backend operations

### Seed / refresh schools dataset (HK primary schools)

#### 1) Regenerate the seed JSON locally
This fetches official CSDI/data.gov.hk CSV zip sources and produces:
- `data/seed/hk_primary_schools_seed.json`
- `convex/seed/hk_primary_schools_seed.json` (for bundling inside Convex functions)

```bash
node scripts/buildPrimarySchoolsSeed.mjs
```

#### 2) Apply the snapshot into Convex (dev)
**Destructive by default** when `wipeExisting=true`.

```bash
npx convex run schools:refreshPrimarySchoolsFromSeed '{"wipeExisting":true}'
```

#### 3) Verify schools data
```bash
npx convex data schools --limit 5
```

---

## Monitoring (Phase 2.2)

### Run monitoring once (manual)
```bash
npx convex run monitoringActions:runMonitoringOnceAction '{"limitSchools":1,"limitPagesPerSchool":3}'
```

### Inspect monitoring results
```bash
npx convex data monitoring_runs --limit 10
npx convex data announcements --limit 10
```

### Scheduled monitoring
Configured in `convex/crons.ts`:
- `monitoring-cron` runs approx every 24 hours (MVP cadence)

To see if it ran:
- Convex Dashboard → Logs
- CLI: `npx convex logs`

---

## Scheduled refresh jobs

### Convex monthly school refresh (applies bundled snapshot)
Configured in `convex/crons.ts`:
- `monthly-school-seed-refresh-cron` runs approx every 30 days
- Executes `jobs.monthlySchoolSeedRefreshCron` → `internal.schools.refreshPrimarySchoolsFromSeed`

Note: Convex intervals do not support true “monthly”; we approximate with 30 days.

### GitHub Actions monthly seed PR
Workflow: `.github/workflows/monthly-school-seed-refresh.yml`
- Runs on the 1st of each month (UTC)
- Regenerates the seed JSON and opens a PR

After merging that PR, deploy Convex code (or run the refresh mutation) so the new snapshot is actually applied.

---

## Deployments

### Vercel (frontend)
- PRs produce preview deployments
- Merges to `main` deploy to production (standard Vercel default)

### Convex (backend)
- Use `npx convex deploy` for production deployments (or the configured CI flow)
- Use `npx convex dev` for development deployment

---

## Troubleshooting

### Cron ran but “nothing changed”
Check:
- `monitoring_runs` latest record
- `announcements` rows for the target school
- Convex logs for fetch errors / blocked pages

### Convex function typecheck failures
If the CLI blocks on typecheck during `npx convex dev --once`, you can temporarily run:
```bash
npx convex dev --once --typecheck=disable
```
…but fix the TS errors before merging.

---

## Quick links
- Task workflow: `docs/TASK_WORKFLOW.md`
- Implementation plan: `IMPLEMENTATION_PLAN.md`
- Ops env vars: `docs/infra/ENV_VARS.md`
