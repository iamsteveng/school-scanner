# AGENTS.md — shared module

- Cadence enforcement lives in shared/cadencePolicy.ts
- Use these helpers for plan and cadence checks.
- Prefer adding cross-cutting helpers in this folder to keep backend and UI consistent.
- Summary aggregation belongs in shared/summaryAggregation.ts with an explicit window contract.
- For dedupe, use stable keys (`schoolId:updateId`) so repeated runs on the same dataset stay deterministic.
- Missed-schools output must stay redacted: emit count-only text and never include school names.
- Scheduler-facing summary generation composition belongs in shared/summaryGeneration.ts so Convex actions/crons and tests share one typed result contract.
- When touching summary generation contracts, keep coverage aligned in both tests/summaryGeneration.test.ts (tier/cadence matrix + typed outcomes) and tests/summaryAggregation.test.ts (redaction + missed-school edge cases).
