# PRD — Phase 5.2 WhatsApp Delivery Scheduler

## Context
Phase 5.1 introduced backend summary generation logic (tier cadence, aggregation, redaction, scheduler-ready entrypoint). Phase 5.2 operationalizes delivery by scheduling and sending WhatsApp summaries at correct cadence with delivery safety guarantees.

## Problem Statement
Summary generation exists, but users still need reliable message delivery. The system must schedule and execute sends at plan-appropriate cadence, avoid duplicate sends, skip inactive users, and persist delivery outcomes for observability.

## Goals
- Deliver FREE user summaries weekly and PREMIUM user summaries daily.
- Use Convex scheduler/jobs to trigger summary generation + WhatsApp send pipeline.
- Skip inactive/ineligible users safely.
- Prevent duplicate sends for the same user/cadence/window.
- Persist delivery logs with status and metadata for audit/debug.

## Non-Goals
- New WhatsApp provider integration (reuse existing dispatch primitives).
- UI redesign for dashboard/subscription pages.
- New billing logic.

## Users / Segments
- **FREE**: weekly summary delivery only.
- **PREMIUM**: daily summary delivery only.

## Functional Requirements

### FR-1: Scheduled cadence execution
- Define scheduler jobs for:
  - daily run (PREMIUM path)
  - weekly run (FREE path)
- Job window calculation must be deterministic and timezone-consistent (UTC baseline unless otherwise specified).

### FR-2: Candidate user selection
- Fetch users eligible for each cadence run.
- Skip users that are inactive/unverified/invalid for delivery.
- Respect tier-to-cadence rules (reuse Phase 5.1 cadence enforcement behavior).

### FR-3: Delivery pipeline orchestration
For each eligible user:
1. Generate summary payload using Phase 5.1 entrypoint.
2. If ineligible/empty per rules, skip or log as non-delivery outcome.
3. Format/send WhatsApp message.
4. Persist structured delivery result log.

### FR-4: Duplicate-send protection
- Ensure idempotency per user + cadence + window.
- Retries must not create duplicate user-visible messages.

### FR-5: Delivery logging
- Log at least: userId, plan, cadence, window, attempt timestamp, status (`sent|skipped|failed`), failure reason when applicable, and provider metadata if available.

### FR-6: Operational controls
- Provide callable dev/internal entrypoint to trigger a single cadence cycle for testing.
- Keep production cron safe (bounded batch size, error isolation per user).

## User Stories

### US-001 — Daily scheduler for PREMIUM users
As a PREMIUM user, I should receive daily summary messages when eligible.

**Acceptance Criteria**
- Daily scheduler runs and processes PREMIUM users only.
- FREE users are not sent via daily scheduler.
- Successful sends are logged.

### US-002 — Weekly scheduler for FREE users
As a FREE user, I should receive weekly summary messages when eligible.

**Acceptance Criteria**
- Weekly scheduler runs and processes FREE users only.
- PREMIUM users are not sent via weekly scheduler.
- Successful sends are logged.

### US-003 — Skip inactive/ineligible users safely
As system ops, the scheduler should avoid unnecessary sends.

**Acceptance Criteria**
- Inactive or non-deliverable users are skipped.
- Skip reason is logged.
- Pipeline continues for other users.

### US-004 — Idempotent delivery behavior
As users, we should not receive duplicates for same cadence window.

**Acceptance Criteria**
- Re-running same job window does not duplicate messages.
- Duplicate prevention keying is tested.

### US-005 — Test matrix + CI evidence
As engineering, we need confidence and traceability.

**Acceptance Criteria**
- Tests cover daily/weekly selection logic, skip behavior, idempotency, and logging outcomes.
- Lint/typecheck/tests pass in CI.
- CI evidence documented in task docs.

## Data / Contract Notes (Proposed)
- Delivery log record shape (example):

```ts
type SummaryDeliveryLog = {
  userId: string;
  plan: "FREE" | "PREMIUM";
  cadence: "daily" | "weekly";
  windowStart: number;
  windowEnd: number;
  attemptedAt: number;
  status: "sent" | "skipped" | "failed";
  reason?: string;
  providerMessageId?: string;
  idempotencyKey: string;
};
```

## Edge Cases
- User has no selected schools => should not crash; log skip/empty outcome according to policy.
- Summary generation returns ineligible => skip with reason.
- Provider transient failure => failed logged; no duplicate on retry.
- Partial batch failure => other users still process.

## Technical Notes
- Reuse Phase 5.1 summary generator entrypoints and typed outcomes.
- Keep scheduler orchestration thin; extract reusable pure helpers for selection/idempotency decisions.
- Prefer explicit UTC window boundaries for deterministic tests.

## Definition of Done
- All five user stories accepted.
- Scheduler jobs + internal trigger endpoints implemented.
- Delivery logs persisted with meaningful statuses.
- CI green and evidence doc added.
