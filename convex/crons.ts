import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "noop-cron",
  { minutes: 1 },
  internal.jobs.noopCron,
  { label: "dev-noop" },
);

// MVP cadence: every 6 hours.
crons.interval(
  "monitoring-cron",
  { hours: 6 },
  internal.jobs.monitoringCron,
  { limitSchools: 50, limitPagesPerSchool: 3 },
);

export default crons;
