import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "noop-cron",
  { minutes: 1 },
  internal.jobs.noopCron,
  { label: "dev-noop" },
);

export default crons;
