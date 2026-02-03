import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "noop-cron",
  { minutes: 1 },
  internal.jobs.noopCron,
  { label: "dev-noop" },
);

// MVP cadence: once per 24 hours.
crons.interval(
  "monitoring-cron",
  { hours: 24 },
  internal.jobs.monitoringCron,
  { limitSchools: 50, limitPagesPerSchool: 3 },
);

// Phase 2.1a: monthly refresh of the schools seed snapshot.
// (Convex intervals don't support months, so approximate with 30 days.)
crons.interval(
  "monthly-school-seed-refresh-cron",
  { hours: 24 * 30 },
  internal.jobs.monthlySchoolSeedRefreshCron,
  {},
);

export default crons;
