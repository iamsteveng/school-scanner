# PRD — Phase 5.1 Summary Generation Logic

## Context
School Scanner currently has onboarding, school selection, and dashboard foundations. This phase builds backend summary-generation logic that prepares WhatsApp-ready summary content with strict tier-based cadence rules and privacy-safe messaging.

This PRD is focused on generation logic only (not delivery scheduling, which is Phase 5.2).

## Problem Statement
Users need clear, timely updates about admissions/open-day events for selected schools. The system must:
1. Generate summaries at the right cadence per plan,
2. Include meaningful update counts,
3. Avoid leaking school names in “missed schools” style sections,
4. Be deterministic and testable for later scheduler integration.

## Goals
- Implement a backend summary generator that is reusable by Phase 5.2 schedulers.
- Enforce strict plan cadence:
  - FREE: weekly summary only
  - PREMIUM: daily summary only
- Compute “missed schools” count from selected schools vs schools with relevant updates in the window.
- Keep output content privacy-safe by not listing school names in missed-schools messaging.
- Provide robust test coverage and CI-pass evidence for the feature.

## Non-Goals
- Sending WhatsApp messages (Phase 5.2).
- Building new dashboard UI.
- Changing subscription checkout/billing behavior.

## Users / Segments
- **FREE users**: weekly digest behavior only.
- **PREMIUM users**: daily digest behavior only.

## Functional Requirements

### FR-1: Summary window + cadence contract
- Generator accepts an explicit target window (start/end timestamps) and cadence context.
- Cadence eligibility rules:
  - FREE users are eligible only for weekly summary generation.
  - PREMIUM users are eligible only for daily summary generation.
- If cadence does not match plan, generator must return a typed “not eligible” outcome (not silent failure).

### FR-2: Update aggregation for selected schools
- Generator reads user’s saved selected schools.
- Generator fetches updates/events in the requested window and joins against selected schools.
- Output includes summary-level aggregates required for WhatsApp composition (counts and compact structured fields).

### FR-3: Missed-schools count (name redaction)
- Compute `missedSchoolsCount` as number of selected schools with no relevant updates in the window.
- Any missed-schools text/content must not include school names.
- If all selected schools had updates, count is 0.

### FR-4: Phase 5.2-ready entrypoint
- Expose a stable backend entrypoint callable by scheduler jobs in Phase 5.2.
- Entrypoint returns deterministic structure suitable for downstream delivery formatting.
- Must include enough metadata for scheduler decisions (plan, cadence, window, generatedAt, etc.).

### FR-5: Error handling
- Handle users with no selected schools gracefully.
- Handle invalid/missing plan values with explicit error/result type.
- Handle empty window results without failing generation.

## Data Contract (Proposed)

```ts
type SummaryCadence = "daily" | "weekly";

type SummaryGenerationResult =
  | {
      status: "eligible";
      userId: string;
      plan: "FREE" | "PREMIUM";
      cadence: SummaryCadence;
      windowStart: number;
      windowEnd: number;
      selectedSchoolCount: number;
      updatedSchoolCount: number;
      missedSchoolsCount: number;
      totalRelevantUpdates: number;
      generatedAt: number;
      // payload fields for Phase 5.2 formatter/sender
      summaryPayload: Record<string, unknown>;
    }
  | {
      status: "ineligible";
      reason: "cadence_mismatch" | "invalid_plan";
      userId: string;
      plan?: string;
      requestedCadence: SummaryCadence;
    }
  | {
      status: "error";
      reason: string;
      userId: string;
    };
```

> Final shape can evolve, but status typing and cadence enforcement behavior are mandatory.

## User Stories

### US-001 — Cadence enforcement by tier
As a FREE user, I should only be processed for weekly summaries; as a PREMIUM user, only daily summaries, so plan benefits are enforced correctly.

**Acceptance Criteria**
- FREE + daily request => `ineligible(cadence_mismatch)`
- FREE + weekly request => eligible path
- PREMIUM + weekly request => `ineligible(cadence_mismatch)`
- PREMIUM + daily request => eligible path

### US-002 — Aggregate selected-school updates in window
As a user, summary generation should reflect updates from my selected schools within the requested window.

**Acceptance Criteria**
- Only selected schools are considered in aggregation.
- Window boundaries are respected.
- Output contains deterministic counts for repeated runs on same data.

### US-003 — Missed-schools count with redaction
As a user, I can know how many selected schools had no updates without exposing school names.

**Acceptance Criteria**
- `missedSchoolsCount` computed accurately.
- Missed-school output does not include school names.

### US-004 — Scheduler-ready generation entrypoint
As a scheduler (Phase 5.2), I can call one entrypoint and get a complete generation result.

**Acceptance Criteria**
- Public/internal backend function exists and is callable.
- Returns typed status and payload metadata.

### US-005 — Tests and CI evidence
As engineering, we need confidence this logic stays correct.

**Acceptance Criteria**
- Unit tests cover tier-cadence matrix, aggregation, missed-schools redaction, empty/no-selection edge cases.
- Lint/typecheck/tests pass in CI for PR.

## Edge Cases
- User has 0 selected schools => eligible result with counts = 0 (or explicit handled status, but no crash).
- No updates in window => `updatedSchoolCount = 0`, `missedSchoolsCount = selectedSchoolCount`.
- Duplicate/overlapping update records => aggregation should dedupe by intended key (documented in code/tests).
- Invalid cadence input => validation error pathway.

## Technical Notes
- Keep generator pure-ish where possible (separate data fetch from computation) to simplify testing.
- Centralize cadence policy in one helper for consistency.
- Ensure naming and payloads align with existing Convex schema/types.

## Telemetry (Optional in 5.1, preferred)
- `summary_generation_attempted`
- `summary_generation_eligible`
- `summary_generation_ineligible`
- `summary_generation_failed`

## Definition of Done
- All five user stories accepted.
- Backend entrypoint merged with tests.
- CI green.
- Ready for Phase 5.2 scheduler integration without reworking core generation logic.
