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

## School URL Data Maintenance (Seed + Auditor)

We have **two cooperating jobs**:

1) **Seed school data refresh** (irregular / on-demand)
2) **Continuous AI URL auditor** (scheduled) that detects wrong `websiteUrl` / `announcementsUrl` and **auto-fixes** them.

### Policy decisions
- **Auto-fix is enabled** for high-confidence mismatches.
- **No random sampling**: we only audit schools that are `pending`, missing audit history, or stale.
- **Staleness window:** re-audit when `auditLastCheckedAt` is older than **30 days**.

### Data flow

#### 1) Seed refresh (irregular)
When applying a new seed snapshot:
- Upsert schools (district/type/metadata) from seed.
- If seed introduces a new school or changes a URL field:
  - set `schools.auditStatus = "pending"` so the auditor will re-check soon.

#### 2) Continuous URL auditor (scheduled)
Cron: `continuous-url-audit-cron` (every ~15 minutes)

Each run:
- selects up to N schools needing audit (priority order):
  1) `auditStatus == "pending"`
  2) `auditLastCheckedAt` is missing
  3) `auditLastCheckedAt < now - 30 days`
- runs AI audit (winner model: `gemini-2.5-flash-lite`)
- writes `schools.auditLastCheckedAt = now` and sets `auditStatus`:
  - `ok` if no mismatch
  - `needs_review` if mismatch
- **auto-fix** when `isMismatch=true` and `confidence >= 0.9`
- logs each auto-fix to `url_audit_fixes`
- updates cumulative counters in `url_audit_state`

### How mismatches (incl. low-confidence) are reported
- **Per-school status (primary):** auditor sets `schools.auditStatus`:
  - `ok` (no mismatch)
  - `needs_review` (mismatch detected but not auto-fixed)
  - `pending` (queued for re-audit)

  To review low-confidence / non-auto-fixed mismatches, filter schools by:
  - `auditStatus == "needs_review"`

- **Auto-fix log:** only high-confidence auto-fixes are logged to `url_audit_fixes` (old/new URLs, confidence, reason, model, timestamp).
- **Summary:** `url_audit_state` contains counters (checked/mismatch/fixed/errors) + last run time.

### Control plane
Start/stop the auditor:
```bash
npx convex run urlAuditState:setRunning '{"running":true}' --typecheck=disable
npx convex run urlAuditState:setRunning '{"running":false}' --typecheck=disable
```

Force a “fresh” re-audit of everything (Option C):
```bash
npx convex run urlAuditState:forceReauditAllNow '{}' --typecheck=disable
```

Check progress/state:
```bash
npx convex run urlAuditState:getState '{}' --typecheck=disable
```

List recent auto-fixes:
```bash
npx convex run urlAuditFixes:listRecentFixes '{"limit":50}' --typecheck=disable
```

### Manual audit (ad-hoc)
Single school audit (report-only):
```bash
npx convex run websiteAuditActions:auditSchoolUrls '{"schoolId":"<schoolId>","model":"gemini-2.5-flash-lite","baseUrl":"https://sfo1.aihub.zeabur.ai/"}' --typecheck=disable
```

### Notes
- Zeabur AI Hub is OpenAI-compatible; base URL should point to the regional endpoint (we normalize `/v1`).
- Keep costs low by:
  - only auditing `pending` + missing + stale (>30d)
  - small batch size (default 10)
  - winner model

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
