import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "noop-cron",
  { minutes: 1 },
  internal.jobs.noopCron,
  { label: "dev-noop" },
);

// Monitoring cadence:
// - daily kickoff resets cursor
// - batch cron sweeps through all schools in chunks
crons.interval(
  "monitoring-cron",
  { hours: 24 },
  internal.jobs.monitoringCron,
  { limitSchools: 25, limitPagesPerSchool: 3 },
);

crons.interval(
  "monitoring-batch-cron",
  { minutes: 10 },
  internal.jobs.monitoringBatchCron,
  { limitSchools: 25, limitPagesPerSchool: 3 },
);

// Phase 2.1a: monthly refresh of the schools seed snapshot.
// (Convex intervals don't support months, so approximate with 30 days.)
crons.interval(
  "monthly-school-seed-refresh-cron",
  { hours: 24 * 30 },
  internal.jobs.monthlySchoolSeedRefreshCron,
  {},
);

// Continuous URL auditor: runs small batches frequently.
crons.interval(
  "continuous-url-audit-cron",
  { minutes: 15 },
  internal.jobs.continuousUrlAuditCron,
  { limit: 10 },
);

export default crons;
