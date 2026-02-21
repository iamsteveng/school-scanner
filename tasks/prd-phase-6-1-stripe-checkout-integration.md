# PRD: Phase 6.1 Stripe Checkout Integration

## 1. Introduction / Overview

Phase 6.1 introduces backend Stripe Checkout session creation for premium upgrade, aligned with the implementation plan.

This phase focuses on creating hosted Checkout sessions safely and deterministically, with clear redirect behavior and test coverage.

## 2. Goals

- Create Stripe Checkout session via backend entrypoint.
- Attach user metadata for downstream webhook/account mapping.
- Restrict eligibility to valid upgrade candidates.
- Prevent accidental duplicate rapid-click session creation.
- Define fixed success/cancel redirect behavior.
- Deliver backend-only completion with unit tests.

## 3. Selected Scope Decisions (Confirmed)

1. Eligible users: **FREE + canceled/expired premium users**.
2. Price strategy: **config-ready multi-price architecture, one active price now**.
3. Repeat-click behavior: **debounce rapid duplicate clicks**.
4. Redirect policy: fixed paths
   - success: `/billing/success`
   - cancel: `/upgrade?canceled=1`
5. DoD for 6.1: **backend action + unit tests only**.

## 4. User Stories

### US-001: Create Checkout Session backend entrypoint
**Description:** As a qualified user, I want the backend to create a Stripe Checkout Session so I can start subscription checkout.

**Acceptance Criteria:**
- [ ] Backend mutation/action creates Stripe Checkout Session successfully.
- [ ] Uses configured active Stripe price from environment/config.
- [ ] Returns hosted checkout URL to caller.
- [ ] Typecheck/lint passes.

### US-002: Enforce user eligibility
**Description:** As the system, I need to allow checkout only for FREE or canceled/expired premium users.

**Acceptance Criteria:**
- [ ] FREE users can create sessions.
- [ ] Canceled/expired premium users can create sessions.
- [ ] Active premium users are blocked with typed error/result.
- [ ] Unverified/ineligible users are blocked with typed error/result.
- [ ] Typecheck/lint passes.

### US-003: Attach metadata for downstream lifecycle handling
**Description:** As backend ops, I need checkout session metadata to map Stripe events to internal user state.

**Acceptance Criteria:**
- [ ] Session metadata includes internal user id.
- [ ] Metadata includes plan context / source marker where required.
- [ ] Metadata format is documented in code comments or task doc.
- [ ] Typecheck/lint passes.

### US-004: Debounce duplicate rapid checkout attempts
**Description:** As a user, rapid repeated clicks should not create multiple checkout sessions immediately.

**Acceptance Criteria:**
- [ ] Backend or request-flow logic debounces duplicate rapid attempts.
- [ ] Duplicate rapid requests return safe typed outcome (reuse/reject/new-per-policy).
- [ ] Behavior is deterministic and test-covered.
- [ ] Typecheck/lint passes.

### US-005: Fixed redirect contract and tests
**Description:** As a user, checkout completion/cancel routes should consistently return me to expected app pages.

**Acceptance Criteria:**
- [ ] Success URL is fixed to `/billing/success`.
- [ ] Cancel URL is fixed to `/upgrade?canceled=1`.
- [ ] Unit tests cover URL construction + eligibility + duplicate-click logic.
- [ ] CI quality gates pass.

## 5. Functional Requirements

- **FR-1:** Backend must expose a callable function to create Stripe Checkout sessions.
- **FR-2:** Session creation must use active configured price id (single active now, design open for more).
- **FR-3:** Eligibility must be enforced server-side for:
  - FREE
  - canceled/expired premium
  and reject others.
- **FR-4:** Session metadata must include user linkage fields required for webhook reconciliation.
- **FR-5:** Redirect URLs must be fixed to `/billing/success` and `/upgrade?canceled=1`.
- **FR-6:** Rapid duplicate requests must be debounced deterministically.
- **FR-7:** Function must return typed success/error outcomes for frontend-safe handling.

## 6. Non-Goals (Out of Scope)

- Frontend `/upgrade` UI build (Phase 6.2).
- Stripe webhook state transitions (Phase 6.3).
- Billing success page UI behavior (Phase 6.4).
- Analytics instrumentation beyond backend testing scope.

## 7. Technical Considerations

- Keep checkout creation logic isolated for easier webhook integration later.
- Use explicit typed result envelopes for predictable UI behavior.
- Protect Stripe secret usage in backend environment only.
- Ensure deterministic testability by abstracting Stripe client calls where helpful.

## 8. Success Metrics

- 100% eligible users can initiate hosted checkout session.
- 0 active-premium users pass eligibility gate.
- Duplicate rapid-click behavior is deterministic in tests.
- CI tests pass for 6.1 backend stories.

## 9. Open Questions

- Should debounce be time-window based only, or include idempotency key reuse with Stripe API request options?
- For canceled/expired premium classification, is current source-of-truth field final or still evolving for 6.3 webhook refactor?
