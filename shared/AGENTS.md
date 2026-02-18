# AGENTS.md — shared module

- Cadence enforcement lives in shared/cadencePolicy.ts
- Use these helpers for plan and cadence checks.
- Prefer adding cross-cutting helpers in this folder to keep backend and UI consistent.
- Summary aggregation belongs in shared/summaryAggregation.ts with an explicit window contract.
- For dedupe, use stable keys (`schoolId:updateId`) so repeated runs on the same dataset stay deterministic.
