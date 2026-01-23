# Task Workflow

Use this workflow to keep design details synchronized with implementation.

## When you say “start next task”

I will:
1) Find the next unstarted task in `IMPLEMENTATION_PLAN.md` (respecting phase order and any strict sequencing).
2) Create or open the matching task brief in `docs/tasks/`.
3) Fill in the brief with initial design details, assumptions, and open questions.
4) Ask you only for the minimal missing inputs to proceed.
5) Begin implementation using the brief as the source of truth.

## Task Brief Naming Convention

- `docs/tasks/phase-<phase>-<section>-<short-title>.md`
- Example: `docs/tasks/phase-1-3-registration-ui.md`

## How to Keep Briefs Updated

- Add new decisions and constraints as they emerge.
- If a decision changes, add a note under “Open Questions” and resolve it explicitly.
- Keep the brief concise; link to external artifacts (Figma, docs, PRs) when relevant.
